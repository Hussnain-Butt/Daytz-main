// File: src/routes.ts
// NO CHANGES NEEDED - This file is correctly structured for POST /date

import express, { Request, Response, NextFunction } from 'express'
import { logAuthHeader, checkJwt, logAfterJwt, extractUserId, asyncHandler } from './middleware'
import * as userHandler from './handlers/userHandlers'
import * as calendarDayHandlers from './handlers/calendarDayHandlers'
import * as attractionHandlers from './handlers/attractionHandlers'
import * as dateHandlers from './handlers/dateHandlers' // This is important
import * as transactionHandler from './handlers/transactionHandlers'
import * as videoHandler from './handlers/videoHandlers'

const router = express.Router()
console.log('BACKEND ROUTES: Router instance created.')

const protectedRouteMiddleware = [logAuthHeader, checkJwt, logAfterJwt, extractUserId]
const protectedReadMiddleware = [logAuthHeader, checkJwt, logAfterJwt, extractUserId] // If read ops also need userId

// --- USER ROUTES ---
router.get(
  '/users/tokens',
  ...protectedReadMiddleware,
  asyncHandler(userHandler.getUserTokenBalanceHandler),
)
router.post('/users', ...protectedRouteMiddleware, asyncHandler(userHandler.createUserHandler)) // Ensure createUserHandler exists
router.patch('/users', ...protectedRouteMiddleware, asyncHandler(userHandler.updateUserHandler))
router.get('/users/:id', ...protectedReadMiddleware, asyncHandler(userHandler.getUserByIdHandler))
router.post(
  '/users/profilePicture',
  ...protectedRouteMiddleware,
  userHandler.uploadProfilePictureHandler,
) // Assuming these are direct handlers not wrapped in asyncHandler
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
// Add DELETE routes if you have them, e.g., for videos/pictures

// --- TRANSACTION ROUTES ---
router.post(
  '/transactions/purchase',
  ...protectedRouteMiddleware,
  asyncHandler(transactionHandler.createPurchaseTransactionHandler),
)
router.get(
  '/transactions/me',
  ...protectedReadMiddleware,
  asyncHandler(transactionHandler.getUserTransactionsHandler),
)

// --- CALENDAR ROUTES ---
router.post(
  '/calendarDays',
  ...protectedRouteMiddleware,
  asyncHandler(calendarDayHandlers.createCalendarDayHandler),
)
router.patch(
  '/calendarDays',
  ...protectedRouteMiddleware,
  asyncHandler(calendarDayHandlers.updateCalendarDayHandler),
)
router.get(
  '/calendarDays/:userId/:date',
  ...protectedReadMiddleware,
  asyncHandler(calendarDayHandlers.getCalendarDayByUserIdAndDateHandler),
)
router.get(
  '/calendarDays/user',
  ...protectedReadMiddleware,
  asyncHandler(calendarDayHandlers.getCalendarDaysByUserIdHandler),
)
// router.get('/calendarDays/videos/:userId/:date', ...protectedReadMiddleware, asyncHandler(calendarDayHandlers.getCalendarDayVideosByUserAndDateHandler)); // If you have this

// --- STORIES ROUTE ---
router.get(
  '/stories/:date',
  ...protectedReadMiddleware,
  asyncHandler(calendarDayHandlers.getStoriesByDateHandler),
)

router.get(
  '/stories/active-dates',
  ...protectedReadMiddleware,
  asyncHandler(calendarDayHandlers.getCommunityActiveDatesHandler),
)

// --- ATTRACTION ROUTES ---
router.post(
  '/attraction',
  ...protectedRouteMiddleware,
  asyncHandler(attractionHandlers.createAttractionHandler),
)
router.get(
  '/attraction/:userFrom/:userTo',
  ...protectedReadMiddleware,
  asyncHandler(attractionHandlers.getAttractionsByUserFromAndUserToHandler),
)
router.get(
  '/attraction/:userFrom/:userTo/:date',
  ...protectedReadMiddleware,
  asyncHandler(attractionHandlers.getAttractionByUserFromUserToAndDateHandler),
)

// --- DATE (PLANNED DATE/EVENT) ROUTES ---
router.post('/date', ...protectedRouteMiddleware, asyncHandler(dateHandlers.createDateHandler)) // Correctly points to your handler
router.get(
  '/date/:userFrom/:userTo/:date',
  ...protectedReadMiddleware,
  asyncHandler(dateHandlers.getDateByUserFromUserToAndDateHandler),
)
// Assuming updateDateHandler and cancelDateHandler expect :dateId in path based on typical REST
// If your PATCH /date is generic without an ID, its handler needs to find the date from the body.
router.patch(
  '/dates/:dateId',
  ...protectedRouteMiddleware,
  asyncHandler(dateHandlers.updateDateHandler),
) // If using :dateId
// router.patch('/date', ...protectedRouteMiddleware, asyncHandler(dateHandlers.updateDateHandler)); // If generic PATCH /date
router.patch(
  '/dates/:dateId/cancel',
  ...protectedRouteMiddleware,
  asyncHandler(dateHandlers.cancelDateHandler),
) // More RESTful for cancel
// router.patch('/date/cancel/:userTo/:date', ...protectedRouteMiddleware, asyncHandler(dateHandlers.cancelDateHandler)); // If using old structure

// Get date by its ID
router.get(
  '/dates/:dateId',
  ...protectedReadMiddleware,
  asyncHandler(dateHandlers.getDateByIdHandler),
)

// --- VIDEO PLAYABLE URL ROUTE ---
router.get(
  '/videos/playable-url',
  ...protectedReadMiddleware,
  asyncHandler(videoHandler.getVideoPlayableUrlHandler),
)

// --- HEALTH CHECK ROUTE ---
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() })
})

// --- SYSTEM ROUTES ---
router.post(
  '/system/replenish-tokens',
  asyncHandler(userHandler.processMonthlyTokenReplenishmentHandler),
) // If you have this

console.log('BACKEND ROUTES: All routes configured.')
export default router
