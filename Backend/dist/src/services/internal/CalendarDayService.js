"use strict";
// File: src/services/internal/CalendarDayService.ts
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
const CalendarDayRepository_1 = __importDefault(require("../../repository/CalendarDayRepository")); // Adjust path if needed
const VimeoService_1 = __importDefault(require("../external/VimeoService")); // << NEW: Import VimeoService
class CalendarDayService {
    constructor() {
        this.calendarDayRepository = new CalendarDayRepository_1.default();
        this.vimeoService = new VimeoService_1.default(); // << NEW
    }
    // ... (createCalendarDay, getCalendarDaysByUserId, getCalendarDayById, getCalendarDayByUserIdAndDate, updateCalendarDay remain unchanged) ...
    createCalendarDay(calendarDay) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.calendarDayRepository.createCalendarDay(calendarDay);
        });
    }
    getCalendarDaysByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.calendarDayRepository.getCalendarDaysByUserId(userId);
        });
    }
    getCalendarDayById(calendarId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.calendarDayRepository.getCalendarDayById(calendarId);
        });
    }
    getCalendarDayByUserIdAndDate(userId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.calendarDayRepository.getCalendarDayByUserIdAndDate(userId, date);
        });
    }
    updateCalendarDay(calendarId, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.calendarDayRepository.updateCalendarDay(calendarId, updateData);
        });
    }
    /**
     * Gets nearby videos (basic data, no fresh URL fetch needed here typically).
     */
    getCalendarDayVideosByDateAndZipCode(date, zipcode) {
        return __awaiter(this, void 0, void 0, function* () {
            const miles = 5; // Or from config
            const zipcodeList = yield this.calendarDayRepository.getNearbyZipcodes(zipcode, miles);
            if (!zipcodeList || zipcodeList.length === 0) {
                console.warn(`[Service: Nearby] No nearby zipcodes found for ${zipcode} within ${miles} miles.`);
                return [];
            }
            return this.calendarDayRepository.getCalendarDayVideosByDateAndZipCode(date, zipcodeList);
        });
    }
    /**
     * Deletes a calendar day entry.
     */
    deleteCalendarDay(calendarId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.calendarDayRepository.deleteCalendarDay(calendarId);
        });
    }
    /**
     * Gets story data for a specific date AND fetches fresh playable URLs for completed videos.
     * @param date The target date (YYYY-MM-DD).
     * @returns An array of story objects including a 'playableUrl' field, or null on error.
     */
    getStoriesForDateWithFreshUrls(date) {
        return __awaiter(this, void 0, void 0, function* () {
            // << NEW Return Type
            console.log(`[Service: Stories] Fetching stories from repository for date: ${date}`);
            const storiesFromRepo = yield this.calendarDayRepository.findStoriesByDateWithUserDetails(date);
            if (storiesFromRepo === null) {
                console.error(`[Service: Stories] Repository returned null fetching stories for date: ${date}. DB error likely.`);
                return null; // Propagate DB error
            }
            if (storiesFromRepo.length === 0) {
                console.log(`[Service: Stories] No stories found in repository for date: ${date}`);
                return []; // Return empty array if none found
            }
            console.log(`[Service: Stories] Found ${storiesFromRepo.length} stories. Fetching fresh URLs...`);
            // Use Promise.all to fetch fresh URLs concurrently
            const storiesWithUrls = yield Promise.all(storiesFromRepo.map((story) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                let playableUrl = null; // Default to null
                // Check if processing is complete and we have a Vimeo URI
                if (story.processingStatus === 'complete' && story.vimeoUri) {
                    console.log(`[Service: Stories] Fetching fresh URL for completed video: ${story.vimeoUri} (Story ID: ${story.calendarId})`);
                    try {
                        // Call the NEW VimeoService method
                        playableUrl = yield this.vimeoService.getFreshPlayableUrl(story.vimeoUri);
                        if (!playableUrl) {
                            console.warn(`[Service: Stories] Could not get fresh playable URL for ${story.vimeoUri}, status was 'complete'.`);
                        }
                        else {
                            console.log(`[Service: Stories] Successfully fetched fresh URL for ${story.vimeoUri}`);
                        }
                    }
                    catch (fetchErr) {
                        console.error(`[Service: Stories] Error fetching fresh URL for ${story.vimeoUri}:`, fetchErr);
                        // Keep playableUrl as null on error
                    }
                }
                else if (story.processingStatus === 'processing' ||
                    story.processingStatus === 'pending') {
                    console.log(`[Service: Stories] Video for story ${story.calendarId} is still processing (Status: ${story.processingStatus}). No playable URL fetched.`);
                    // Keep playableUrl as null
                }
                else {
                    console.log(`[Service: Stories] Video for story ${story.calendarId} has status ${story.processingStatus || 'unknown'} or no Vimeo URI. No playable URL fetched.`);
                    // Keep playableUrl as null
                }
                // Explicitly construct the return object to satisfy TypeScript
                const result = {
                    calendarId: story.calendarId,
                    userId: story.userId,
                    userName: story.userName,
                    profilePictureUrl: (_a = story.profilePictureUrl) !== null && _a !== void 0 ? _a : null,
                    userVideoUrl: story.userVideoUrl,
                    date: story.date,
                    vimeoUri: (_b = story.vimeoUri) !== null && _b !== void 0 ? _b : null,
                    // ---- FIX: Use nullish coalescing for processingStatus ----
                    processingStatus: (_c = story.processingStatus) !== null && _c !== void 0 ? _c : null, // Default to null if undefined/null
                    // ---- END FIX ----
                    playableUrl: playableUrl,
                };
                return result;
            })));
            console.log(`[Service: Stories] Finished processing fresh URLs for ${storiesWithUrls.length} stories for date: ${date}`);
            return storiesWithUrls;
        });
    }
}
exports.default = CalendarDayService;
