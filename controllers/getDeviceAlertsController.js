const redisClient = require('../utils/redisClient');
const mongoose = require('mongoose');
const ApiKey = require('../models/ApiKey');

// No banco sighub, apenas sigtemp tem alertas
// Coleção: sigtemp_alerts
const ALERTS_COLLECTION = 'sigtemp_alerts';

exports.getDeviceAlerts = async (req, res) => {
    try {
        console.log('Starting getDeviceAlerts function');
        const { uuid, start_date, end_date, page = 1, size = 10, ...otherFilters } = req.query;
        console.log('Query parameters:', req.query);

        const pageNumber = parseInt(page);
        const pageSize = Math.min(parseInt(size), 100); // Limita o tamanho a 100.

        const apiKey = req.headers['x-api-key'];
        const companyId = req.headers['x-company-id'];
        console.log('Headers:', { apiKey, companyId });

        if (!apiKey || !companyId || !uuid) {
            console.error('Missing required parameters');
            return res.status(400).json({
                status: 'error',
                message: 'API Key, Company ID, and UUID are required',
            });
        }

        const apiKeyData = await ApiKey.findOne({ key: apiKey, companyId });
        if (!apiKeyData) {
            console.error('Invalid API Key or Company ID');
            return res.status(401).json({
                status: 'error',
                message: 'Invalid API Key or Company ID',
            });
        }

        let companyIdFilter;
        try {
            companyIdFilter = new mongoose.Types.ObjectId(companyId);
        } catch (err) {
            console.error('Invalid Company ID format');
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
        console.log('Group exists:', groupExists);

        if (!groupExists) {
            console.error('Device UUID not found in groups');
            return res.status(404).json({
                status: 'error',
                message: 'Device UUID not found in groups for the specified company',
            });
        }

        const cacheKey = `alerts:${uuid}:${JSON.stringify({ ...req.query, page, size })}:${companyId}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log('Cache hit:', cacheKey);
            return res.status(200).json(JSON.parse(cachedData));
        }
        console.log('Cache miss:', cacheKey);

        const skip = (pageNumber - 1) * pageSize;
        let data = [];
        let totalRecords = 0;

        // No banco sighub, apenas sigtemp_alerts existe
        console.log('Checking collection:', ALERTS_COLLECTION);
        const mongoCollection = mongoose.connection.collection(ALERTS_COLLECTION);

        const filterQuery = { uuid };

        if (start_date && end_date) {
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.error('Invalid date format:', { start_date, end_date });
                return res.status(400).json({ status: 'error', message: 'Invalid date format. Use ISO 8601.' });
            }

            filterQuery.createdAt = {
                $gte: startDate,
                $lte: endDate,
            };
            console.log('Date filter applied:', filterQuery.createdAt);
        }

        // Aplicar filtros adicionais (type, sensor, etc.)
        Object.assign(filterQuery, otherFilters);
        console.log('Final filter query:', filterQuery);

        totalRecords = await mongoCollection.countDocuments(filterQuery);
        console.log('Total records in collection:', totalRecords);

        if (totalRecords > 0) {
            data = await mongoCollection
                .find(filterQuery)
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(pageSize)
                .toArray();

            console.log('Data fetched from collection:', data.length);
        }

        if (!data || data.length === 0) {
            console.error('No alerts found');
            return res.status(404).json({ status: 'error', message: 'No alerts found for the specified UUID' });
        }

        // Formatar alertas para o padrão de saída
        const formattedData = data.map(item => ({
            _id: item._id,
            uuid: item.uuid,
            message: item.message || null,
            type: item.type || null,           // HIGH, LOW, etc.
            sensor: item.sensor || null,       // temperature_ambient, etc.
            eventValue: item.eventValue || null,
            thresholdMax: item.thresholdMax || null,
            thresholdMin: item.thresholdMin || null,
            createdAt: item.createdAt || null,
            email_status_code: item.email_status_code || null,
            eventID: item.eventID || null,
            annotation: item.annotation || null,
            user_note: item.user_note || null,
            alertType: 'sigtemp'
        }));
        console.log('Formatted data:', formattedData.length);

        const pagination = {
            total: totalRecords,
            currentPage: pageNumber,
            totalPage: Math.ceil(totalRecords / pageSize),
            size: pageSize,
            hasNextPage: pageNumber * pageSize < totalRecords,
            hasPrevPage: pageNumber > 1,
        };
        console.log('Pagination:', pagination);

        const result = {
            status: 'success',
            message: `${formattedData.length} alert(s) found.`,
            data: formattedData,
            pagination,
        };

        await redisClient.set(cacheKey, JSON.stringify(result), { EX: 1800 });
        console.log('Cache saved for key:', cacheKey);

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error in getDeviceAlerts:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
