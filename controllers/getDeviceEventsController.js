const redisClient = require('../utils/redisClient');
const paginateQuery = require('../utils/paginateQuery');
const formatDocument = require('../utils/formatDocument');
const mongoose = require('mongoose');

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

    const cacheKey = `events:${collectionName}:${JSON.stringify(req.query)}`;
    console.log('Cache Key:', cacheKey);

    try {
        // Verificar o cache no Redis
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log('Cache hit:', cacheKey);
            return res.status(200).json(JSON.parse(cachedData));
        }
        console.log('Cache miss:', cacheKey);

        const mongoCollection = mongoose.connection.collection(collectionName);
        const page = parseInt(req.query.page || 1);
        const size = parseInt(req.query.size || 10);
        const filterQuery = {};

        console.log('Page:', page, 'Size:', size);

        // Filtro por UUID
        if (req.query.uuid) {
            filterQuery['metadata.deviceUUID'] = req.query.uuid;
            console.log('UUID filter applied:', filterQuery['metadata.deviceUUID']);
        }

        // Filtro de datas
        if (req.query.start_date && req.query.end_date) {
            const startDate = new Date(req.query.start_date);
            const endDate = new Date(req.query.end_date);

            // Validar datas
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

        // Paginação
        const skip = (page - 1) * size;
        console.log('Skip:', skip);

        // Consulta ao MongoDB com ordenação decrescente
        const total = await mongoCollection.countDocuments(filterQuery);
        console.log('Total records matching filter:', total);

        const data = await mongoCollection
            .find(filterQuery)
            .sort({ timestamp: 1 }) // Ordena pela data mais recente primeiro
            .skip(skip)
            .limit(size)
            .toArray();

        console.log('Data fetched from MongoDB:', data.length, 'records');

        // Verificar se encontrou resultados
        if (data.length === 0) {
            console.log('No data found for filter:', filterQuery);
            return res.status(404).json({ status: 'error', message: 'No data found for the given filters.' });
        }

        // Formatar os documentos
        const formattedData = data.map(formatDocument);
        console.log('Formatted data:', formattedData.length, 'records');

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
            message: `${data.length} record(s) found.`,
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
