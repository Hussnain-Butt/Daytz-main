// src/scripts/migrate.ts

import { Pool } from 'pg'
import 'dotenv/config'
import fs from 'fs'
import path from 'path'

// Check if DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  throw new Error('FATAL ERROR: DATABASE_URL is not defined in environment variables.')
}

// Create a new pool instance for the migration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Railway and other cloud providers
  },
})

const runMigration = async () => {
  try {
    console.log('🚀 Starting database migration...')

    // 1. Connect to the database
    const client = await pool.connect()
    console.log('✅ Connected to database.')

    // 2. Find and read the create.sql file
    // __dirname is the current folder (dist/src/scripts), so we go up three levels to the project root.
    // path.resolve is more reliable for creating an absolute path.
    // Nayi Line:
    const sqlFilePath = path.resolve(__dirname, '../../db/scripts/create.sql')
    console.log(`🔍 Reading SQL file from: ${sqlFilePath}`)
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8')

    // 3. Execute the entire SQL script
    console.log('⏳ Executing SQL script to create tables, types, and functions...')
    await client.query(sqlScript)
    console.log('✅ SQL script executed successfully. Tables are ready!')

    // 4. Release the client and end the pool
    client.release()
    await pool.end()
    console.log('🏁 Migration finished successfully.')
    process.exit(0) // Exit with a success code
  } catch (err) {
    console.error('❌ Error during database migration:', err)
    process.exit(1) // Exit with a failure code
  }
}

runMigration()
