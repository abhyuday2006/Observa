const axios = require("axios");

const services = [
    "auth-service",
    "payment-service",
    "user-service",
    "inventory-service",
    "notification-service"
];

const levels = [
    "INFO",
    "WARNING",
    "ERROR"
];

const messages = {
    INFO: [
        "User logged in",
        "Request processed",
        "Cache hit",
        "Email sent",
        "Payment verified"
    ],
    WARNING: [
        "High memory usage",
        "Slow database query",
        "Cache miss",
        "Retrying request"
    ],
    ERROR: [
        "Database connection failed",
        "Redis timeout",
        "Payment gateway unavailable",
        "Unhandled exception"
    ]
};

async function sendLog() {

    const level = levels[Math.floor(Math.random()*levels.length)];
    const API_KEY = 'obs_live_3f0aa7db2702dadbc1dad84a1ad57ebbf62a22cefcf90fce';

    const log = {
        service_name: services[Math.floor(Math.random()*services.length)],
        level,
        message: messages[level][
            Math.floor(Math.random()*messages[level].length)
        ]
    };

    try{
        await axios.post(
            "http://localhost:3000/v1/logs",
            log,
            {
                headers: {
                    Authorization:
                        `Bearer ${API_KEY}`
                }
            }
        );
    }
    catch(err){
        console.log(err.message);
    }
}

setInterval(sendLog,1000);