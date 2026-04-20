const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', authMiddleware, areaController.listar);
router.post('/', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Moderador', 'moderador']), areaController.crear);
router.put('/:id', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Moderador', 'moderador']), areaController.actualizar);
router.delete('/:id', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin']), areaController.eliminar);

module.exports = router;
