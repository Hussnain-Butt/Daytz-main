"use strict";
// File: src/handlers/videoHandlers.ts
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
exports.getVideoPlayableUrlHandler = void 0;
const VimeoService_1 = __importDefault(require("../services/external/VimeoService")); // Adjust path if necessary
const db_1 = __importDefault(require("../db")); // Assuming your pg Pool is exported from here
const vimeoService = new VimeoService_1.default();
/**
 * Fetches the Vimeo URI associated with a given calendarId from the database
 * using a direct SQL query.
 *
 * @param calendarId The ID of the calendar entry.
 * @returns A Promise that resolves to the Vimeo URI string if found, or null otherwise.
 * @throws Error if the database query fails.
 */
function getVimeoUriFromCalendarId(calendarId) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`[VideoHandler-DB] Attempting to fetch vimeoUri for calendar_id: ${calendarId} using pg Pool`);
        if (!db_1.default) {
            console.error("[VideoHandler-DB] pg Pool is not initialized. Ensure 'pool' is imported correctly from '../db'.");
            throw new Error('Database client (pg Pool) not initialized.');
        }
        const queryText = 'SELECT vimeo_uri FROM calendar_day WHERE calendar_id = $1';
        try {
            const result = yield db_1.default.query(queryText, [calendarId]);
            if (result.rows.length > 0) {
                const vimeoUri = result.rows[0].vimeo_uri;
                if (vimeoUri) {
                    console.log(`[VideoHandler-DB] Found vimeo_uri: '${vimeoUri}' for calendar_id: ${calendarId}`);
                    return vimeoUri;
                }
                else {
                    console.warn(`[VideoHandler-DB] calendar_id ${calendarId} found, but vimeo_uri is NULL.`);
                    return null;
                }
            }
            else {
                console.warn(`[VideoHandler-DB] No entry found in calendar_day for calendar_id: ${calendarId}`);
                return null;
            }
        }
        catch (dbError) {
            console.error(`[VideoHandler-DB] Database error fetching vimeo_uri for calendar_id ${calendarId}:`, dbError.message, dbError.stack);
            // Re-throw the error to be caught by the main handler, which will send a 500 response.
            throw dbError;
        }
    });
}
const getVideoPlayableUrlHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uri, calendarId: calendarIdStr } = req.query;
    let videoIdentifier = null;
    let identifierSource = null;
    // 1. Try to use 'uri' if provided and in the expected format "videos/VIDEO_ID"
    if (uri && typeof uri === 'string') {
        if (uri.startsWith('videos/')) {
            videoIdentifier = uri;
            identifierSource = 'uri';
            console.log(`[VideoHandler] Using 'uri' parameter: ${videoIdentifier}`);
        }
        else {
            console.warn(`[VideoHandler] 'uri' parameter ('${uri}') received but not in expected 'videos/VIDEO_ID' format. Will try 'calendarId' if available.`);
        }
    }
    // 2. If a valid 'uri' wasn't found/used, try 'calendarId'
    if (!videoIdentifier && calendarIdStr && typeof calendarIdStr === 'string') {
        if (/^\d+$/.test(calendarIdStr)) {
            console.log(`[VideoHandler] 'uri' not used or invalid, attempting 'calendarId': ${calendarIdStr}`);
            try {
                const parsedCalendarId = parseInt(calendarIdStr, 10);
                const vimeoUriFromDb = yield getVimeoUriFromCalendarId(parsedCalendarId);
                if (vimeoUriFromDb && typeof vimeoUriFromDb === 'string' && vimeoUriFromDb.trim() !== '') {
                    videoIdentifier = vimeoUriFromDb.trim(); // Use the URI fetched from DB
                    identifierSource = 'calendarId';
                    console.log(`[VideoHandler] Resolved calendarId ${parsedCalendarId} to vimeoUri: '${videoIdentifier}'`);
                }
                else {
                    console.warn(`[VideoHandler] No valid Vimeo URI found in DB for calendarId: ${parsedCalendarId}. (vimeoUriFromDb was: '${vimeoUriFromDb}')`);
                    return res
                        .status(404)
                        .json({ message: `Video content not associated with calendarId: ${parsedCalendarId}.` });
                }
            }
            catch (dbError) {
                console.error(`[VideoHandler] Database error while processing calendarId ${calendarIdStr}:`, dbError.message);
                return res.status(500).json({
                    message: 'Server error while resolving video by calendar ID due to database issue.',
                });
            }
        }
        else {
            console.warn(`[VideoHandler] 'calendarId' parameter ('${calendarIdStr}') is not a valid number.`);
        }
    }
    // 3. Check if we have a valid videoIdentifier to proceed
    if (!videoIdentifier) {
        console.warn(`[VideoHandler] Could not determine a valid video identifier. URI: '${uri}', CalendarID: '${calendarIdStr}'`);
        return res.status(400).json({
            message: 'A valid "uri" (format: "videos/VIDEO_ID") or a "calendarId" that resolves to a video is required.',
        });
    }
    console.log(`[VideoHandler] Requesting playable URL from VimeoService for identifier: '${videoIdentifier}' (Source: ${identifierSource})`);
    try {
        const playableUrl = yield vimeoService.getFreshPlayableUrl(videoIdentifier);
        if (playableUrl) {
            console.log(`[VideoHandler] Playable URL found by VimeoService: ${playableUrl.substring(0, 70)}...`);
            return res.json({ playableUrl });
        }
        else {
            console.warn(`[VideoHandler] Playable URL not found by VimeoService for identifier: '${videoIdentifier}'. This could be due to processing, privacy, or non-existence.`);
            return res.status(404).json({
                message: 'Playable URL not found. The video may still be processing, is private/protected, or does not exist on the video platform.',
            });
        }
    }
    catch (error) {
        console.error(`[VideoHandler] Error fetching playable URL via VimeoService for '${videoIdentifier}':`, error.message, error.stack);
        return res.status(500).json({
            message: 'Server error while fetching playable URL from video provider.',
            error: error.message,
        });
    }
});
exports.getVideoPlayableUrlHandler = getVideoPlayableUrlHandler;
