const express = require('express');
const router = express.Router();
const dniController = require('../controllers/dniController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * GET /api/dni/:numero
 * Consulta de datos de DNI con middleware de autenticación
 */
router.get('/:numero', authMiddleware, dniController.getDniData);

module.exports = router;
