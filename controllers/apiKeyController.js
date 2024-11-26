const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');

// Controlador para gerar ou retornar uma API Key
const generateOrReturnApiKey = async (req, res) => {
    const { companyId } = req.body;

    if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
    }

    try {
        // Gerar uma nova API Key
        const key = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Validade de 1 ano

        // Atualizar o registro existente ou criar um novo
        const updatedApiKey = await ApiKey.findOneAndUpdate(
            { companyId }, // Filtro para encontrar o registro
            { key, expiresAt, isActive: true }, // Dados a serem atualizados
            { upsert: true, new: true } // Criar um novo registro se não existir, e retornar o registro atualizado
        );

        res.status(200).json({ apiKey: updatedApiKey.key });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to generate or update API Key' });
    }
};

module.exports = { generateOrReturnApiKey };
