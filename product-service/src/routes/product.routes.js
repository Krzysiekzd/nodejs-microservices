const express = require('express');
const router = express.Router();
const controller = require('../controllers/product.controller');

router.get('/', controller.getAll);
router.post('/', controller.create);
router.patch('/:id', controller.update);

module.exports = router;
