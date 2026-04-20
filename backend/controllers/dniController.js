const axios = require('axios');

/**
 * Consulta datos de DNI usando apisperu.com
 * Endpoint: https://dniruc.apisperu.com/api/v1/dni/:dni?token=:token
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

    try {
        // Determinamos el endpoint basado en el tipo (default dni)
        const endpoint = (tipo === 'ce') ? 'ce' : 'dni';
        const url = `https://dniruc.apisperu.com/api/v1/${endpoint}/${numero}?token=${token}`;
        
        console.log(`[Lookup] Consultando ${endpoint.toUpperCase()}: ${numero}`);
        const response = await axios.get(url);

        const result = response.data;
        const finalData = result.data || result;

        if (finalData && (finalData.nombres || finalData.nombre_completo)) {
            return res.json({
                success: true,
                nombres: finalData.nombres || '',
                apellidoPaterno: finalData.apellidoPaterno || '',
                apellidoMaterno: finalData.apellidoMaterno || '',
                nombreCompleto: finalData.nombre_completo || '',
                tipo: endpoint
            });
        } else {
            return res.status(404).json({ 
                success: false, 
                message: `No se encontró información para este ${endpoint.toUpperCase()}.` 
            });
        }
    } catch (error) {
        console.error('[Lookup] Error:', error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al conectar con el servicio de identidad.' 
        });
    }
};
