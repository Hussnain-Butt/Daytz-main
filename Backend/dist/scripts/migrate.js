"use strict";
// src/scripts/migrate.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Check if DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
    throw new Error('FATAL ERROR: DATABASE_URL is not defined in environment variables.');
}
// Create a new pool instance for the migration
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Required for Railway and other cloud providers
    },
});
const runMigration = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🚀 Starting database migration...');
        // 1. Connect to the database
        const client = yield pool.connect();
        console.log('✅ Connected to database.');
        // 2. Find and read the create.sql file
        // __dirname is the current folder (dist/src/scripts), so we go up three levels to the project root.
        // path.resolve is more reliable for creating an absolute path.
        const sqlFilePath = path_1.default.resolve(__dirname, '..', '..', '..', 'db', 'scripts', 'create.sql');
        console.log(`🔍 Reading SQL file from: ${sqlFilePath}`);
        const sqlScript = fs_1.default.readFileSync(sqlFilePath, 'utf8');
        // 3. Execute the entire SQL script
        console.log('⏳ Executing SQL script to create tables, types, and functions...');
        yield client.query(sqlScript);
        console.log('✅ SQL script executed successfully. Tables are ready!');
        // 4. Release the client and end the pool
        client.release();
        yield pool.end();
        console.log('🏁 Migration finished successfully.');
        process.exit(0); // Exit with a success code
    }
    catch (err) {
        console.error('❌ Error during database migration:', err);
        process.exit(1); // Exit with a failure code
    }
});
runMigration();
