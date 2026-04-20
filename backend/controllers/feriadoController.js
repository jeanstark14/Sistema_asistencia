const pool = require('../config/db');

exports.listar = async (req, res) => {
    try {
        const [feriados] = await pool.execute('SELECT * FROM feriados ORDER BY fecha ASC');
        res.json(feriados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crear = async (req, res) => {
    const { fecha, descripcion } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO feriados (fecha, descripcion) VALUES (?, ?)',
            [fecha, descripcion]
        );
        res.status(201).json({ id: result.insertId, fecha, descripcion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminar = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM feriados WHERE id = ?', [id]);
        res.json({ message: 'Feriado eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
