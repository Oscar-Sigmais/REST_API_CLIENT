const mongoose = require('mongoose');
const formatDocument = require('../utils/formatDocument'); // Certifique-se de importar a função de formatação de documentos

// Rota para obter o resumo de dispositivos
const getDeviceResume = async (req, res) => {
    try {
        const { collection } = req.params;

        // Adiciona "s" ao final da coleção, exceto para "sigmeter4a20"
        const collectionName = collection !== 'sigmeter4a20' ? `${collection}s` : collection;

        // Obter a coleção do MongoDB
        const mongoCollection = mongoose.connection.collection(collectionName);

        // Captura os parâmetros de paginação
        const page = parseInt(req.query.page || 1);
        const size = parseInt(req.query.size || 10);
        const skip = (page - 1) * size;

        // Captura os filtros da query string
        const filterQuery = { ...req.query }; // Copia os filtros enviados na URL
        delete filterQuery.page; // Remove os parâmetros de paginação para evitar conflitos
        delete filterQuery.size;

        console.log(`Filtros recebidos: ${JSON.stringify(filterQuery)}`);

        // Consulta ao MongoDB
        const total = await mongoCollection.countDocuments(filterQuery);
        const data = await mongoCollection
            .find(filterQuery)
            .skip(skip)
            .limit(size)
            .sort({ _id: -1 })
            .toArray();

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
