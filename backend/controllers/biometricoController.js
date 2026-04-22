const pool = require('../config/db');
const normalizacionService = require('../services/normalizacionService');

const BIOMETRIC_API_KEY = process.env.BIOMETRIC_API_KEY || 'biometric_default_key_2024';

const validarApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.body.api_key;
    
    if (!apiKey) {
        return res.status(401).json({ 
            error: 'API Key requerida',
            detalle: 'Envía el header X-API-KEY o el campo api_key en el body'
        });
    }
    
    if (apiKey !== BIOMETRIC_API_KEY) {
        console.warn(`[Biométrico] Intento de acceso con API Key inválida: ${apiKey}`);
        return res.status(403).json({ error: 'API Key inválida' });
    }
    
    next();
};

exports.registrarEvento = [validarApiKey, async (req, res) => {
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    const device_uid = req.body.device_uid || req.body.sn || req.body.device_id;
    const employee_code = req.body.employee_code || req.body.empleado_id;
    let event_type = req.body.event_type || req.body.tipo || 'entrada';
    let timestamp = req.body.timestamp || req.body.fecha_hora;
    
    if (!timestamp) {
        timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    } else if (timestamp instanceof Date) {
        timestamp = timestamp.toISOString().slice(0, 19).replace('T', ' ');
    }

    const typeLower = event_type.toLowerCase();
    if (typeLower === 'in' || typeLower === 'entrada') event_type = 'entrada';
    else if (typeLower === 'out' || typeLower === 'salida') event_type = 'salida';
    else if (typeLower === 'entrada2') event_type = 'entrada2';
    else if (typeLower === 'salida2') event_type = 'salida2';
    else if (typeLower.includes('ent')) event_type = 'entrada';
    else if (typeLower.includes('sal')) event_type = 'salida';

    try {
        if (!device_uid || !employee_code) {
            return res.status(400).json({ 
                error: 'Faltan parámetros obligatorios', 
                detalle: 'Se requiere device_uid (o sn) y employee_code (o empleado_id)' 
            });
        }

        let [dispositivos] = await pool.execute(
            'SELECT id, ip_whitelist FROM dispositivos WHERE (device_uid = ? OR nombre = ?) AND estado = "activo"',
            [device_uid, device_uid]
        );

        if (dispositivos.length === 0 && (device_uid.includes('SIMULADOR') || device_uid.includes('TEST'))) {
            const [newDevice] = await pool.execute(
                'INSERT INTO dispositivos (nombre, device_uid, estado, ip_local) VALUES (?, ?, "activo", ?)',
                [device_uid, device_uid, clientIp]
            );
            dispositivos = [{ id: newDevice.insertId }];
            console.log(`[Biométrico] Dispositivo de simulación auto-registrado: ${device_uid} desde IP: ${clientIp}`);
        }

        if (dispositivos.length === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado o inactivo', sn: device_uid });
        }

        const dispositivo = dispositivos[0];
        
        if (dispositivo.ip_whitelist) {
            const ipsPermitidas = dispositivo.ip_whitelist.split(',').map(ip => ip.trim());
            if (!ipsPermitidas.includes(clientIp) && !ipsPermitidas.includes('*')) {
                console.warn(`[Biométrico] IP no permitida: ${clientIp} para dispositivo ${device_uid}`);
                return res.status(403).json({ error: 'IP no autorizada para este dispositivo' });
            }
        }

        const device_id = dispositivo.id;

        const [empleados] = await pool.execute(
            'SELECT id FROM empleados WHERE (codigo_interno = ? OR id = ?) AND estado = "activo"',
            [employee_code, employee_code]
        );

        if (empleados.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado o inactivo', code: employee_code });
        }

        const empleado_id = empleados[0].id;

        const [rawResult] = await pool.execute(
            `INSERT INTO asistencia_raw (device_id, empleado_id, fecha_hora_marcacion, tipo_marcacion, payload_json) 
             VALUES (?, ?, ?, ?, ?)`,
            [device_id, empleado_id, timestamp, event_type, JSON.stringify({...req.body, ip_cliente: clientIp})]
        );
        const rawId = rawResult.insertId;

        await pool.execute(
            'UPDATE dispositivos SET ultimo_evento_recibido = NOW() WHERE id = ?',
            [device_id]
        );

        console.log(`[Biométrico] Evento almacenado: raw_id=${rawId}, Empleado ${employee_code} (${event_type}) desde ${device_uid} [IP: ${clientIp}]`);
        
        try {
            await normalizacionService.procesarUnEvento(empleado_id, timestamp, event_type, device_id, rawId);
            // Marcar como procesado para evitar re-procesamiento por el batch job
            await pool.execute('UPDATE asistencia_raw SET procesado = TRUE WHERE id = ?', [rawId]);
            console.log(`[Biométrico] Evento procesado en tiempo real (raw_id=${rawId})`);
        } catch (procError) {
            console.error(`[Biométrico] Error en procesamiento en tiempo real: ${procError.message}`);
        }
        
        return res.status(200).json({ status: 'OK', message: 'Evento registrado correctamente' });

    } catch (error) {
        console.error('[Biométrico] Error crítico:', error);
        return res.status(500).json({ error: 'Error interno del servidor', detalle: error.message });
    }
}];

exports.verificarConexion = async (req, res) => {
    try {
        await pool.execute('SELECT 1');
        res.json({ 
            status: 'OK', 
            message: 'Conexión con servidor exitosa',
            timestamp: new Date().toISOString(),
            device_time: req.body.timestamp || null
        });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', message: 'Error de conexión con base de datos' });
    }
};

exports.obtenerEmpleados = async (req, res) => {
    try {
        const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
        const fechaObj = new Date(fecha + 'T00:00:00');
        const dayOfWeek = fechaObj.getDay() + 1; // Convierte JS (Dom=0..Sab=6) → BD/MySQL (Dom=1..Sab=7)

        const [empleados] = await pool.execute(`
            SELECT 
                e.id,
                e.codigo_interno,
                e.nombres,
                e.apellidos,
                COALESCE(a.nombre, '') as area_nombre,
                COALESCE(c.nombre, '') as cargo_nombre
            FROM empleados e
            LEFT JOIN areas a ON e.area_id = a.id
            LEFT JOIN cargos c ON e.cargo_id = c.id
            WHERE e.estado = 'activo'
            ORDER BY e.apellidos ASC, e.nombres ASC
        `);

        const [turnos] = await pool.execute(`
            SELECT 
                et.empleado_id,
                et.dia_semana,
                et.hora_inicio as hora_inicio_custom,
                et.hora_fin as hora_fin_custom,
                t.id as turno_id,
                t.nombre_turno,
                t.hora_inicio as hora_inicio_default,
                t.hora_fin as hora_fin_default
            FROM empleado_turno et
            JOIN turnos t ON et.turno_id = t.id
            WHERE et.fecha_inicio <= ?
              AND (et.fecha_fin >= ? OR et.fecha_fin IS NULL)
              AND t.estado = 'activo'
        `, [fecha, fecha]);

        const empleadosConTurnos = empleados.map(emp => {
            const turnosEmpleado = turnos.filter(t => 
                t.empleado_id === emp.id && (t.dia_semana === null || t.dia_semana === dayOfWeek)
            );
            
            const turno = turnosEmpleado[0] || null;
            
            return {
                id: emp.id,
                codigo_interno: emp.codigo_interno,
                nombres: emp.nombres,
                apellidos: emp.apellidos,
                area: emp.area_nombre,
                cargo: emp.cargo_nombre,
                turno: turno ? {
                    nombre: turno.nombre_turno,
                    hora_inicio: turno.hora_inicio_custom || turno.hora_inicio_default,
                    hora_fin: turno.hora_fin_custom || turno.hora_fin_default,
                    dia_semana: turno.dia_semana
                } : null
            };
        });

        res.json({
            fecha: fecha,
            dia_semana: dayOfWeek,
            empleados: empleadosConTurnos
        });
    } catch (error) {
        console.error('[Biométrico] Error obteniendo empleados:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.obtenerAsistenciaActual = async (req, res) => {
    try {
        const { empleado_id } = req.query;
        const fecha = new Date().toISOString().split('T')[0];

        if (!empleado_id) {
            return res.status(400).json({ error: 'empleado_id es requerido' });
        }

        const [asistencias] = await pool.execute(`
            SELECT 
                id,
                hora_entrada,
                hora_salida,
                hora_entrada_2,
                hora_salida_2,
                minutos_tardanza,
                minutos_merienda,
                minutos_trabajados,
                estado
            FROM asistenciaS
            WHERE empleado_id = ? AND fecha = ?
        `, [empleado_id, fecha]);

        if (asistencias.length === 0) {
            return res.json({
                tiene_asistencia: false,
                mensaje: 'No hay registro de asistencia para hoy'
            });
        }

        const asis = asistencias[0];
        
        let siguienteMarcacion = null;
        if (!asis.hora_entrada) {
            siguienteMarcacion = 'entrada';
        } else if (!asis.hora_salida) {
            siguienteMarcacion = 'salida';
        } else if (!asis.hora_entrada_2) {
            siguienteMarcacion = 'entrada2';
        } else if (!asis.hora_salida_2) {
            siguienteMarcacion = 'salida2';
        }

        res.json({
            tiene_asistencia: true,
            asistencia: asis,
            siguiente_marcacion: siguienteMarcacion,
            estado: asis.estado
        });
    } catch (error) {
        console.error('[Biométrico] Error obteniendo asistencia actual:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.listarLogs = async (req, res) => {
    try {
        const [logs] = await pool.execute(`
            SELECT 
                r.id, 
                r.fecha_hora_marcacion as fecha_hora, 
                e.nombres as nombre_empleado, 
                e.apellidos as apellido_empleado,
                a.nombre as area_nombre,
                d.nombre as dispositivo_nombre
            FROM asistencia_raw r
            JOIN empleados e ON r.empleado_id = e.id
            LEFT JOIN areas a ON e.area_id = a.id
            JOIN dispositivos d ON r.device_id = d.id
            ORDER BY r.fecha_hora_marcacion DESC
            LIMIT 100
        `);
        
        // Transformar para el frontend
        const result = logs.map(l => ({
            ...l,
            nombre_empleado: `${l.nombre_empleado} ${l.apellido_empleado}`,
            latencia: 1500 // Simulado
        }));
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.limpiarAsistencia = [validarApiKey, async (req, res) => {
    try {
        const { empleado_id } = req.body;
        const fecha = new Date().toISOString().split('T')[0];

        if (!empleado_id) {
            return res.status(400).json({ error: 'empleado_id es requerido' });
        }

        // Eliminar las justificaciones de esa asistencia primero para no romper la FK
        await pool.execute(
            'DELETE FROM justificaciones WHERE asistencia_id IN (SELECT id FROM asistencias WHERE empleado_id = ? AND fecha = ?)',
            [empleado_id, fecha]
        );

        // Eliminar la asistencia
        const [result] = await pool.execute(
            'DELETE FROM asistencias WHERE empleado_id = ? AND fecha = ?',
            [empleado_id, fecha]
        );

        if (result.affectedRows > 0) {
            console.log(`[Biométrico] Asistencia limpiada para emp ${empleado_id} en ${fecha}`);
            res.json({ message: 'Marcaciones eliminadas correctamente' });
        } else {
            res.json({ message: 'No había marcaciones para eliminar' });
        }
    } catch (error) {
        console.error('[Biométrico] Error limpiando asistencia:', error);
        res.status(500).json({ error: error.message });
    }
}];
