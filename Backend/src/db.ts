// File: src/db.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

let pool: Pool

// --- Connection Pool Configuration ---

// Option 1: Production Environment (e.g., Railway, Heroku, Render)
// Checks for DATABASE_URL which is the standard for most cloud providers.
if (process.env.DATABASE_URL) {
  console.log('✅ [DB] Connecting to PRODUCTION database using DATABASE_URL...')
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // This SSL setting is often required for secure connections to cloud databases
    ssl: {
      rejectUnauthorized: false,
    },
    // Recommended production settings for a robust pool
    max: 20, // Max number of clients in the pool
    idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
    connectionTimeoutMillis: 10000, // How long to wait for a connection from the pool
  })
}
// Option 2: Local Development Environment
// Falls back to using individual DB variables from your .env file.
else {
  console.log('🔍 [DB] DATABASE_URL not found. Using LOCAL database configuration...')

  // Validate that required local variables are present
  const requiredEnv = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT']
  requiredEnv.forEach((key) => {
    if (!process.env[key]) {
      console.error(`❌ [DB] FATAL ERROR: Local environment variable ${key} is missing.`)
      // Exit the process if a critical configuration is missing to avoid runtime errors
      process.exit(1)
    }
  })

  const dbConfig = {
    user: process.env.DB_USER as string,
    host: process.env.DB_HOST as string,
    database: process.env.DB_NAME as string,
    password: process.env.DB_PASSWORD as string,
    port: parseInt(process.env.DB_PORT || '5432', 10),
  }
  pool = new Pool(dbConfig)
}

// --- Pool Event Listeners for Resilience and Logging ---

// CRITICAL: Global error listener for the pool.
// This handles errors on idle clients that disconnect in the background,
// preventing the entire Node.js application from crashing.
pool.on('error', (err, client) => {
  console.error('[DB Pool Error] An unexpected error occurred on an idle client:', err)
  // The pool will automatically try to remove the client and handle the error.
  // No need to exit the process here.
})

// Optional: Log when a new client is connected (useful for debugging)
pool.on('connect', (client) => {
  console.log('[DB Pool Log] A new client has connected to the database.')
})

// Optional: Log when a client is removed (useful for debugging)
pool.on('remove', (client) => {
  console.log('[DB Pool Log] A client has been removed from the pool.')
})

// --- Initial Connection Check ---
// Perform a single query on startup to confirm the configuration is correct.
pool
  .query('SELECT NOW()')
  .then((res) => {
    console.log(
      '✅ [DB] PostgreSQL Database connected successfully. Current time:',
      res.rows[0].now,
    )
  })
  .catch((err) => {
    console.error('❌ [DB] FATAL: Initial PostgreSQL connection failed:', err)
    // If the initial connection fails, something is wrong with the credentials or network.
    // It's better to stop the application from starting.
    process.exit(1)
  })

// Export the configured pool for use in repositories
export default pool
