const express = require('express');
const router = express.Router();
const kioskController = require('../controllers/kioskController');
const authMiddleware = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

// Rate limiter para el kiosco — más permisivo que el biométrico
const kioskLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    message: { error: 'Demasiadas peticiones. Por favor, espera un momento.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Rutas públicas (sin JWT) — acceso desde kiosco de red local ──
router.get('/empleados',               kioskController.obtenerEmpleados);
router.get('/asistencia/:empleadoId',  kioskController.obtenerAsistencia);
router.post('/verificar-pin',  kioskLimiter, kioskController.verificarPin);
router.post('/marcar',         kioskLimiter, kioskController.registrarMarcacion);

// ── Rutas admin (requieren JWT) — gestión de PINs desde panel admin ──
router.put('/pin/:empleadoId',    authMiddleware, kioskController.actualizarPin);
router.delete('/pin/:empleadoId', authMiddleware, kioskController.eliminarPin);

module.exports = router;
