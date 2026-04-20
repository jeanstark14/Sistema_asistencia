const pool = require('../config/db');

exports.listar = async (req, res) => {
    try {
        const [turnos] = await pool.execute('SELECT * FROM turnos WHERE estado = "activo" ORDER BY id DESC');
        res.json(turnos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crear = async (req, res) => {
    const { nombre_turno, hora_inicio, hora_fin, horas_refrigerio } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO turnos (nombre_turno, hora_inicio, hora_fin, horas_refrigerio, estado) VALUES (?, ?, ?, ?, "activo")',
            [nombre_turno, hora_inicio, hora_fin, horas_refrigerio]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.actualizar = async (req, res) => {
    const { id } = req.params;
    const { nombre_turno, hora_inicio, hora_fin, horas_refrigerio, estado } = req.body;
    try {
        await pool.execute(
            'UPDATE turnos SET nombre_turno = ?, hora_inicio = ?, hora_fin = ?, horas_refrigerio = ?, estado = ? WHERE id = ?',
            [nombre_turno, hora_inicio, hora_fin, horas_refrigerio, estado || 'activo', id]
        );
        res.json({ message: 'Turno actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminar = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('UPDATE turnos SET estado = "inactivo" WHERE id = ?', [id]);
        res.json({ message: 'Turno eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.asignarAEmpleado = async (req, res) => {
    const { empleado_id, turno_id, fecha_inicio, hora_inicio, hora_fin, horas_refrigerio, dias_semana } = req.body;
    try {
        if (dias_semana && Array.isArray(dias_semana) && dias_semana.length > 0) {
            // Filtrar domingo (1) para evitar inconsistencias
            const dias_permitidos = dias_semana.filter(dia => dia !== 1);
            
            if (dias_permitidos.length === 0) {
                return res.status(400).json({ error: 'No se puede asignar turnos en días no laborables (Domingo).' });
            }

            // Insertar múltiples registros para los días seleccionados
            const values = dias_permitidos.map(dia => [
                empleado_id, 
                turno_id, 
                fecha_inicio, 
                hora_inicio || null, 
                hora_fin || null, 
                horas_refrigerio || null, 
                dia
            ]);
            
            await pool.query(
                'INSERT INTO empleado_turno (empleado_id, turno_id, fecha_inicio, hora_inicio, hora_fin, horas_refrigerio, dia_semana) VALUES ?',
                [values]
            );
        } else {
            // Insertar un solo registro para todos los días (dia_semana = NULL)
            await pool.execute(
                `INSERT INTO empleado_turno (empleado_id, turno_id, fecha_inicio, hora_inicio, hora_fin, horas_refrigerio, dia_semana) 
                 VALUES (?, ?, ?, ?, ?, ?, NULL)`,
                [empleado_id, turno_id, fecha_inicio, hora_inicio || null, hora_fin || null, horas_refrigerio || null]
            );
        }
        res.json({ message: 'Turno asignado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listarAsignaciones = async (req, res) => {
    try {
        const [asignaciones] = await pool.execute(`
            SELECT 
                et.id, 
                et.empleado_id, 
                et.turno_id, 
                et.fecha_inicio,
                et.dia_semana,
                et.hora_inicio as custom_inicio,
                et.hora_fin as custom_fin,
                et.horas_refrigerio as custom_refrigerio,
                e.nombres, 
                e.apellidos, 
                t.nombre_turno,
                t.hora_inicio as default_inicio,
                t.hora_fin as default_fin,
                t.horas_refrigerio as default_refrigerio
            FROM empleado_turno et
            JOIN empleados e ON et.empleado_id = e.id
            JOIN turnos t ON et.turno_id = t.id
            ORDER BY e.apellidos, e.nombres, 
                CASE WHEN et.dia_semana IS NULL THEN 8 ELSE et.dia_semana END
        `);
        res.json(asignaciones);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminarAsignacion = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM empleado_turno WHERE id = ?', [id]);
        res.json({ message: 'Asignación eliminada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
