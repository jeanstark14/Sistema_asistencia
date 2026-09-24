const pool = require('../config/db');

const BIOMETRIC_API_KEY = process.env.BIOMETRIC_API_KEY || 'biometric_default_key_2024';
const DEVICE_UID_KIOSCO = 'KIOSCO_WEB_001';

/**
 * GET /api/kiosco/empleados
 * Retorna la lista de empleados activos con su turno del día actual.
 * No requiere JWT (acceso desde kiosco de red local).
 */
exports.obtenerEmpleados = async (req, res) => {
    try {
        const fecha = new Date().toISOString().split('T')[0];
        const fechaObj = new Date(fecha + 'T00:00:00');
        const dayOfWeek = fechaObj.getDay() + 1;

        const [empleados] = await pool.execute(`
            SELECT 
                e.id,
                e.codigo_interno,
                e.nombres,
                e.apellidos,
                COALESCE(a.nombre, '') AS area_nombre,
                COALESCE(c.nombre, '') AS cargo_nombre,
                e.pin_kiosco
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
                et.hora_inicio AS hora_inicio_custom,
                et.hora_fin    AS hora_fin_custom,
                t.nombre_turno,
                t.hora_inicio  AS hora_inicio_default,
                t.hora_fin     AS hora_fin_default
            FROM empleado_turno et
            JOIN turnos t ON et.turno_id = t.id
            WHERE et.fecha_inicio <= ?
              AND (et.fecha_fin >= ? OR et.fecha_fin IS NULL)
              AND t.estado = 'activo'
        `, [fecha, fecha]);

        const resultado = empleados.map(emp => {
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
                tiene_pin: !!emp.pin_kiosco,
                turno: turno ? {
                    nombre: turno.nombre_turno,
                    hora_inicio: turno.hora_inicio_custom || turno.hora_inicio_default,
                    hora_fin:    turno.hora_fin_custom    || turno.hora_fin_default
                } : null
            };
        });

        res.json({ fecha, dia_semana: dayOfWeek, empleados: resultado });
    } catch (error) {
        console.error('[Kiosco] Error obteniendo empleados:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/kiosco/asistencia/:empleadoId
 * Retorna el estado de asistencia del día actual del empleado.
 */
exports.obtenerAsistencia = async (req, res) => {
    try {
        const { empleadoId } = req.params;
        const fecha = new Date().toISOString().split('T')[0];

        const [rows] = await pool.execute(`
            SELECT 
                id,
                hora_entrada,
                hora_salida,
                hora_entrada_2,
                hora_salida_2,
                estado
            FROM asistencias
            WHERE empleado_id = ? AND fecha = ?
        `, [empleadoId, fecha]);

        if (rows.length === 0) {
            return res.json({ tiene_asistencia: false, siguiente_marcacion: 'entrada' });
        }

        const asis = rows[0];
        let siguiente = null;
        if (!asis.hora_entrada)   siguiente = 'entrada';
        else if (!asis.hora_salida)   siguiente = 'salida';
        else if (!asis.hora_entrada_2) siguiente = 'entrada2';
        else if (!asis.hora_salida_2)  siguiente = 'salida2';

        res.json({ tiene_asistencia: true, asistencia: asis, siguiente_marcacion: siguiente });
    } catch (error) {
        console.error('[Kiosco] Error asistencia:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/kiosco/verificar-pin
 * Verifica el PIN del empleado sin exponer datos sensibles.
 * Body: { empleado_id, pin }
 */
exports.verificarPin = async (req, res) => {
    try {
        const { empleado_id, pin } = req.body;

        if (!empleado_id || !pin) {
            return res.status(400).json({ error: 'empleado_id y pin son requeridos' });
        }

        if (!/^\d{5}$/.test(String(pin))) {
            return res.status(400).json({ error: 'PIN inválido' });
        }

        const [rows] = await pool.execute(
            'SELECT id FROM empleados WHERE id = ? AND pin_kiosco = ? AND estado = "activo"',
            [empleado_id, String(pin)]
        );

        if (rows.length === 0) {
            return res.status(401).json({ valido: false, error: 'PIN incorrecto' });
        }

        res.json({ valido: true });
    } catch (error) {
        console.error('[Kiosco] Error verificando PIN:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/kiosco/marcar
 * Registra una marcación desde el kiosco web.
 * Body: { empleado_id, event_type }  (PIN ya fue verificado en paso anterior)
 */
exports.registrarMarcacion = async (req, res) => {
    try {
        const { empleado_id, event_type } = req.body;

        if (!empleado_id || !event_type) {
            return res.status(400).json({ error: 'empleado_id y event_type son requeridos' });
        }

        const tiposValidos = ['entrada', 'salida', 'entrada2', 'salida2'];
        if (!tiposValidos.includes(event_type)) {
            return res.status(400).json({ error: 'event_type inválido' });
        }

        // Verificar que el empleado existe y está activo
        const [empleados] = await pool.execute(
            'SELECT id, codigo_interno FROM empleados WHERE id = ? AND estado = "activo"',
            [empleado_id]
        );
        if (empleados.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado o inactivo' });
        }

        // Auto-registrar dispositivo kiosco si no existe
        let [dispositivos] = await pool.execute(
            'SELECT id FROM dispositivos WHERE device_uid = ? AND estado = "activo"',
            [DEVICE_UID_KIOSCO]
        );
        if (dispositivos.length === 0) {
            const [newDev] = await pool.execute(
                'INSERT INTO dispositivos (nombre, device_uid, estado, ip_local) VALUES (?, ?, "activo", "127.0.0.1")',
                ['Kiosco Web', DEVICE_UID_KIOSCO]
            );
            dispositivos = [{ id: newDev.insertId }];
        }
        const device_id = dispositivos[0].id;

        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Guardar en raw
        const [rawResult] = await pool.execute(
            `INSERT INTO asistencia_raw (device_id, empleado_id, fecha_hora_marcacion, tipo_marcacion, payload_json)
             VALUES (?, ?, ?, ?, ?)`,
            [device_id, empleado_id, timestamp, event_type, JSON.stringify({ method: 'kiosco_web', empleado_id })]
        );
        const rawId = rawResult.insertId;

        await pool.execute('UPDATE dispositivos SET ultimo_evento_recibido = NOW() WHERE id = ?', [device_id]);

        // Procesar en tiempo real
        try {
            const normalizacionService = require('../services/normalizacionService');
            await normalizacionService.procesarUnEvento(empleado_id, timestamp, event_type, device_id, rawId);
            await pool.execute('UPDATE asistencia_raw SET procesado = TRUE WHERE id = ?', [rawId]);
        } catch (procError) {
            console.error('[Kiosco] Error procesando evento:', procError.message);
        }

        const tipoLabel = {
            entrada: 'Entrada', salida: 'Salida a Merienda',
            entrada2: 'Regreso de Merienda', salida2: 'Salida Final'
        };

        res.json({
            status: 'OK',
            message: 'Marcación registrada correctamente',
            tipo_label: tipoLabel[event_type],
            hora: timestamp.split(' ')[1].slice(0, 5),
            timestamp
        });
    } catch (error) {
        console.error('[Kiosco] Error registrando marcación:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * PUT /api/kiosco/pin/:empleadoId
 * Actualiza el PIN de un empleado (requiere auth admin).
 * Body: { pin }
 */
exports.actualizarPin = async (req, res) => {
    try {
        const { empleadoId } = req.params;
        const { pin } = req.body;

        if (!pin || !/^\d{5}$/.test(String(pin))) {
            return res.status(400).json({ error: 'El PIN debe ser exactamente 5 dígitos numéricos' });
        }

        const [result] = await pool.execute(
            'UPDATE empleados SET pin_kiosco = ? WHERE id = ? AND estado = "activo"',
            [String(pin), empleadoId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado o inactivo' });
        }

        res.json({ message: 'PIN actualizado correctamente' });
    } catch (error) {
        console.error('[Kiosco] Error actualizando PIN:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * DELETE /api/kiosco/pin/:empleadoId
 * Elimina el PIN de un empleado (requiere auth admin).
 */
exports.eliminarPin = async (req, res) => {
    try {
        const { empleadoId } = req.params;

        await pool.execute(
            'UPDATE empleados SET pin_kiosco = NULL WHERE id = ?',
            [empleadoId]
        );

        res.json({ message: 'PIN eliminado correctamente' });
    } catch (error) {
        console.error('[Kiosco] Error eliminando PIN:', error);
        res.status(500).json({ error: error.message });
    }
};
