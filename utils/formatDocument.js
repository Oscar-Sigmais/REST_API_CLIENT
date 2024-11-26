const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

function formatDocument(doc) {
    function convertValue(value) {
        if (value instanceof ObjectId) {
            return { $oid: value.toString() }; // Formata como string
        } else if (value instanceof Date) {
            return { $date: value.toISOString() }; // Formata como data
        } else if (Array.isArray(value)) {
            return value.map(convertValue); // Recursivamente formata arrays
        } else if (typeof value === 'object' && value !== null) {
            return Object.entries(value).reduce((acc, [key, val]) => {
                acc[key] = convertValue(val);
                return acc;
            }, {});
        }
        return value; // Retorna o valor original para tipos simples
    }

    return convertValue(doc);
}

module.exports = formatDocument;