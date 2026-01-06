const redisClient = require('../utils/redisClient');
const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey');

// Mapeamento de coleções de eventos (banco sighub)
// sigmeter/sigmeterlora -> sigtemp_events
// sigpulse -> sigpulse_events
// sigmeteronoff e sigpark não existem neste banco
const collectionMap = {
    sigtemp: 'sigtemp_events',      // sigmeter e sigmeterlora
    sigpulse: 'sigpulse_events',
};

exports.getDeviceEvents = async (req, res) => {
    try {
        const { uuid } = req.query;
        const apiKey = req.headers['x-api-key'];
        const companyId = req.headers['x-company-id'];

        if (!apiKey || !companyId || !uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'API Key, Company ID, and UUID are required',
            });
        }

        const apiKeyData = await ApiKey.findOne({ key: apiKey, companyId });
        if (!apiKeyData) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid API Key or Company ID',
            });
        }

        let companyIdFilter;
        try {
            companyIdFilter = new mongoose.Types.ObjectId(companyId);
        } catch (err) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid Company ID format',
            });
        }

        const groupsCollection = mongoose.connection.collection('groups');
        const groupExists = await groupsCollection.findOne({
            company_id: companyIdFilter,
            'devices.uuid': uuid,
        });

        if (!groupExists) {
            return res.status(404).json({
                status: 'error',
                message: 'Device UUID not found in groups for the specified company',
            });
        }

        const cacheKey = `events:${uuid}:${JSON.stringify(req.query)}:${companyId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json(JSON.parse(cachedData));
        }

        const page = parseInt(req.query.page || 1);
        let size = parseInt(req.query.size || 10);

        if (size > 100) size = 100;

        const skip = (page - 1) * size;
        let data = null;
        let deviceType = null;
        let formattedData = [];
        let totalRecords = 0;

        for (const [key, collectionName] of Object.entries(collectionMap)) {
            const mongoCollection = mongoose.connection.collection(collectionName);

            // No novo banco, o campo uuid está diretamente no documento
            const filterQuery = { uuid: uuid };

            if (req.query.start_date && req.query.end_date) {
                const startDate = new Date(req.query.start_date);
                const endDate = new Date(req.query.end_date);

                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    return res.status(400).json({ status: 'error', message: 'Invalid date format. Use ISO 8601.' });
                }

                // No novo banco, o timestamp está em metadata.timestamp
                filterQuery['metadata.timestamp'] = { $gte: startDate, $lte: endDate };
            }

            totalRecords = await mongoCollection.countDocuments(filterQuery);

            data = await mongoCollection
                .find(filterQuery)
                .sort({ 'metadata.timestamp': 1 })
                .skip(skip)
                .limit(size)
                .toArray();

            if (data.length > 0) {
                deviceType = key;

                if (deviceType === 'sigtemp') {
                    // Formatar eventos sigtemp (sigmeter e sigmeterlora)
                    formattedData = data.map(item => ({
                        timestamp: item.metadata?.timestamp || item.updatedAt,
                        device_type: 'sigtemp',
                        device_uuid: item.uuid,
                        analise: 'temperatura',
                        umidade_ambiente: item.metadata?.humidity_ambient || null,
                        temperatura_ambiente: item.metadata?.temperature_ambient || null,
                        temperatura_canal_1: item.metadata?.temperature_sensor1 || '',
                        temperatura_canal_2: item.metadata?.temperature_sensor2 || '',
                        raw_payload: item.raw_payload || null
                    }));
                } else if (deviceType === 'sigpulse') {
                    // Formatar eventos sigpulse
                    formattedData = data.map(item => ({
                        timestamp: item.metadata?.timestamp || item.updatedAt,
                        device_type: 'sigpulse',
                        device_uuid: item.uuid,
                        analise: 'contador',
                        contador_porta_1: item.metadata?.counter_channel_1 || 0,
                        contador_porta_2: item.metadata?.counter_channel_2 || 0,
                        acumulado_canal_1: item.metadata?.accumulated_channel_1 || 0,
                        acumulado_canal_2: item.metadata?.accumulated_channel_2 || 0
                    }));
                }
                break;
            }
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No data found for the given filters.' });
        }

        const pagination = {
            total: totalRecords,
            currentPage: page,
            totalPage: Math.ceil(totalRecords / size),
            size,
            hasNextPage: page * size < totalRecords,
            hasPrevPage: page > 1,
        };

        const result = {
            status: 'success',
            message: `${formattedData.length} records returned, max 100.`,
            data: formattedData,
            deviceType,
            pagination,
        };

        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 600 });

        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
};
