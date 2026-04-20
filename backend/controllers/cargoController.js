const pool = require('../config/db');

exports.listar = async (req, res) => {
    try {
        const [cargos] = await pool.execute('SELECT * FROM cargos ORDER BY nombre ASC');
        res.json(cargos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crear = async (req, res) => {
    const { nombre, descripcion, salario_sugerido } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO cargos (nombre, descripcion, salario_sugerido) VALUES (?, ?, ?)',
            [nombre, descripcion, salario_sugerido || 0]
        );
        res.status(201).json({ id: result.insertId, nombre, descripcion, salario_sugerido: salario_sugerido || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.actualizar = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, salario_sugerido } = req.body;
    try {
        await pool.execute(
            'UPDATE cargos SET nombre = ?, descripcion = ?, salario_sugerido = ? WHERE id = ?',
            [nombre, descripcion, salario_sugerido, id]
        );
        res.json({ message: 'Cargo actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminar = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM cargos WHERE id = ?', [id]);
        res.json({ message: 'Cargo eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
