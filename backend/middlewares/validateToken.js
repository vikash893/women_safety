const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_secret_123";

const validateToken = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.Authorization || req.headers.authorization;

    // 1. Reject immediately if no Authorization header exists
    if (!authHeader || !authHeader.startsWith("Bearer")) {
        res.status(401);
        throw new Error("Authorization header missing or malformed. Expected: Bearer <token>");
    }

    const token = authHeader.split(" ")[1];

    // 2. Reject if token portion is empty
    if (!token) {
        res.status(401);
        throw new Error("Access token is missing after Bearer prefix");
    }

    // 3. Verify the token
    try {
        const decoded = jwt.verify(token, ACCESS_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            res.status(401);
            throw new Error("Access token has expired. Please refresh your session.");
        }
        res.status(401);
        throw new Error("Invalid or corrupted access token");
    }
});

module.exports = validateToken;