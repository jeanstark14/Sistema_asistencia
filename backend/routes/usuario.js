const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Solo administradores pueden gestionar usuarios
router.use(authMiddleware);
router.use(roleMiddleware(['Administrador', 'admin']));

router.get('/', userController.listar);
router.post('/', userController.crear);
router.delete('/:id', userController.eliminar);
router.get('/roles', userController.listarRoles);

module.exports = router;
