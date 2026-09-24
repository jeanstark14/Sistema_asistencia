const express = require('express');
const router = express.Router();
const nominaController = require('../controllers/nominaController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Solo Admin y Gerente pueden generar nómina masiva
router.post('/generar', authMiddleware, roleMiddleware(['Administrador', 'Gerente']), nominaController.generar);

// Admin, Gerente, Jefe pueden descargar cualquier boleta
// Empleado podrá descargar la suya (validado en el controller)
router.get('/boleta/:id', authMiddleware, roleMiddleware(['Administrador', 'Gerente', 'Jefe', 'Empleado']), nominaController.descargarBoleta);

// Listar nóminas recientes
router.get('/recente', authMiddleware, roleMiddleware(['Administrador', 'Gerente', 'Jefe']), nominaController.listarRecientes);

module.exports = router;
