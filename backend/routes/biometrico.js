const express = require('express');
const router = express.Router();
const biometricoController = require('../controllers/biometricoController');
const normalizacionService = require('../services/normalizacionService');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const rateLimit = require('express-rate-limit');

const pool = require('../config/db');

const biometricoLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30, 
    message: {
        error: 'Demasiadas peticiones desde este dispositivo. Por favor, intenta de nuevo en un minuto.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/evento', biometricoLimiter, biometricoController.registrarEvento);
router.post('/ping', biometricoController.verificarConexion);
router.get('/empleados', biometricoController.obtenerEmpleados);
router.get('/asistencia-actual', biometricoController.obtenerAsistenciaActual);
router.delete('/limpiar-asistencia', biometricoLimiter, biometricoController.limpiarAsistencia);

router.get('/monitor', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Monitor', 'moderador', 'Moderador']), async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;
        
        // Normalizar eventos pendientes
        await normalizacionService.normalizarYProcesar();

        // Obtener tolerancia
        const [configs] = await pool.execute(
            'SELECT valor FROM configuraciones WHERE clave = "tolerancia_minutos"'
        );
        const tolerancia = parseInt(configs[0]?.valor || '0');

        // Determinar fechas
        let fechaInicio, fechaFin;
        if (fecha_inicio && fecha_fin) {
            fechaInicio = fecha_inicio;
            fechaFin = fecha_fin;
        } else {
            const hoy = new Date();
            fechaInicio = hoy.toISOString().split('T')[0];
            fechaFin = hoy.toISOString().split('T')[0];
        }

        // 1. Obtener empleados activos
        const [empleadosActivos] = await pool.execute(
            `SELECT e.id, e.nombres, e.apellidos, COALESCE(a.nombre, '') as area_nombre
             FROM empleados e
             LEFT JOIN areas a ON e.area_id = a.id
             WHERE e.estado = 'activo'
             ORDER BY e.apellidos ASC, e.nombres ASC`
        );

        // 2. Buscar en tabla "asistencias"
        let tablaAsistencia = [];
        try {
            const [asistencias] = await pool.execute(
                `SELECT a.*, e.nombres, e.apellidos 
                 FROM asistencias a
                 JOIN empleados e ON a.empleado_id = e.id
                 WHERE a.fecha BETWEEN ? AND ?
                 ORDER BY a.fecha DESC, e.apellidos ASC`,
                [fechaInicio, fechaFin]
            );
            tablaAsistencia = asistencias;
        } catch (error) {
            console.error('[Monitor] Error consultando tabla asistencias:', error.message);
        }

        // 4. Generar lista de fechas en el rango
        let fechasArray = [];
        let curDate = new Date(fechaInicio);
        const endDate = new Date(fechaFin);
        while (curDate <= endDate) {
            fechasArray.push(curDate.toISOString().split('T')[0]);
            curDate.setDate(curDate.getDate() + 1);
        }

        // 5. Obtener turnos de los empleados
        const [turnosEmpleados] = await pool.execute(
            `SELECT et.empleado_id, et.turno_id, et.hora_inicio, et.hora_fin, et.es_tarde, et.dia_semana,
                    t.nombre_turno, t.hora_inicio as hora_inicio_default, t.hora_fin as hora_fin_default
             FROM empleado_turno et
             LEFT JOIN turnos t ON et.turno_id = t.id
             WHERE et.fecha_inicio <= ?
               AND (et.fecha_fin >= ? OR et.fecha_fin IS NULL)`,
            [fechaFin, fechaInicio]
        );

        // 6. Obtener justificaciones
        const [justificaciones] = await pool.execute(
            `SELECT * FROM justificaciones WHERE fecha_referencia BETWEEN ? AND ?`,
            [fechaInicio, fechaFin]
        );

        // 7. Construir resultado (Cartesiano: Empleados x Fechas)
        const resultado = [];
        for (const fecha of fechasArray) {
            const fechaObj = new Date(fecha + 'T00:00:00');
            const dayOfWeek = fechaObj.getDay() + 1; // Dom=1, Lun=2 ... Sab=7 (igual que frontend/DB)

            for (const emp of empleadosActivos) {
                // Find all valid turnos for this employee and date
                const turnosValidos = turnosEmpleados.filter(t => t.empleado_id === emp.id && (t.dia_semana === null || t.dia_semana === dayOfWeek));
                const turno = turnosValidos.length > 0 ? turnosValidos[0] : null;

                const asis = tablaAsistencia.find(a => {
                    const asisFecha = a.fecha instanceof Date ? a.fecha.toISOString().split('T')[0] : String(a.fecha).split('T')[0];
                    return a.empleado_id === emp.id && asisFecha === fecha;
                });

                const justificacion = justificaciones.find(j => {
                    const jFecha = j.fecha_referencia instanceof Date ? j.fecha_referencia.toISOString().split('T')[0] : String(j.fecha_referencia).split('T')[0];
                    return j.empleado_id === emp.id && jFecha === fecha;
                });

                const horaInicioTurno = turno?.hora_inicio || turno?.hora_inicio_default;
                const horaFinTurno = turno?.hora_fin || turno?.hora_fin_default;

                let minutosTardanza = 0;
                let estado = 'no_marcado';
                let tieneAsistencia = false;

                if (asis) {
                    tieneAsistencia = true;
                    minutosTardanza = asis.minutos_tardanza || 0;
                    estado = asis.estado || 'normal';

                    // Calcular tardanza si no está calculada
                    if (asis.hora_entrada && horaInicioTurno && minutosTardanza === 0) {
                        try {
                            const [h, m] = horaInicioTurno.split(':');
                            const horaMarcacion = new Date(asis.hora_entrada);
                            const horaInicioDate = new Date(asis.hora_entrada);
                            horaInicioDate.setHours(parseInt(h), parseInt(m || '0'), 0, 0);
                            const diffMins = Math.floor((horaMarcacion - horaInicioDate) / 60000);
                            if (diffMins > tolerancia) {
                                minutosTardanza = diffMins;
                                estado = 'tardanza';
                            }
                        } catch (e) {
                           // ignora
                        }
                    }
                } else if (horaInicioTurno) {
                    const ahora = new Date();
                    try {
                        const horaInicioDate = new Date(fecha + 'T' + horaInicioTurno);
                        if (ahora > horaInicioDate) {
                            const diffMins = Math.floor((ahora - horaInicioDate) / 60000);
                            if (diffMins > tolerancia) {
                                estado = 'tardanza';
                                minutosTardanza = diffMins;
                            }
                        }
                    } catch (e) {
                        // ignora
                    }
                }

                resultado.push({
                    id: asis?.id || `${emp.id}-${fecha}`,
                    fecha: fecha,
                    empleado_id: emp.id,
                    nombre_empleado: emp.nombres,
                    apellido_empleado: emp.apellidos,
                    area_nombre: emp.area_nombre || null,
                    hora_entrada: asis?.hora_entrada || null,
                    hora_salida: asis?.hora_salida || null,
                    hora_entrada_2: asis?.hora_entrada_2 || null,
                    hora_salida_2: asis?.hora_salida_2 || null,
                    minutos_tardanza: minutosTardanza,
                    minutos_merienda: asis?.minutos_merienda || null,
                    minutos_trabajados: asis?.minutos_trabajados || null,
                    estado: estado,
                    turno_id: turno?.turno_id || null,
                    nombre_turno: turno?.nombre_turno || null,
                    hora_inicio_turno: horaInicioTurno,
                    hora_fin_turno: horaFinTurno,
                    tiene_asistencia: tieneAsistencia,
                    // Objeto completo para el modal
                    justificacion: justificacion || null,
                    // Campos planos para el badge de estado (lo que Attendance.jsx espera)
                    estado_justificacion: justificacion?.estado || null,
                    tipo_justificacion:   justificacion?.tipo   || null,
                    motivo_justificacion: justificacion?.motivo || null,
                    comentario_revisor:   justificacion?.comentario_revisor || null
                });
            }
        }

        res.json({
            count: resultado.length,
            status: 'COMPLETED',
            tolerancia_minutos: tolerancia,
            data: resultado
        });
    } catch (error) {
        console.error('[Monitor] Error crítico:', error);
        res.status(500).json({ error: 'Error al obtener datos del monitor', details: error.message, stack: error.stack });
    }
});

module.exports = router;