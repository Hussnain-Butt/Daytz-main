// Import environment variables FIRST
import 'dotenv/config'
// Import necessary modules
import express, { Application, Request, Response, NextFunction, Express } from 'express'
import bodyParser from 'body-parser'
import cors from 'cors' // CORS middleware import karna
import routes from './routes' // Apne routes file ko import karna (path check kar lein)
import { setupSwagger } from './swagger' // Swagger setup ko import karna (path check kar lein)

// Express application banayein
const app: Application = express()

// Port define karen (environment variable se ya default 3000)
const PORT = process.env.PORT || 3000

// Swagger setup karen (agar use kar rahe hain)
setupSwagger(app as Express)

// --- CORS Configuration ---
// Define karen kaunse URLs (origins) aapke backend ko access kar sakte hain
const allowedOrigins = [
  'https://2c4d-2400-adc5-173-bd00-5a6-36ef-c7d6-f6af.ngrok-free.app', // your ngrok
  'http://localhost:8081', // Expo web or other local client
  'https://backend-production-7442.up.railway.app', // Your specific local IP for mobile dev
  // Development ke liye aapke local IP ko bhi add karna accha rehta hai
  'http://localhost:3000',
  'http://192.168.1.6:8081', // Example: Frontend running on this IP
]

// CORS options configure karen
const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Agar request kisi browser se nahi (jaise mobile app, Postman, Thunder Client) ya allowed origin se hai, toh allow karen
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true) // Allow request
    } else {
      console.error(`CORS Error: Origin ${origin} not allowed.`) // Log karen kaunsa origin block hua
      callback(new Error('Not allowed by CORS')) // Block request
    }
  },
  // Allowed HTTP methods (OPTIONS preflight ke liye zaroori hai)
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  // Allowed headers (Authorization token bhej ne ke liye zaroori hai)
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Agar aap cookies ya authorization headers use kar rahe hain cross-origin
  credentials: true,
}

// --- Middleware Apply Karen ---

// 1. CORS Middleware (Routes se pehle apply karna zaroori hai)
console.log('Applying CORS middleware...')
app.use(cors(corsOptions))

// 2. Body Parser Middleware (JSON aur URL-encoded data parse karne ke liye)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// 3. API Routes Middleware (CORS aur BodyParser ke baad)
// *** YEH SABSE ZAROORI BADLAAV HAI ***
// Yeh Express ko batata hai ki '/api' se shuru hone wali sabhi requests ko 'routes' file handle karegi
console.log("Applying API routes with '/api' prefix...")
app.use('/api', routes)

// --- Error Handling & Not Found ---

// 4. Catch-all Route (Agar koi upar wala route match na ho, khaas kar /api ke bahar wale)
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }) // JSON response bhejein
})

// 5. Global Error Handling Middleware (Ye sabse aakhir mein rakhein)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Global Error Handler Caught:', err.stack || err) // Error ko server console pe log karen

  // Agar ye CORS error hai jo humne configure kiya tha
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: err.message }) // Forbidden status bhejein
  }

  // Baaki ke errors ke liye general response
  res.status(err.status || 500).json({
    message: err.message || 'An internal server error occurred.',
  })
})

// --- Server Start Karen ---
app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`)
  console.log(`CORS enabled for origins: ${allowedOrigins.join(', ')}`)
})

// Optional: Export app agar testing wagera ke liye zaroorat ho
// export default app;
