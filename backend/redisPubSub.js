require("dotenv").config();

const Redis = require("ioredis");

const redisConfig = {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT)
};

const publisher = new Redis(redisConfig);
const subscriber = new Redis(redisConfig);

module.exports = {
    publisher,
    subscriber
};