const pool = require('../config/db');

class AuditService {
    /**
     * Registra una acción en la bitácora de auditoría.
     * @param {number|null} usuarioId - ID del usuario que realiza la acción.
     * @param {string} tabla - Tabla afectada.
     * @param {number|null} registroId - ID del registro afectado.
     * @param {string} accion - INSERT, UPDATE, DELETE o LOGIN.
     * @param {object|null} valorAnterior - Datos previos (para UPDATE/DELETE).
     * @param {object|null} valorNuevo - Nuevos datos.
     */
    async registrar(usuarioId, tabla, registroId, accion, valorAnterior = null, valorNuevo = null) {
        try {
            await pool.execute(
                `INSERT INTO auditoria (usuario_id, tabla_afectada, registro_id, accion, valor_anterior, valor_nuevo) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    usuarioId || 0, // 0 para acciones de sistema o fallos de login
                    tabla,
                    registroId || 0,
                    accion,
                    valorAnterior ? JSON.stringify(valorAnterior) : null,
                    valorNuevo ? JSON.stringify(valorNuevo) : null
                ]
            );
        } catch (error) {
            console.error('[Auditoría] Error al registrar:', error.message);
        }
    }

    /**
     * Atajo para registrar inicios de sesión.
     */
    async logLogin(usuarioId, email, exito, mensaje) {
        await this.registrar(
            usuarioId, 
            'usuarios', 
            usuarioId, 
            exito ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE', 
            null, 
            { email, mensaje }
        );
    }
}

module.exports = new AuditService();
