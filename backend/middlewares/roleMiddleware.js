/**
 * Middleware para restringir acceso según el rol del usuario.
 * @param {Array} rolesAutorizados - Lista de nombres de roles que pueden acceder.
 */
module.exports = (rolesAutorizados) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const { rol } = req.user;
        const rolNormalizado = rol?.toLowerCase();
        const rolesAutorizadosNormalizados = rolesAutorizados.map(r => r.toLowerCase());

        if (!rolesAutorizadosNormalizados.includes(rolNormalizado)) {
            return res.status(403).json({ 
                error: `Acceso denegado. Se requiere uno de estos roles: ${rolesAutorizados.join(', ')}. Tu rol actual es: ${rol}` 
            });
        }

        next();
    };
};
