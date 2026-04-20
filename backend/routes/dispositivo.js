const express = require('express');
const router = express.Router();
const dispositivoController = require('../controllers/dispositivoController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', authMiddleware, dispositivoController.listar);
router.post('/', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Moderador', 'moderador']), dispositivoController.crear);
router.put('/:id', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Moderador', 'moderador']), dispositivoController.actualizar);
router.delete('/:id', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Moderador', 'moderador']), dispositivoController.eliminar);

module.exports = router;
