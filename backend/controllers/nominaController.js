const nominaService = require('../services/nominaService');
const pdfService = require('../services/pdfService');
const pool = require('../config/db');
const auditService = require('../services/auditService');

exports.generar = async (req, res) => {
    const { periodo } = req.body; // Espera '2024-03'

    if (!periodo) {
        return res.status(400).json({ error: 'El campo periodo (YYYY-MM) es obligatorio' });
    }

    try {
        const result = await nominaService.generarNomina(periodo);
        
        // Registrar en auditoría
        await auditService.registrar(
            req.user.id, 
            'nominas', 
            null, 
            'GENERATE_PAYROLL', 
            null, 
            { periodo, resultados: result.length }
        );

        res.json({
            message: 'Nómina generada exitosamente',
            data: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.descargarBoleta = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Obtener datos de la nómina, empleado y detalles
        const [nominas] = await pool.execute(
            `SELECT n.*, e.nombres, e.apellidos, e.dni, e.codigo_interno 
             FROM nominas n 
             JOIN empleados e ON n.empleado_id = e.id 
             WHERE n.id = ?`,
            [id]
        );

        if (nominas.length === 0) {
            return res.status(404).json({ error: 'Boleta de pago no encontrada' });
        }

        const data = nominas[0];

        // Seguridad: Si es Rol Empleado, solo puede ver la suya
        if (req.user.rol === 'Empleado' && req.user.id !== data.empleado_id) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta boleta' });
        }

        const [detalles] = await pool.execute(
            'SELECT concepto, monto, tipo FROM nomina_detalle WHERE nomina_id = ?',
            [id]
        );

        data.detalles = detalles;

        // 2. Generar PDF
        const doc = pdfService.generarBoleta(data);

        // 3. Configurar Headers y Enviar
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Boleta_${data.periodo}_${data.codigo_interno}.pdf`);
        
        doc.pipe(res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.listarRecientes = async (req, res) => {
    try {
        const { periodo } = req.query;
        let query = `
            SELECT n.*, e.nombres, e.apellidos, e.dni, e.codigo_interno 
            FROM nominas n 
            JOIN empleados e ON n.empleado_id = e.id
        `;
        const params = [];

        if (periodo) {
            query += ' WHERE n.periodo = ?';
            params.push(periodo);
        }

        query += ' ORDER BY n.created_at DESC LIMIT 100';

        const [nominas] = await pool.execute(query, params);
        res.json(nominas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
