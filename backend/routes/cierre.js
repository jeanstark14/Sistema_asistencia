const express = require('express');
const router = express.Router();
const cierreService = require('../services/cierreService');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post('/procesar', authMiddleware, roleMiddleware(['Administrador']), async (req, res) => {
    const { fecha } = req.body;
    try {
        const resultado = await cierreService.procesarCierre(fecha);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;