const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey'); // Modelo para validação da API Key

// Mapeamento de coleções (banco sighub)
// sigmeter/sigmeterlora -> sigtemp_devices
// sigpulse -> sigpulse_devices
// sigmeteronoff e sigpark não existem neste banco
const COLLECTIONS = [
    { name: 'sigtemp_devices', deviceTypes: ['sigmeter', 'sigmeterlora'] },
    { name: 'sigpulse_devices', deviceTypes: ['sigpulse'] }
];

const getDeviceResume = async (req, res) => {
    try {
        const { uuid, name, _id, device_type } = req.query;
        const apiKey = req.headers['x-api-key'];
        const companyId = req.headers['x-company-id'];

        // Validação inicial
        if (!apiKey || !companyId || (!uuid && !name && !_id)) {
            return res.status(400).json({
                status: 'error',
                message: 'API Key, Company ID, and at least one search parameter (uuid, name, _id) are required',
            });
        }

        // Validação da API Key
        const apiKeyData = await ApiKey.findOne({ key: apiKey, companyId });
        if (!apiKeyData) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid API Key or Company ID',
            });
        }

        // Filtro de busca
        const searchQuery = {};
        if (uuid) searchQuery.uuid = uuid;
        if (name) searchQuery.name = name;
        if (_id) searchQuery._id = new mongoose.Types.ObjectId(_id);

        let deviceData = null;
        let groupData = null;
        let companyData = null;

        // Itera em todas as coleções
        for (const { name: collectionName, deviceTypes } of COLLECTIONS) {
            const collection = mongoose.connection.collection(collectionName);
            const data = await collection.findOne(searchQuery);

            if (data) {
                // Determinar o device_type baseado no vendor ou parâmetro
                let detectedDeviceType = deviceTypes[0]; // default
                if (device_type && deviceTypes.includes(device_type)) {
                    detectedDeviceType = device_type;
                } else if (data.vendor === 'LORA') {
                    detectedDeviceType = 'sigmeterlora';
                } else if (data.vendor === 'NBIOT' && collectionName === 'sigtemp_devices') {
                    detectedDeviceType = 'sigmeter';
                } else if (collectionName === 'sigpulse_devices') {
                    detectedDeviceType = 'sigpulse';
                }

                // Monta os dados do dispositivo no formato padrão de saída
                deviceData = {
                    uuid: data.uuid || null,
                    alias: data.name || null,
                    id: data._id || null,
                    device_type: detectedDeviceType,
                    vendor: data.vendor || null,
                    firmware_version: data.firmware_version || null,
                    active: data.active || false,
                    createdAt: data.createdAt || null,
                    updatedAt: data.updatedAt || null,
                    metadata: data.metadata || null,
                    company: data.company || null
                };

                // Adiciona campos específicos de sigpulse
                if (collectionName === 'sigpulse_devices') {
                    deviceData.battery = data.battery || null;
                    deviceData.rssi = data.rssi || null;
                    deviceData.inicialValue = data.inicialValue || 0;
                    deviceData.multiplier = data.multiplier || 1;
                }

                // Busca o grupo correspondente
                const groupsCollection = mongoose.connection.collection('groups');
                const group = await groupsCollection.findOne({
                    company_id: new mongoose.Types.ObjectId(companyId),
                    'devices.uuid': data.uuid
                });

                if (group) {
                    groupData = {
                        nome: group.name || null,
                        descricao: group.description || null,
                        id: group._id || null
                    };
                }

                // Busca os dados da empresa
                const companiesCollection = mongoose.connection.collection('companies');
                const company = await companiesCollection.findOne({
                    _id: new mongoose.Types.ObjectId(companyId)
                });

                if (company) {
                    companyData = {
                        nome: company.name || null,
                        id: company._id || null
                    };
                }
                break; // Para após encontrar o dispositivo
            }
        }

        if (!deviceData) {
            return res.status(404).json({
                status: 'error',
                message: 'Device not found in any collection for the specified company',
            });
        }

        // Retorna o formato esperado
        return res.status(200).json({
            status: 'success',
            data: {
                device: deviceData,
                grupo: groupData,
                empresa: companyData
            }
        });
    } catch (err) {
        console.error('Error during the request:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

module.exports = { getDeviceResume };
