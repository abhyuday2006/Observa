const pool = require("./db");

async function apiKeyMiddleware(req, res, next) {
    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "API Key missing"
            });
        }

        const apiKey = authHeader.split(" ")[1];

        const result = await pool.query(
            `
            SELECT *
            FROM projects
            WHERE api_key = $1
            `,
            [apiKey]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid API Key"
            });
        }

        req.project = result.rows[0];

        next();

    } catch (err) {
        console.log(err);

        res.status(500).json({
            message: "Internal Server Error"
        });
    }
}

module.exports = apiKeyMiddleware;