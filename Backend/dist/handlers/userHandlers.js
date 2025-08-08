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
exports.registerPushTokenHandler = exports.deleteProfilePictureHandler = exports.uploadProfilePictureHandler = exports.deleteHomepageVideoHandler = exports.uploadHomepageVideoHandler = exports.processMonthlyTokenReplenishmentHandler = exports.getUserTokenBalanceHandler = exports.getUserByIdHandler = exports.updateUserHandler = exports.createUserHandler = void 0;
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises")); // For fs.unlink
const middleware_1 = require("../middleware");
const UserService_1 = __importDefault(require("../services/internal/UserService"));
const VimeoService_1 = __importDefault(require("../services/external/VimeoService"));
const UserRepository_1 = __importDefault(require("../repository/UserRepository")); // << IMPORT UserRepository
const uploadUtils_1 = require("../uploadUtils");
const userService = new UserService_1.default();
const vimeoService = new VimeoService_1.default();
const userRepository = new UserRepository_1.default(); // << INSTANTIATE UserRepository
console.log('[UserHandler] userService instance created:', typeof userService !== 'undefined');
console.log('[UserHandler] vimeoService instance created:', typeof vimeoService !== 'undefined');
console.log('[UserHandler] userRepository instance created:', typeof userRepository !== 'undefined');
// --- Create User Handler ---
exports.createUserHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const auth0UserId = req === null || req === void 0 ? void 0 : req.userId;
    if (!auth0UserId) {
        return res.status(401).json({ message: 'Unauthorized: User identifier missing from token.' });
    }
    try {
        let existingUser = yield userService.getUserById(auth0UserId);
        if (existingUser) {
            console.log(`[CreateUser] Auth0 User ${auth0UserId}: Already exists. DB ID: ${existingUser.userId}, Tokens: ${existingUser.tokens}. Returning existing data.`);
            return res.status(200).json(existingUser);
        }
        const { firstName, lastName, profilePictureUrl, email, zipcode } = req.body;
        // Validate email presence on request body as it's crucial
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ message: 'Email is required and must be a string.' });
        }
        const newUserInternalData = {
            userId: auth0UserId,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            email: email, // Pass validated email
            profilePictureUrl: profilePictureUrl || undefined,
            zipcode: zipcode || undefined,
        };
        console.log(`[CreateUser] Auth0 User ${auth0UserId}: Creating new user record with internal data:`, newUserInternalData);
        const createdUser = yield userService.createUser(newUserInternalData); // UserService handles initial tokens
        if (!createdUser) {
            console.error(`[CreateUser] User service failed to create user ${auth0UserId} but did not throw. This is unexpected.`);
            return res.status(500).json({ message: 'User creation failed unexpectedly.' });
        }
        console.log(`[CreateUser] Auth0 User ${auth0UserId}: User created successfully. DB ID: ${createdUser.userId}, Tokens: ${createdUser.tokens}, Profile Complete: ${createdUser.is_profile_complete}`);
        res.status(201).json(createdUser);
    }
    catch (error) {
        console.error(`[CreateUser] Error for Auth0 User ${auth0UserId}:`, error.message, error.stack);
        if (error.message &&
            error.message.toLowerCase().includes('duplicate key value violates unique constraint') &&
            error.message.toLowerCase().includes('users_email_key')) {
            console.warn(`[CreateUser] Duplicate email for user attempting to register with Auth0 ID ${auth0UserId}.`);
            return res.status(409).json({
                message: 'Email already in use. Please try a different email or log in if you have an existing account.',
            });
        }
        if (error.message &&
            error.message.toLowerCase().includes('duplicate key value violates unique constraint') &&
            (error.message.toLowerCase().includes('users_pkey') ||
                error.message.toLowerCase().includes(auth0UserId))) {
            console.warn(`[CreateUser] Potential race condition or re-creation attempt for user ${auth0UserId}. Re-fetching user.`);
            const userAfterError = yield userService.getUserById(auth0UserId);
            if (userAfterError) {
                return res.status(200).json(userAfterError);
            }
        }
        next(error);
    }
}));
// --- Update User Handler ---
exports.updateUserHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized.' });
    const updateDataFromRequest = req.body;
    const validUpdateData = {};
    if (updateDataFromRequest.firstName !== undefined)
        validUpdateData.firstName = updateDataFromRequest.firstName;
    if (updateDataFromRequest.lastName !== undefined)
        validUpdateData.lastName = updateDataFromRequest.lastName;
    if (updateDataFromRequest.zipcode !== undefined)
        validUpdateData.zipcode = updateDataFromRequest.zipcode;
    if (updateDataFromRequest.stickers !== undefined)
        validUpdateData.stickers = updateDataFromRequest.stickers;
    if (updateDataFromRequest.enableNotifications !== undefined &&
        updateDataFromRequest.enableNotifications !== null) {
        validUpdateData.enableNotifications = Boolean(updateDataFromRequest.enableNotifications);
    }
    if (updateDataFromRequest.is_profile_complete !== undefined &&
        updateDataFromRequest.is_profile_complete !== null) {
        validUpdateData.is_profile_complete = Boolean(updateDataFromRequest.is_profile_complete);
    }
    if (Object.keys(validUpdateData).length === 0) {
        console.warn(`[UpdateUser] User ${userId}: No valid fields from UpdateUserPayload for update. Fetching current user.`);
        const currentUser = yield userService.getUserById(userId);
        return res
            .status(200)
            .json(currentUser || { message: 'User not found, no update performed.' });
    }
    try {
        console.log(`[UpdateUser] User ${userId}: Updating with data:`, validUpdateData);
        const updatedUser = yield userService.updateUser(userId, validUpdateData);
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found or update failed.' });
        }
        console.log(`[UpdateUser] User ${userId}: Updated successfully. Tokens: ${updatedUser.tokens}, Profile Complete: ${updatedUser.is_profile_complete}`);
        res.status(200).json(updatedUser);
    }
    catch (error) {
        console.error(`[UpdateUser] Error for User ${userId}:`, error);
        next(error);
    }
}));
// --- Get User By ID Handler ---
exports.getUserByIdHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const targetUserId = req.params.id;
    const authenticatedUserId = req === null || req === void 0 ? void 0 : req.userId;
    if (!targetUserId) {
        return res.status(400).json({ message: 'User ID parameter is required.' });
    }
    if (!authenticatedUserId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    try {
        console.log(`[GetUserById] User ${authenticatedUserId} attempting to fetch profile for user: ${targetUserId}.`);
        const user = yield userService.getUserById(targetUserId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json(user);
    }
    catch (error) {
        console.error(`[GetUserById] Error fetching user ${targetUserId} by ${authenticatedUserId}:`, error);
        next(error);
    }
}));
// --- Get User Token Balance Handler (WITH NEW LOGGING) ---
exports.getUserTokenBalanceHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    // <<<< NEW LOGGING 1
    console.log(`[GetUserTokenBalance] Handler invoked for user: ${userId}`);
    if (!userId) {
        console.warn('[GetUserTokenBalance] Unauthorized access attempt: User ID missing from token.');
        return res.status(401).json({ message: 'Unauthorized: User identifier missing.' });
    }
    try {
        // <<<< NEW LOGGING 2
        console.log(`[GetUserTokenBalance] STEP 1: About to call userService.getUserById for user: ${userId}`);
        const user = yield userService.getUserById(userId);
        // <<<< NEW LOGGING 3
        console.log(`[GetUserTokenBalance] STEP 2: Call to userService.getUserById has completed. User found: ${!!user}`);
        if (!user) {
            console.error(`[GetUserTokenBalance] Critical: User ${userId} from token not found in DB.`);
            return res.status(404).json({ message: 'User not found.' });
        }
        // <<<< NEW LOGGING 4
        console.log(`[GetUserTokenBalance] STEP 3: Found user with token balance: ${user.tokens}. Sending response.`);
        res.status(200).json({ tokenBalance: user.tokens });
    }
    catch (error) {
        // <<<< NEW LOGGING 5
        console.error(`[GetUserTokenBalance] The operation threw an error for user ${userId}. Error:`, error);
        next(error);
    }
}));
// --- Handler for CRON job to replenish tokens for all users ---
exports.processMonthlyTokenReplenishmentHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // ... (rest of the file remains the same)
    const cronSecret = req.headers['x-cron-secret'] || req.body.secret;
    const expectedSecret = process.env.CRON_JOB_SECRET;
    if (!expectedSecret) {
        console.error('[ReplenishTokensCron] CRITICAL: CRON_JOB_SECRET is not set in environment variables. Denying request.');
        return res.status(500).json({ message: 'Service configuration error.' });
    }
    if (cronSecret !== expectedSecret) {
        console.warn('[ReplenishTokensCron] Forbidden attempt. Invalid or missing secret.', `Received: ${cronSecret ? '******' : 'MISSING'}`);
        return res.status(403).json({ message: 'Forbidden.' });
    }
    console.log('[ReplenishTokensCron] Authorized request to process monthly tokens.');
    try {
        const result = yield userService.replenishAllUsersMonthlyTokens();
        console.log('[ReplenishTokensCron] Token replenishment process finished.', result);
        res.status(200).json(Object.assign({ message: 'Monthly token replenishment process executed successfully.' }, result));
    }
    catch (error) {
        console.error('[ReplenishTokensCron] Critical error during token replenishment:', error);
        next(error);
    }
}));
// --- File Upload Handlers ---
exports.uploadHomepageVideoHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    uploadUtils_1.upload.single('video')(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        if (err)
            return (0, uploadUtils_1.handleMulterError)(err, next);
        const videoPath = (_a = req.file) === null || _a === void 0 ? void 0 : _a.path;
        const userId = req === null || req === void 0 ? void 0 : req.userId;
        try {
            if (!userId) {
                if (videoPath)
                    try {
                        yield promises_1.default.unlink(videoPath);
                    }
                    catch (e) {
                        console.warn(`[UploadHomepageVideo] Failed to unlink temp video for unauth user: ${videoPath}`, e);
                    }
                return res.status(401).json({ message: 'Unauthorized.' });
            }
            if (!req.file) {
                return res.status(400).json({ message: 'No video file uploaded.' });
            }
            const user = yield userService.getUserById(userId);
            if (!user) {
                if (videoPath)
                    try {
                        yield promises_1.default.unlink(videoPath);
                    }
                    catch (e) {
                        console.warn(`[UploadHomepageVideo] Failed to unlink temp video for non-existent user ${userId}: ${videoPath}`, e);
                    }
                return res.status(404).json({ message: 'User not found.' });
            }
            const videoName = `user_${userId}_bio_video_${Date.now()}`;
            let vimeoUriOnSuccess;
            try {
                if (user.videoUrl && user.videoUrl.includes('vimeo.com/')) {
                    const existingVimeoId = (_b = user.videoUrl.split('/').pop()) === null || _b === void 0 ? void 0 : _b.split('?')[0];
                    if (existingVimeoId) {
                        console.log(`[UploadHomepageVideo] User ${userId}: Deleting existing Vimeo video: ${existingVimeoId}`);
                        yield (0, uploadUtils_1.deleteVideoFromVimeo)(existingVimeoId);
                    }
                }
                console.log(`[UploadHomepageVideo] User ${userId}: Uploading new video "${videoName}" from path: ${req.file.path}`);
                const vimeoResult = yield vimeoService.uploadVideo(req.file.path, videoName);
                vimeoUriOnSuccess = vimeoResult.uri;
                const vimeoPageUrl = vimeoResult.pageLink;
                if (!vimeoPageUrl || !vimeoUriOnSuccess) {
                    throw new Error('Vimeo upload failed to return necessary URLs.');
                }
                console.log(`[UploadHomepageVideo] User ${userId}: Vimeo upload successful. Page URL: ${vimeoPageUrl}, URI: ${vimeoUriOnSuccess}`);
                const updatedUser = yield userService.updateUser(userId, { videoUrl: vimeoPageUrl });
                if (!updatedUser) {
                    console.error(`[UploadHomepageVideo] CRITICAL: User ${userId}: Failed to update user record with new videoUrl ${vimeoPageUrl} after Vimeo upload succeeded (${vimeoUriOnSuccess}). Attempting to delete orphaned Vimeo video.`);
                    if (vimeoUriOnSuccess) {
                        try {
                            yield vimeoService.deleteVideo(vimeoUriOnSuccess);
                            console.log(`[UploadHomepageVideo] User ${userId}: Successfully deleted orphaned Vimeo video ${vimeoUriOnSuccess}.`);
                        }
                        catch (delErr) {
                            console.error(`[UploadHomepageVideo] CRITICAL FAIL: User ${userId}: Failed to delete orphaned Vimeo video ${vimeoUriOnSuccess}. Manual cleanup required. Error:`, delErr);
                        }
                    }
                    throw new Error('Failed to update user with new video URL after successful upload.');
                }
                console.log(`[UploadHomepageVideo] User ${userId}: Homepage video uploaded and user record updated successfully.`);
                return res.status(200).json({
                    message: 'Homepage video uploaded.',
                    videoUrl: vimeoPageUrl,
                    vimeoUri: vimeoUriOnSuccess,
                    user: updatedUser,
                });
            }
            catch (uploadOrUpdateError) {
                console.error(`[UploadHomepageVideo] User ${userId}: Error during Vimeo upload or user update:`, uploadOrUpdateError.message, uploadOrUpdateError.stack);
                if (vimeoUriOnSuccess && !res.headersSent) {
                    console.warn(`[UploadHomepageVideo] User ${userId}: Attempting to delete Vimeo video ${vimeoUriOnSuccess} due to error after upload.`);
                    try {
                        yield vimeoService.deleteVideo(vimeoUriOnSuccess);
                        console.log(`[UploadHomepageVideo] User ${userId}: Cleaned up (deleted) Vimeo video ${vimeoUriOnSuccess}.`);
                    }
                    catch (delErr) {
                        console.error(`[UploadHomepageVideo] User ${userId}: CRITICAL - Failed to delete orphaned Vimeo video ${vimeoUriOnSuccess} during error cleanup. Error:`, delErr);
                    }
                }
                if (!res.headersSent) {
                    res
                        .status(500)
                        .json({ message: uploadOrUpdateError.message || 'Video processing failed.' });
                }
            }
        }
        catch (initialError) {
            console.error(`[UploadHomepageVideo] Initial error for user ${userId || 'Unknown'}:`, initialError);
            if (!res.headersSent)
                next(initialError);
        }
        finally {
            if (videoPath) {
                try {
                    if (yield promises_1.default
                        .access(videoPath)
                        .then(() => true)
                        .catch(() => false)) {
                        yield promises_1.default.unlink(videoPath);
                    }
                }
                catch (e) {
                    console.warn(`[UploadHomepageVideo] User ${userId || 'Unknown'}: Non-critical error unlinking temporary video file ${videoPath}:`, e.message);
                }
            }
        }
    }));
}));
exports.deleteHomepageVideoHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // ...
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized.' });
    try {
        const user = yield userService.getUserById(userId);
        if (!user)
            return res.status(404).json({ message: 'User not found.' });
        if (!user.videoUrl) {
            console.log(`[DeleteHomepageVideo] User ${userId}: No homepage video to delete.`);
            return res.status(200).json({ message: 'No video to delete.', user });
        }
        if (user.videoUrl.includes('vimeo.com/')) {
            const vimeoIdOrUri = (_a = user.videoUrl.split('/').pop()) === null || _a === void 0 ? void 0 : _a.split('?')[0];
            if (vimeoIdOrUri) {
                console.log(`[DeleteHomepageVideo] User ${userId}: Deleting Vimeo video: ${vimeoIdOrUri}`);
                yield (0, uploadUtils_1.deleteVideoFromVimeo)(vimeoIdOrUri);
                console.log(`[DeleteHomepageVideo] User ${userId}: Vimeo video ${vimeoIdOrUri} deleted from Vimeo.`);
            }
            else {
                console.warn(`[DeleteHomepageVideo] User ${userId}: Could not extract Vimeo ID/URI from URL: ${user.videoUrl}`);
            }
        }
        else {
            console.log(`[DeleteHomepageVideo] User ${userId}: Video URL ${user.videoUrl} is not a Vimeo URL, skipping Vimeo deletion.`);
        }
        const updatedUser = yield userService.updateUser(userId, { videoUrl: null });
        if (!updatedUser) {
            console.error(`[DeleteHomepageVideo] User ${userId}: Failed to update user record after video deletion.`);
            return res
                .status(500)
                .json({ message: 'Failed to update user after deleting video references.' });
        }
        console.log(`[DeleteHomepageVideo] User ${userId}: Homepage video reference removed from user profile.`);
        res.status(200).json({ message: 'Homepage video deleted.', user: updatedUser });
    }
    catch (error) {
        console.error(`[DeleteHomepageVideo] User ${userId}: Error:`, error.message, error.stack);
        next(error);
    }
}));
exports.uploadProfilePictureHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // ...
    uploadUtils_1.upload.single('image')(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (err)
            return (0, uploadUtils_1.handleMulterError)(err, next);
        const userId = req === null || req === void 0 ? void 0 : req.userId;
        const tempFilePath = (_a = req.file) === null || _a === void 0 ? void 0 : _a.path;
        try {
            if (!userId) {
                if (tempFilePath)
                    try {
                        yield promises_1.default.unlink(tempFilePath);
                    }
                    catch (e) {
                        /* ignore */
                    }
                return res.status(401).json({ message: 'Unauthorized.' });
            }
            if (!req.file) {
                return res.status(400).json({ message: 'No image file uploaded.' });
            }
            const user = yield userService.getUserById(userId);
            if (!user) {
                if (tempFilePath)
                    try {
                        yield promises_1.default.unlink(tempFilePath);
                    }
                    catch (e) {
                        /* ignore */
                    }
                return res.status(404).json({ message: 'User not found.' });
            }
            const s3BucketName = process.env.AWS_S3_BUCKET_NAME;
            if (!s3BucketName) {
                console.error('[UploadProfilePicture] CRITICAL: AWS_S3_BUCKET_NAME is not configured.');
                if (tempFilePath)
                    try {
                        yield promises_1.default.unlink(tempFilePath);
                    }
                    catch (e) {
                        /* ignore */
                    }
                return res.status(500).json({ message: 'Server configuration error for file uploads.' });
            }
            if (user.profilePictureUrl) {
                const s3BaseUrlPattern = new RegExp(`^https://${s3BucketName}\\.s3\\.[^./]+\\.amazonaws\\.com/`);
                const oldImageS3Key = user.profilePictureUrl.replace(s3BaseUrlPattern, '');
                if (oldImageS3Key && oldImageS3Key !== user.profilePictureUrl) {
                    console.log(`[UploadProfilePicture] User ${userId}: Deleting old S3 profile picture with key: ${oldImageS3Key}`);
                    try {
                        yield (0, uploadUtils_1.deleteImageHandler)(s3BucketName, oldImageS3Key);
                        console.log(`[UploadProfilePicture] User ${userId}: Successfully deleted old S3 profile picture.`);
                    }
                    catch (e) {
                        console.error(`[UploadProfilePicture] User ${userId}: Failed to delete old S3 profile picture (key: ${oldImageS3Key}). Non-critical. Error:`, e.message);
                    }
                }
            }
            const imageExtension = path_1.default.extname(req.file.originalname).toLowerCase() || '.png';
            const newImageS3Key = `user-${userId}/profile-${Date.now()}${imageExtension}`;
            console.log(`[UploadProfilePicture] User ${userId}: Ready to upload new profile picture to S3. Key: ${newImageS3Key}, Temp Path: ${tempFilePath}`);
            yield (0, uploadUtils_1.uploadImageHandler)(req, res, next, userId, s3BucketName, newImageS3Key, 'profilePictureUrl', userService.updateUser.bind(userService));
        }
        catch (error) {
            console.error(`[UploadProfilePicture] User ${userId || 'Unknown'}: Error in handler:`, error);
            if (tempFilePath && !res.headersSent) {
                try {
                    if (yield promises_1.default
                        .access(tempFilePath)
                        .then(() => true)
                        .catch(() => false)) {
                        yield promises_1.default.unlink(tempFilePath);
                    }
                }
                catch (e) {
                    /* ignore cleanup error */
                }
            }
            if (!res.headersSent) {
                next(error);
            }
        }
    }));
}));
exports.deleteProfilePictureHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // ...
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized.' });
    try {
        const user = yield userService.getUserById(userId);
        if (!user)
            return res.status(404).json({ message: 'User not found.' });
        if (!user.profilePictureUrl) {
            console.log(`[DeleteProfilePicture] User ${userId}: No profile picture to delete.`);
            return res.status(200).json({ message: 'No profile picture to delete.', user });
        }
        const s3BucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!s3BucketName) {
            console.error('[DeleteProfilePicture] CRITICAL: AWS_S3_BUCKET_NAME is not configured.');
            return res.status(500).json({ message: 'Server configuration error for file deletion.' });
        }
        const s3BaseUrlPattern = new RegExp(`^https://${s3BucketName}\\.s3\\.[^./]+\\.amazonaws\\.com/`);
        const imageKey = user.profilePictureUrl.replace(s3BaseUrlPattern, '');
        if (imageKey && imageKey !== user.profilePictureUrl) {
            console.log(`[DeleteProfilePicture] User ${userId}: Deleting S3 profile picture with key: ${imageKey}`);
            try {
                yield (0, uploadUtils_1.deleteImageHandler)(s3BucketName, imageKey);
                console.log(`[DeleteProfilePicture] User ${userId}: Successfully deleted S3 profile picture.`);
            }
            catch (e) {
                console.error(`[DeleteProfilePicture] User ${userId}: Failed to delete S3 profile picture (key: ${imageKey}). Error:`, e.message);
            }
        }
        else {
            console.warn(`[DeleteProfilePicture] User ${userId}: Could not extract valid S3 key from URL: ${user.profilePictureUrl}. Skipping S3 deletion.`);
        }
        const updatedUser = yield userService.updateUser(userId, { profilePictureUrl: null });
        if (!updatedUser) {
            console.error(`[DeleteProfilePicture] User ${userId}: Failed to update user record (set profilePictureUrl to null).`);
            return res
                .status(500)
                .json({ message: 'Failed to update user profile after picture deletion.' });
        }
        console.log(`[DeleteProfilePicture] User ${userId}: Profile picture reference removed from user profile.`);
        res.status(200).json({ message: 'Profile picture deleted.', user: updatedUser });
    }
    catch (error) {
        console.error(`[DeleteProfilePicture] User ${userId}: Error:`, error);
        next(error);
    }
}));
// --- Register Push Token Handler ---
exports.registerPushTokenHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // ...
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    const { playerId } = req.body;
    if (!userId) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    if (!playerId || typeof playerId !== 'string') {
        return res
            .status(400)
            .json({ message: 'Player ID (playerId) is required and must be a string.' });
    }
    try {
        console.log(`[RegisterPushTokenHandler] User ${userId} attempting to register Player ID: ${playerId}`);
        const success = yield userRepository.registerPushToken(userId, playerId);
        if (!success) {
            console.warn(`[RegisterPushTokenHandler] Failed to register push token for user ${userId}. User might not exist or DB update failed.`);
            return res.status(404).json({ message: 'User not found or token registration failed.' });
        }
        console.log(`[RegisterPushTokenHandler] Push token ${playerId} registered successfully for user ${userId}.`);
        res.status(200).json({ message: 'Push token registered successfully.' });
    }
    catch (error) {
        console.error(`[RegisterPushTokenHandler] Error registering push token for user ${userId}, Player ID ${playerId}:`, error.message, error.stack);
        next(error);
    }
}));
