const express = require('express');
const router = express.Router();
const empleadoController = require('../controllers/empleadoController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', authMiddleware, empleadoController.listar);
router.post('/', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Gerente', 'Moderador', 'moderador']), empleadoController.crear);
router.put('/:id', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Gerente', 'Moderador', 'moderador']), empleadoController.actualizar);
router.delete('/:id', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin']), empleadoController.eliminar);

module.exports = router;
