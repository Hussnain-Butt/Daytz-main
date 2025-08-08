"use strict";
// aws.ts
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const credential_provider_env_1 = require("@aws-sdk/credential-provider-env");
// --- Debugging Logs ---
console.log('--- AWS S3 Client Configuration ---');
const configuredRegion = process.env.AWS_REGION;
const accessKeyIdPreview = process.env.AWS_ACCESS_KEY_ID
    ? process.env.AWS_ACCESS_KEY_ID.substring(0, 5) + '...'
    : 'Not Set';
const isSecretKeySet = process.env.AWS_SECRET_ACCESS_KEY ? 'Yes' : 'No / Not Set';
console.log('Attempting to load AWS_REGION from env:', configuredRegion);
console.log('Attempting to load AWS_ACCESS_KEY_ID from env (first 5 chars):', accessKeyIdPreview);
console.log('Is AWS_SECRET_ACCESS_KEY set in env?:', isSecretKeySet);
// --- End of Debugging Logs ---
if (!configuredRegion) {
    console.error('CRITICAL: AWS_REGION environment variable is not set. S3 client might not work correctly.');
}
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('CRITICAL: AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY environment variable is not set. S3 client will fail.');
}
// Configuring the AWS S3 client
const s3Client = new client_s3_1.S3Client({
    region: 'us-east-1', // CORRECT: Uses region from environment variable (e.g., 'us-east-1')
    credentials: (0, credential_provider_env_1.fromEnv)(), // Uses AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY from env
});
console.log(`S3Client instance created. Configured to use region: ${configuredRegion || 'Fallback/Default'}`);
console.log('-----------------------------------');
exports.default = s3Client; // Exporting as s3Client, you can rename back to 's3' if you prefer
