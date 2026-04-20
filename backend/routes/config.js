const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get('/', authMiddleware, configController.listar);
router.put('/', authMiddleware, roleMiddleware(['Administrador', 'admin', 'Admin', 'Moderador', 'moderador']), configController.actualizar);

module.exports = router;
