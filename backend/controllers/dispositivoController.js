const pool = require('../config/db');

exports.listar = async (req, res) => {
    try {
        const [dispositivos] = await pool.execute('SELECT * FROM dispositivos ORDER BY nombre ASC');
        res.json(dispositivos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crear = async (req, res) => {
    const { device_uid, nombre, ubicacion, ip_local } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO dispositivos (device_uid, nombre, ubicacion, ip_local) VALUES (?, ?, ?, ?)',
            [device_uid, nombre, ubicacion, ip_local]
        );
        res.status(201).json({ id: result.insertId, device_uid, nombre, ubicacion, ip_local });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.actualizar = async (req, res) => {
    const { id } = req.params;
    const { nombre, ubicacion, ip_local, estado } = req.body;
    try {
        await pool.execute(
            'UPDATE dispositivos SET nombre = ?, ubicacion = ?, ip_local = ?, estado = ? WHERE id = ?',
            [nombre, ubicacion, ip_local, estado, id]
        );
        res.json({ message: 'Dispositivo actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminar = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM dispositivos WHERE id = ?', [id]);
        res.json({ message: 'Dispositivo eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
