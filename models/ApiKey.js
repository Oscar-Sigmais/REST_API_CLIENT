const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    companyId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true }, // Nova propriedade
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ApiKey', apiKeySchema);
