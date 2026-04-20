const pool = require('../config/db');

exports.listar = async (req, res) => {
    try {
        const [configs] = await pool.execute('SELECT * FROM configuraciones');
        res.json(configs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.actualizar = async (req, res) => {
    const { configuraciones } = req.body; // Se espera un array de {clave, valor}
    try {
        for (const config of configuraciones) {
            await pool.execute(
                'UPDATE configuraciones SET valor = ? WHERE clave = ?',
                [config.valor, config.clave]
            );
        }
        res.json({ message: 'Configuraciones actualizadas correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
