const express = require('express');
const mongoose = require('mongoose');
const redisClient = require('../utils/redisClient');
const formatDocument = require('../utils/formatDocument');
const ApiKey = require('../models/ApiKey');

exports.getDeviceAlerts = async (req, res) => {
    const collectionMap = {
        sigmeter: 'alert_events_sigmeters',
        sigmeteronoff: 'alert_events_sigmeterSLs',
        sigmeterlora: 'alert_events_sigmeterLORAs',
        sigpulse: 'alert_events_sigmeterpulses',
        sigpark: 'alert_events_sigparks',
    };

    const { collection } = req.params;

    // Verificar se a coleção é válida
    if (!collectionMap[collection]) {
        console.log('Invalid collection name:', collection);
        return res.status(400).json({ status: 'error', message: 'Invalid collection name' });
    }

    const mongoCollection = mongoose.connection.collection(collectionMap[collection]);
    const cacheKey = `alerts:${collection}:${JSON.stringify(req.query)}`;
    console.log('Cache Key:', cacheKey);

    try {
        const { uuid, start_date, end_date, page = 1, size = 10, ...otherFilters } = req.query;
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

        // Verificar o cache no Redis
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log('Cache hit:', cacheKey);
            return res.status(200).json(JSON.parse(cachedData));
        }
        console.log('Cache miss:', cacheKey);

        const filterQuery = { uuid };

        // Adicionar filtros de data
        if (start_date && end_date) {
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);

            // Validar formato de data
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.log('Invalid date format:', start_date, end_date);
                return res.status(400).json({ status: 'error', message: 'Invalid date format. Use ISO 8601.' });
            }

            filterQuery.createdAt = {
                $gte: startDate,
                $lte: endDate,
            };
            console.log('Date filter applied:', filterQuery.createdAt);
        }

        // Adicionar outros filtros opcionais
        Object.assign(filterQuery, otherFilters);
        console.log('Final Filter Query:', JSON.stringify(filterQuery));

        // Paginação
        const limit = Math.min(parseInt(size, 10), 100); // Limitar a paginação a no máximo 100 registros
        const skip = (parseInt(page, 10) - 1) * limit;
        console.log('Page:', page, 'Size:', size, 'Skip:', skip);

        // Consulta ao MongoDB com ordenação crescente
        const total = await mongoCollection.countDocuments(filterQuery);
        console.log('Total records matching filter:', total);

        const data = await mongoCollection
            .find(filterQuery)
            .sort({ createdAt: 1 }) // Ordena pela data mais recente primeiro
            .skip(skip)
            .limit(limit)
            .toArray();

        console.log('Data fetched from MongoDB:', data.length, 'records');

        // Verificar se não encontrou resultados
        if (data.length === 0) {
            console.log('No alerts found for filter:', filterQuery);
            return res.status(404).json({ status: 'error', message: 'No alerts found for the specified UUID' });
        }

        // Formatar os documentos
        const formattedData = data.map(formatDocument);
        console.log('Formatted data:', formattedData.length, 'records');

        const pagination = {
            total,
            currentPage: parseInt(page, 10),
            totalPage: Math.ceil(total / limit),
            size: limit,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
        };

        const result = {
            status: 'success',
            message: `${data.length} alert(s) found.`,
            data: formattedData,
            pagination,
        };

        // Salvar no cache do Redis (30 minutos)
        await redisClient.set(cacheKey, JSON.stringify(result), {
            EX: 1800, // Expiração de 30 minutos
        });
        console.log('Cache saved for key:', cacheKey);

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error during request:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
};