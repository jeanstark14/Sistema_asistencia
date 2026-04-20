const express = require('express');
const router = express.Router();
const justificacionController = require('../controllers/justificacionController');
const authMiddleware = require('../middlewares/authMiddleware');

// Validar que el usuario esté logueado
router.use(authMiddleware);

// Rutas para el empleado
router.post('/', justificacionController.crearJustificacion);
router.get('/mis-asistencias', justificacionController.misAsistenciasYFaltas);

// Rutas para el administrador/jefe
router.get('/aprobacion', justificacionController.listarParaAprobacion);
router.put('/:id/resolver', justificacionController.resolverJustificacion);

module.exports = router;
