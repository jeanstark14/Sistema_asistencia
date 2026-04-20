const pool = require('../config/db');

exports.crearJustificacion = async (req, res) => {
    const { fecha_referencia, tipo, motivo } = req.body;
    const empleado_id = req.user.empleado_id; 

    if (!empleado_id) {
        return res.status(403).json({ error: 'Tu cuenta de usuario no está vinculada a un registro de empleado. Contacta al administrador.' });
    }

    if (!fecha_referencia || !tipo || !motivo) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Verificar si ya existe una justificación para esta fecha
        const [existente] = await pool.execute(
            'SELECT id FROM justificaciones WHERE empleado_id = ? AND fecha_referencia = ?',
            [empleado_id, fecha_referencia]
        );

        if (existente.length > 0) {
            return res.status(400).json({ error: 'Ya has enviado una justificación para esta fecha' });
        }

        const [result] = await pool.execute(
            'INSERT INTO justificaciones (empleado_id, fecha_referencia, tipo, motivo) VALUES (?, ?, ?, ?)',
            [empleado_id, fecha_referencia, tipo, motivo]
        );
        res.status(201).json({ id: result.insertId, message: 'Justificación enviada correctamente' });
    } catch (error) {
        console.error('[Justificación] Error:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar la justificación' });
    }
};

exports.misAsistenciasYFaltas = async (req, res) => {
    const empleado_id = req.user.empleado_id;

    if (!empleado_id) {
        // Si es admin pero no está asociado a empleado, simplemente retornamos vacío
        return res.json([]);
    }

    try {
        const [asistencias] = await pool.execute(
            `SELECT a.*, 
                    (SELECT j.estado FROM justificaciones j WHERE j.empleado_id = a.empleado_id AND j.fecha_referencia = a.fecha LIMIT 1) as estado_justificacion 
             FROM asistencias a 
             WHERE a.empleado_id = ? 
             ORDER BY a.fecha DESC LIMIT 30`,
            [empleado_id]
        );
        res.json(asistencias);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listarParaAprobacion = async (req, res) => {
    try {
        const [justificaciones] = await pool.execute(`
            SELECT j.*, e.nombres, e.apellidos 
            FROM justificaciones j
            JOIN empleados e ON j.empleado_id = e.id
            ORDER BY j.fecha_creacion DESC
        `);
        res.json(justificaciones);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.resolverJustificacion = async (req, res) => {
    const { id } = req.params;
    const { estado, comentario_revisor } = req.body;
    const revisado_por = req.user.id; // From admin/mod token

    try {
        await pool.execute(
            'UPDATE justificaciones SET estado = ?, comentario_revisor = ?, revisado_por = ?, fecha_revision = NOW() WHERE id = ?',
            [estado, comentario_revisor, revisado_por, id]
        );
        res.json({ message: `Justificación ${estado}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
