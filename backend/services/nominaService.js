const pool = require('../config/db');

class NominaService {
    async generarNomina(periodo) {
        // periodo viene como 'YYYY-MM'
        const year = parseInt(periodo.split('-')[0]);
        const month = parseInt(periodo.split('-')[1]);
        
        const start = `${periodo}-01`;
        // Obtener el último día del mes correctamente
        const lastDay = new Date(year, month, 0).getDate();
        const end = `${periodo}-${lastDay}`;

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const [empleados] = await connection.execute(
                'SELECT id, codigo_interno, nombres, apellidos, salario_base FROM empleados WHERE estado = "activo"'
            );

            const [configs] = await connection.execute('SELECT clave, valor FROM configuraciones');
            const configMap = configs.reduce((acc, c) => ({ ...acc, [c.clave]: parseFloat(c.valor) }), {});

            const valorMinutoTardanza = configMap.valor_minuto_tardanza || 0.10;
            const factorExtraDiurna = configMap.factor_extra_diurna || 1.25;
            const factorExtraNocturna = configMap.factor_extra_nocturna || 1.50;

            // 1. Limpiar nómina previa para este periodo si existe
            // El ON DELETE CASCADE en nomina_detalle se encargará de los hijos
            await connection.execute('DELETE FROM nominas WHERE periodo = ?', [periodo]);

            const resultados = [];

            for (const emp of empleados) {
                const [asistencias] = await connection.execute(
                    `SELECT 
                        SUM(COALESCE(minutos_tardanza, 0)) as total_tardanza, 
                        SUM(COALESCE(minutos_extra_diurna, 0)) as total_extras_md, 
                        SUM(COALESCE(minutos_extra_nocturna, 0)) as total_extras_mn 
                     FROM asistencias
                     WHERE empleado_id = ? AND fecha BETWEEN ? AND ?`,
                    [emp.id, start, end]
                );

                const resumen = asistencias[0] || { total_tardanza: 0, total_extras_md: 0, total_extras_mn: 0 };
                const sBase = parseFloat(emp.salario_base);
                
                const descTardanza = (resumen.total_tardanza || 0) * valorMinutoTardanza;
                
                // Cálculo de valor minuto basado en 30 días, 8 horas
                const valorMinutoBase = sBase / (30 * 8 * 60);
                const pagoExtrasD = (resumen.total_extras_md || 0) * valorMinutoBase * factorExtraDiurna;
                const pagoExtrasN = (resumen.total_extras_mn || 0) * valorMinutoBase * factorExtraNocturna;
                
                const totalPagar = (sBase + pagoExtrasD + pagoExtrasN) - descTardanza;

                const [resNomina] = await connection.execute(
                    'INSERT INTO nominas (empleado_id, periodo, total_pagar, estado) VALUES (?, ?, ?, "calculado")',
                    [emp.id, periodo, totalPagar]
                );

                const nominaId = resNomina.insertId;

                const detalles = [
                    [nominaId, 'Sueldo Base', sBase, 'ingreso'],
                    [nominaId, 'Horas Extra Diurnas', pagoExtrasD, 'ingreso'],
                    [nominaId, 'Horas Extra Nocturnas', pagoExtrasN, 'ingreso'],
                    [nominaId, 'Descuento por Tardanza', descTardanza, 'descuento']
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
                    total: totalPagar.toFixed(2)
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
