const pool = require('../config/db');

exports.listar = async (req, res) => {
    try {
        const [empleados] = await pool.execute(`
            SELECT e.*, a.nombre as area_nombre, c.nombre as cargo_nombre,
                   d.name as departamento_nombre, p.name as provincia_nombre, dist.name as distrito_nombre
            FROM empleados e
            LEFT JOIN areas a ON e.area_id = a.id
            LEFT JOIN cargos c ON e.cargo_id = c.id
            LEFT JOIN ubigeo_peru_departments d ON e.ubigeo_departamento_id = d.id
            LEFT JOIN ubigeo_peru_provinces p ON e.ubigeo_provincia_id = p.id
            LEFT JOIN ubigeo_peru_districts dist ON e.ubigeo_distrito_id = dist.id
            ORDER BY e.apellidos ASC
        `);
        res.json(empleados);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crear = async (req, res) => {
    const { 
        codigo_interno, nombres, apellidos, dni, salario_base, 
        tipo_empleado, area_id, cargo_id, fecha_ingreso,
        telefono, email, direccion, fecha_nacimiento, genero,
        ubigeo_departamento_id, ubigeo_provincia_id, ubigeo_distrito_id
    } = req.body;
    try {
        const [result] = await pool.execute(`
            INSERT INTO empleados (
                codigo_interno, nombres, apellidos, dni, salario_base, 
                tipo_empleado, area_id, cargo_id, fecha_ingreso,
                telefono, email, direccion, fecha_nacimiento, genero,
                ubigeo_departamento_id, ubigeo_provincia_id, ubigeo_distrito_id
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            codigo_interno, nombres, apellidos, dni, salario_base, 
            tipo_empleado, area_id, cargo_id, fecha_ingreso,
            telefono, email, direccion, fecha_nacimiento, genero,
            ubigeo_departamento_id || null, ubigeo_provincia_id || null, ubigeo_distrito_id || null
        ]);
        
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.actualizar = async (req, res) => {
    const { id } = req.params;
    const { 
        codigo_interno, nombres, apellidos, dni, salario_base, 
        tipo_empleado, area_id, cargo_id, fecha_ingreso, estado,
        telefono, email, direccion, fecha_nacimiento, genero,
        ubigeo_departamento_id, ubigeo_provincia_id, ubigeo_distrito_id
    } = req.body;
    try {
        await pool.execute(`
            UPDATE empleados 
            SET codigo_interno = ?, nombres = ?, apellidos = ?, dni = ?, salario_base = ?, 
                tipo_empleado = ?, area_id = ?, cargo_id = ?, fecha_ingreso = ?, estado = ?,
                telefono = ?, email = ?, direccion = ?, fecha_nacimiento = ?, genero = ?,
                ubigeo_departamento_id = ?, ubigeo_provincia_id = ?, ubigeo_distrito_id = ?
            WHERE id = ?
        `, [
            codigo_interno, nombres, apellidos, dni, salario_base, 
            tipo_empleado, area_id, cargo_id, fecha_ingreso, estado,
            telefono, email, direccion, fecha_nacimiento, genero, 
            ubigeo_departamento_id || null, ubigeo_provincia_id || null, ubigeo_distrito_id || null,
            id
        ]);
        
        res.json({ message: 'Empleado actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminar = async (req, res) => {
    const { id } = req.params;
    try {
        // Podríamos hacer un delete lógico cambiando el estado, pero el usuario pidió CRUD
        await pool.execute('DELETE FROM empleados WHERE id = ?', [id]);
        res.json({ message: 'Empleado eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
