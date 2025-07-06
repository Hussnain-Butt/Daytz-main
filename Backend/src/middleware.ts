// File: src/middleware.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

import { Request, Response, NextFunction } from 'express'
import { auth, AuthOptions, InvalidTokenError } from 'express-oauth2-jwt-bearer'
import { validationResult } from 'express-validator' // Assuming you might use this elsewhere

// --- Configuration ---
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  console.error('FATAL ERROR: Auth0 Domain or Audience is not set in environment variables.')
  process.exit(1)
}

// ✅ FIX: Exporting CustomRequest to be used in other files
export interface CustomRequest extends Request {
  userId?: string // This will hold the Auth0 'sub' claim
}

// --- JWT Check Middleware Configuration ---
const checkJwtOptions: AuthOptions = {
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256',
}

console.log(`BACKEND: JWT check configured for audience: ${AUTH0_AUDIENCE}`)

// --- Middleware to Log Header BEFORE JWT Validation ---
export const logAuthHeader = (req: Request, res: Response, next: NextFunction) => {
  const requestPath = req.originalUrl || req.path
  console.log(
    `\n[BACKEND PRE-JWT] Request for: ${req.method} ${requestPath} at ${new Date().toISOString()}`,
  )
  if (req.headers.authorization) {
    console.log(`[BACKEND PRE-JWT] Auth Header: Present`)
  } else {
    console.warn(`[BACKEND PRE-JWT] Auth Header: Missing`)
  }
  next()
}

// --- JWT Validation Middleware ---
export const checkJwt = auth(checkJwtOptions)

// --- Extract User ID Middleware (Runs AFTER checkJwt) ---
// This uses the CustomRequest type we defined and exported
export const extractUserId = (req: CustomRequest, res: Response, next: NextFunction) => {
  const userId = req.auth?.payload?.sub
  if (typeof userId === 'string' && userId) {
    req.userId = userId
    console.log(
      `[BACKEND POST-JWT] User ID extracted: ${userId} for path ${req.originalUrl || req.path}`,
    )
    next()
  } else {
    console.error(
      `[BACKEND Middleware Error] Could not extract user ID ('sub') from token payload.`,
    )
    res.status(401).json({ message: 'Invalid token: User identifier missing.' })
  }
}

// --- Optional Logging Middleware (Runs AFTER checkJwt) ---
export const logAfterJwt = (req: CustomRequest, res: Response, next: NextFunction) => {
  console.log(
    `[BACKEND POST-JWT] JWT successfully validated for path: ${req.originalUrl || req.path}.`,
  )
  next()
}

// --- Async Handler Wrapper ---
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next)

// --- Global Error Handler (to be used in your main server file) ---
export const globalErrorHandlerExample = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error('\n--- [BACKEND] Global Error Handler Caught ---')
  console.error('Error:', err.message)

  if (err instanceof InvalidTokenError) {
    console.error('JWT Error Details:', { code: err.code, status: err.status })
    return res.status(err.status).json({ message: err.message })
  }

  const statusCode = (err as any).status || 500
  res.status(statusCode).json({
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
  })
}
