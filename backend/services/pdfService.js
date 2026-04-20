const PDFDocument = require('pdfkit');

class PDFService {
    /**
     * Genera un stream de PDF para una boleta de pago.
     * @param {Object} data - Datos de la nómina y el empleado.
     * @returns {PDFDocument}
     */
    generarBoleta(data) {
        const doc = new PDFDocument({ margin: 50 });

        // --- ENCABEZADO ---
        doc.fontSize(20).text('SISTEMA DE ASISTENCIA Y NÓMINA', { align: 'center' });
        doc.fontSize(12).text('BOLETA DE PAGO DE REMUNERACIONES', { align: 'center' });
        doc.moveDown();
        doc.rect(50, 100, 500, 1).fill('#000');
        doc.moveDown();

        // --- DATOS EMPLEADO ---
        doc.fontSize(10).font('Helvetica-Bold').text(`EMPLEADO: `, { continued: true }).font('Helvetica').text(`${data.nombres} ${data.apellidos}`);
        doc.font('Helvetica-Bold').text(`DNI: `, { continued: true }).font('Helvetica').text(data.dni);
        doc.font('Helvetica-Bold').text(`CÓDIGO: `, { continued: true }).font('Helvetica').text(data.codigo_interno);
        doc.font('Helvetica-Bold').text(`PERIODO: `, { continued: true }).font('Helvetica').text(data.periodo);
        doc.moveDown();

        // --- TABLA DE CONCEPTOS ---
        const startY = 180;
        doc.font('Helvetica-Bold');
        doc.text('CONCEPTO', 60, startY);
        doc.text('TIPO', 300, startY);
        doc.text('MONTO', 480, startY);
        doc.rect(50, startY + 15, 500, 1).fill('#000');
        
        let currentY = startY + 25;
        doc.font('Helvetica');

        data.detalles.forEach(d => {
            doc.text(d.concepto, 60, currentY);
            doc.text(d.tipo.toUpperCase(), 300, currentY);
            doc.text(`${parseFloat(d.monto).toFixed(2)}`, 480, currentY);
            currentY += 20;
        });

        doc.rect(50, currentY + 5, 500, 1).fill('#000');
        currentY += 15;

        // --- RESUMEN NETO ---
        doc.font('Helvetica-Bold');
        doc.text('TOTAL A PAGAR (NETO):', 300, currentY);
        doc.fontSize(12).text(`S/ ${parseFloat(data.total_pagar).toFixed(2)}`, 480, currentY);
        
        doc.moveDown(4);
        doc.rect(200, doc.y, 200, 1).fill('#000');
        doc.fontSize(10).text('FIRMA DEL EMPLEADOR', { align: 'center' });

        doc.end();
        return doc;
    }
}

module.exports = new PDFService();
