const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');

// Controlador para gerar ou retornar uma API Key
const generateOrReturnApiKey = async (req, res) => {
    const { companyId } = req.body;

    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }

    try {
        // Desativar todas as chaves antigas da empresa
        await ApiKey.updateMany({ companyId }, { isActive: false });

        // Gerar nova API Key
        const key = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Validade de 1 ano

        const newApiKey = new ApiKey({ key, companyId, expiresAt, isActive: true });
        await newApiKey.save();

        res.status(201).json({ apiKey: key });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate API Key' });
    }
};


module.exports = { generateOrReturnApiKey };
