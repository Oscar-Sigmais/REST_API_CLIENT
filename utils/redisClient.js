const redis = require('redis');

// Configure o cliente Redis
const redisClient = redis.createClient({
    host: '127.0.0.1', // Substitua pelo IP do servidor Redis se necessário
    port: 6379,        // Porta padrão do Redis
});

// Manipulação de erros
redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});

// Testa a conexão
redisClient.connect().then(() => {
    console.log('Connected to Redis');
});

module.exports = redisClient;
    