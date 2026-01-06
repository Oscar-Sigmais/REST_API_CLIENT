const mongoose = require('mongoose');
const paginateQuery = require('../utils/paginateQuery'); // Função para paginação

// Coleção: companies (banco sighub)
exports.getCompanies = async (req, res) => {
    try {
        const mongoCollection = mongoose.connection.collection('companies');

        // Obter o companyId do cabeçalho
        const companyId = req.headers['x-company-id'];
        if (!companyId) {
            return res.status(401).json({ status: 'error', message: 'Company ID is required' });
        }

        // Verificar se o companyId é válido
        let companyIdFilter;
        try {
            companyIdFilter = new mongoose.Types.ObjectId(companyId);
        } catch (err) {
            return res.status(400).json({ status: 'error', message: 'Invalid Company ID format' });
        }

        // Configurações de paginação
        const page = parseInt(req.query.page || 1);
        const size = parseInt(req.query.size || 10);

        // Construir a consulta de filtro com companyId
        const filterQuery = { _id: companyIdFilter };

        // Consulta os dados paginados
        const { data, pagination } = await paginateQuery(mongoCollection, filterQuery, page, size);

        // Caso não encontre a companhia
        if (data.length === 0) {
            return res.status(404).json({ status: 'error', message: 'Company not found' });
        }

        // Formatar os dados para o padrão de saída
        const formattedData = data.map(company => ({
            _id: company._id,
            name: company.name || null,
            users: company.users || [],
            contact: company.contact || { email: '', phone: '' },
            address: company.address || { street: '', city: '', state: '', zipCode: '', number: '', complement: '' },
            groups: company.groups || [],
            deleted: company.deleted || false,
            createdAt: company.createdAt || null,
            updatedAt: company.updatedAt || null
        }));

        // Retorna os dados formatados
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