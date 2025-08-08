"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandlerExample = exports.asyncHandler = exports.logAfterJwt = exports.extractUserId = exports.checkJwt = exports.logAuthHeader = void 0;
const express_oauth2_jwt_bearer_1 = require("express-oauth2-jwt-bearer");
// --- Configuration ---
const AUTH0_DOMAIN = 'dev-il3jgemg2szpurs5.us.auth0.com';
// !! CRITICAL !! This MUST EXACTLY match:
// 1. The 'Identifier' (Audience) of your API in the Auth0 Dashboard (APIs section).
// 2. The `audience` parameter passed in `useAuthRequest` and `refreshAccessToken` in your frontend AuthContext.
const AUTH0_AUDIENCE = 'https://api.daytz.app/v1';
if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
    console.error('FATAL ERROR: Auth0 Domain or Audience is missing or incorrect in middleware.ts.');
    console.error('Check AUTH0_DOMAIN and AUTH0_AUDIENCE variables.');
    process.exit(1); // Stop the server if config is missing
}
// --- JWT Check Middleware Configuration ---
const checkJwtOptions = {
    audience: AUTH0_AUDIENCE, // Validate the audience claim (`aud`)
    issuerBaseURL: `https://${AUTH0_DOMAIN}/`, // Validate the issuer claim (`iss`)
    tokenSigningAlg: 'RS256', // Specify the expected signing algorithm (usually RS256 for Auth0)
};
console.log(`BACKEND: Configuring JWT check middleware with options:`, checkJwtOptions);
// --- Middleware to Log Header BEFORE JWT Validation ---
const logAuthHeader = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const requestPath = req.originalUrl || req.path; // Get the full path including query params if available
    console.log(`\n[BACKEND PRE-JWT] Request received for path: ${requestPath} at ${new Date().toISOString()}`); // Log path and time
    if (authHeader) {
        const headerPreview = authHeader.length > 30
            ? `${authHeader.substring(0, 15)}...${authHeader.substring(authHeader.length - 15)}`
            : authHeader;
        console.log(`[BACKEND PRE-JWT] Authorization Header (Preview): ${headerPreview}`);
        // --- !! TEMPORARY: Log FULL token for debugging - REMOVE AFTER DEBUGGING !! ---
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7); // Extract token part after 'Bearer '
            console.log(`--- [BACKEND DEBUG] Full Token Received START ---\n${token}\n--- [BACKEND DEBUG] Full Token Received END ---`);
            // Basic check for JWT structure (3 parts separated by dots)
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.warn(`[BACKEND DEBUG] WARNING: Received token does NOT have 3 parts separated by dots. Structure: ${parts.length} parts.`);
            }
            else {
                console.log(`[BACKEND DEBUG] Received token appears to have JWT structure (3 parts).`);
            }
        }
        else {
            console.warn(`[BACKEND DEBUG] Auth Header present but not a Bearer token: ${authHeader}`);
        }
        // --- *** END FULL TOKEN DEBUG LOGGING *** ---
    }
    else {
        console.warn(`[BACKEND PRE-JWT] Authorization Header: Not Present for path ${requestPath}`);
    }
    next(); // Continue to the next middleware (which should be checkJwt)
};
exports.logAuthHeader = logAuthHeader;
// Initialize the JWT validation middleware from express-oauth2-jwt-bearer
exports.checkJwt = (0, express_oauth2_jwt_bearer_1.auth)(checkJwtOptions);
// --- Extract User ID Middleware (Runs AFTER checkJwt Succeeds) ---
const extractUserId = (req, res, next) => {
    var _a, _b, _c;
    // checkJwt should have populated req.auth if validation passed
    const userId = (_b = (_a = req.auth) === null || _a === void 0 ? void 0 : _a.payload) === null || _b === void 0 ? void 0 : _b.sub; // 'sub' claim is the standard Auth0 user ID
    if (typeof userId === 'string' && userId) {
        // Attach userId to the request object for use in subsequent route handlers
        // Using 'any' for simplicity, consider Express Request type augmentation for better type safety
        ;
        req.userId = userId;
        console.log(`[BACKEND POST-JWT] User ID extracted: ${userId} for path ${req.originalUrl || req.path}`); // Log successful extraction
        next(); // Proceed to the next middleware or route handler
    }
    else {
        // This should ideally not happen if checkJwt passed, but it's a safety check.
        console.error(`[BACKEND Middleware Error] FATAL: Could not extract user ID ('sub' claim) from req.auth.payload AFTER JWT validation succeeded for path ${req.originalUrl || req.path}.`, `Payload received: ${JSON.stringify((_c = req.auth) === null || _c === void 0 ? void 0 : _c.payload)}`);
        // Send 500 Internal Server Error because this indicates a logic flaw
        res
            .status(500)
            .json({ message: 'Internal Server Error: Invalid token state after validation.' });
    }
};
exports.extractUserId = extractUserId;
// --- Optional Logging Middleware (Runs AFTER checkJwt Succeeds) ---
const logAfterJwt = (req, res, next) => {
    console.log(`[BACKEND POST-JWT] JWT successfully validated for path: ${req.originalUrl || req.path}.`);
    // Optionally log specific payload claims if needed for debugging:
    // console.log(`[BACKEND POST-JWT] Payload Keys:`, req.auth?.payload ? Object.keys(req.auth.payload) : 'N/A');
    // console.log(`[BACKEND POST-JWT] Issuer (iss): ${req.auth?.payload?.iss}`);
    // console.log(`[BACKEND POST-JWT] Audience (aud): ${JSON.stringify(req.auth?.payload?.aud)}`);
    next();
};
exports.logAfterJwt = logAfterJwt;
// --- Async Handler Wrapper (Utility for route handlers) ---
// Wraps async route handlers to automatically catch errors and pass them to Express's error handling middleware
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); // Pass errors using next(error)
exports.asyncHandler = asyncHandler;
// --- EXAMPLE Global Error Handler ---
/**
 * !!! IMPORTANT !!!
 * Place this error handling middleware in your main server file (e.g., app.ts or server.ts)
 * AFTER all your routes have been defined (e.g., after `app.use('/api', routes);`).
 * This acts as a catch-all for errors occurring in your routes or middleware.
 */
const globalErrorHandlerExample = (err, req, res, next) => {
    console.error('\n--- [BACKEND] Global Error Handler Caught ---');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Request Path:', req.originalUrl || req.path);
    console.error('Request Method:', req.method);
    console.error('Error Type:', err.constructor.name); // e.g., InvalidTokenError, Error, TypeError
    console.error('Error Message:', err.message);
    // Specific handling for express-oauth2-jwt-bearer errors
    if (err instanceof express_oauth2_jwt_bearer_1.InvalidTokenError) {
        console.error('InvalidTokenError Details:', {
            code: err.code, // e.g., 'invalid_token', 'insufficient_scope'
            status: err.status, // HTTP status code (usually 401 or 403)
            headers: err.headers, // Contains WWW-Authenticate header
        });
        // Log stack trace for debugging where the error originated
        console.error('Stack Trace:', err.stack);
        console.error('--- [BACKEND] End Global Error Handler ---');
        // Use the status and headers provided by the InvalidTokenError object
        return res.status(err.status).set(err.headers).json({ message: err.message });
    }
    // Log stack trace for other types of errors
    console.error('Stack Trace:', err.stack);
    // General fallback for other errors
    // Check if the error object has a status or statusCode property
    const statusCode = err.status || err.statusCode || 500; // Default to 500 Internal Server Error
    const message = err.message || 'Internal Server Error'; // Use error message or a generic one
    console.error('Responding with Status:', statusCode);
    console.error('--- [BACKEND] End Global Error Handler ---\n');
    // Avoid sending stack trace in production responses
    if (process.env.NODE_ENV === 'production') {
        res.status(statusCode).json({ message: 'An unexpected error occurred.' });
    }
    else {
        // In development, you might want to send more details (or just the message)
        res.status(statusCode).json({ message: message });
    }
};
exports.globalErrorHandlerExample = globalErrorHandlerExample;
// --- Make sure your main server file uses the global error handler ---
// Example in app.ts/server.ts:
// const app = express();
// ... other middleware (cors, json parser, etc.) ...
// app.use('/api', apiRoutes); // Your API routes
// app.use(globalErrorHandlerExample); // Add the error handler LAST
// app.listen(...)
