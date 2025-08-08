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
exports.getAttractionByUserFromUserToAndDateHandler = exports.getAttractionsByUserFromAndUserToHandler = exports.createAttractionHandler = void 0;
const middleware_1 = require("../middleware");
const AttractionService_1 = __importDefault(require("../services/internal/AttractionService"));
const CalendarDayService_1 = __importDefault(require("../services/internal/CalendarDayService"));
const UserService_1 = __importDefault(require("../services/internal/UserService"));
const NotificationService_1 = __importDefault(require("../services/internal/NotificationService"));
const attractionService = new AttractionService_1.default();
const calendarDayService = new CalendarDayService_1.default(); // Keep if used, even if optional in this handler
const userService = new UserService_1.default();
const notificationService = new NotificationService_1.default();
const ATTRACTION_TOKEN_COST_PER_POINT = 1;
console.log('[AttractionHandler] Services instantiated (Attraction, CalendarDay, User, Notification).');
exports.createAttractionHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authenticatedUserId = req === null || req === void 0 ? void 0 : req.userId;
    if (!authenticatedUserId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    const clientReqBody = req.body;
    const { userTo, date, romanticRating = 0, sexualRating = 0, friendshipRating = 0, longTermPotential = false, // Assuming these are part of your CreateAttraction type
    intellectual = false, emotional = false, } = clientReqBody;
    // --- Input Validations ---
    if (!userTo || !date) {
        return res.status(400).json({ message: 'userTo and date are required.' });
    }
    if (typeof userTo !== 'string' ||
        typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res
            .status(400)
            .json({ message: 'Invalid format for userTo or date. Date must be YYYY-MM-DD.' });
    }
    // Allow zero ratings for updates, but for new attractions, at least one should be > 0
    // This check will be handled more specifically in create vs update block
    const isValidRating = (rating) => typeof rating === 'number' && rating >= 0 && rating <= 3; // Assuming MAX_RATING is 3
    if (!isValidRating(romanticRating) ||
        !isValidRating(sexualRating) ||
        !isValidRating(friendshipRating)) {
        return res.status(400).json({ message: 'Ratings must be numbers between 0 and 3.' });
    }
    if (authenticatedUserId === userTo) {
        return res.status(400).json({ message: 'Cannot express attraction to oneself.' });
    }
    // Optional: Check target user's calendar day (if it's a strict requirement for expressing attraction)
    // const targetCalendarDay = await calendarDayService.getCalendarDayByUserIdAndDate(userTo, date);
    // if (!targetCalendarDay) {
    //   console.log(`[CreateAttractionHandler-UPSERT] No calendar day for target user ${userTo} on ${date}.`);
    //   return res.status(404).json({ message: `Target user does not have a story for ${date}.` });
    // }
    try {
        const existingAttraction = yield attractionService.getAttraction(authenticatedUserId, userTo, date);
        let finalAttraction = null;
        let httpStatus = 200; // Default to 200 OK for updates
        if (existingAttraction && existingAttraction.attractionId) {
            // --- UPDATE EXISTING ATTRACTION ---
            console.log(`[AttractionHandler-UPSERT] Updating existing attraction ID: ${existingAttraction.attractionId} from ${authenticatedUserId} to ${userTo} on ${date}.`);
            // No token cost for updates. Ratings can be set to 0 to "clear" interest.
            const updatePayload = {
                romanticRating,
                sexualRating,
                friendshipRating,
                longTermPotential: Boolean(longTermPotential),
                intellectual: Boolean(intellectual),
                emotional: Boolean(emotional),
                // result and firstMessageRights will be re-evaluated based on new ratings & counter-attraction
            };
            finalAttraction = yield attractionService.updateAttraction(existingAttraction.attractionId, updatePayload);
            if (!finalAttraction) {
                console.error(`[AttractionHandler-UPSERT] Failed to update attraction ${existingAttraction.attractionId}.`);
                return res.status(500).json({ message: 'Failed to update attraction.' });
            }
            httpStatus = 200; // OK for update
            console.log(`[AttractionHandler-UPSERT] Attraction ${finalAttraction.attractionId} updated.`);
        }
        else {
            // --- CREATE NEW ATTRACTION ---
            console.log(`[AttractionHandler-UPSERT] Creating new attraction from ${authenticatedUserId} to ${userTo} on ${date}.`);
            if (romanticRating === 0 && sexualRating === 0 && friendshipRating === 0) {
                return res.status(400).json({
                    message: 'For a new attraction, at least one rating must be greater than 0.',
                });
            }
            const tokenCostForNewAttraction = (romanticRating || 0) * ATTRACTION_TOKEN_COST_PER_POINT +
                (sexualRating || 0) * ATTRACTION_TOKEN_COST_PER_POINT +
                (friendshipRating || 0) * ATTRACTION_TOKEN_COST_PER_POINT;
            if (tokenCostForNewAttraction > 0) {
                const descriptiveResultForLog = attractionService.calculateAttractionResultString(romanticRating, sexualRating, friendshipRating);
                console.log(`[AttractionHandler-UPSERT] Attempting to spend ${tokenCostForNewAttraction} tokens for user ${authenticatedUserId}.`);
                yield userService.spendTokensForUser(authenticatedUserId, tokenCostForNewAttraction, `Attraction (${descriptiveResultForLog}) to ${userTo} on ${date}`);
                console.log(`[AttractionHandler-UPSERT] Tokens spent successfully by ${authenticatedUserId}.`);
            }
            else {
                console.log(`[AttractionHandler-UPSERT] No token cost for this new attraction by ${authenticatedUserId} (should not happen if validation for new attraction is correct).`);
            }
            const servicePayload = {
                userFrom: authenticatedUserId,
                userTo,
                date,
                romanticRating,
                sexualRating,
                friendshipRating,
                longTermPotential: Boolean(longTermPotential),
                intellectual: Boolean(intellectual),
                emotional: Boolean(emotional),
                result: null,
                firstMessageRights: null,
            };
            finalAttraction = yield attractionService.createAttraction(servicePayload);
            if (!finalAttraction || !finalAttraction.attractionId) {
                console.error(`[AttractionHandler-UPSERT] CRITICAL: Tokens may have been spent by ${authenticatedUserId} for new attraction to ${userTo} on ${date}, but attraction creation failed in service. Token cost: ${tokenCostForNewAttraction}. Payload:`, servicePayload);
                if (tokenCostForNewAttraction > 0) {
                    try {
                        yield userService.grantTokensToUser(authenticatedUserId, tokenCostForNewAttraction, `Refund: Attraction creation failed for ${userTo} on ${date}`);
                        console.log(`[AttractionHandler-UPSERT] Tokens refunded to ${authenticatedUserId} due to attraction creation failure.`);
                    }
                    catch (refundError) {
                        console.error(`[AttractionHandler-UPSERT] CRITICAL FAIL: Failed to refund tokens to ${authenticatedUserId}. Error:`, refundError.message);
                    }
                }
                return res.status(500).json({
                    message: 'Failed to create attraction. If tokens were deducted, they have been refunded. Please try again.',
                });
            }
            httpStatus = 201; // Created
            console.log(`[AttractionHandler-UPSERT] New attraction ${finalAttraction.attractionId} created.`);
        }
        if (!finalAttraction || !finalAttraction.attractionId) {
            console.error('[AttractionHandler-UPSERT] Critical: finalAttraction is null after create/update logic branch.');
            return res
                .status(500)
                .json({ message: 'Internal server error during attraction processing.' });
        }
        // --- MATCH LOGIC (common for both create and update paths) ---
        const userToAttractionRecord = yield attractionService.getAttraction(userTo, // The user being attracted TO
        authenticatedUserId, // The user expressing attraction (current user)
        date);
        let isMatch = false;
        if (userToAttractionRecord && userToAttractionRecord.attractionId) {
            console.log(`[AttractionHandler-UPSERT] Mutual attraction check: Found counter-attraction ID ${userToAttractionRecord.attractionId} from ${userTo} to ${authenticatedUserId} on ${date}.`);
            isMatch = yield attractionService.determineMatchResult(finalAttraction, userToAttractionRecord);
            console.log(`[AttractionHandler-UPSERT] Match determined: ${isMatch}`);
            // Update both records' result status
            finalAttraction.result = isMatch;
            userToAttractionRecord.result = isMatch; // This needs to be saved for userTo's record
            if (isMatch) {
                const userFromFirstMessageRights = yield attractionService.determineFirstMessageRights(finalAttraction, userToAttractionRecord);
                finalAttraction.firstMessageRights = userFromFirstMessageRights;
                userToAttractionRecord.firstMessageRights =
                    userFromFirstMessageRights === null ? null : !userFromFirstMessageRights;
                console.log(`[AttractionHandler-UPSERT] First message rights for ${authenticatedUserId}: ${userFromFirstMessageRights}`);
            }
            else {
                finalAttraction.firstMessageRights = null;
                userToAttractionRecord.firstMessageRights = null;
            }
            // Save changes to userTo's attraction record
            yield attractionService.updateAttraction(userToAttractionRecord.attractionId, {
                result: userToAttractionRecord.result,
                firstMessageRights: userToAttractionRecord.firstMessageRights,
            });
            console.log(`[AttractionHandler-UPSERT] Counter-attraction ${userToAttractionRecord.attractionId} updated with match result.`);
        }
        else {
            // No counter-attraction from userTo, so it cannot be a match
            console.log(`[AttractionHandler-UPSERT] No mutual attraction from ${userTo} to ${authenticatedUserId} on ${date}.`);
            finalAttraction.result = false; // Explicitly set to false if no counter-attraction
            finalAttraction.firstMessageRights = null;
            isMatch = false;
        }
        // Save/confirm final state of the current user's attraction record (finalAttraction)
        // This is important because its 'result' and 'firstMessageRights' might have changed
        const fullyUpdatedFinalAttraction = yield attractionService.updateAttraction(finalAttraction.attractionId, {
            result: finalAttraction.result,
            firstMessageRights: finalAttraction.firstMessageRights,
            // Re-assert ratings in case updateAttraction service expects full updatable fields
            romanticRating: finalAttraction.romanticRating,
            sexualRating: finalAttraction.sexualRating,
            friendshipRating: finalAttraction.friendshipRating,
            longTermPotential: finalAttraction.longTermPotential,
            intellectual: finalAttraction.intellectual,
            emotional: finalAttraction.emotional,
        });
        if (fullyUpdatedFinalAttraction) {
            finalAttraction = fullyUpdatedFinalAttraction;
        }
        else {
            // This would be an issue if the update after match logic fails
            console.error(`[AttractionHandler-UPSERT] Failed to save final state for attraction ${finalAttraction.attractionId} after match logic.`);
            // Decide how to handle - potentially proceed with the in-memory finalAttraction but log error
        }
        if (isMatch) {
            if (finalAttraction.userFrom && finalAttraction.userTo) {
                console.log(`[AttractionHandler-UPSERT] Sending match notification for users ${finalAttraction.userFrom} and ${finalAttraction.userTo}`);
                try {
                    yield notificationService.sendMatchNotification(finalAttraction.userFrom, finalAttraction.userTo);
                    console.log(`[AttractionHandler-UPSERT] Match notification process initiated for ${finalAttraction.userFrom} and ${finalAttraction.userTo}.`);
                }
                catch (error) {
                    console.error('[AttractionHandler-UPSERT] Failed to send match notification:', error.message, error.stack);
                }
            }
            else {
                console.error(`[AttractionHandler-UPSERT] CRITICAL: Cannot send match notification due to null user ID in finalAttraction.`);
            }
        }
        console.log('[AttractionHandler-UPSERT] Successfully processed attraction. Response:', JSON.stringify(finalAttraction, null, 2));
        return res.status(httpStatus).json(finalAttraction);
    }
    catch (error) {
        console.error('[AttractionHandler-UPSERT] Error in main try-catch block:', error.message, error.stack);
        if (error.message && error.message.toLowerCase().includes('insufficient token balance')) {
            return res.status(402).json({ message: 'Insufficient tokens for this action.' });
        }
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return res
                .status(402)
                .json({ message: error.message || 'Insufficient tokens for this action.' });
        }
        return res.status(500).json({
            message: error.message || 'An unexpected error occurred while processing attraction.',
        });
    }
}));
// --- getAttractionsByUserFromAndUserToHandler ---
// NO CHANGES NEEDED for this handler based on the problem description
exports.getAttractionsByUserFromAndUserToHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userFrom = req.params.userFrom;
    const userTo = req.params.userTo;
    const authenticatedUserId = req === null || req === void 0 ? void 0 : req.userId;
    if (!userFrom || !userTo) {
        return res.status(400).json({ message: 'userFrom and userTo parameters are required.' });
    }
    if (!authenticatedUserId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    if (userFrom !== authenticatedUserId && userTo !== authenticatedUserId) {
        console.warn(`[GetAttractions] Forbidden attempt by ${authenticatedUserId} to access attractions between ${userFrom} and ${userTo}.`);
        return res
            .status(403)
            .json({ message: 'Forbidden. You can only view attractions involving yourself.' });
    }
    try {
        const attractions = yield attractionService.getAttractionsByUserFromAndUserTo(userFrom, userTo);
        return res.status(200).json(attractions);
    }
    catch (error) {
        console.error(`[GetAttractions] Error fetching attractions between ${userFrom} and ${userTo}:`, error.message, error.stack);
        next(error); // Or return a 500 error
    }
}));
// --- getAttractionByUserFromUserToAndDateHandler ---
// NO CHANGES NEEDED for this handler based on the problem description
exports.getAttractionByUserFromUserToAndDateHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userFrom = req.params.userFrom;
    const userTo = req.params.userTo;
    const date = req.params.date;
    const authenticatedUserId = req === null || req === void 0 ? void 0 : req.userId;
    if (!userFrom || !userTo || !date) {
        return res
            .status(400)
            .json({ message: 'userFrom, userTo, and date parameters are required.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
    }
    if (!authenticatedUserId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    // Allow fetching if the authenticated user is either userFrom or userTo
    if (userFrom !== authenticatedUserId && userTo !== authenticatedUserId) {
        console.warn(`[GetAttractionByDate] Forbidden attempt by ${authenticatedUserId} to access attraction for ${userFrom} -> ${userTo} on ${date}.`);
        return res
            .status(403)
            .json({ message: 'Forbidden. You can only view attractions involving yourself.' });
    }
    try {
        const attraction = yield attractionService.getAttraction(userFrom, userTo, date);
        if (!attraction) {
            // It's important for the frontend that a 404 means "no attraction found for this specific query"
            // and not a general "endpoint not found".
            return res
                .status(404)
                .json({ message: 'Attraction not found for the specified users and date.' });
        }
        return res.status(200).json(attraction);
    }
    catch (error) {
        console.error(`[GetAttractionByDate] Error fetching attraction for ${userFrom} -> ${userTo} on ${date}:`, error.message, error.stack);
        next(error); // Or return a 500 error
    }
}));
