"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
// Configure dotenv at the very top to load environment variables IMMEDIATELY
dotenv_1.default.config();
// Check required env variables for local DB
const requiredEnv = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT'];
requiredEnv.forEach((key) => {
    if (!process.env[key]) {
        // This warning will now show the correct status because dotenv has run
        console.warn(`⚠️ Environment variable ${key} is missing after dotenv.config()`);
    }
});
// ✅ Create pool for local PostgreSQL
const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD, // This will now have a value
    port: parseInt(process.env.DB_PORT || '5432'),
};
const pool = new pg_1.Pool(dbConfig);
// ✅ Check connection immediately
pool
    .query('SELECT NOW()')
    .then((res) => {
    console.log('✅ PostgreSQL Connected Successfully at:', res.rows[0].now);
})
    .catch((err) => {
    console.error('❌ PostgreSQL Connection Failed:', err);
});
exports.default = pool;
