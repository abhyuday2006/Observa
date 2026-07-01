// queue.js

const { Queue } = require("bullmq");
const connection = require("./redis");

const logQueue = new Queue("logs", {
    connection
});

module.exports = logQueue;