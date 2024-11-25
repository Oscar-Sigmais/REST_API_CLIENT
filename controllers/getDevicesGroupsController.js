const paginateQuery = require('../utils/paginateQuery');
const formatDocument = require('../utils/formatDocument');
const mongoose = require('mongoose');

exports.getGroups = async (req, res) => {
    const mongoCollection = mongoose.connection.collection('groups');
    try {
        const page = parseInt(req.query.page || 1);
        const size = parseInt(req.query.size || 10);
        const filterQuery = {};

        if (req.query.company_id) filterQuery.company_id = req.query.company_id;
        if (req.query['devices.uuid']) filterQuery['devices.uuid'] = req.query['devices.uuid'];
        if (req.query['devices.id']) filterQuery['devices.id'] = req.query['devices.id'];
        if (req.query._id) {
            filterQuery._id = new ObjectId(req.query._id); // Converte string para ObjectId
        }
        console.log(filterQuery);
        const { data, pagination } = await paginateQuery(mongoCollection, filterQuery, page, size);

        res.status(200).json({
            status: 'success',
            data: data.map(formatDocument),
            pagination
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};
