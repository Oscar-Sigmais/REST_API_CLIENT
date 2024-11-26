const mongoose = require('mongoose');

const connectDB = async (uri, dbName) => {
    try {
        await mongoose.connect(uri, {
            dbName
        });
        console.log('Conectado ao MongoDB');
    } catch (err) {
        console.error('Erro ao conectar ao MongoDB:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
