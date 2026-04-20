const pool = require('../config/db');
const asistenciaService = require('./asistenciaService');

class NormalizacionService {
    async normalizarYProcesar() {
        try {
            const [rows] = await pool.execute(
                `SELECT id, device_id, empleado_id, fecha_hora_marcacion, tipo_marcacion, payload_json 
                 FROM asistencia_raw 
                 WHERE procesado = FALSE 
                 ORDER BY fecha_hora_marcacion ASC`
            );

            if (rows.length === 0) return [];

            const resultados = [];

            for (const row of rows) {
                try {
                    await this.procesarUnEvento(
                        row.empleado_id, 
                        row.fecha_hora_marcacion, 
                        row.tipo_marcacion, 
                        row.device_id,
                        row.id
                    );
                    
                    await pool.execute('UPDATE asistencia_raw SET procesado = TRUE WHERE id = ?', [row.id]);
                    resultados.push({ raw_id: row.id, status: 'procesado' });
                } catch (rowError) {
                    console.error(`[Normalizacion] Error procesando raw_id ${row.id}:`, rowError.message);
                    await pool.execute(
                        'UPDATE asistencia_raw SET procesado = TRUE, payload_json = JSON_SET(COALESCE(payload_json, \'{}\'), "$.error", ?) WHERE id = ?',
                        [rowError.message, row.id]
                    );
                }
            }

            if (resultados.length > 0) {
                console.log(`[Normalizacion] ${resultados.length} evento(s) procesado(s) correctamente.`);
            }
            return resultados;

        } catch (error) {
            console.error('[Normalizacion] Error crítico:', error.message);
            throw error;
        }
    }

    async procesarUnEvento(empleado_id, fecha_hora, tipo_marcacion, device_id, raw_id = null) {
        try {
            let tipoNormalizado = 'otros';
            const tipo = (tipo_marcacion || 'otros').toString().toLowerCase();
            
            if (tipo.startsWith('in') || tipo.includes('ent')) {
                tipoNormalizado = tipo.includes('2') ? 'entrada2' : 'entrada';
            } else if (tipo.startsWith('out') || tipo.includes('sal')) {
                tipoNormalizado = tipo.includes('2') ? 'salida2' : 'salida';
            }

            let fechaHoraObj = fecha_hora;
            if (!(fecha_hora instanceof Date)) {
                fechaHoraObj = new Date(fecha_hora);
            }

            const eventoNormalizado = {
                raw_id: raw_id,
                dispositivo_id: device_id,
                empleado_id: empleado_id,
                fecha_hora: fechaHoraObj,
                tipo: tipoNormalizado,
                metodo: 'biometrico',
            };

            if (raw_id) {
                await pool.execute(
                    `INSERT INTO asistencia_eventos (empleado_id, dispositivo_id, fecha_hora, tipo, metodo, raw_id) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        eventoNormalizado.empleado_id,
                        eventoNormalizado.dispositivo_id,
                        eventoNormalizado.fecha_hora,
                        eventoNormalizado.tipo,
                        eventoNormalizado.metodo,
                        eventoNormalizado.raw_id
                    ]
                );
            }

            await asistenciaService.procesarEvento(eventoNormalizado);
            
            return { success: true, tipo: tipoNormalizado };
        } catch (error) {
            console.error(`[Normalizacion] Error en procesarUnEvento:`, error.message);
            throw error;
        }
    }
}

module.exports = new NormalizacionService();
