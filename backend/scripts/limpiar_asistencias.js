const pool = require('../config/db');

async function limpiarTodo() {
    console.log('--- Iniciando limpieza de asistencias y marcaciones ---');
    const connection = await pool.getConnection();
    try {
        const [tables] = await connection.query('SHOW TABLES');
        const dbName = Object.keys(tables[0])[0];
        const existingTables = tables.map(t => Object.values(t)[0]);
        console.log('Tablas detectadas en la base de datos:', existingTables);

        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tablasALimpiar = [
            'asistencias',
            'asistencia_eventos',
            'asistencia_raw',
            'justificaciones',
            'ausencias'
        ];

        for (const tabla of tablasALimpiar) {
            if (existingTables.includes(tabla)) {
                console.log(`Borrando tabla: ${tabla}...`);
                const [res] = await connection.query(`DELETE FROM \`${tabla}\``);
                console.log(`  -> ${res.affectedRows} registros eliminados de ${tabla}.`);
                try {
                    await connection.query(`ALTER TABLE \`${tabla}\` AUTO_INCREMENT = 1`);
                } catch (e) {}
            } else {
                console.log(`Tabla omitida (no existe): ${tabla}`);
            }
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('====================================================');
        console.log('¡Limpieza completada exitosamente!');
        console.log('====================================================');
    } catch (error) {
        console.error('Error durante la limpieza:', error.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

limpiarTodo();
