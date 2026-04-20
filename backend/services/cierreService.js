const pool = require('../config/db');
const auditService = require('./auditService');

class CierreService {
    /**
     * Proceso de cierre diario.
     * @param {string} fecha - Formato 'YYYY-MM-DD'. Si no se pasa, usa el día anterior.
     */
    async procesarCierre(fecha = null) {
        if (!fecha) {
            const ayer = new Date();
            ayer.setDate(ayer.getDate() - 1);
            fecha = ayer.toISOString().split('T')[0];
        }

        console.log(`[Cierre] Iniciando procesamiento para fecha: ${fecha}`);

        try {
            // 1. Detectar Faltas
            // Buscamos empleados activos que no tengan registro en asistencias para esa fecha
            const [faltas] = await pool.execute(
                `SELECT e.id 
                 FROM empleados e
                 WHERE e.estado = 'activo'
                   AND e.id NOT IN (SELECT empleado_id FROM asistencias WHERE fecha = ?)
                   AND e.fecha_ingreso <= ?`,
                [fecha, fecha]
            );

            for (const f of faltas) {
                await pool.execute(
                    'INSERT IGNORE INTO asistencias (empleado_id, fecha, estado) VALUES (?, ?, "falta")',
                    [f.id, fecha]
                );
            }
            console.log(`[Cierre] Se detectaron ${faltas.length} faltas.`);

            // 2. Detectar Jornadas Inconsistentes (Entradas sin Salida)
            // Registros donde hay hora_entrada pero hora_salida es NULL al finalizar el día
            const [inconcistentes] = await pool.execute(
                `UPDATE asistencias 
                 SET estado = 'inconsistente' 
                 WHERE fecha = ? AND hora_entrada IS NOT NULL AND hora_salida IS NULL`,
                [fecha]
            );
            console.log(`[Cierre] Jornadas inconsistentes marcadas.`);

            // Registrar en auditoría
            await auditService.registrar(
                null, // Se asume disparado por sistema o sin req.user aquí
                'asistencias',
                null,
                'SYSTEM_CLOSURE',
                null,
                { fecha, faltas: faltas.length }
            );

            return {
                fecha,
                faltas: faltas.length,
                status: 'completado'
            };

        } catch (error) {
            console.error('[Cierre] Error en proceso:', error);
            throw error;
        }
    }
}

module.exports = new CierreService();
