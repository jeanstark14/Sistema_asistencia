const pool = require('../config/db');

exports.listar = async (req, res) => {
    try {
        const [areas] = await pool.execute('SELECT * FROM areas ORDER BY nombre ASC');
        res.json(areas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crear = async (req, res) => {
    const { nombre, descripcion } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO areas (nombre, descripcion) VALUES (?, ?)',
            [nombre, descripcion]
        );
        res.status(201).json({ id: result.insertId, nombre, descripcion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.actualizar = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    try {
        await pool.execute(
            'UPDATE areas SET nombre = ?, descripcion = ? WHERE id = ?',
            [nombre, descripcion, id]
        );
        res.json({ message: 'Área actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminar = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM areas WHERE id = ?', [id]);
        res.json({ message: 'Área eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
