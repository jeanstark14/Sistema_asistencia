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
        // 1. Verificar si hay nóminas pendientes de pago
        const [nominas] = await pool.execute(
            'SELECT COUNT(*) as count FROM nominas WHERE empleado_id = ? AND estado = "calculado"',
            [id]
        );
        
        if (nominas[0].count > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar empleado con nóminas pendientes de pago. Procese las nóminas primero.' 
            });
        }

        // 2. Verificar si hay asistencias del mes actual sin procesar
        const hoy = new Date();
        const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
        const inicioMes = `${mesActual}-01`;
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const [asistenciasPendientes] = await pool.execute(
            'SELECT COUNT(*) as count FROM asistencias WHERE empleado_id = ? AND fecha BETWEEN ? AND ? AND estado NOT IN ("procesado", "falta", "justificado")',
            [id, inicioMes, finMes]
        );
        
        if (asistenciasPendientes[0].count > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar empleado con asistencias pendientes de procesar en el mes actual.' 
            });
        }

        // 3. Hacer soft delete (desactivar, no eliminar físicamente)
        await pool.execute(
            'UPDATE empleados SET estado = "inactivo", deleted_at = NOW() WHERE id = ?',
            [id]
        );
        
        res.json({ message: 'Empleado desactivado correctamente. Ya no podrá marcar asistencia ni generar nóminas.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
