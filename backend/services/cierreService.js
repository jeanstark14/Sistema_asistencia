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
            const fechaObj = new Date(fecha + 'T00:00:00Z');
            const dayOfWeek = fechaObj.getUTCDay() + 1; // 1 = Domingo, 2 = Lunes, ..., 7 = Sábado

            // 1. Validar si la fecha es Domingo (descanso obligatorio estándar)
            if (dayOfWeek === 1) {
                console.log(`[Cierre] Fecha ${fecha} es Domingo. No se generan faltas automáticas.`);
                return { fecha, faltas: 0, status: 'omitido_domingo' };
            }

            // 2. Validar si la fecha es feriado oficial activo
            const [feriados] = await pool.execute(
                'SELECT id, descripcion FROM feriados WHERE fecha = ? AND activo = 1',
                [fecha]
            );
            if (feriados.length > 0) {
                console.log(`[Cierre] Fecha ${fecha} es Feriado (${feriados[0].descripcion}). No se generan faltas automáticas.`);
                return { fecha, faltas: 0, status: 'omitido_feriado' };
            }

            // 3. Obtener turnos vigentes para esta fecha
            const [turnos] = await pool.execute(
                `SELECT empleado_id, dia_semana 
                 FROM empleado_turno 
                 WHERE fecha_inicio <= ? AND (fecha_fin >= ? OR fecha_fin IS NULL)`,
                [fecha, fecha]
            );

            // 4. Detectar empleados activos que no marcaron asistencia
            const [candidatosFalta] = await pool.execute(
                `SELECT e.id 
                 FROM empleados e
                 WHERE e.estado = 'activo'
                   AND e.id NOT IN (SELECT empleado_id FROM asistencias WHERE fecha = ?)
                   AND e.fecha_ingreso <= ?`,
                [fecha, fecha]
            );

            let faltasRegistradas = 0;

            for (const f of candidatosFalta) {
                const turnosEmp = turnos.filter(t => t.empleado_id === f.id);
                
                let teniaTurnoHoy = false;
                if (turnosEmp.length > 0) {
                    const tieneDiaEspecifico = turnosEmp.some(t => t.dia_semana !== null);
                    if (tieneDiaEspecifico) {
                        teniaTurnoHoy = turnosEmp.some(t => t.dia_semana === dayOfWeek);
                    } else {
                        teniaTurnoHoy = true; // Turno general
                    }
                } else {
                    teniaTurnoHoy = true; // Sin turno específico: se asume jornada hábil
                }

                if (!teniaTurnoHoy) {
                    continue; // Día libre según su programación
                }

                // Verificar si ya tiene justificación aprobada
                const [justAprobada] = await pool.execute(
                    'SELECT id FROM justificaciones WHERE empleado_id = ? AND fecha_referencia = ? AND estado = "aprobada"',
                    [f.id, fecha]
                );
                if (justAprobada.length > 0) {
                    continue; // Ausencia justificada previamente
                }

                await pool.execute(
                    'INSERT IGNORE INTO asistencias (empleado_id, fecha, estado) VALUES (?, ?, "falta")',
                    [f.id, fecha]
                );
                faltasRegistradas++;
            }
            console.log(`[Cierre] Se detectaron ${faltasRegistradas} faltas reales para fecha ${fecha}.`);

            // 5. Detectar Jornadas Inconsistentes (Entradas sin Salida)
            await pool.execute(
                `UPDATE asistencias 
                 SET estado = 'inconsistente' 
                 WHERE fecha = ? AND hora_entrada IS NOT NULL AND hora_salida IS NULL`,
                [fecha]
            );
            console.log(`[Cierre] Jornadas inconsistentes actualizadas.`);

            // Registrar en auditoría
            await auditService.registrar(
                null,
                'asistencias',
                null,
                'SYSTEM_CLOSURE',
                null,
                { fecha, faltas: faltasRegistradas }
            );

            return {
                fecha,
                faltas: faltasRegistradas,
                status: 'completado'
            };

        } catch (error) {
            console.error('[Cierre] Error en proceso:', error);
            throw error;
        }
    }
}

module.exports = new CierreService();
