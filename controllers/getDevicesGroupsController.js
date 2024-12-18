const paginateQuery = require('../utils/paginateQuery');
const ApiKey = require('../models/ApiKey');
const mongoose = require('mongoose');

exports.getGroups = async (req, res) => {
    try {
        const mongoGroups = mongoose.connection.collection('groups');
        const mongoCompanies = mongoose.connection.collection('companies');

        const apiKey = req.headers['x-api-key'];
        const companyId = req.headers['x-company-id'];

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

        // Busca os dados da empresa
        const companyData = await mongoCompanies.findOne({
            _id: new mongoose.Types.ObjectId(companyId),
        });

        if (!companyData) {
            return res.status(404).json({
                status: 'error',
                message: 'Company not found',
            });
        }

        // Configuração de filtros para busca nos grupos
        const filterQuery = { company_id: new mongoose.Types.ObjectId(companyId) };
        if (req.query['devices.uuid']) filterQuery['devices.uuid'] = req.query['devices.uuid'];
        if (req.query['devices.id']) filterQuery['devices.id'] = req.query['devices.id'];
        if (req.query._id) filterQuery._id = new mongoose.Types.ObjectId(req.query._id);

        const page = parseInt(req.query.page || 1);
        const size = parseInt(req.query.size || 10);
        const { data, pagination } = await paginateQuery(mongoGroups, filterQuery, page, size);

        // Formatação dos dados de grupos e dispositivos
        const formattedGroups = data.map((group) => ({
            id: group._id || null,
            nome: group.name || null,
            device_type: group.device_type || null,
            devices: group.devices
                ? group.devices.map((device) => ({
                      uuid: device.uuid || null,
                      id: device.id || null,
                  }))
                : [],
            createdAt: group.createdAt || null,
        }));

        // Resposta final com dados formatados
        return res.status(200).json({
            status: 'success',
            empresa: {
                nome: companyData.name || null,
                id: companyData._id || null,
            },
            grupos: formattedGroups,
            pagination,
        });
    } catch (err) {
        console.error('Error during the request:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};
