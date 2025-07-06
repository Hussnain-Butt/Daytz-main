"use strict";
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
// File: src/services/external/AwsService.ts
const client_s3_1 = require("@aws-sdk/client-s3");
// Ensure this path is correct and 's3Client' (or 's3') is the exported S3Client instance
const aws_1 = __importDefault(require("../../aws")); // Renamed import for clarity to s3ClientInstance
class AwsService {
    getMimeType(key) {
        var _a;
        if (!key || typeof key !== 'string') {
            console.warn('AwsService: getMimeType received invalid key.');
            return undefined;
        }
        const extension = (_a = key.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        switch (extension) {
            case 'jpg':
            case 'jpeg':
                return 'image/jpeg';
            case 'png':
                return 'image/png';
            case 'gif':
                return 'image/gif';
            case 'webp':
                return 'image/webp';
            // Add more common image MIME types as needed
            default:
                console.warn(`AwsService: Unknown extension ".${extension}" for key "${key}". MIME type not set.`);
                return undefined; // Let S3 infer, or set a default like 'application/octet-stream' if required
        }
    }
    /**
     * Stores an image in the specified S3 bucket.
     * @param imageData The image data as a Buffer.
     * @param bucketName The name of the S3 bucket.
     * @param key The S3 object key (path/filename).
     * @throws Will throw an error if the upload fails.
     */
    storeImage(imageData, bucketName, key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!imageData || !bucketName || !key) {
                const errorMsg = 'AwsService: storeImage called with invalid parameters.';
                console.error(errorMsg, { hasImageData: !!imageData, bucketName, key });
                throw new Error(errorMsg);
            }
            const contentType = this.getMimeType(key);
            const params = {
                Bucket: bucketName,
                Key: key,
                Body: imageData,
                // ACL: ObjectCannedACL.public_read, // Makes the object publicly readable
                ContentType: contentType,
            };
            // If ContentType is undefined, AWS SDK might try to infer it,
            // or you might choose to remove it or set a default like 'application/octet-stream'.
            // For this example, we'll send it even if undefined.
            if (!contentType) {
                console.warn(`AwsService: ContentType for ${key} is undefined. S3 will attempt to infer.`);
            }
            try {
                const command = new client_s3_1.PutObjectCommand(params);
                // Using the imported s3ClientInstance
                yield aws_1.default.send(command);
                console.log(`AwsService: Successfully uploaded ${key} to ${bucketName}`);
            }
            catch (error) {
                console.error(`AwsService: Error uploading "${key}" to S3 bucket "${bucketName}":`, error);
                // Ensure the error is an instance of Error for consistent handling downstream
                if (error instanceof Error) {
                    throw error;
                }
                else {
                    throw new Error(`Unknown error during S3 upload: ${String(error)}`);
                }
            }
        });
    }
    /**
     * Deletes an image from the specified S3 bucket.
     * @param bucketName The name of the S3 bucket.
     * @param key The S3 object key (path/filename).
     * @throws Will throw an error if the deletion fails.
     */
    deleteImage(bucketName, key) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!bucketName || !key) {
                const errorMsg = 'AwsService: deleteImage called with invalid parameters.';
                console.error(errorMsg, { bucketName, key });
                throw new Error(errorMsg);
            }
            const params = {
                Bucket: bucketName,
                Key: key,
            };
            try {
                const command = new client_s3_1.DeleteObjectCommand(params);
                // Using the imported s3ClientInstance
                yield aws_1.default.send(command);
                console.log(`AwsService: Successfully deleted ${key} from ${bucketName}`);
            }
            catch (error) {
                console.error(`AwsService: Error deleting "${key}" from S3 bucket "${bucketName}":`, error);
                if (error instanceof Error) {
                    throw error;
                }
                else {
                    throw new Error(`Unknown error during S3 deletion: ${String(error)}`);
                }
            }
        });
    }
}
exports.default = AwsService;
