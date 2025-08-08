// File: src/routes.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import express, { Request, Response, NextFunction } from 'express'
import { logAuthHeader, checkJwt, logAfterJwt, extractUserId, asyncHandler } from './middleware'
import * as userHandler from './handlers/userHandlers'
import * as calendarDayHandlers from './handlers/calendarDayHandlers'
import * as attractionHandlers from './handlers/attractionHandlers'
import * as dateHandlers from './handlers/dateHandlers'
import * as transactionHandler from './handlers/transactionHandlers'
import * as videoHandler from './handlers/videoHandlers'
import * as notificationHandler from './handlers/notificationHandlers'

const router = express.Router()
console.log('BACKEND ROUTES: Router instance created.')

const protectedRouteMiddleware = [logAuthHeader, checkJwt, logAfterJwt, extractUserId]
const protectedReadMiddleware = [logAuthHeader, checkJwt, logAfterJwt, extractUserId]

// --- USER ROUTES ---
router.get(
  '/users/tokens',
  ...protectedReadMiddleware,
  asyncHandler(userHandler.getUserTokenBalanceHandler),
)
router.post('/users', ...protectedRouteMiddleware, asyncHandler(userHandler.createUserHandler))
router.patch('/users', ...protectedRouteMiddleware, asyncHandler(userHandler.updateUserHandler))
router.get('/users/:id', ...protectedReadMiddleware, asyncHandler(userHandler.getUserByIdHandler))
router.post(
  '/users/profilePicture',
  ...protectedRouteMiddleware,
  userHandler.uploadProfilePictureHandler,
)
router.post(
  '/users/homePageVideo',
  ...protectedRouteMiddleware,
  userHandler.uploadHomepageVideoHandler,
)
router.post(
  '/users/calendarVideos',
  ...protectedRouteMiddleware,
  calendarDayHandlers.uploadCalendarVideoHandler,
)
router.post(
  '/users/push-token',
  ...protectedRouteMiddleware,
  asyncHandler(userHandler.registerPushTokenHandler),
)

// Block a user
router.post('/users/block', ...protectedRouteMiddleware, asyncHandler(userHandler.blockUserHandler))

// Unblock a user
router.post(
  '/users/unblock',
  ...protectedRouteMiddleware,
  asyncHandler(userHandler.unblockUserHandler),
)

// Get a list of users I have blocked (for a settings page)
router.get(
  '/users/me/blocked',
  ...protectedReadMiddleware,
  asyncHandler(userHandler.getBlockedUsersHandler),
)

// --- DATE (PLANNED DATE/EVENT) ROUTES ---
router.post('/date', ...protectedRouteMiddleware, asyncHandler(dateHandlers.createDateHandler))
router.get(
  '/date/:userFrom/:userTo/:date',
  ...protectedReadMiddleware,
  asyncHandler(dateHandlers.getDateByUserFromUserToAndDateHandler),
)
router.patch(
  '/dates/:dateId',
  ...protectedRouteMiddleware,
  asyncHandler(dateHandlers.updateDateHandler),
)
// ✅ ================== NAYA ROUTE ==================
router.patch(
  '/dates/:dateId/feedback',
  ...protectedRouteMiddleware,
  asyncHandler(dateHandlers.addDateFeedbackHandler),
)
router.patch(
  '/dates/:dateId/cancel',
  ...protectedRouteMiddleware,
  asyncHandler(dateHandlers.cancelDateHandler),
)
router.get(
  '/dates/:dateId',
  ...protectedReadMiddleware,
  asyncHandler(dateHandlers.getDateByIdHandler),
)
router.get(
  '/dates/me/upcoming',
  ...protectedReadMiddleware,
  asyncHandler(dateHandlers.getUpcomingDatesHandler),
)

// --- NOTIFICATION ROUTES ---
router.get(
  '/notifications',
  ...protectedRouteMiddleware,
  asyncHandler(notificationHandler.getMyNotificationsHandler),
)
router.get(
  '/notifications/unread-count',
  ...protectedRouteMiddleware,
  asyncHandler(notificationHandler.getUnreadNotificationsCountHandler),
)
router.post(
  '/notifications/mark-as-read',
  ...protectedRouteMiddleware,
  asyncHandler(notificationHandler.markNotificationsAsReadHandler),
)

// ... (Other routes like ATTRACTION, TRANSACTION, etc. remain the same)
router.get(
  '/transactions/me',
  ...protectedReadMiddleware,
  asyncHandler(transactionHandler.getUserTransactionsHandler),
)
router.post(
  '/transactions/purchase',
  ...protectedRouteMiddleware,
  asyncHandler(transactionHandler.createPurchaseTransactionHandler),
)
router.get(
  '/calendarDays/user',
  ...protectedReadMiddleware,
  asyncHandler(calendarDayHandlers.getCalendarDaysByUserIdHandler),
)
router.get(
  '/stories/:date',
  ...protectedReadMiddleware,
  asyncHandler(calendarDayHandlers.getStoriesByDateHandler),
)
router.post(
  '/attraction',
  ...protectedRouteMiddleware,
  asyncHandler(attractionHandlers.createAttractionHandler),
)
router.get(
  '/attraction/:userFrom/:userTo/:date',
  ...protectedReadMiddleware,
  asyncHandler(attractionHandlers.getAttractionByUserFromUserToAndDateHandler),
)
router.get(
  '/videos/playable-url',
  ...protectedReadMiddleware,
  asyncHandler(videoHandler.getVideoPlayableUrlHandler),
)
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() })
})
router.post(
  '/system/replenish-tokens',
  asyncHandler(userHandler.processMonthlyTokenReplenishmentHandler),
)

console.log('BACKEND ROUTES: All routes configured.')
export default router
