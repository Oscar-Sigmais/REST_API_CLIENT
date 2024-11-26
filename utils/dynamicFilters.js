function createDynamicFilters(query, allowedFilters) {
    const filterQuery = {};
    allowedFilters.forEach(key => {
        if (query[key]) filterQuery[key] = query[key];
    });
    return filterQuery;
}

module.exports = createDynamicFilters;
