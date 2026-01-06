const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey'); // Modelo para validação da API Key

// Mapeamento de coleções (banco sighub)
// sigtemp_devices -> sigmeter, sigmeterlora
// sigpulse_devices -> sigpulse
const COLLECTIONS = [
    { name: 'sigtemp_devices', deviceType: 'sigtemp' },
    { name: 'sigpulse_devices', deviceType: 'sigpulse' }
];

const getAllDevicesResume = async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        const companyId = req.headers['x-company-id'];
        const onlineTime = parseInt(req.query.onlineTime, 10); // Filtro opcional para dispositivos online
        const offlineTime = parseInt(req.query.offlineTime, 10); // Filtro opcional para dispositivos offline

        // Validação inicial
        if (!apiKey || !companyId) {
            return res.status(400).json({
                status: 'error',
                message: 'API Key and Company ID are required',
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

        // Busca todos os UUIDs vinculados à empresa na coleção "groups"
        const groupsCollection = mongoose.connection.collection('groups');
        const groups = await groupsCollection.find({
            company_id: new mongoose.Types.ObjectId(companyId)
        }).toArray();

        const uuids = groups.flatMap(group => group.devices?.map(device => device.uuid) || []);

        if (uuids.length === 0) {
            return res.status(200).json({
                status: 'success',
                data: {
                    nmCliente: null,
                    cdCliente: companyId,
                    devices: []
                }
            });
        }

        let devices = [];

        // Calcula os limites de tempo baseados em onlineTime e offlineTime
        let onlineFilter = null;
        if (onlineTime && !isNaN(onlineTime) && onlineTime >= 1 && onlineTime <= 2550) {
            const now = new Date();
            onlineFilter = new Date(now.getTime() - onlineTime * 60 * 60 * 1000);
        }

        let offlineFilter = null;
        if (offlineTime && !isNaN(offlineTime) && offlineTime >= 1 && offlineTime <= 2550) {
            const now = new Date();
            offlineFilter = new Date(now.getTime() - offlineTime * 60 * 60 * 1000);
        }

        // Itera em todas as coleções para buscar dispositivos pelos UUIDs
        for (const { name: collectionName, deviceType } of COLLECTIONS) {
            const collection = mongoose.connection.collection(collectionName);

            const query = { uuid: { $in: uuids } };
            if (onlineFilter) {
                query.updatedAt = { $gte: onlineFilter };
            }
            if (offlineFilter) {
                query.updatedAt = { $lt: offlineFilter };
            }

            const collectionDevices = await collection.find(query).toArray();

            // Formatar dispositivos para o padrão de saída
            devices.push(
                ...collectionDevices.map(device => {
                    // Detectar tipo de dispositivo baseado no vendor
                    let detectedType = deviceType;
                    if (collectionName === 'sigtemp_devices') {
                        detectedType = device.vendor === 'LORA' ? 'sigmeterlora' : 'sigmeter';
                    }

                    // Estrutura de retorno padrão
                    const formattedDevice = {
                        Last_time: device.updatedAt || null,
                        deviceAlias: device.name || null,
                        deviceUUID: device.uuid || null,
                        device_type: detectedType,
                        vendor: device.vendor || null,
                        active: device.active || false
                    };

                    // Campos específicos para sigtemp
                    if (collectionName === 'sigtemp_devices') {
                        formattedDevice.temp = device.metadata?.temperature_ambient || null;
                        formattedDevice.Temp1 = device.metadata?.temperature_sensor1 || null;
                        formattedDevice.Temp2 = device.metadata?.temperature_sensor2 || null;
                        formattedDevice.Humidity = device.metadata?.humidity_ambient || null;
                    }

                    // Campos específicos para sigpulse
                    if (collectionName === 'sigpulse_devices') {
                        formattedDevice.Battery = device.battery || null;
                        formattedDevice.rssi = device.rssi || null;
                        formattedDevice.counter_channel_1 = device.metadata?.counter_channel_1 || null;
                        formattedDevice.counter_channel_2 = device.metadata?.counter_channel_2 || null;
                        formattedDevice.accumulated_channel_1 = device.metadata?.accumulated_channel_1 || null;
                        formattedDevice.accumulated_channel_2 = device.metadata?.accumulated_channel_2 || null;
                    }

                    return formattedDevice;
                })
            );
        }

        // Busca os dados da empresa
        const companiesCollection = mongoose.connection.collection('companies');
        const company = await companiesCollection.findOne({
            _id: new mongoose.Types.ObjectId(companyId)
        });

        if (!company) {
            return res.status(404).json({
                status: 'error',
                message: 'Company not found',
            });
        }

        // Retorna o formato esperado
        return res.status(200).json({
            status: 'success',
            data: {
                nmCliente: company.name || null,
                cdCliente: company._id || null,
                devices
            }
        });
    } catch (err) {
        console.error('Error during the request:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

module.exports = { getAllDevicesResume };
