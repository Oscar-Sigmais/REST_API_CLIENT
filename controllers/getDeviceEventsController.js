const redisClient = require('../utils/redisClient');
const mongoose = require('mongoose');
const formatDocument = require('../utils/formatDocument');
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
        console.log('Invalid collection name:', req.params.collection);
        return res.status(400).json({ status: 'error', message: 'Invalid collection name' });
    }

    try {
        const { uuid } = req.query;
        const apiKey = req.headers['x-api-key'];
        const companyId = req.headers['x-company-id'];

        // Validar presença dos campos obrigatórios
        if (!apiKey || !companyId || !uuid) {
            return res.status(400).json({
                status: 'error',
                message: 'API Key, Company ID, and UUID are required',
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

        // Validar se o companyId é um ObjectId válido
        let companyIdFilter;
        try {
            companyIdFilter = new mongoose.Types.ObjectId(companyId);
        } catch (err) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid Company ID format',
            });
        }

        // Verificar se o dispositivo pertence ao grupo correto
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

        // Cache Key
        const cacheKey = `events:${collectionName}:${JSON.stringify(req.query)}:${companyId}`;
        console.log('Cache Key:', cacheKey);

        // Verificar o cache no Redis
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log('Cache hit:', cacheKey);
            return res.status(200).json(JSON.parse(cachedData));
        }
        console.log('Cache miss:', cacheKey);

        const mongoCollection = mongoose.connection.collection(collectionName);

        // Paginação com limite de tamanho
        const page = parseInt(req.query.page || 1);
        let size = parseInt(req.query.size || 10);

        // Limitar tamanho máximo da página em 100
        if (size > 100) {
            size = 100;
        }

        const skip = (page - 1) * size;

        // Construir filtro de pesquisa
        const filterQuery = { 'metadata.deviceUUID': uuid };
        console.log('UUID filter applied:', filterQuery['metadata.deviceUUID']);

        // Filtro de datas
        if (req.query.start_date && req.query.end_date) {
            const startDate = new Date(req.query.start_date);
            const endDate = new Date(req.query.end_date);

            // Validar formato das datas
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.log('Invalid date format:', req.query.start_date, req.query.end_date);
                return res.status(400).json({ status: 'error', message: 'Invalid date format. Use ISO 8601.' });
            }

            filterQuery.timestamp = {
                $gte: startDate,
                $lte: endDate,
            };
            console.log('Date filter applied:', filterQuery.timestamp);
        }

        console.log('Final Filter Query:', filterQuery);

        // Consulta ao MongoDB
        const total = await mongoCollection.countDocuments(filterQuery);
        console.log('Total records matching filter:', total);

        const data = await mongoCollection
            .find(filterQuery)
            .sort({ timestamp: 1 }) // Ordena pela data mais recente
            .skip(skip)
            .limit(size)
            .toArray();

        if (data.length === 0) {
            console.log('No data found for filter:', filterQuery);
            return res.status(404).json({ status: 'error', message: 'No data found for the given filters.' });
        }

        // Formatar os documentos
        const formattedData = data.map(formatDocument);

        const pagination = {
            total,
            currentPage: page,
            totalPage: Math.ceil(total / size),
            size,
            hasNextPage: page * size < total,
            hasPrevPage: page > 1,
        };

        const result = {
            status: 'success',
            message: `${data.length} records return, max 100.`,
            data: formattedData,
            pagination,
        };

        // Salvar no cache do Redis (1 hora)
        await redisClient.set(cacheKey, JSON.stringify(result), {
            EX: 3600,
        });
        console.log('Cache saved for key:', cacheKey);

        return res.status(200).json(result);
    } catch (err) {
        console.error('Error during request:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};