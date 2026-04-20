const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.listar = async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT u.id, u.nombre, u.email, u.rol_id, u.empleado_id, u.estado, u.created_at,
                   r.nombre as rol_nombre,
                   e.nombres as empleado_nombres, e.apellidos as empleado_apellidos
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            LEFT JOIN empleados e ON u.empleado_id = e.id
            ORDER BY u.created_at DESC
        `);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.crear = async (req, res) => {
    const { nombre, email, password, rol_id, empleado_id } = req.body;

    if (!nombre || !email || !password || !rol_id) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Verificar si el email ya existe
        const [existeEmail] = await pool.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existeEmail.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        // Verificar si el empleado ya tiene un usuario vinculado
        if (empleado_id) {
            const [existeEmpleado] = await pool.execute('SELECT id FROM usuarios WHERE empleado_id = ?', [empleado_id]);
            if (existeEmpleado.length > 0) {
                return res.status(400).json({ error: 'Este empleado ya tiene una cuenta de usuario vinculada' });
            }
        }

        const password_hash = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO usuarios (nombre, email, password_hash, rol_id, empleado_id, estado) VALUES (?, ?, ?, ?, ?, "activo")',
            [nombre, email, password_hash, rol_id, empleado_id || null]
        );

        res.status(201).json({ id: result.insertId, message: 'Usuario creado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.eliminar = async (req, res) => {
    const { id } = req.params;
    try {
        // No permitir autoliminar
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
        }

        await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listarRoles = async (req, res) => {
    try {
        const [roles] = await pool.execute('SELECT * FROM roles');
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
