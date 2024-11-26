async function paginateQuery(collection, filterQuery, page, size, projection = {}) {
    const skip = (page - 1) * size;

    const data = await collection
        .find(filterQuery, { projection }) // Incluindo projeção
        .sort({ _id: 1 }) // Ordenar por id, ajuste conforme necessário
        .skip(skip)
        .limit(size)
        .toArray();

    const totalDocuments = await collection.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalDocuments / size);

    return {
        data,
        pagination: {
            page,
            size,
            totalDocuments,
            totalPages,
        },
    };
}


module.exports = paginateQuery;