"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// File: src/config/vimeo.ts
require("dotenv/config"); // Ensures .env is loaded at the very start
const clientId = '99b708a9de9b26d9acff120bac0cc7d125f0d667';
const clientSecret = 'egj7V3BgUQkhQ7yBV3Yco8uGIgPrlHIjdgqcop4RSbm2+N2LH8Lgt3RAwZJ8i3Rp7ke3Uw5ieGRLuN53+lgVfuTJkYjaVf9XptMF1LNI40LvSmzNch/GgbNDVqeM91rh';
const accessToken = 'a80d2aad19dafa2e5980b4da79ee5828';
if (!clientId || !clientSecret || !accessToken) {
    console.warn('VIMEO CRITICAL WARNING: Missing VIMEO_CLIENT_ID, VIMEO_CLIENT_SECRET, or VIMEO_ACCESS_TOKEN in environment variables. Vimeo API calls WILL FAIL.');
    // Optionally, you could throw an error here to prevent the app from starting
    // throw new Error("Vimeo credentials missing, application cannot start.");
}
else {
    console.log('Vimeo client will be configured with credentials from environment variables.');
}
// The 'vimeo' package might not have default ES6 export, or types might be tricky.
// Using 'require' is a common workaround.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const VimeoLib = require('vimeo').Vimeo;
// Initialize client only if all credentials are provided
let client = null; // Use 'any' if actual type from 'vimeo' package is hard to use
if (clientId && clientSecret && accessToken) {
    try {
        client = new VimeoLib(clientId, clientSecret, accessToken);
        console.log('Vimeo client configured successfully.');
    }
    catch (e) {
        console.error('Failed to initialize Vimeo client:', e);
        // client remains null, API calls will fail
    }
}
else {
    console.error('Vimeo client NOT configured due to missing credentials.');
}
exports.default = client; // This will be the initialized Vimeo client instance, or null if config failed
