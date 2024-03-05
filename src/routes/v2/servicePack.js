const express = require('express');
const router = express.Router();
const servicePackService = require('../../services/v2/servicePack.service');

router.get('/getAllServicePack', servicePackService.fetchAmountFormServicePack);

module.exports = router;