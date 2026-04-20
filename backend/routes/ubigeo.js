const express = require('express');
const router = express.Router();
const ubigeoController = require('../controllers/ubigeoController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/departments', authMiddleware, ubigeoController.getDepartments);
router.get('/provinces/:departmentId', authMiddleware, ubigeoController.getProvinces);
router.get('/districts/:provinceId', authMiddleware, ubigeoController.getDistricts);

module.exports = router;
