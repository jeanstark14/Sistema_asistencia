const express = require('express');
const router = express.Router();
const feriadoController = require('../controllers/feriadoController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', authMiddleware, feriadoController.listar);
router.post('/', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Moderador', 'moderador']), feriadoController.crear);
router.delete('/:id', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Moderador', 'moderador']), feriadoController.eliminar);

module.exports = router;
