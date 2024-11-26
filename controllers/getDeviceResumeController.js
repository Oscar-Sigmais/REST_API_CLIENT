const mongoose = require('mongoose');
const formatDocument = require('../utils/formatDocument');
const ApiKey = require('../models/ApiKey'); // Modelo para validação da API Key

// Rota para obter o resumo de dispositivos
const getDeviceResume = async (req, res) => {
    try {
        const { collection } = req.params;
        const { uuid } = req.query;
        const apiKey = req.headers['x-api-key'];
        const companyId = req.headers['x-company-id'];

        // Validar presença dos cabeçalhos obrigatórios
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

        // Se passar pela validação, prosseguir com a pesquisa na coleção de dispositivos
        const collectionName = collection !== 'sigmeter4a20' ? `${collection}s` : collection;
        const mongoCollection = mongoose.connection.collection(collectionName);

        // Configuração de paginação
        const page = parseInt(req.query.page || 1);
        const size = parseInt(req.query.size || 10);
        const skip = (page - 1) * size;

        // Filtro de busca nos dispositivos
        const filterQuery = { uuid };
        const total = await mongoCollection.countDocuments(filterQuery);
        const data = await mongoCollection
            .find(filterQuery)
            .skip(skip)
            .limit(size)
            .sort({ _id: -1 })
            .toArray();

        if (data.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Device not found in the specified company or type',
            });
        }

        // Formatar os resultados
        const formattedData = data.map(formatDocument);

        // Construir a paginação
        const pagination = {
            total,
            currentPage: page,
            totalPage: Math.ceil(total / size),
            size,
            hasNextPage: page * size < total,
            hasPrevPage: page > 1,
        };

        return res.status(200).json({
            status: 'success',
            data: formattedData,
            pagination,
        });
    } catch (err) {
        console.error('Erro durante a requisição:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};

module.exports = { getDeviceResume };