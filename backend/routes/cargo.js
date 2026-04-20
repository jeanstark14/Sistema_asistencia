const express = require('express');
const router = express.Router();
const cargoController = require('../controllers/cargoController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', authMiddleware, cargoController.listar);
router.post('/', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Moderador', 'moderador']), cargoController.crear);
router.put('/:id', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Moderador', 'moderador']), cargoController.actualizar);
router.delete('/:id', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin']), cargoController.eliminar);

module.exports = router;
