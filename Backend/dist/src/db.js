"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
// Check required env variables for local DB
const requiredEnv = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT'];
requiredEnv.forEach((key) => {
    if (!process.env[key]) {
        console.warn(`⚠️ Environment variable ${key} is missing`);
    }
});
// ✅ Create pool for local PostgreSQL
const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost', // Default to localhost
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
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
