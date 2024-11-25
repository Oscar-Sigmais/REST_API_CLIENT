const mongoose = require('mongoose');
const paginateQuery = require('../utils/paginateQuery'); // Assumindo que usa a função paginateQuery
const formatDocument = require('../utils/formatDocument'); // Função para formatar documentos MongoDB

exports.getCompanies = async (req, res) => {
    try {
        const mongoCollection = mongoose.connection.collection('companies');

        // Configurações de paginação
        const page = parseInt(req.query.page || 1);
        const size = parseInt(req.query.size || 10);

        // Construir a consulta de filtro
        const filterQuery = {};
        if (req.query.name) filterQuery.name = req.query.name;
        if (req.query.groups) filterQuery.groups = req.query.groups;
        if (req.query._id) {
            try {
                filterQuery._id = new mongoose.Types.ObjectId(req.query._id);
            } catch (err) {
                return res.status(400).json({ status: 'error', message: 'Invalid ID format' });
            }
        }

        // Consulta os dados paginados
        const { data, pagination } = await paginateQuery(mongoCollection, filterQuery, page, size);

        // Formatar os dados para evitar referências circulares
        const formattedData = data.map(formatDocument);

        // Retorna os dados formatados e a paginação
        return res.status(200).json({
            status: 'success',
            data: formattedData,
            pagination,
        });
    } catch (err) {
        console.error('Erro no controlador /companies/data:', err);
        return res.status(500).json({ status: 'error', message: err.message });
    }
};
