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
// File: src/services/internal/NotificationService.ts
const onesignal_node_1 = require("onesignal-node"); // Import Client directly
const db_1 = __importDefault(require("../../db"));
class NotificationService {
    constructor() {
        const appId = '0e2040ef-b6ed-4884-8d94-4283f3e4ecf0';
        const apiKey = 'os_v2_app_byqeb35w5veijdmuikb7hzhm6cqki2w2jgrua3vocknmlkkwxfducfi3nptkms55dazqkopu6xjbaaxuua7vtcayhi6o7z7cwnjfnoa';
        if (!appId || !apiKey) {
            console.error('CRITICAL: OneSignal App ID or API Key is not properly configured in environment variables.', `App ID found: ${appId ? 'Yes' : 'No'}, API Key found: ${apiKey ? 'Yes' : 'No'}`);
            throw new Error('OneSignal credentials not configured or missing from environment');
        }
        // Instantiate using the imported Client constructor
        this.oneSignalClient = new onesignal_node_1.Client(appId, apiKey);
        this.db = db_1.default;
        console.log('[NotificationService] Initialized with OneSignal client using environment variables.');
    }
    getUserProfile(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = `
        SELECT user_id, first_name, last_name, profile_picture_url, video_url 
        FROM users 
        WHERE user_id = $1;
      `;
                const result = yield this.db.query(query, [userId]);
                if (result.rows.length > 0) {
                    return result.rows[0];
                }
                console.warn(`[NotificationService] User profile not found for userId: ${userId}`);
                return null;
            }
            catch (error) {
                console.error(`[NotificationService] Error fetching user profile for ${userId}:`, error);
                return null;
            }
        });
    }
    getPlayerId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.db.query('SELECT one_signal_player_id FROM users WHERE user_id = $1', [userId]);
                if (result.rows.length > 0 && result.rows[0].one_signal_player_id) {
                    return result.rows[0].one_signal_player_id;
                }
                console.warn(`[NotificationService] No OneSignal player ID found for user ${userId}`);
                return null;
            }
            catch (error) {
                console.error(`[NotificationService] Error fetching player ID for user ${userId}:`, error);
                return null;
            }
        });
    }
    sendMatchNotification(userFromId, userToId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            console.log(`[NotificationService] Attempting to send match notification between ${userFromId} and ${userToId}`);
            const userFromProfile = yield this.getUserProfile(userFromId);
            const userToProfile = yield this.getUserProfile(userToId);
            if (!userFromProfile || !userToProfile) {
                console.error('[NotificationService] Could not send match notification due to missing profiles.');
                return;
            }
            const playerFromId = yield this.getPlayerId(userFromId);
            const playerToId = yield this.getPlayerId(userToId);
            const commonNotificationData = {
                type: 'MATCH_NOTIFICATION',
            };
            if (playerFromId) {
                const notificationToUserFrom = {
                    contents: {
                        en: `It's a Match! You matched with ${userToProfile.firstName || 'them'}.`,
                    },
                    headings: {
                        en: 'New Match!',
                    },
                    include_player_ids: [playerFromId],
                    data: Object.assign(Object.assign({}, commonNotificationData), { matchedUserId: userToId, matchedUserName: `${userToProfile.firstName || ''} ${userToProfile.lastName || ''}`.trim(), matchedUserPic: (_a = userToProfile.profilePictureUrl) !== null && _a !== void 0 ? _a : undefined }),
                    ios_attachments: userToProfile.profilePictureUrl
                        ? { id1: userToProfile.profilePictureUrl }
                        : undefined,
                    big_picture: (_b = userToProfile.profilePictureUrl) !== null && _b !== void 0 ? _b : undefined,
                };
                try {
                    const oneSignalResponse = yield this.oneSignalClient.createNotification(notificationToUserFrom);
                    console.log(`[NotificationService] Match notification sent to user ${userFromId} (about ${userToId}). OneSignal Response:`, oneSignalResponse.body);
                }
                catch (error) {
                    console.error(`[NotificationService] Error sending match notification to ${userFromId}:`, error.body || error.message || error);
                }
            }
            if (playerToId) {
                const notificationToUserTo = {
                    contents: {
                        en: `It's a Match! You matched with ${userFromProfile.firstName || 'them'}.`,
                    },
                    headings: {
                        en: 'New Match!',
                    },
                    include_player_ids: [playerToId],
                    data: Object.assign(Object.assign({}, commonNotificationData), { matchedUserId: userFromId, matchedUserName: `${userFromProfile.firstName || ''} ${userFromProfile.lastName || ''}`.trim(), matchedUserPic: (_c = userFromProfile.profilePictureUrl) !== null && _c !== void 0 ? _c : undefined }),
                    ios_attachments: userFromProfile.profilePictureUrl
                        ? { id1: userFromProfile.profilePictureUrl }
                        : undefined,
                    big_picture: (_d = userFromProfile.profilePictureUrl) !== null && _d !== void 0 ? _d : undefined,
                };
                try {
                    const oneSignalResponse = yield this.oneSignalClient.createNotification(notificationToUserTo);
                    console.log(`[NotificationService] Match notification sent to user ${userToId} (about ${userFromId}). OneSignal Response:`, oneSignalResponse.body);
                }
                catch (error) {
                    console.error(`[NotificationService] Error sending match notification to ${userToId}:`, error.body || error.message || error);
                }
            }
        });
    }
    sendDateProposalNotification(senderUserId, receiverUserId, dateDetails, attractionRatings) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            console.log(`[NotificationService] Attempting to send date proposal from ${senderUserId} to ${receiverUserId}`);
            const senderProfile = yield this.getUserProfile(senderUserId);
            if (!senderProfile) {
                console.error(`[NotificationService] Cannot send proposal, sender profile ${senderUserId} not found.`);
                return;
            }
            const receiverPlayerId = yield this.getPlayerId(receiverUserId);
            if (!receiverPlayerId) {
                console.warn(`[NotificationService] No OneSignal player ID for receiver ${receiverUserId}. Proposal notification not sent.`);
                return;
            }
            const formattedDate = new Date(dateDetails.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'long',
                day: 'numeric',
            });
            const formattedTime = dateDetails.time
                ? new Date(`1970-01-01T${dateDetails.time}`).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                })
                : 'Any time';
            const senderDisplayName = `${senderProfile.firstName || ''} ${senderProfile.lastName || ''}`.trim() || 'Someone';
            const notification = {
                contents: {
                    en: `${senderDisplayName} proposed a date: ${dateDetails.venue} on ${formattedDate} at ${formattedTime}.`,
                },
                headings: {
                    en: 'New Date Proposal!',
                },
                include_player_ids: [receiverPlayerId],
                data: {
                    type: 'DATE_PROPOSAL',
                    dateId: dateDetails.dateId,
                    senderInfo: {
                        userId: senderProfile.userId,
                        name: senderDisplayName,
                        profilePictureUrl: (_a = senderProfile.profilePictureUrl) !== null && _a !== void 0 ? _a : undefined,
                        videoUrl: (_b = senderProfile.videoUrl) !== null && _b !== void 0 ? _b : undefined,
                    },
                    dateDetails: {
                        date: dateDetails.date,
                        time: dateDetails.time,
                        venue: dateDetails.venue,
                    },
                    attractionRatings: attractionRatings || {},
                    action: 'VIEW_PROPOSAL_DETAILS',
                },
                buttons: [
                    { id: 'accept_proposal', text: 'Accept' },
                    { id: 'decline_proposal', text: 'Decline' },
                    { id: 'update_proposal', text: 'Suggest Update' },
                ],
                ios_attachments: senderProfile.profilePictureUrl
                    ? { id1: senderProfile.profilePictureUrl }
                    : undefined,
                big_picture: (_c = senderProfile.profilePictureUrl) !== null && _c !== void 0 ? _c : undefined,
            };
            try {
                const oneSignalResponse = yield this.oneSignalClient.createNotification(notification);
                console.log(`[NotificationService] Date proposal notification sent to ${receiverUserId}. OneSignal Response:`, oneSignalResponse.body);
            }
            catch (error) {
                console.error('[NotificationService] Error sending date proposal notification:', error.body || error.message || error);
            }
        });
    }
    sendDateUpdateNotification(updaterUserId, receiverUserId, dateId, updateDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log(`[NotificationService] Attempting to send date update notification from ${updaterUserId} to ${receiverUserId} for dateId ${dateId}`);
            const updaterProfile = yield this.getUserProfile(updaterUserId);
            if (!updaterProfile) {
                console.error(`[NotificationService] Cannot send update, updater profile ${updaterUserId} not found.`);
                return;
            }
            const receiverPlayerId = yield this.getPlayerId(receiverUserId);
            if (!receiverPlayerId) {
                console.warn(`[NotificationService] No OneSignal player ID for receiver ${receiverUserId}. Update notification not sent.`);
                return;
            }
            const updaterDisplayName = `${updaterProfile.firstName || ''} ${updaterProfile.lastName || ''}`.trim() || 'Someone';
            let updateMessage = `${updaterDisplayName} updated the date details:`;
            if (updateDetails.date)
                updateMessage += ` New Date: ${new Date(updateDetails.date).toLocaleDateString()}`;
            if (updateDetails.time)
                updateMessage += ` New Time: ${new Date(`1970-01-01T${updateDetails.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            if (updateDetails.venue)
                updateMessage += ` New Venue: ${updateDetails.venue}`;
            const notification = {
                contents: {
                    en: updateMessage,
                },
                headings: {
                    en: 'Date Details Updated!',
                },
                include_player_ids: [receiverPlayerId],
                data: {
                    type: 'DATE_DETAILS_UPDATED',
                    dateId: dateId,
                    updaterUserId: updaterUserId,
                    updatedFields: updateDetails,
                    action: 'VIEW_UPDATED_DATE_DETAILS',
                },
                buttons: [
                    { id: 'accept_update', text: 'Accept Changes' },
                    { id: 'decline_update', text: 'Decline/Counter' },
                ],
                ios_attachments: updaterProfile.profilePictureUrl
                    ? { id1: updaterProfile.profilePictureUrl }
                    : undefined,
                big_picture: (_a = updaterProfile.profilePictureUrl) !== null && _a !== void 0 ? _a : undefined,
            };
            try {
                const oneSignalResponse = yield this.oneSignalClient.createNotification(notification);
                console.log(`[NotificationService] Date update notification sent to ${receiverUserId}. OneSignal Response:`, oneSignalResponse.body);
            }
            catch (error) {
                console.error('[NotificationService] Error sending date update notification:', error.body || error.message || error);
            }
        });
    }
    sendDateResponseNotification(responderUserId, receiverUserId, responseType, dateId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            console.log(`[NotificationService] Attempting to send date ${responseType} notification from ${responderUserId} to ${receiverUserId} for dateId ${dateId}`);
            const responderProfile = yield this.getUserProfile(responderUserId);
            if (!responderProfile) {
                console.error(`[NotificationService] Cannot send response, responder profile ${responderUserId} not found.`);
                return;
            }
            const receiverPlayerId = yield this.getPlayerId(receiverUserId);
            if (!receiverPlayerId) {
                console.warn(`[NotificationService] No OneSignal player ID for receiver ${receiverUserId}. Response notification not sent.`);
                return;
            }
            const responderDisplayName = `${responderProfile.firstName || ''} ${responderProfile.lastName || ''}`.trim() || 'Someone';
            const actionText = responseType === 'ACCEPTED' ? 'accepted' : 'declined';
            const notification = {
                contents: {
                    en: `${responderDisplayName} has ${actionText} the date proposal.`,
                },
                headings: {
                    en: responseType === 'ACCEPTED' ? 'Date Proposal Accepted!' : 'Date Proposal Declined',
                },
                include_player_ids: [receiverPlayerId],
                data: {
                    type: responseType === 'ACCEPTED' ? 'DATE_PROPOSAL_ACCEPTED' : 'DATE_PROPOSAL_DECLINED',
                    dateId: dateId,
                    responderUserId: responderUserId,
                    responderName: responderDisplayName,
                    action: 'VIEW_DATE_STATUS',
                    responderProfilePictureUrl: (_a = responderProfile.profilePictureUrl) !== null && _a !== void 0 ? _a : undefined,
                },
                ios_attachments: responderProfile.profilePictureUrl
                    ? { id1: responderProfile.profilePictureUrl }
                    : undefined,
                big_picture: (_b = responderProfile.profilePictureUrl) !== null && _b !== void 0 ? _b : undefined,
            };
            try {
                const oneSignalResponse = yield this.oneSignalClient.createNotification(notification);
                console.log(`[NotificationService] Date ${responseType} notification sent to ${receiverUserId}. OneSignal Response:`, oneSignalResponse.body);
            }
            catch (error) {
                console.error(`[NotificationService] Error sending date ${responseType} notification:`, error.body || error.message || error);
            }
        });
    }
}
exports.default = NotificationService;
