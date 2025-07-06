// File: src/handlers/dateHandlers.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import { Request, Response, NextFunction } from 'express'
import { asyncHandler, CustomRequest } from '../middleware' // Use CustomRequest
import DatesService from '../services/internal/DatesService'
import NotificationService from '../services/internal/NotificationService'
import { Date as DateType, CreateDatePayload, StatusType } from '../types/Date'

const datesService = new DatesService()
const notificationService = new NotificationService()

console.log('[DateHandler] Services instantiated (Dates, Notification).')

// ✅ THIS IS THE MAIN UPDATED FUNCTION
// It now handles the combined payload for both attraction and date.
export const createDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const proposerUserId = req.userId
    // The body now contains the combined payload from the frontend
    const payload: CreateDatePayload = req.body
    const { date, userTo, romanticRating, sexualRating, friendshipRating } = payload

    if (!proposerUserId) {
      return res.status(401).json({ message: 'Unauthorized.' })
    }
    if (!date || !userTo) {
      return res.status(400).json({ message: 'Date and userTo are required.' })
    }
    if (
      typeof romanticRating !== 'number' ||
      typeof sexualRating !== 'number' ||
      typeof friendshipRating !== 'number'
    ) {
      return res.status(400).json({ message: 'Valid attraction ratings are required.' })
    }
    if (proposerUserId === userTo) {
      return res.status(400).json({ message: 'Cannot propose a date to yourself.' })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' })
    }

    // Check for an existing ACTIVE date to prevent duplicates
    const existingDate = await datesService.getDateEntryByUsersAndDate(proposerUserId, userTo, date)
    if (
      existingDate &&
      existingDate.status !== 'cancelled' &&
      existingDate.status !== 'completed'
    ) {
      return res.status(409).json({
        message: 'An active or pending date already exists for this day.',
        existingDate,
      })
    }

    try {
      // Call the new service method that handles the entire transaction
      const createdDate = await datesService.createFullDateProposal(proposerUserId, payload)

      console.log(
        `[CreateDateHandler] Full proposal created by ${proposerUserId} to ${userTo}. Date ID: ${createdDate.dateId}`,
      )

      // --- Send Notification ---
      try {
        await notificationService.sendDateProposalNotification(
          proposerUserId,
          userTo,
          {
            dateId: createdDate.dateId,
            date: createdDate.date,
            time: createdDate.time || '',
            venue: createdDate.locationMetadata?.name || 'A new spot!',
          },
          {
            // Pass ratings to notification
            romanticRating,
            sexualRating,
            friendshipRating,
          },
        )
        console.log(`[CreateDateHandler] Date proposal notification sent to user ${userTo}.`)
      } catch (notificationError: any) {
        console.error(
          '[CreateDateHandler] Failed to send notification, but proposal was created:',
          notificationError.message,
        )
      }

      return res.status(201).json(createdDate)
    } catch (error: any) {
      console.error('[CreateDateHandler] Error during full proposal creation:', error.message)
      if (error.code === 'INSUFFICIENT_FUNDS') {
        return res.status(402).json({ message: 'Insufficient tokens to express attraction.' })
      }
      if (error.message.includes('unique constraint')) {
        return res.status(409).json({ message: 'A conflict occurred. Please try again.' })
      }
      next(error)
    }
  },
)

// No changes to the functions below, but included for completeness.
// ... (updateDateHandler, cancelDateHandler, etc. all remain the same) ...

export const updateDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const updaterUserId = req.userId
    const dateIdFromParams = req.params.dateId
    const updates = req.body

    if (!updaterUserId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!dateIdFromParams || isNaN(Number(dateIdFromParams))) {
      return res.status(400).json({ message: 'Valid numeric dateId is required.' })
    }
    const dateId = Number(dateIdFromParams)

    try {
      const updatedDate = await datesService.updateDateEntry(dateId, updates)
      if (!updatedDate) {
        return res.status(404).json({ message: 'Date not found or no changes made.' })
      }
      // Add notification logic here if needed
      res.status(200).json(updatedDate)
    } catch (error) {
      next(error)
    }
  },
)

export const cancelDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const cancellerUserId = req.userId
    const { dateId } = req.params
    if (!cancellerUserId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!dateId || isNaN(Number(dateId)))
      return res.status(400).json({ message: 'Valid dateId is required.' })

    try {
      const dateEntry = await datesService.getDateEntryById(Number(dateId))
      if (!dateEntry) return res.status(404).json({ message: 'Date not found.' })
      if (dateEntry.userFrom !== cancellerUserId && dateEntry.userTo !== cancellerUserId) {
        return res.status(403).json({ message: 'Forbidden.' })
      }
      const updatedDate = await datesService.updateDateEntry(Number(dateId), {
        status: 'cancelled',
      })
      res.status(200).json(updatedDate)
    } catch (error) {
      next(error)
    }
  },
)

export const getDateByIdHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    const { dateId } = req.params
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!dateId || isNaN(Number(dateId)))
      return res.status(400).json({ message: 'Valid dateId is required.' })

    const date = await datesService.getDateEntryById(Number(dateId))
    if (!date || (date.userFrom !== userId && date.userTo !== userId)) {
      return res.status(404).json({ message: 'Date not found or not authorized.' })
    }
    res.status(200).json(date)
  },
)

export const getDateByUserFromUserToAndDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    const { userFrom, userTo, date } = req.params
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })
    if (userId !== userFrom && userId !== userTo)
      return res.status(403).json({ message: 'Forbidden.' })

    const dateEntry = await datesService.getDateEntryByUsersAndDate(userFrom, userTo, date)
    if (!dateEntry) return res.status(404).json({ message: 'Date not found.' })
    res.status(200).json(dateEntry)
  },
)
