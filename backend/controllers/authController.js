const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auditService = require('../services/auditService');

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    try {
        // 1. Buscar usuario
        const [users] = await pool.execute(
            'SELECT u.*, r.nombre as rol_nombre FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.email = ? AND u.estado = "activo"',
            [email]
        );

        if (users.length === 0) {
            await auditService.logLogin(null, email, false, 'Usuario no encontrado o inactivo');
            return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
        }

        const user = users[0];

        // 2. Verificar contraseña
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            await auditService.logLogin(user.id, email, false, 'Contraseña incorrecta');
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 3. Generar JWT
        const token = jwt.sign(
            { 
                id: user.id,
                nombre: user.nombre,
                rol: user.rol_nombre,
                empleado_id: user.empleado_id
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        await auditService.logLogin(user.id, email, true, 'Login exitoso');

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol_nombre,
                empleado_id: user.empleado_id
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
