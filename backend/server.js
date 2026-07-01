const express = require('express');
const logQueue = require('./queue.js');
const app = express();
const pool = require('./db.js');
const cors = require("cors");
const path = require("path");

const crypto = require("crypto");
const authenticate = require("./authMiddleware");
const apiKeyMiddleware = require("./apiKeyMiddleware");

const { subscriber } = require("./redisPubSub");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const validator = require("validator");

require("dotenv").config();
app.use(cors());

app.use(express.json());
app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);

const { createServer } = require("node:http");
const { Server } = require("socket.io");
const server = createServer(app);
const io = new Server(server,{
    cors:{
        origin:"*"
    }
});

io.on("connection",(socket)=>{
    socket.on("disconnect",()=>{
        console.log("Disconnected:",socket.id);
    });
});

async function initializePubSub() {
    await subscriber.subscribe("new-log");
    subscriber.on("message", (channel, message) => {
        io.emit(channel, JSON.parse(message));
    });
}

initializePubSub();
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});

//home route
app.get("/",(req,res)=>{
    res.sendFile(path.join(__dirname, "../frontend/landing.html"));
})

//login
app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password required"
            });
        }
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }
        const user = result.rows[0];
        const match = await bcrypt.compare(
            password,
            user.password_hash
        );
        if (!match) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );
        res.json({
            token
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error"
        });

    }
});

//sign up 
app.post("/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }
        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email"
            });
        }
        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            `
            INSERT INTO users(name, email, password_hash)
            VALUES($1, $2, $3)
            `,
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: "User registered successfully"
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

app.get("/me", authenticate, (req, res) => {
    res.json({
        message: "Authenticated",
        user: req.user
    });

});



//add projects routes
app.post("/projects", authenticate, async (req, res) => {
    try{
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({
                message: "Project name required"
            });
        }
        const apiKey =
        "obs_live_" +
        crypto.randomBytes(24).toString("hex");
        const result = await pool.query(
        `
        INSERT INTO projects(
            user_id,
            name,
            api_key
        )
        VALUES($1,$2,$3)
        RETURNING *
        `,
        [
            req.user.id,
            name,
            apiKey
        ]
        );
        res.status(201).json(result.rows[0]);
    } catch(err){
        console.log(err);
        res.status(500).json({
            message: "Internal server error"
        });
    }

});

//delete projects route
app.delete("/projects/:id", authenticate, async (req, res) => {
    try {
        const projectId = req.params.id;
        const result = await pool.query(
            `
            DELETE FROM projects
            WHERE id = $1
            AND user_id = $2
            RETURNING *
            `,
            [
                projectId,
                req.user.id
            ]
        );
        if(result.rows.length === 0){
            return res.status(404).json({
                message:"Project not found"
            });
        }
        res.json({
            message:"Project deleted"
        });

    } catch(err){
        console.log(err);
        res.sendStatus(500);
    }
});

//add logs to queue
app.post("/v1/logs", apiKeyMiddleware, async (req, res) => {
    try{
        const {
            service_name,
            level,
            message
        } = req.body;

        await logQueue.add(
            "process-log",
            {
                service_name,
                level,
                message,
                project_id: req.project.id
            }
        );
        res.status(200).json({
            message: "Log received"
        });
    }catch(err){
        console.log(err);
        res.status(500).json({
            message: "Internal server error"
        });
    }

});

//all projects route
app.get("/projects", authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT *
            FROM projects
            WHERE user_id = $1
            ORDER BY created_at DESC
            `,
            [req.user.id]
        );

        res.json(result.rows);

    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//get all logs route
app.get("/analytics/logs",authenticate, async (req, res) => {
    try{
        const projectId = req.query.project;
        const result = await pool.query(
            `
            SELECT *
            FROM logs
            WHERE project_id = $1
            ORDER BY created_at DESC
            `,
            [projectId]
        );
        res.json(result.rows);
    }catch{
        console.log("error occured");
        res.status(500).json({
            message: "Internal server error"
        });
    }

});


//get overview
app.get("/analytics/overview",authenticate, async (req, res) => {
    try {
        const projectId = req.query.project;
        const result = await pool.query(`
            SELECT
                COUNT(*) AS total_logs,

                COUNT(CASE
                    WHEN level='ERROR'
                    THEN 1
                END) AS error_logs,

                COUNT(CASE
                    WHEN level='WARNING'
                    THEN 1
                END) AS warn_logs,

                COUNT(CASE
                    WHEN level='INFO'
                    THEN 1
                END) AS info_logs
            FROM logs
            WHERE project_id = $1;
        `,
            [projectId]
    );

        const waiting = await logQueue.getWaitingCount();
        const active = await logQueue.getActiveCount();
        const failed = await logQueue.getFailedCount();
        const delayed = await logQueue.getDelayedCount();

        const overview = result.rows[0];

        res.json({
            total_logs: Number(overview.total_logs),
            error_logs: Number(overview.error_logs),
            warn_logs: Number(overview.warn_logs),
            info_logs: Number(overview.info_logs),

            queue: {
                waiting,
                active,
                failed,
                delayed
            }
        });

    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

//get top services
app.get("/analytics/services",authenticate, async (req,res)=>{
    try{
        const projectId = req.query.project;
        const result = await pool.query(
            `
            SELECT service_name,
                COUNT(*) AS count
            FROM logs
            WHERE project_id = $1
            GROUP BY service_name
            ORDER BY count DESC
            `,
        [projectId]
        );

        res.json(result.rows);
    }catch{
        console.log("error occured");
        res.status(500).json({
            message: "Internal server error"
        });
    }
});