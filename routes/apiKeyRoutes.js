const express = require('express');
const { generateOrReturnApiKey } = require('../controllers/apiKeyController');

const router = express.Router();

// Rota para gerar ou retornar a API Key
router.post('/generate-api-key', generateOrReturnApiKey);

module.exports = router;
