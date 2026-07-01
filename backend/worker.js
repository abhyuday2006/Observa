// worker.js
const { Worker } = require("bullmq");
const connection = require("./redis");
const pool = require('./db')
const { publisher } = require("./redisPubSub");


const worker = new Worker(
    "logs",
    async (job) => {
        try{
            const {service_name,level,message,project_id} = job.data;

            const result = await pool.query(`INSERT INTO logs(service_name, level, message,project_id) VALUES ($1,$2,$3,$4) RETURNING *`,[service_name, level, message,project_id]);

            await publisher.publish("new-log",JSON.stringify(result.rows[0]));
        } catch(err){
            console.log(err);
        }
    },
    {connection}
);