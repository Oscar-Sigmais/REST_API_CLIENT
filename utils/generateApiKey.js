const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');

const generateApiKey = async (client) => {
    const key = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Validade de 1 ano

    const apiKey = new ApiKey({ key, client, expiresAt });
    await apiKey.save();
    return key;
};

module.exports = generateApiKey;
