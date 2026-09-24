const pool = require('../config/db');

function formatFecha(fecha) {
    if (!fecha) return '';
    if (fecha instanceof Date) {
        // Usar UTC para evitar que zonas horarias negativas (ej. UTC-5 en Perú) resten un día
        const year = fecha.getUTCFullYear();
        const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const day = String(fecha.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return String(fecha).split('T')[0];
}

class NominaService {
    async generarNomina(periodo) {
        // periodo viene como 'YYYY-MM'
        const year = parseInt(periodo.split('-')[0]);
        const month = parseInt(periodo.split('-')[1]);
        
        const start = `${periodo}-01`;
        // Obtener el último día del mes correctamente
        const lastDay = new Date(year, month, 0).getDate();
        const end = `${periodo}-${String(lastDay).padStart(2, '0')}`;

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Proteger nóminas que ya se encuentren en estado 'pagado'
            const [nominasPagadas] = await connection.execute(
                'SELECT COUNT(*) as count FROM nominas WHERE periodo = ? AND estado = "pagado"',
                [periodo]
            );
            if (nominasPagadas[0]?.count > 0) {
                throw new Error(`La nómina del periodo ${periodo} ya tiene registros en estado 'pagado' y no puede ser recalculada.`);
            }

            // Limpiar nóminas previas en estado 'calculado' para este periodo
            await connection.execute('DELETE FROM nominas WHERE periodo = ? AND estado != "pagado"', [periodo]);

            const [empleados] = await connection.execute(
                'SELECT id, codigo_interno, nombres, apellidos, salario_base, fecha_ingreso FROM empleados WHERE estado = "activo"'
            );

            const [configs] = await connection.execute('SELECT clave, valor FROM configuraciones');
            const configMap = configs.reduce((acc, c) => ({ ...acc, [c.clave]: parseFloat(c.valor) }), {});

            const factorExtraDiurna = configMap.factor_extra_diurna || 1.25;
            const factorExtraNocturna = configMap.factor_extra_nocturna || 1.50;

            // 1.1 Obtener feriados del período para excluir del cálculo de faltas y días hábiles
            const [feriados] = await connection.execute(
                'SELECT fecha FROM feriados WHERE fecha BETWEEN ? AND ? AND activo = 1',
                [start, end]
            );
            const fechasFeriadas = feriados.map(f => formatFecha(f.fecha));

            // Determinar fecha tope de cálculo para faltas (si es el mes actual, no penalizar días futuros)
            const hoy = new Date();
            const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
            const fechaTopeStr = (hoyStr < end && hoyStr >= start) ? hoyStr : end;

            const resultados = [];

            for (const emp of empleados) {
                // 1.2 Obtener justificaciones aprobadas del empleado en el período segregadas por tipo
                const [justificaciones] = await connection.execute(
                    'SELECT fecha_referencia, tipo FROM justificaciones WHERE empleado_id = ? AND fecha_referencia BETWEEN ? AND ? AND estado = "aprobada"',
                    [emp.id, start, end]
                );
                
                const fechasTardanzaJustificada = justificaciones
                    .filter(j => j.tipo === 'tardanza' || j.tipo === 'omision_marcacion')
                    .map(j => formatFecha(j.fecha_referencia));

                const fechasFaltaJustificada = justificaciones
                    .filter(j => j.tipo === 'falta' || j.tipo === 'omision_marcacion')
                    .map(j => formatFecha(j.fecha_referencia));

                // 1.3 Obtener turnos asignados del empleado vigentes en el período
                const [turnosEmp] = await connection.execute(
                    `SELECT turno_id, fecha_inicio, fecha_fin, dia_semana 
                     FROM empleado_turno 
                     WHERE empleado_id = ? 
                       AND fecha_inicio <= ? 
                       AND (fecha_fin >= ? OR fecha_fin IS NULL)`,
                    [emp.id, end, start]
                );

                // 1.4 Obtener asistencias procesadas del empleado en el período
                const [asistencias] = await connection.execute(
                    `SELECT 
                         fecha,
                         MAX(estado) as estado,
                         SUM(COALESCE(minutos_tardanza, 0)) as total_tardanza, 
                         SUM(COALESCE(minutos_extra_diurna, 0)) as total_extras_md, 
                         SUM(COALESCE(minutos_extra_nocturna, 0)) as total_extras_mn 
                      FROM asistencias
                      WHERE empleado_id = ? AND fecha BETWEEN ? AND ?
                      GROUP BY fecha`,
                    [emp.id, start, end]
                );

                const asistenciasMap = new Map();
                for (const a of asistencias) {
                    asistenciasMap.set(formatFecha(a.fecha), a);
                }

                // 1.5 Recorrer el calendario laboral del período día a día
                let totalTardanza = 0;
                let totalExtrasMd = 0;
                let totalExtrasMn = 0;
                let faltasInjustificadas = 0;

                const fechaIngresoStr = emp.fecha_ingreso ? formatFecha(emp.fecha_ingreso) : null;
                let cur = new Date(start + 'T00:00:00Z');
                const endLimit = new Date(fechaTopeStr + 'T00:00:00Z');

                while (cur <= endLimit) {
                    const fStr = formatFecha(cur);
                    const dayOfWeek = cur.getUTCDay() + 1; // 1 = Domingo, 2 = Lunes, ..., 7 = Sábado

                    // Si el día es anterior a la fecha de ingreso, no genera falta ni asistencia
                    if (fechaIngresoStr && fStr < fechaIngresoStr) {
                        cur.setUTCDate(cur.getUTCDate() + 1);
                        continue;
                    }

                    const esFeriado = fechasFeriadas.includes(fStr);
                    const esDomingo = (dayOfWeek === 1);

                    // Determinar si era día programado de trabajo
                    let esDiaProgramado = false;
                    if (!esDomingo && !esFeriado) {
                        if (turnosEmp.length > 0) {
                            const tieneDiaEspecifico = turnosEmp.some(t => t.dia_semana !== null);
                            if (tieneDiaEspecifico) {
                                esDiaProgramado = turnosEmp.some(t => t.dia_semana === dayOfWeek);
                            } else {
                                esDiaProgramado = true; // Turno general semanal
                            }
                        } else {
                            esDiaProgramado = true; // Sin turno específico: se asume jornada hábil ordinaria
                        }
                    }

                    const asistencia = asistenciasMap.get(fStr);

                    if (asistencia) {
                        // Horas extras (no se duplican en feriados)
                        if (!esFeriado) {
                            totalExtrasMd += asistencia.total_extras_md || 0;
                            totalExtrasMn += asistencia.total_extras_mn || 0;
                        }

                        // Tardanzas: computar si no cuenta con justificación de tardanza aprobada
                        if (!fechasTardanzaJustificada.includes(fStr)) {
                            totalTardanza += asistencia.total_tardanza || 0;
                        }

                        // Si la asistencia tiene estado explícito de falta
                        if (asistencia.estado === 'falta' && esDiaProgramado && !fechasFaltaJustificada.includes(fStr)) {
                            faltasInjustificadas++;
                        }
                    } else {
                        // No hubo marcación: si correspondía laborar y no está justificado, es falta
                        if (esDiaProgramado && !fechasFaltaJustificada.includes(fStr)) {
                            faltasInjustificadas++;
                        }
                    }

                    cur.setUTCDate(cur.getUTCDate() + 1);
                }

                const sBase = parseFloat(emp.salario_base);
                
                // Cálculo de valor minuto basado en 30 días, 8 horas diarias (14,400 minutos)
                const valorMinutoBase = sBase / (30 * 8 * 60);

                // Descuento proporcional por minuto de tardanza (o configurable si se define tarifa específica)
                const valorMinutoTardanza = !isNaN(configMap.valor_minuto_tardanza) 
                    ? configMap.valor_minuto_tardanza 
                    : valorMinutoBase;

                const descTardanza = totalTardanza * valorMinutoTardanza;
                
                // Descuento diario de falta = salario_base / 30
                const descFaltas = faltasInjustificadas * (sBase / 30);
                const totalDescuentos = descTardanza + descFaltas;
                
                const pagoExtrasD = totalExtrasMd * valorMinutoBase * factorExtraDiurna;
                const pagoExtrasN = totalExtrasMn * valorMinutoBase * factorExtraNocturna;
                
                // El neto a pagar no puede ser negativo
                const totalPagar = Math.max(0, (sBase + pagoExtrasD + pagoExtrasN) - totalDescuentos);
                const totalHorasExtra = pagoExtrasD + pagoExtrasN;

                const [resNomina] = await connection.execute(
                    'INSERT INTO nominas (empleado_id, periodo, total_base, total_descuentos, total_horas_extra, total_pagar, estado) VALUES (?, ?, ?, ?, ?, ?, "calculado")',
                    [emp.id, periodo, sBase, totalDescuentos, totalHorasExtra, totalPagar]
                );

                const nominaId = resNomina.insertId;

                const detalles = [
                    [nominaId, 'Sueldo Base', sBase, 'ingreso'],
                    [nominaId, 'Horas Extra Diurnas', pagoExtrasD, 'ingreso'],
                    [nominaId, 'Horas Extra Nocturnas', pagoExtrasN, 'ingreso'],
                    [nominaId, 'Descuento por Tardanza', descTardanza, 'descuento'],
                    [nominaId, 'Descuento por Inasistencia', descFaltas, 'descuento']
                ];

                for (const d of detalles) {
                    // Solo insertar si el monto es significativo o es el sueldo base
                    if (d[2] > 0 || (d[3] === 'ingreso' && d[1] === 'Sueldo Base')) {
                        await connection.execute(
                            'INSERT INTO nomina_detalle (nomina_id, concepto, monto, tipo) VALUES (?, ?, ?, ?)',
                            d
                        );
                    }
                }

                resultados.push({
                    empleado: `${emp.nombres} ${emp.apellidos}`,
                    periodo,
                    total: totalPagar.toFixed(2),
                    tardanzaMinutos: totalTardanza,
                    descuentoTardanza: descTardanza.toFixed(2),
                    faltas: faltasInjustificadas,
                    descuentoFaltas: descFaltas.toFixed(2)
                });
            }

            await connection.commit();
            return resultados;

        } catch (error) {
            await connection.rollback();
            console.error('[Nómina] Error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = new NominaService();
