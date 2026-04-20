const pool = require('../config/db');

exports.getDepartments = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM ubigeo_peru_departments ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProvinces = async (req, res) => {
    const { departmentId } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM ubigeo_peru_provinces WHERE department_id = ? ORDER BY name ASC',
            [departmentId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDistricts = async (req, res) => {
    const { provinceId } = req.params;
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM ubigeo_peru_districts WHERE province_id = ? ORDER BY name ASC',
            [provinceId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
