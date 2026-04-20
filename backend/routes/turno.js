const express = require('express');
const router = express.Router();
const turnoController = require('../controllers/turnoController');

router.get('/', turnoController.listar);
router.post('/', turnoController.crear);
router.put('/:id', turnoController.actualizar);
router.delete('/:id', turnoController.eliminar);
router.post('/asignar', turnoController.asignarAEmpleado);
router.get('/asignaciones', turnoController.listarAsignaciones);
router.delete('/asignaciones/:id', turnoController.eliminarAsignacion);

module.exports = router;
