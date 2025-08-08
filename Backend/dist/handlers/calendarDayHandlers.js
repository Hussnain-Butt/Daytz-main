"use strict";
// File: src/handlers/calendarDayHandlers.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoriesByDateHandler = exports.getCalendarDayVideosByUserAndDateHandler = exports.updateCalendarDayHandler = exports.createCalendarDayHandler = exports.getCalendarDaysByUserIdHandler = exports.getCalendarDayByUserIdAndDateHandler = exports.deleteCalendarVideoHandler = exports.uploadCalendarVideoHandler = void 0;
const moment_1 = __importDefault(require("moment"));
const promises_1 = __importDefault(require("fs/promises"));
const middleware_1 = require("../middleware");
const uploadUtils_1 = require("../uploadUtils"); // deleteVideoHandler from uploadUtils
const CalendarDayService_1 = __importDefault(require("../services/internal/CalendarDayService"));
const UserService_1 = __importDefault(require("../services/internal/UserService"));
const CalendarDayRepository_1 = __importDefault(require("../repository/CalendarDayRepository")); // Though CalendarDayService likely uses this
// Instantiate services
const calendarDayService = new CalendarDayService_1.default();
const userService = new UserService_1.default();
// const calendarDayRepository = new CalendarDayRepository(); // Less likely to be used directly if service layer is complete
console.log('[CalendarDayHandler] Services instantiated.');
// --- Upload Calendar Video Handler ---
exports.uploadCalendarVideoHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    uploadUtils_1.upload.single('video')(req, res, (err) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            return (0, uploadUtils_1.handleMulterError)(err, next);
        }
        const userId = req === null || req === void 0 ? void 0 : req.userId;
        const date = req.body.date;
        const videoFile = req.file;
        console.log(`[UploadCalendarVideo] User: ${userId}, Date: ${date}, File: ${videoFile === null || videoFile === void 0 ? void 0 : videoFile.originalname}`);
        if (!userId || !date || !videoFile) {
            if (videoFile === null || videoFile === void 0 ? void 0 : videoFile.path)
                try {
                    yield promises_1.default.unlink(videoFile.path);
                    console.log('[UploadCalendarVideo] Temp file unlinked due to bad request.');
                }
                catch (e) {
                    console.error('[UploadCalendarVideo] Failed to unlink temp file on bad request:', e);
                }
            return res
                .status(400)
                .json({ message: 'Bad Request: Missing userId, date, or video file.' });
        }
        if (!(0, moment_1.default)(date, 'YYYY-MM-DD', true).isValid()) {
            if (videoFile === null || videoFile === void 0 ? void 0 : videoFile.path)
                try {
                    yield promises_1.default.unlink(videoFile.path);
                    console.log('[UploadCalendarVideo] Temp file unlinked due to invalid date.');
                }
                catch (e) {
                    console.error('[UploadCalendarVideo] Failed to unlink temp file on invalid date:', e);
                }
            return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
        }
        try {
            const existingUser = yield userService.getUserById(userId);
            if (!existingUser) {
                if (videoFile === null || videoFile === void 0 ? void 0 : videoFile.path)
                    try {
                        yield promises_1.default.unlink(videoFile.path);
                    }
                    catch (e) {
                        /*ignore for non-existent user*/
                    }
                return res.status(404).json({ message: `User ${userId} not found.` });
            }
            let calendarDay = yield calendarDayService.getCalendarDayByUserIdAndDate(userId, date);
            let calendarId;
            if (!calendarDay) {
                console.log(`[UploadCalendarVideo] Creating new calendar day for ${userId} on ${date}.`);
                const newCalendarDayData = {
                    userId: userId,
                    date: date,
                    userVideoUrl: null,
                };
                const createdEntry = yield calendarDayService.createCalendarDay(newCalendarDayData);
                if (!(createdEntry === null || createdEntry === void 0 ? void 0 : createdEntry.calendarId)) {
                    throw new Error('Failed to create/retrieve calendar entry ID after creation.');
                }
                calendarDay = createdEntry;
                calendarId = calendarDay.calendarId;
                console.log(`[UploadCalendarVideo] Created new calendar entry ID: ${calendarId}`);
            }
            else {
                calendarId = calendarDay.calendarId;
                console.log(`[UploadCalendarVideo] Found existing calendar day entry ID: ${calendarId}`);
            }
            if (calendarId === undefined) {
                throw new Error('Critical: Failed to determine calendar entry ID for video upload.');
            }
            // Extract existing Vimeo ID correctly (e.g., "12345" from "/videos/12345")
            let existingVimeoIdForReplacement = undefined;
            if (calendarDay === null || calendarDay === void 0 ? void 0 : calendarDay.vimeoUri) {
                const uriParts = calendarDay.vimeoUri.split('/');
                const idPart = uriParts.pop(); // Get the last part
                if (idPart && /^\d+$/.test(idPart)) {
                    // Check if it's numeric
                    existingVimeoIdForReplacement = idPart;
                }
            }
            console.log(`[UploadCalendarVideo] Existing Vimeo ID for replacement: ${existingVimeoIdForReplacement || 'N/A'} for calendarId ${calendarId}`);
            // handleVideoUpload (from uploadUtils) will manage S3/Vimeo upload and its own response/error handling
            yield (0, uploadUtils_1.handleVideoUpload)(req, res, next, calendarId, existingVimeoIdForReplacement);
            // Response is handled by handleVideoUpload
        }
        catch (error) {
            console.error('[UploadCalendarVideo] Error in main try-catch block:', error);
            if ((videoFile === null || videoFile === void 0 ? void 0 : videoFile.path) && !res.headersSent) {
                try {
                    yield promises_1.default.unlink(videoFile.path);
                    console.log('[UploadCalendarVideo] Temp file unlinked due to error in handler.');
                }
                catch (e) {
                    console.error('[UploadCalendarVideo] Failed to unlink temp file on handler error:', e);
                }
            }
            if (!res.headersSent) {
                next(error);
            }
            else {
                console.warn('[UploadCalendarVideo] Headers already sent, cannot forward error.');
            }
        }
    }));
}));
// --- Delete Calendar Video Handler ---
exports.deleteCalendarVideoHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    const date = req.params.date;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized.' });
    if (!date || !(0, moment_1.default)(date, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ message: 'Valid date parameter (YYYY-MM-DD) is required.' });
    }
    console.log(`[DeleteCalendarVideo] User ${userId}, Date ${date}: Attempting delete.`);
    try {
        const calendarDay = yield calendarDayService.getCalendarDayByUserIdAndDate(userId, date);
        if (!calendarDay || calendarDay.calendarId === undefined) {
            // check for calendarId
            console.warn(`[DeleteCalendarVideo] User ${userId}, Date ${date}: Calendar day not found.`);
            return res
                .status(404)
                .json({ message: 'Calendar day entry not found for this user and date.' });
        }
        const calendarId = calendarDay.calendarId;
        // MODIFIED CALL: deleteVideoHandler now only takes calendarId
        // It returns an object like { success: boolean; message: string; details?: any }
        const deleteResult = yield (0, uploadUtils_1.deleteVideoHandler)(calendarId);
        if (deleteResult.success) {
            console.log(`[DeleteCalendarVideo] Success for Calendar ID ${calendarId}: ${deleteResult.message}`);
            return res.status(200).json({ message: deleteResult.message });
        }
        else {
            // If deleteVideoHandler indicates failure (e.g., Vimeo API error it couldn't recover from)
            console.error(`[DeleteCalendarVideo] Failure for Calendar ID ${calendarId}: ${deleteResult.message}`, deleteResult.details);
            // Determine appropriate status code based on message or details if available
            // For a generic failure from the utility, 500 might be suitable.
            return res
                .status(500)
                .json({ message: deleteResult.message, details: deleteResult.details });
        }
    }
    catch (error) {
        // Catch errors from getCalendarDayByUserIdAndDate or if deleteVideoHandler re-throws unexpectedly
        console.error(`[DeleteCalendarVideo] Unexpected Error for User ${userId}, Date ${date}:`, error);
        if (!res.headersSent) {
            next(error); // Pass to global error handler
        }
    }
}));
// --- Get Calendar Day By UserID and Date Handler ---
exports.getCalendarDayByUserIdAndDateHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userIdParam = req.params.userId;
    const dateParam = req.params.date;
    if (!userIdParam || !dateParam || !(0, moment_1.default)(dateParam, 'YYYY-MM-DD', true).isValid()) {
        return res
            .status(400)
            .json({ message: 'Valid User ID and Date (YYYY-MM-DD) parameters are required.' });
    }
    try {
        console.log(`[GetCalendarDay] Fetching for User: ${userIdParam}, Date: ${dateParam}`);
        const calendarDay = yield calendarDayService.getCalendarDayByUserIdAndDate(userIdParam, dateParam);
        if (!calendarDay) {
            return res.status(404).json({ message: 'Calendar day entry not found.', calendarDay: null }); // Return null for consistency
        }
        res.status(200).json({ calendarDay }); // Return calendarDay inside an object
    }
    catch (error) {
        console.error(`[GetCalendarDay] Error for User: ${userIdParam}, Date: ${dateParam}:`, error);
        next(error);
    }
}));
// --- Get ALL Calendar Days By Authenticated User Handler ---
exports.getCalendarDaysByUserIdHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized.' });
    console.log(`[GetCalendarDaysForUser] Fetching all entries for user: ${userId}`);
    try {
        const calendarDays = yield calendarDayService.getCalendarDaysByUserId(userId);
        res.status(200).json(calendarDays); // Return array directly
    }
    catch (error) {
        console.error(`[GetCalendarDaysForUser] Error for user ${userId}:`, error);
        next(error);
    }
}));
// --- Create Calendar Day Handler ---
exports.createCalendarDayHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    const { date } = req.body;
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized.' });
    if (!date || !(0, moment_1.default)(date, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ message: 'Valid date (YYYY-MM-DD) is required.' });
    }
    try {
        console.log(`[CreateCalendarDay] User ${userId}, Date ${date}: Attempting creation.`);
        const existingUser = yield userService.getUserById(userId);
        if (!existingUser)
            return res.status(404).json({ message: `User ${userId} not found.` });
        const existingCalendarDay = yield calendarDayService.getCalendarDayByUserIdAndDate(userId, date);
        if (existingCalendarDay) {
            return res
                .status(409)
                .json({ message: 'Calendar day already exists.', calendarDay: existingCalendarDay });
        }
        const newCalendarDayData = {
            userId: userId,
            date: date,
            userVideoUrl: null,
        };
        const createdCalendarDay = yield calendarDayService.createCalendarDay(newCalendarDayData);
        if (!createdCalendarDay)
            throw new Error('DB failed to create calendar day entry.');
        console.log(`[CreateCalendarDay] User ${userId}, Date ${date}: Created successfully with ID ${createdCalendarDay.calendarId}.`);
        res.status(201).json(createdCalendarDay);
    }
    catch (error) {
        console.error(`[CreateCalendarDay] User ${userId}, Date ${date}: Error:`, error);
        next(error);
    }
}));
// --- Update Calendar Day Handler ---
exports.updateCalendarDayHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    const _a = req.body, { date: dateFromBody } = _a, otherUpdateData = __rest(_a, ["date"]);
    if (!userId)
        return res.status(401).json({ message: 'Unauthorized.' });
    if (!dateFromBody || !(0, moment_1.default)(dateFromBody, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ message: 'Valid date (YYYY-MM-DD) in body required.' });
    }
    try {
        console.log(`[UpdateCalendarDay] User ${userId}, Date ${dateFromBody}: Attempting update.`);
        const calendarDay = yield calendarDayService.getCalendarDayByUserIdAndDate(userId, dateFromBody);
        if (!(calendarDay === null || calendarDay === void 0 ? void 0 : calendarDay.calendarId)) {
            return res
                .status(404)
                .json({ message: `Calendar day not found for user ${userId} on date ${dateFromBody}.` });
        }
        const calendarIdToUpdate = calendarDay.calendarId;
        // Define what fields are actually updatable through this endpoint.
        // Video related fields (userVideoUrl, vimeoUri, processingStatus) are handled by upload/delete endpoints.
        const allowedUpdateFields = [
        // 'notes', 'eventType', etc. - Add fields here that users can update via this PATCH.
        // For now, let's assume no direct fields are updatable here to prevent accidental video field changes.
        ];
        const updateData = {};
        let hasValidUpdate = false;
        for (const key of allowedUpdateFields) {
            if (Object.prototype.hasOwnProperty.call(otherUpdateData, key)) {
                ;
                updateData[key] = otherUpdateData[key];
                hasValidUpdate = true;
            }
        }
        // Explicitly block updates to video-related fields through this generic update handler
        if (otherUpdateData.userVideoUrl !== undefined ||
            otherUpdateData.vimeoUri !== undefined ||
            otherUpdateData.processingStatus !== undefined) {
            console.warn(`[UpdateCalendarDay] User ${userId}, Date ${dateFromBody}: Attempt to update video-related fields (userVideoUrl, vimeoUri, processingStatus) directly via this endpoint was ignored. Use dedicated video upload/delete endpoints.`);
        }
        if (!hasValidUpdate) {
            // If no allowed fields were provided for update
            return res.status(200).json({
                message: 'No updatable fields provided or no changes made.',
                calendarDay: calendarDay, // Return the current state
            });
        }
        const updatedEntry = yield calendarDayService.updateCalendarDay(calendarIdToUpdate, updateData);
        if (!updatedEntry)
            throw new Error('Failed to update calendar day entry.');
        console.log(`[UpdateCalendarDay] User ${userId}, Date ${dateFromBody}: Updated successfully.`);
        res
            .status(200)
            .json({ message: 'Calendar day updated successfully.', calendarDay: updatedEntry });
    }
    catch (error) {
        console.error(`[UpdateCalendarDay] User ${userId}, Date ${dateFromBody}: Error:`, error);
        next(error);
    }
}));
// --- Get Calendar Day Videos By User and Date Handler (Nearby Videos) ---
exports.getCalendarDayVideosByUserAndDateHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const targetUserId = req.params.userId;
    const targetDate = req.params.date;
    const calendarDayRepo = new CalendarDayRepository_1.default(); // Instance here if not using service for this specific query
    if (!targetUserId || !targetDate || !(0, moment_1.default)(targetDate, 'YYYY-MM-DD', true).isValid()) {
        return res
            .status(400)
            .json({ message: 'Valid User ID and Date (YYYY-MM-DD) parameters required.' });
    }
    try {
        console.log(`[GetNearbyVideos] For User ${targetUserId}, Date ${targetDate}: Fetching.`);
        const user = yield userService.getUserById(targetUserId); // User service to get zipcode
        if (!(user === null || user === void 0 ? void 0 : user.zipcode)) {
            return res.status(200).json({ message: 'User zipcode not set.', nearbyVideos: [] });
        }
        const miles = 5; // Or from config/request query
        let zipcodeList = yield calendarDayRepo.getNearbyZipcodes(user.zipcode, miles); // Using repo directly
        // Ensure the user's own zipcode is in the list if not already returned by getNearbyZipcodes
        if (!zipcodeList || !zipcodeList.includes(user.zipcode)) {
            zipcodeList = zipcodeList ? [...new Set([...zipcodeList, user.zipcode])] : [user.zipcode];
        }
        console.log(`[GetNearbyVideos] User ${targetUserId}, Date ${targetDate}: Searching in zips: ${zipcodeList.join(', ')}`);
        const nearbyVideosFromRepo = yield calendarDayRepo.getCalendarDayVideosByDateAndZipCode(targetDate, zipcodeList); // Using repo directly
        if (!nearbyVideosFromRepo)
            throw new Error('Failed to retrieve nearby video data from repository.');
        const filteredNearbyVideos = nearbyVideosFromRepo.filter((videoData) => videoData.userId !== targetUserId);
        if (filteredNearbyVideos.length === 0) {
            return res
                .status(200)
                .json({ message: 'No other user videos found for this date/location.', nearbyVideos: [] });
        }
        res
            .status(200)
            .json({ message: 'Nearby user videos found.', nearbyVideos: filteredNearbyVideos });
    }
    catch (error) {
        console.error(`[GetNearbyVideos] User ${targetUserId}, Date ${targetDate}: Error:`, error);
        next(error);
    }
}));
// --- Get Stories By Date Handler (Uses new Service method) ---
exports.getStoriesByDateHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const targetDate = req.params.date;
    console.log(`[GetStories] Fetching stories for date: ${targetDate}`);
    if (!targetDate || !(0, moment_1.default)(targetDate, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ message: 'Invalid or missing date parameter (YYYY-MM-DD).' });
    }
    try {
        const storiesData = // Type from CalendarDay types
         yield calendarDayService.getStoriesForDateWithFreshUrls(targetDate);
        if (!storiesData)
            throw new Error('Failed to retrieve stories data from service.');
        // Service should return empty array if no stories, not null, unless error.
        // If service returns null on "no stories found", adjust here or in service.
        // Assuming service returns [] for no stories.
        console.log(`[GetStories] Found ${storiesData.length} stories for date: ${targetDate}`);
        res.status(200).json(storiesData); // Return array directly
    }
    catch (error) {
        console.error(`[GetStories] Error fetching stories for date ${targetDate}:`, error);
        next(error);
    }
}));
