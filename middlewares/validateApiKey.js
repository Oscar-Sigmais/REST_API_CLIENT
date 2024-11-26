const ApiKey = require('../models/ApiKey');

const validateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const companyId = req.headers['x-company-id'];

    if (!apiKey || !companyId) {
        return res.status(401).json({ error: 'API Key and Company ID are required' });
    }

    try {
        const keyData = await ApiKey.findOne({ key: apiKey, companyId, isActive: true });

        if (!keyData) {
            return res.status(401).json({ error: 'Invalid or inactive API Key' });
        }

        if (keyData.expiresAt < new Date()) {
            return res.status(401).json({ error: 'API Key expired' });
        }

        req.companyId = companyId; // Anexa o ID da empresa à requisição
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = validateApiKey;