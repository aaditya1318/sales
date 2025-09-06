"use strict";
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const database = require("./config/db");
const rateLimit = require("express-rate-limit");

const PORT = process.env.PORT;
const NODE_ENV = process.env.NODE_ENV;

const routes = require("./routes");
const seedOffice = require("./seed/seed");

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = NODE_ENV === "development" ? 1000 : 100;

const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
});

const app = express();
app.set('trust proxy', 1);

app.use(cors());

app.use((req, res, next) => {
    const { method, url } = req;
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`[${timestamp}] ${method} ${url}`);
    next();
});


app.use(express.json());
app.use(limiter);
app.use("/api", routes); 

app.get("/health", async (req, res) => {
    try {
        res.status(200).send("OK");
    } catch (err) {
        res.status(503).send("Service Unavailable");
    }
});

app.use((req, res, next) => {
    return res.status(404).json({
        message: "Invalid route. The requested route does not exist."
    });
});

app.use((err, req, res, next) => {
    console.log('err: ', err);
    let message = 'Something went wrong. Please try again later.';
    let status = err.status || 500;

    // Mongoose Duplicate Key Error
    if (err.code === 11000 || err.name === 'MongoServerError') {
        const field = Object?.keys(err?.keyValue || {})[0];
        message = `${field} must be unique. "${err?.keyValue?.[field]}" is already in use.`;
        status = 400;
    }

    // Mongoose Validation Error
    else if (err.name === 'ValidationError') {
        message = Object.values(err.errors)?.[0]?.message || 'Validation error';
        status = 400;
    }

    // Mongoose CastError
    else if (err.name === 'CastError') {
        message = `Invalid ${err.path}: ${err.value}`;
        status = 400;
    }

    // Axios Error (from another service)
    else if (err.isAxiosError) {
        const axiosMsg =
            err.response?.data?.message ||              // your custom error message
            err.response?.data?.error ||               // fallback to error field
            JSON.stringify(err.response?.data) ||      // stringified response
            err.message;                               // final fallback

        message = `Upstream service error: ${axiosMsg}`;
        status = err.response?.status || 500;
    }

    // Development mode: show more details
    if (process.env.NODE_ENV === 'development') {
        console.error('🔴 Error Message:', err.message);
        if (err.cause) console.error('📌 Error Cause:', err.cause);
        if (err.stack) console.error('🛠️ Stack Trace:', err.stack);
        if (err.isAxiosError) {
            console.error('📡 Axios Response:', err.response?.data);
        }
        message = err.message;
    }  

    return res.status(status).json({
        success: false,
        message,
        data: [],
        code: status,
    });
});

app.listen(PORT, () => {
    database.connect();
    seedOffice();
    console.log(`Server is Up on ${PORT}`);
});
