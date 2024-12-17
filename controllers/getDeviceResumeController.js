const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey'); // Modelo para validação da API Key

const COLLECTIONS = [
    { name: 'sigmeterloras', deviceType: 'sigmeterlora' },
    { name: 'sigmeter4a20', deviceType: 'sigmeter4a20' },
    { name: 'sigmeters', deviceType: 'sigmeter' },
    { name: 'sigmetersls', deviceType: 'sigmeteronoff' },
    { name: 'sigpulses', deviceType: 'sigpulse' }
];

const getDeviceResume = async (req, res) => {
    try {
        const { uuid, name, _id } = req.query;
        const apiKey = req.headers['x-api-key'];
        const companyId = req.headers['x-company-id'];

        // Validar presença dos cabeçalhos obrigatórios
        if (!apiKey || !companyId || (!uuid && !name && !_id)) {
            return res.status(400).json({
                status: 'error',
                message: 'API Key, Company ID, and at least one search parameter (uuid, name, _id) are required',
            });
        }

        // Validar API Key
        const apiKeyData = await ApiKey.findOne({ key: apiKey, companyId });
        if (!apiKeyData) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid API Key or Company ID',
            });
        }

        // Validar companyId
        let companyIdFilter;
        try {
            companyIdFilter = new mongoose.Types.ObjectId(companyId);
        } catch {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid Company ID format',
            });
        }

        // Filtro de busca
        const searchQuery = {};
        if (uuid) searchQuery.uuid = uuid;
        if (name) searchQuery.name = name;
        if (_id) searchQuery._id = new mongoose.Types.ObjectId(_id);

        let result = [];
        let collectionFound = null;

        // Iterar em todas as coleções
        for (const { name: collectionName, deviceType } of COLLECTIONS) {
            const collection = mongoose.connection.collection(collectionName);
            const data = await collection.find(searchQuery).toArray();

            if (data.length > 0) {
                // Verificar se o dispositivo pertence à empresa
                const groupsCollection = mongoose.connection.collection('groups');
                const validGroup = await groupsCollection.findOne({
                    company_id: companyIdFilter,
                    'devices.uuid': { $in: data.map((device) => device.uuid) },
                });

                if (validGroup) {
                    result = data.map((device) => ({
                        uuid: device.uuid || null,
                        name: device.name || null,
                        id: device._id || null,
                        device_type: deviceType,
                        createdAt: device.createdAt || null,
                    }));
                    collectionFound = collectionName;
                    break;
                }
            }
        }

        if (result.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Device not found in any collection for the specified company',
            });
        }

        return res.status(200).json({
            status: 'success',
            collection: collectionFound,
            data: result,
        });
    } catch (err) {
        console.error('Error during the request:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

module.exports = { getDeviceResume };