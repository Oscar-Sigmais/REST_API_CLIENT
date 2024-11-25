const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');

// Controlador para gerar ou retornar uma API Key
const generateOrReturnApiKey = async (req, res) => {
    const { companyId } = req.body;

    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }

    try {
        // Verificar se já existe uma chave válida para a empresa
        const existingKey = await ApiKey.findOne({ companyId, expiresAt: { $gt: new Date() } });
        if (existingKey) {
            return res.status(200).json({ apiKey: existingKey.key });
        }

        // Gerar nova API Key
        const key = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Validade de 1 ano

        const newApiKey = new ApiKey({ key, companyId, expiresAt });
        await newApiKey.save();

        res.status(201).json({ apiKey: key });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate API Key' });
    }
};

module.exports = { generateOrReturnApiKey };
