// import { Pool } from 'pg'
// import dotenv from 'dotenv'

// // Configure dotenv at the very top to load environment variables IMMEDIATELY
// dotenv.config()

// // Check required env variables for local DB
// const requiredEnv = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT']
// requiredEnv.forEach((key) => {
//   if (!process.env[key]) {
//     // This warning will now show the correct status because dotenv has run
//     console.warn(`⚠️ Environment variable ${key} is missing after dotenv.config()`)
//   }
// })

// // ✅ Create pool for local PostgreSQL
// const dbConfig = {
//   user: process.env.DB_USER as string,
//   host: (process.env.DB_HOST as string) || 'localhost',
//   database: process.env.DB_NAME as string,
//   password: process.env.DB_PASSWORD as string, // This will now have a value
//   port: parseInt(process.env.DB_PORT || '5432'),
// }

// const pool = new Pool(dbConfig)

// // ✅ Check connection immediately
// pool
//   .query('SELECT NOW()')
//   .then((res) => {
//     console.log('✅ PostgreSQL Connected Successfully at:', res.rows[0].now)
//   })
//   .catch((err) => {
//     console.error('❌ PostgreSQL Connection Failed:', err)
//   })

// export default pool

// // src/db.ts

// // import { Pool } from 'pg'
// // import dotenv from 'dotenv'

// // dotenv.config()

// // let pool: Pool

// // // Agar PRODUCTION (Railway) environment hai, toh DATABASE_URL istemal hoga
// // if (process.env.DATABASE_URL) {
// //   console.log('✅ Connecting to production database using DATABASE_URL...')
// //   pool = new Pool({
// //     connectionString: process.env.DATABASE_URL,
// //     // Yeh SSL setting cloud providers jaise Railway ke liye zaroori hai
// //     ssl: {
// //       rejectUnauthorized: false,
// //     },
// //   })
// // }
// // // Warna LOCAL environment ke liye purana tareeqa istemal hoga
// // else {
// //   console.log('🔍 DATABASE_URL nahi mila. Local database configuration istemal ki ja rahi hai...')
// //   const dbConfig = {
// //     user: process.env.DB_USER,
// //     host: process.env.DB_HOST,
// //     database: process.env.DB_NAME,
// //     password: process.env.DB_PASSWORD,
// //     port: parseInt(process.env.DB_PORT || '5432'),
// //   }
// //   pool = new Pool(dbConfig)
// // }

// // // Connection check karein
// // pool
// //   .query('SELECT NOW()')
// //   .then((res) => {
// //     console.log('✅ PostgreSQL Connected Successfully at:', res.rows[0].now)
// //   })
// //   .catch((err) => {
// //     console.error('❌ PostgreSQL Connection Failed:', err)
// //   })

// // export default pool

// src / db.ts

import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

let pool: Pool

// Agar PRODUCTION (Railway) environment hai, toh DATABASE_URL istemal hoga
if (process.env.DATABASE_URL) {
  console.log('✅ Connecting to production database using DATABASE_URL...')
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Yeh SSL setting cloud providers jaise Railway ke liye zaroori hai
    ssl: {
      rejectUnauthorized: false,
    },
  })
}
// Warna LOCAL environment ke liye purana tareeqa istemal hoga
else {
  console.log('🔍 DATABASE_URL nahi mila. Local database configuration istemal ki ja rahi hai...')
  const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
  }
  pool = new Pool(dbConfig)
}

// Connection check karein
pool
  .query('SELECT NOW()')
  .then((res) => {
    console.log('✅ PostgreSQL Connected Successfully at:', res.rows[0].now)
  })
  .catch((err) => {
    console.error('❌ PostgreSQL Connection Failed:', err)
  })

export default pool
