const redis = require('redis');

let redisClient = null;
let isConnected = false;

// Tenta criar e conectar o cliente Redis
const initRedis = async () => {
    try {
        redisClient = redis.createClient({
            socket: {
                host: '127.0.0.1',
                port: 6379,
                connectTimeout: 5000
            }
        });

        redisClient.on('error', (err) => {
            console.error('Redis connection error:', err.message);
            isConnected = false;
        });

        redisClient.on('connect', () => {
            console.log('Connected to Redis');
            isConnected = true;
        });

        await redisClient.connect();
    } catch (err) {
        console.error('Failed to connect to Redis:', err.message);
        isConnected = false;
    }
};

initRedis();

// Wrapper para operações de cache com fallback
const cacheWrapper = {
    async get(key) {
        if (!isConnected || !redisClient) return null;
        try {
            return await redisClient.get(key);
        } catch (err) {
            console.error('Redis get error:', err.message);
            return null;
        }
    },
    async set(key, value, options) {
        if (!isConnected || !redisClient) return false;
        try {
            await redisClient.set(key, value, options);
            return true;
        } catch (err) {
            console.error('Redis set error:', err.message);
            return false;
        }
    }
};

module.exports = cacheWrapper;
    