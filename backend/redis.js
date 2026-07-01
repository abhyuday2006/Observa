// redis.js

require("dotenv").config();

const { Redis } = require("ioredis");

const connection = new Redis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: null
});

module.exports = connection;