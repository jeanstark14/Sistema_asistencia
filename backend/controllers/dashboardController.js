const pool = require('../config/db');

exports.getStats = async (req, res) => {
    try {
        const hoy = new Date().toISOString().slice(0, 10);
        
        let total_empleados = 0;
        let asistencias_hoy = 0;
        let tardanzas_hoy = 0;
        let justificaciones_pnd = 0;
        let ultimas_marcaciones = [];
        let dispositivos = [];

        // 1. Total empleados activos
        try {
            const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM empleados WHERE estado = "activo"');
            total_empleados = total;
        } catch (e) { console.error('Error total_empleados:', e.message); }
        
        // 2. Asistencias hoy
        try {
            const [[{ asistencias }]] = await pool.execute(
                'SELECT COUNT(DISTINCT empleado_id) as asistencias FROM asistencias WHERE fecha = ?',
                [hoy]
            );
            asistencias_hoy = asistencias;
        } catch (e) { console.error('Error asistencias_hoy:', e.message); }

        // 3. Tardanzas hoy
        try {
            // Buscamos en minutos_tardanza (común) o minutos_tardanza_1 (nuevo esquema)
            const [[{ tardanzas }]] = await pool.execute(
                'SELECT COUNT(*) as tardanzas FROM asistencias WHERE fecha = ? AND (estado_entrada = "Tardanza" OR minutos_tardanza > 0 OR minutos_tardanza_1 > 0)',
                [hoy]
            );
            tardanzas_hoy = tardanzas;
        } catch (e) {
            // Fallback si fallan las columnas anteriores
            try {
                const [[{ tardanzas }]] = await pool.execute(
                    'SELECT COUNT(*) as tardanzas FROM asistencias WHERE fecha = ? AND estado_entrada = "Tardanza"',
                    [hoy]
                );
                tardanzas_hoy = tardanzas;
            } catch (e2) {}
        }

        // 4. Justificaciones pendientes
        try {
            const [[{ count }]] = await pool.execute(
                'SELECT COUNT(*) as count FROM justificaciones WHERE estado = "pnd"'
            );
            justificaciones_pnd = count;
        } catch (e) { console.error('Error justificaciones:', e.message); }

        // 5. Últimas 5 marcaciones
        try {
            const [rows] = await pool.execute(`
                SELECT 
                    r.fecha_hora_marcacion as fecha_hora, 
                    e.nombres, 
                    e.apellidos,
                    r.tipo_marcacion,
                    d.nombre as dispositivo
                FROM asistencia_raw r
                JOIN empleados e ON r.empleado_id = e.id
                JOIN dispositivos d ON r.device_id = d.id
                ORDER BY r.fecha_hora_marcacion DESC
                LIMIT 15
            `);
            ultimas_marcaciones = rows;
        } catch (e) { console.error('Error ultimas_marcaciones:', e.message); }

        // 6. Estado de dispositivos
        try {
            const [rows] = await pool.execute(
                'SELECT nombre, ubicacion, estado, ultimo_evento_recibido, device_uid FROM dispositivos'
            );
            dispositivos = rows;
        } catch (e) { console.error('Error dispositivos:', e.message); }

        const ausentes_hoy = Math.max(0, total_empleados - asistencias_hoy);

        res.json({
            summary: {
                total_empleados,
                asistencias_hoy,
                tardanzas_hoy,
                ausentes_hoy,
                justificaciones_pendientes: justificaciones_pnd
            },
            recentActivity: ultimas_marcaciones,
            dispositivos: dispositivos.map(d => ({
                ...d,
                online: d.ultimo_evento_recibido && (new Date() - new Date(d.ultimo_evento_recibido) < 300000)
            })),
            stats: [
                { label: 'Personal Activo', value: total_empleados.toString(), type: 'primary', icon: 'Users' },
                { label: 'Presentes Hoy', value: asistencias_hoy.toString(), type: 'accent', icon: 'Clock' },
                { label: 'Ausentes', value: ausentes_hoy.toString(), type: 'warning', icon: 'UserMinus' },
                { label: 'Justificaciones', value: justificaciones_pnd.toString(), type: 'info', icon: 'FileText' }
            ]
        });
    } catch (error) {
        console.error('Critical Dashboard Error:', error);
        res.status(500).json({ error: 'Error interno al cargar métricas', detalle: error.message });
    }
};
