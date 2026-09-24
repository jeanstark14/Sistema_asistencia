const axios = require('axios');

/**
 * Consulta datos de DNI usando apiperu.dev
 * Endpoint: https://apiperu.dev/api/dni
 */
exports.getDniData = async (req, res) => {
    const { numero } = req.params;
    const { tipo } = req.query; // 'dni' o 'ce'
    const token = process.env.DNI_API_TOKEN;

    if (!numero) {
        return res.status(400).json({ success: false, message: 'Número de documento requerido.' });
    }

    if (!token) {
        console.error('[Documento] Error: Token de API no configurado.');
        return res.status(500).json({ success: false, message: 'Error de configuración en el servidor.' });
    }

    if (tipo === 'ce') {
        return res.status(400).json({
            success: false,
            message: 'La consulta de Carné de Extranjería (CE) no está soportada por el proveedor actual (apiperu.dev).'
        });
    }

    try {
        console.log(`[Lookup] Consultando DNI: ${numero} en apiperu.dev`);
        const response = await axios.post(
            'https://apiperu.dev/api/dni',
            { dni: numero },
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const result = response.data;
        const finalData = result.data || result;

        if (result.success && finalData && (finalData.nombres || finalData.nombre_completo)) {
            return res.json({
                success: true,
                nombres: finalData.nombres || '',
                apellidoPaterno: finalData.apellido_paterno || finalData.apellidoPaterno || '',
                apellidoMaterno: finalData.apellido_materno || finalData.apellidoMaterno || '',
                nombreCompleto: finalData.nombre_completo || finalData.nombreCompleto || '',
                tipo: 'dni'
            });
        } else {
            const errorMsg = result.message || 'No se encontró información para este DNI.';
            return res.status(404).json({ 
                success: false, 
                message: errorMsg
            });
        }
    } catch (error) {
        console.error('[Lookup] Error:', error.message);
        if (error.response && error.response.data && error.response.data.message) {
            return res.status(error.response.status || 500).json({
                success: false,
                message: error.response.data.message
            });
        }
        return res.status(500).json({ 
            success: false, 
            message: 'Error al conectar con el servicio de identidad.' 
        });
    }
};
