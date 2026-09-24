const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function formatFechaLocal(fecha) {
    if (!fecha) return 'N/A';
    if (fecha instanceof Date) {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
    }
    return String(fecha).split('T')[0];
}

class PDFService {
    /**
     * Genera un stream de PDF para una boleta de pago.
     * @param {Object} data - Datos de la nómina y el empleado.
     * @returns {PDFDocument}
     */
    generarBoleta(data) {
        const doc = new PDFDocument({ margin: 40 });

        // --- COLORES ---
        const colorPrimary = '#1E3A8A'; // Azul corporativo
        const colorSecondary = '#475569'; // Slate
        const colorGrayLight = '#F8FAFC'; // Fondo gris claro
        const colorBorder = '#E2E8F0'; // Borde
        const colorText = '#0F172A'; // Texto oscuro
        const colorTextWhite = '#FFFFFF';

        // --- ENCABEZADO: LOGO Y DATOS DE LA EMPRESA ---
        const logoPath = path.join(__dirname, '../public/logo_2.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 40, { width: 70 });
        } else {
            // Fallback vectorial: un escudo corporativo circular
            doc.circle(75, 75, 30).fill(colorPrimary);
            doc.fillColor(colorTextWhite).fontSize(22).font('Helvetica-Bold').text('S', 67, 60);
        }

        // Datos de la empresa (alineados a la derecha del logo)
        doc.fillColor(colorText);
        doc.fontSize(14).font('Helvetica-Bold').text('TECNOLOGíA INFORMATICA Y DESARROLLO (TID)', 130, 40);
        doc.fontSize(9).font('Helvetica-Bold').text('RUC: ', { continued: true }).font('Helvetica').text('10199208841');
        doc.font('Helvetica-Bold').text('Dirección: ', { continued: true }).font('Helvetica').text('Jr. Ayacucho N°697 - Oficina 206, Lima');
        doc.font('Helvetica-Bold').text('Actividad: ', { continued: true }).font('Helvetica').text('Servicios de Tecnología y Gestión Humana');

        // Línea divisora
        doc.moveTo(40, 110).lineTo(570, 110).strokeColor(colorBorder).stroke();

        // --- TÍTULO DE LA BOLETA ---
        doc.fillColor(colorPrimary).fontSize(14).font('Helvetica-Bold').text('BOLETA DE PAGO DE REMUNERACIONES', 40, 120, { align: 'center' });
        doc.fillColor(colorSecondary).fontSize(10).font('Helvetica-Bold').text(`PERIODO: ${data.periodo}`, 40, 138, { align: 'center' });

        // --- PANEL DE INFORMACIÓN DEL EMPLEADO ---
        doc.roundedRect(40, 155, 530, 80, 6).fill(colorGrayLight);
        doc.strokeColor(colorBorder).roundedRect(40, 155, 530, 80, 6).stroke();

        // Etiquetas y Valores en 3 columnas
        doc.fillColor(colorText).fontSize(8.5);

        // Columna 1
        let col1X = 55;
        doc.font('Helvetica-Bold').text('Cód. Empleado:', col1X, 165);
        doc.font('Helvetica').text(data.codigo_interno || 'N/A', col1X, 177);
        doc.font('Helvetica-Bold').text('Tipo Colaborador:', col1X, 195);
        doc.font('Helvetica').text(data.tipo_empleado ? data.tipo_empleado.toUpperCase() : 'EMPLEADO', col1X, 207);

        // Columna 2
        let col2X = 210;
        doc.font('Helvetica-Bold').text('Nombres y Apellidos:', col2X, 165);
        doc.font('Helvetica').text(`${data.nombres} ${data.apellidos}`, col2X, 177);
        doc.font('Helvetica-Bold').text('Documento Identidad (DNI):', col2X, 195);
        doc.font('Helvetica').text(data.dni || 'N/A', col2X, 207);

        // Columna 3
        let col3X = 410;
        doc.font('Helvetica-Bold').text('Área:', col3X, 165);
        doc.font('Helvetica').text(data.area_nombre || 'No asignada', col3X, 177);
        doc.font('Helvetica-Bold').text('Cargo / Puesto:', col3X, 195);
        doc.font('Helvetica').text(data.cargo_nombre || 'No asignado', col3X, 207);
        doc.font('Helvetica-Bold').text('Fecha Ingreso:', col3X + 90, 195);
        doc.font('Helvetica').text(formatFechaLocal(data.fecha_ingreso), col3X + 90, 207);

        // --- TABLA DE CONCEPTOS (BILATERAL) ---
        const tableY = 250;
        const colWidth = 255;

        // Fondos de cabecera de tablas
        doc.rect(40, tableY, colWidth, 18).fill(colorPrimary);
        doc.rect(315, tableY, colWidth, 18).fill(colorSecondary);

        // Textos cabecera
        doc.fillColor(colorTextWhite).font('Helvetica-Bold').fontSize(9);
        doc.text('INGRESOS / HABERES', 50, tableY + 5);
        doc.text('MONTO', 230, tableY + 5, { width: 55, align: 'right' });

        doc.text('DESCUENTOS / DEDUCCIONES', 325, tableY + 5);
        doc.text('MONTO', 505, tableY + 5, { width: 55, align: 'right' });

        // Separar conceptos
        const ingresos = data.detalles.filter(d => d.tipo === 'ingreso');
        const descuentos = data.detalles.filter(d => d.tipo === 'descuento');

        let yIng = tableY + 28;
        let yDesc = tableY + 28;

        doc.fillColor(colorText).fontSize(8.5).font('Helvetica');

        let sumIngresos = 0;
        let sumDescuentos = 0;

        // Renderizar ingresos
        ingresos.forEach(d => {
            doc.text(d.concepto, 50, yIng);
            const montoStr = parseFloat(d.monto).toFixed(2);
            doc.text(`S/ ${montoStr}`, 200, yIng, { width: 85, align: 'right' });
            sumIngresos += parseFloat(d.monto);
            yIng += 18;
        });

        // Renderizar descuentos
        descuentos.forEach(d => {
            doc.text(d.concepto, 325, yDesc);
            const montoStr = parseFloat(d.monto).toFixed(2);
            doc.text(`S/ ${montoStr}`, 475, yDesc, { width: 85, align: 'right' });
            sumDescuentos += parseFloat(d.monto);
            yDesc += 18;
        });

        // Asegurar altura mínima de la tabla
        const minTableEnd = tableY + 120;
        const currentTableEnd = Math.max(yIng, yDesc, minTableEnd);

        // Borde exterior e interior de la tabla
        doc.strokeColor(colorBorder);
        doc.rect(40, tableY, 530, currentTableEnd - tableY).stroke();
        doc.moveTo(307, tableY).lineTo(307, currentTableEnd).stroke(); // Línea central divisora

        // --- SUB-TOTALES ---
        doc.fontSize(8.5).font('Helvetica-Bold');
        doc.text('TOTAL INGRESOS:', 50, currentTableEnd + 8);
        doc.text(`S/ ${sumIngresos.toFixed(2)}`, 200, currentTableEnd + 8, { width: 85, align: 'right' });

        doc.text('TOTAL DESCUENTOS:', 325, currentTableEnd + 8);
        doc.text(`S/ ${sumDescuentos.toFixed(2)}`, 475, currentTableEnd + 8, { width: 85, align: 'right' });

        // Línea divisora inferior
        doc.moveTo(40, currentTableEnd + 22).lineTo(570, currentTableEnd + 22).strokeColor(colorBorder).stroke();

        // --- NETO A PAGAR ---
        const netoY = currentTableEnd + 30;
        doc.roundedRect(40, netoY, 530, 36, 4).fill(colorPrimary);

        doc.fillColor(colorTextWhite).fontSize(11).font('Helvetica-Bold');
        doc.text('NETO A PAGAR (REMUNERACIÓN NETA):', 55, netoY + 13);
        doc.fontSize(14).text(`S/ ${parseFloat(data.total_pagar).toFixed(2)}`, 380, netoY + 10, { width: 180, align: 'right' });

        // --- SECCIÓN DE FIRMAS ---
        const firmaY = netoY + 110;

        doc.strokeColor(colorSecondary).moveTo(70, firmaY).lineTo(230, firmaY).stroke();
        doc.strokeColor(colorSecondary).moveTo(380, firmaY).lineTo(540, firmaY).stroke();

        doc.fillColor(colorText).fontSize(8.5).font('Helvetica-Bold');
        doc.text('FIRMA DEL EMPLEADOR', 70, firmaY + 8, { width: 160, align: 'center' });
        doc.text('FIRMA DEL TRABAJADOR', 380, firmaY + 8, { width: 160, align: 'center' });

        doc.font('Helvetica').fontSize(7.5).fillColor(colorSecondary);
        doc.text('Declaro haber recibido el importe de la presente boleta y conforme con los conceptos liquidados.', 340, firmaY + 22, { width: 240, align: 'center' });

        doc.end();
        return doc;
    }
}

module.exports = new PDFService();
