const pool = require('../config/db');

async function limpiarNominas() {
    console.log('--- Iniciando limpieza de planillas/nóminas ---');
    const connection = await pool.getConnection();
    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const [rDetalle] = await connection.query('DELETE FROM nomina_detalle');
        console.log(`- nomina_detalle eliminadas: ${rDetalle.affectedRows}`);

        const [rNominas] = await connection.query('DELETE FROM nominas');
        console.log(`- nominas eliminadas: ${rNominas.affectedRows}`);

        try { await connection.query('ALTER TABLE nomina_detalle AUTO_INCREMENT = 1'); } catch (e) {}
        try { await connection.query('ALTER TABLE nominas AUTO_INCREMENT = 1'); } catch (e) {}

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('====================================================');
        console.log('¡Planillas limpiadas exitosamente!');
        console.log('====================================================');
    } catch (error) {
        console.error('Error durante la limpieza de nóminas:', error.message);
    } finally {
        connection.release();
        process.exit(0);
    }
}

limpiarNominas();
