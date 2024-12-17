const redisClient = require('../utils/redisClient');
const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey');

exports.getDeviceEvents = async (req, res) => {
    const collectionMap = {
        sigmeter: 'sigmeter_events',
        sigmeterlora: 'sigmeterlora_events',
        sigpulse: 'sigpulse_events',
        sigpark: 'sigpark_events',
        sigmeteronoff: 'sigmetersl_events',
        sigmeter4a20: 'sigmeter4a20_events',
    };

    const collectionName = collectionMap[req.params.collection];
    if (!collectionName) {
        return res.status(400).json({ status: 'error', message: 'Invalid collection name' });
    }

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

        const cacheKey = `events:${collectionName}:${JSON.stringify(req.query)}:${companyId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json(JSON.parse(cachedData));
        }

        const mongoCollection = mongoose.connection.collection(collectionName);
        const page = parseInt(req.query.page || 1);
        let size = parseInt(req.query.size || 10);

        if (size > 100) size = 100;

        const skip = (page - 1) * size;
        const filterQuery = { 'metadata.deviceUUID': uuid };

        if (req.query.start_date && req.query.end_date) {
            const startDate = new Date(req.query.start_date);
            const endDate = new Date(req.query.end_date);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({ status: 'error', message: 'Invalid date format. Use ISO 8601.' });
            }

            filterQuery.timestamp = { $gte: startDate, $lte: endDate };
        }

        const data = await mongoCollection
            .find(filterQuery)
            .sort({ timestamp: 1 })
            .skip(skip)
            .limit(size)
            .toArray();

        if (data.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No data found for the given filters.' });
        }

        const formattedData = data
            .filter(item => [1, 2, 3, 7].includes(item.metadata.frame))
            .map(item => ({
                timestamp: item.timestamp,
                device_Id: item.metadata.deviceId,
                device_uuid: item.metadata.deviceUUID,
                analise: (() => {
                    switch (item.metadata.frame) {
                        case 1: return 'temperatura';
                        case 2: return 'contador';
                        case 3: return 'parametros';
                        case 7: return 'sensor_Id';
                    }
                })(),
                mensagem: item.event.input.message,
                umidade_ambiente: item.event.input.data.humidity,
                temperatura_ambiente: item.event.input.data.temperature,
                temperatura_canal_1: item.event.input.data.temperatureEx1 === -128 ? 'N_D' : item.event.input.data.temperatureEx1,
                temperatura_canal_2: item.event.input.data.temperatureEx2 === -128 ? 'N_D' : item.event.input.data.temperatureEx2,
                contagem_canal_1: item.event.input.data.count1,
                contagem_canal_2: item.event.input.data.count2,
                Acumulado_canal_1: item.event.input.data.timeCount1,
                Acumulado_canal_2: item.event.input.data.timeCount2,
                sensorUUID: item.event.input.data.sensorUid,
            }));

        const pagination = {
            total: formattedData.length,
            currentPage: page,
            totalPage: Math.ceil(formattedData.length / size),
            size,
            hasNextPage: page * size < formattedData.length,
            hasPrevPage: page > 1,
        };

        const result = {
            status: 'success',
            message: `${formattedData.length} records return, max 100.`,
            data: formattedData,
            pagination,
        };

        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 3600 });

        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
};
