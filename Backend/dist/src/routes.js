"use strict";
// File: src/routes.ts
// NO CHANGES NEEDED - This file is correctly structured for POST /date
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const middleware_1 = require("./middleware");
const userHandler = __importStar(require("./handlers/userHandlers"));
const calendarDayHandlers = __importStar(require("./handlers/calendarDayHandlers"));
const attractionHandlers = __importStar(require("./handlers/attractionHandlers"));
const dateHandlers = __importStar(require("./handlers/dateHandlers")); // This is important
const transactionHandler = __importStar(require("./handlers/transactionHandlers"));
const videoHandler = __importStar(require("./handlers/videoHandlers"));
const router = express_1.default.Router();
console.log('BACKEND ROUTES: Router instance created.');
const protectedRouteMiddleware = [middleware_1.logAuthHeader, middleware_1.checkJwt, middleware_1.logAfterJwt, middleware_1.extractUserId];
const protectedReadMiddleware = [middleware_1.logAuthHeader, middleware_1.checkJwt, middleware_1.logAfterJwt, middleware_1.extractUserId]; // If read ops also need userId
// --- USER ROUTES ---
router.get('/users/tokens', ...protectedReadMiddleware, (0, middleware_1.asyncHandler)(userHandler.getUserTokenBalanceHandler));
router.post('/users', ...protectedRouteMiddleware, (0, middleware_1.asyncHandler)(userHandler.createUserHandler)); // Ensure createUserHandler exists
router.patch('/users', ...protectedRouteMiddleware, (0, middleware_1.asyncHandler)(userHandler.updateUserHandler));
router.get('/users/:id', ...protectedReadMiddleware, (0, middleware_1.asyncHandler)(userHandler.getUserByIdHandler));
router.post('/users/profilePicture', ...protectedRouteMiddleware, userHandler.uploadProfilePictureHandler); // Assuming these are direct handlers not wrapped in asyncHandler
router.post('/users/homePageVideo', ...protectedRouteMiddleware, userHandler.uploadHomepageVideoHandler);
router.post('/users/calendarVideos', ...protectedRouteMiddleware, calendarDayHandlers.uploadCalendarVideoHandler);
router.post('/users/push-token', ...protectedRouteMiddleware, (0, middleware_1.asyncHandler)(userHandler.registerPushTokenHandler));
// Add DELETE routes if you have them, e.g., for videos/pictures
// --- TRANSACTION ROUTES ---
router.post('/transactions/purchase', ...protectedRouteMiddleware, (0, middleware_1.asyncHandler)(transactionHandler.createPurchaseTransactionHandler));
router.get('/transactions/me', ...protectedReadMiddleware, (0, middleware_1.asyncHandler)(transactionHandler.getUserTransactionsHandler));
// --- CALENDAR ROUTES ---
router.post('/calendarDays', ...protectedRouteMiddleware, (0, middleware_1.asyncHandler)(calendarDayHandlers.createCalendarDayHandler));
router.patch('/calendarDays', ...protectedRouteMiddleware, (0, middleware_1.asyncHandler)(calendarDayHandlers.updateCalendarDayHandler));
router.get('/calendarDays/:userId/:date', ...protectedReadMiddleware, (0, middleware_1.asyncHandler)(calendarDayHandlers.getCalendarDayByUserIdAndDateHandler));
router.get('/calendarDays/user', ...protectedReadMiddleware, (0, middleware_1.asyncHandler)(calendarDayHandlers.getCalendarDaysByUserIdHandler));
// router.get('/calendarDays/videos/:userId/:date', ...protectedReadMiddleware, asyncHandler(calendarDayHandlers.getCalendarDayVideosByUserAndDateHandler)); // If you have this
// --- STORIES ROUTE ---
router.get('/stories/:date', ...protectedReadMiddleware, (0, middleware_1.asyncHandler)(calendarDayHandlers.getStoriesByDateHandler));
// --- ATTRACTION ROUTES ---
router.post('/attraction', ...protectedRouteMiddleware, (0, middleware_1.asyncHandler)(attractionHandlers.createAttractionHandler));
router.get('/attraction/:userFrom/:userTo', ...protectedReadMiddleware, (0, middleware_1.asyncHandler)(attractionHandlers.getAttractionsByUserFromAndUserToHandler));
router.get('/attraction/:userFrom/:userTo/:date', ...protectedReadMiddleware, (0, middleware_1.asyncHandler)(attractionHandlers.getAttractionByUserFromUserToAndDateHandler));
// --- DATE (PLANNED DATE/EVENT) ROUTES ---
router.post('/date', ...protectedRouteMiddleware, (0, middleware_1.asyncHandler)(dateHandlers.createDateHandler)); // Correctly points to your handler
router.get('/date/:userFrom/:userTo/:date', ...protectedReadMiddleware, (0, middleware_1.asyncHandler)(dateHandlers.getDateByUserFromUserToAndDateHandler));
// Assuming updateDateHandler and cancelDateHandler expect :dateId in path based on typical REST
// If your PATCH /date is generic without an ID, its handler needs to find the date from the body.
router.patch('/dates/:dateId', ...protectedRouteMiddleware, (0, middleware_1.asyncHandler)(dateHandlers.updateDateHandler)); // If using :dateId
// router.patch('/date', ...protectedRouteMiddleware, asyncHandler(dateHandlers.updateDateHandler)); // If generic PATCH /date
router.patch('/dates/:dateId/cancel', ...protectedRouteMiddleware, (0, middleware_1.asyncHandler)(dateHandlers.cancelDateHandler)); // More RESTful for cancel
// router.patch('/date/cancel/:userTo/:date', ...protectedRouteMiddleware, asyncHandler(dateHandlers.cancelDateHandler)); // If using old structure
// Get date by its ID
router.get('/dates/:dateId', ...protectedReadMiddleware, (0, middleware_1.asyncHandler)(dateHandlers.getDateByIdHandler));
// --- VIDEO PLAYABLE URL ROUTE ---
router.get('/videos/playable-url', ...protectedReadMiddleware, (0, middleware_1.asyncHandler)(videoHandler.getVideoPlayableUrlHandler));
// --- HEALTH CHECK ROUTE ---
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
// --- SYSTEM ROUTES ---
router.post('/system/replenish-tokens', (0, middleware_1.asyncHandler)(userHandler.processMonthlyTokenReplenishmentHandler)); // If you have this
console.log('BACKEND ROUTES: All routes configured.');
exports.default = router;
