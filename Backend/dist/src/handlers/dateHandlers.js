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
exports.getDateByUserFromUserToAndDateHandler = exports.getDateByIdHandler = exports.cancelDateHandler = exports.updateDateHandler = exports.createDateHandler = void 0;
const middleware_1 = require("../middleware"); // Ensure this path is correct
const DatesService_1 = __importDefault(require("../services/internal/DatesService")); // Ensure this path is correct
const NotificationService_1 = __importDefault(require("../services/internal/NotificationService")); // Ensure this path is correct
const AttractionService_1 = __importDefault(require("../services/internal/AttractionService")); // Ensure this path is correct
const datesService = new DatesService_1.default();
const notificationService = new NotificationService_1.default();
const attractionService = new AttractionService_1.default(); // For fetching attraction details
console.log('[DateHandler] Services instantiated (Dates, Notification, Attraction).');
exports.createDateHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const proposerUserId = req === null || req === void 0 ? void 0 : req.userId;
    // Destructure from CreateDatePayload which matches frontend
    const { date, time, userTo, locationMetadata } = req.body;
    if (!proposerUserId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    if (!date || !userTo) {
        return res.status(400).json({ message: 'Date and userTo are required to propose a date.' });
    }
    if (proposerUserId === userTo) {
        return res.status(400).json({ message: 'Cannot propose a date to yourself.' });
    }
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    // Validate time format (HH:MM or HH:MM:SS) if provided
    if (time && (typeof time !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(time))) {
        return res.status(400).json({ message: 'Invalid time format. Use HH:MM or HH:MM:SS.' });
    }
    // Check if an active or pending date already exists
    const existingDateMutual = yield datesService.getDateEntryByUsersAndDate(proposerUserId, userTo, date);
    if (existingDateMutual &&
        existingDateMutual.status !== 'cancelled' &&
        existingDateMutual.status !== 'completed' // Add any other "final" statuses
    ) {
        console.warn(`[CreateDateHandler] Active or pending date already exists between ${proposerUserId} and ${userTo} for ${date}. Date ID: ${existingDateMutual.dateId}`);
        return res.status(409).json({
            message: `An active or pending date already exists with this user for ${date}.`,
            existingDate: existingDateMutual, // Optionally return existing date info
        });
    }
    const createDatePayload = {
        // This matches the type used in DatesService
        date: date,
        time: time || null, // Ensure time is null if not provided
        userFrom: proposerUserId,
        userTo: userTo,
        userFromApproved: true, // Proposer always approves their own proposal initially
        userToApproved: false, // Other user needs to approve
        locationMetadata: locationMetadata || null, // Ensure location is null if not provided
        status: 'pending', // Initial status
    };
    try {
        const createdDate = yield datesService.createDateEntry(createDatePayload);
        if (!createdDate || !createdDate.dateId) {
            console.error('[CreateDateHandler] Failed to create date entry in service.');
            return res.status(500).json({ error: 'Error creating date proposal.' });
        }
        console.log(`[CreateDateHandler] Date proposed by ${proposerUserId} to ${userTo} for ${date}. Date ID: ${createdDate.dateId}`);
        // --- Send Notification ---
        // Fetch attraction details to include in the notification if available
        let attractionRatingsData = null;
        try {
            // Attraction is between proposer (userFrom) and userTo for the specific date of the proposal
            const attraction = yield attractionService.getAttraction(proposerUserId, userTo, createdDate.date);
            if (attraction) {
                attractionRatingsData = {
                    romanticRating: attraction.romanticRating,
                    sexualRating: attraction.sexualRating,
                    friendshipRating: attraction.friendshipRating,
                    // Add other attraction fields if your notification service uses them
                };
            }
            else {
                console.warn(`[CreateDateHandler] No prior attraction found between ${proposerUserId} and ${userTo} for date ${createdDate.date} to include in notification.`);
            }
        }
        catch (attractionError) {
            console.error('[CreateDateHandler] Failed to fetch attraction details for notification:', attractionError.message);
            // Continue without attraction data for notification
        }
        // Now, send the notification
        try {
            yield notificationService.sendDateProposalNotification(proposerUserId, // senderUserId
            userTo, // receiverUserId
            {
                dateId: createdDate.dateId,
                date: createdDate.date,
                time: createdDate.time || '', // Pass empty string if time is null
                venue: ((_a = createdDate.locationMetadata) === null || _a === void 0 ? void 0 : _a.name) || 'Venue to be decided',
            }, attractionRatingsData);
            console.log(`[CreateDateHandler] Date proposal notification initiated for User B (${userTo}).`);
        }
        catch (notificationError) {
            // Log notification error but don't fail the entire request because of it
            console.error('[CreateDateHandler] Failed to send date proposal notification:', notificationError.message, notificationError.stack);
        }
        // --- End Send Notification ---
        return res.status(201).json(createdDate);
    }
    catch (error) {
        console.error('[CreateDateHandler] Error during date proposal creation:', error.message, error.stack);
        // Handle specific DB errors like unique constraint violations
        if (error.message.toLowerCase().includes('duplicate key') ||
            error.message.toLowerCase().includes('unique constraint')) {
            return res.status(409).json({
                message: 'A date proposal for these users on this day might already exist or there was a conflict.',
            });
        }
        next(error); // Pass to global error handler for other errors
    }
}));
exports.updateDateHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const updaterUserId = req === null || req === void 0 ? void 0 : req.userId;
    const dateIdFromParams = req.params.dateId; // From PATCH /dates/:dateId
    const { date, time, locationMetadata, userFromApproved, userToApproved, status, // string from request, needs to be StatusType
     } = req.body;
    if (!updaterUserId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    if (!dateIdFromParams || isNaN(Number(dateIdFromParams))) {
        return res.status(400).json({ message: 'A valid numeric dateId path parameter is required.' });
    }
    const dateId = Number(dateIdFromParams);
    try {
        const existingDate = yield datesService.getDateEntryById(dateId);
        if (!existingDate) {
            return res.status(404).json({ message: 'Date entry not found.' });
        }
        // Authorization: User must be part of the date
        if (existingDate.userFrom !== updaterUserId && existingDate.userTo !== updaterUserId) {
            console.warn(`[UpdateDateHandler] Unauthorized attempt by ${updaterUserId} to update date ${dateId} belonging to ${existingDate.userFrom}/${existingDate.userTo}.`);
            return res.status(403).json({ message: 'You are not authorized to update this date.' });
        }
        // Prevent updates on already finalized dates
        if (existingDate.status === 'cancelled' || existingDate.status === 'completed') {
            return res
                .status(400)
                .json({ message: `Cannot update a date that is already ${existingDate.status}.` });
        }
        const partialUpdateData = {};
        if (date !== undefined) {
            if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ message: 'Invalid date format for update.' });
            }
            partialUpdateData.date = date;
        }
        if (time !== undefined) {
            // Allow null to clear time
            if (time !== null && (typeof time !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(time))) {
                return res.status(400).json({ message: 'Invalid time format for update.' });
            }
            partialUpdateData.time = time;
        }
        if (locationMetadata !== undefined)
            partialUpdateData.locationMetadata = locationMetadata; // Allow null
        let receiverNotificationUserId = null;
        let isAcceptance = false;
        let isCancellation = false;
        let isDecline = false; // For when userToApproved becomes false explicitly
        // Handle approval logic
        if (updaterUserId === existingDate.userFrom) {
            // User From (proposer) is updating
            if (userFromApproved !== undefined &&
                typeof userFromApproved === 'boolean' &&
                userFromApproved !== existingDate.userFromApproved) {
                partialUpdateData.userFromApproved = userFromApproved;
                if (userFromApproved && existingDate.userToApproved) {
                    // Both true means approved
                    isAcceptance = true;
                }
            }
            receiverNotificationUserId = existingDate.userTo;
        }
        else if (updaterUserId === existingDate.userTo) {
            // User To (receiver of proposal) is updating
            if (userToApproved !== undefined &&
                typeof userToApproved === 'boolean' &&
                userToApproved !== existingDate.userToApproved) {
                partialUpdateData.userToApproved = userToApproved;
                if (userToApproved && existingDate.userFromApproved) {
                    // Both true means approved
                    isAcceptance = true;
                }
                else if (!userToApproved) {
                    // UserTo explicitly declined
                    isDecline = true;
                }
            }
            receiverNotificationUserId = existingDate.userFrom;
        }
        // Handle status changes (e.g., cancellation)
        if (status !== undefined && status !== existingDate.status) {
            const validStatuses = [
                'pending',
                'approved',
                'cancelled',
                'completed',
                'unscheduled',
            ];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: `Invalid status value: ${status}.` });
            }
            partialUpdateData.status = status;
            if (status === 'cancelled') {
                isCancellation = true;
            }
            // If status is directly set to 'approved', it's an acceptance (could be admin action or specific flow)
            if (status === 'approved' && existingDate.userFromApproved && existingDate.userToApproved) {
                isAcceptance = true; // Ensure isAcceptance is true if status is directly set to approved
            }
        }
        // Determine if core date details (date, time, location) actually changed
        const detailsChanged = (partialUpdateData.date !== undefined && partialUpdateData.date !== existingDate.date) ||
            (partialUpdateData.time !== undefined && partialUpdateData.time !== existingDate.time) ||
            (partialUpdateData.locationMetadata !== undefined &&
                JSON.stringify(partialUpdateData.locationMetadata) !==
                    JSON.stringify(existingDate.locationMetadata));
        if (Object.keys(partialUpdateData).length === 0) {
            return res.status(200).json({ message: 'No changes detected.', date: existingDate });
        }
        // If it's an acceptance, set status to 'approved'
        if (isAcceptance && partialUpdateData.status !== 'cancelled') {
            // Don't override explicit cancellation
            partialUpdateData.status = 'approved';
        }
        // If it's a decline by UserTo setting their approval to false, set status to 'pending' or 'cancelled'
        if (isDecline && partialUpdateData.status !== 'cancelled') {
            partialUpdateData.status = 'pending'; // Or 'cancelled' depending on desired flow for decline
        }
        const updatedDate = yield datesService.updateDateEntry(dateId, partialUpdateData);
        if (!updatedDate) {
            console.error(`[UpdateDateHandler] Failed to update date entry ${dateId} in service.`);
            return res.status(500).json({ error: 'Error updating date proposal.' });
        }
        console.log(`[UpdateDateHandler] Date ${dateId} updated by ${updaterUserId}. New status: ${updatedDate.status}`);
        // Send Notifications based on what changed
        if (receiverNotificationUserId) {
            if (isCancellation || updatedDate.status === 'cancelled') {
                yield notificationService.sendDateResponseNotification(updaterUserId, receiverNotificationUserId, 'DECLINED', // Cancellation is like a decline
                updatedDate.dateId);
            }
            else if (isDecline) {
                yield notificationService.sendDateResponseNotification(updaterUserId, // The one who set their approval to false
                receiverNotificationUserId, // The other party
                'DECLINED', updatedDate.dateId);
            }
            else if (isAcceptance && updatedDate.status === 'approved') {
                yield notificationService.sendDateResponseNotification(updaterUserId, // The one who made the final approval
                receiverNotificationUserId, 'ACCEPTED', updatedDate.dateId);
            }
            else if (detailsChanged &&
                !isAcceptance &&
                !isDecline &&
                updatedDate.status !== 'approved' &&
                updatedDate.status !== 'cancelled') {
                // Only send details update if it wasn't an acceptance/decline and status is not final
                const updatedFieldsForNotification = {};
                if (partialUpdateData.date !== undefined)
                    updatedFieldsForNotification.date = partialUpdateData.date;
                if (partialUpdateData.time !== undefined)
                    updatedFieldsForNotification.time = partialUpdateData.time;
                if (partialUpdateData.locationMetadata !== undefined) {
                    updatedFieldsForNotification.venue =
                        ((_a = partialUpdateData.locationMetadata) === null || _a === void 0 ? void 0 : _a.name) || 'Venue details updated';
                }
                if (Object.keys(updatedFieldsForNotification).length > 0) {
                    yield notificationService.sendDateUpdateNotification(updaterUserId, receiverNotificationUserId, updatedDate.dateId, updatedFieldsForNotification);
                }
            }
        }
        return res.status(200).json(updatedDate);
    }
    catch (error) {
        console.error(`[UpdateDateHandler] Error updating date ${dateId}:`, error.message, error.stack);
        next(error);
    }
}));
exports.cancelDateHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const cancellerUserId = req === null || req === void 0 ? void 0 : req.userId;
    const { dateId } = req.params; // Assuming dateId is a path parameter
    if (!cancellerUserId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    if (!dateId || isNaN(Number(dateId))) {
        return res.status(400).json({ message: 'A valid numeric dateId path parameter is required.' });
    }
    const numericDateId = Number(dateId);
    try {
        const dateEntry = yield datesService.getDateEntryById(numericDateId);
        if (!dateEntry) {
            return res.status(404).json({ message: 'Date proposal not found.' });
        }
        if (dateEntry.userFrom !== cancellerUserId && dateEntry.userTo !== cancellerUserId) {
            return res.status(403).json({ message: 'You are not authorized to cancel this date.' });
        }
        if (dateEntry.status === 'cancelled' || dateEntry.status === 'completed') {
            return res.status(400).json({ message: `This date is already ${dateEntry.status}.` });
        }
        const updatedDate = yield datesService.updateDateEntry(numericDateId, {
            status: 'cancelled',
        });
        if (!updatedDate || updatedDate.status !== 'cancelled') {
            console.error(`[CancelDateHandler] Failed to cancel date ${numericDateId}.`);
            return res.status(500).json({ error: 'Error cancelling date.' });
        }
        console.log(`[CancelDateHandler] Date ${numericDateId} cancelled by ${cancellerUserId}.`);
        const otherPartyUserId = dateEntry.userFrom === cancellerUserId ? dateEntry.userTo : dateEntry.userFrom;
        if (otherPartyUserId) {
            yield notificationService.sendDateResponseNotification(cancellerUserId, otherPartyUserId, 'DECLINED', // Cancellation is like a decline
            updatedDate.dateId);
        }
        return res.status(200).json(updatedDate);
    }
    catch (error) {
        console.error(`[CancelDateHandler] Error cancelling date ${dateId}:`, error.message, error.stack);
        next(error);
    }
}));
exports.getDateByIdHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authenticatedUserId = req === null || req === void 0 ? void 0 : req.userId;
    const { dateId } = req.params;
    if (!authenticatedUserId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    if (!dateId || isNaN(Number(dateId))) {
        return res.status(400).json({ message: 'A valid numeric dateId parameter is required.' });
    }
    const numericDateId = Number(dateId);
    try {
        const dateEntry = yield datesService.getDateEntryById(numericDateId);
        if (!dateEntry) {
            return res.status(404).json({ message: 'Date entry not found.' });
        }
        if (authenticatedUserId !== dateEntry.userFrom && authenticatedUserId !== dateEntry.userTo) {
            return res
                .status(403)
                .json({ message: 'Forbidden: You can only view dates you are part of.' });
        }
        return res.status(200).json(dateEntry);
    }
    catch (error) {
        console.error(`[GetDateByIdHandler] Error fetching date by ID ${dateId}:`, error.message, error.stack);
        next(error);
    }
}));
exports.getDateByUserFromUserToAndDateHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authenticatedUserId = req === null || req === void 0 ? void 0 : req.userId;
    const { userFrom, userTo, date } = req.params;
    if (!authenticatedUserId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    if (!userFrom || !userTo || !date) {
        return res
            .status(400)
            .json({ message: 'userFrom, userTo, and date parameters are required.' });
    }
    if (authenticatedUserId !== userFrom && authenticatedUserId !== userTo) {
        return res
            .status(403)
            .json({ message: 'Forbidden: You can only view dates you are part of.' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    try {
        // Try fetching in one direction
        let dateEntry = yield datesService.getDateEntryByUserToUserFromAndDate(userFrom, userTo, date);
        if (!dateEntry) {
            // If not found, try the other direction
            dateEntry = yield datesService.getDateEntryByUserToUserFromAndDate(userTo, userFrom, date);
        }
        if (!dateEntry) {
            return res
                .status(404)
                .json({ message: 'Date not found between these users for this date.' });
        }
        return res.status(200).json(dateEntry);
    }
    catch (error) {
        console.error(`[GetDateByUserFromUserToAndDateHandler] Error fetching date for ${userFrom}-${userTo} on ${date}:`, error.message, error.stack);
        next(error);
    }
}));
