// File: src/handlers/dateHandlers.ts
// ✅ COMPLETE AND FINAL UPDATED CODE (LOGIC REBUILT FOR RESCHEDULE FLOW)

import { Response, NextFunction } from 'express'
import { asyncHandler, CustomRequest } from '../middleware'
import DatesService from '../services/internal/DatesService'
import NotificationService from '../services/internal/NotificationService'
import { CreateDatePayload, DateObject as DateType, DateOutcome } from '../types/Date'
import pool from '../db'
import * as humps from 'humps'

const datesService = new DatesService()
const notificationService = new NotificationService()

console.log('[DateHandler] Services instantiated (Dates, Notification).')

// --- createDateHandler (No changes needed) ---
export const createDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const proposerUserId = req.userId
    const payload: CreateDatePayload = req.body
    const { date, userTo, romanticRating, sexualRating, friendshipRating } = payload

    if (!proposerUserId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!date || !userTo) return res.status(400).json({ message: 'Date and userTo are required.' })

    if (
      typeof romanticRating !== 'number' ||
      typeof sexualRating !== 'number' ||
      typeof friendshipRating !== 'number'
    ) {
      return res.status(400).json({ message: 'Valid attraction ratings are required.' })
    }

    if (proposerUserId === userTo)
      return res.status(400).json({ message: 'Cannot propose a date to yourself.' })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' })

    const existingDate = await datesService.getDateEntryByUsersAndDate(proposerUserId, userTo, date)
    if (
      existingDate &&
      existingDate.status !== 'cancelled' &&
      existingDate.status !== 'completed'
    ) {
      return res
        .status(409)
        .json({ message: 'An active or pending date already exists for this day.', existingDate })
    }

    try {
      const createdDate = await datesService.createFullDateProposal(proposerUserId, payload)
      return res.status(201).json(createdDate)
    } catch (error: any) {
      console.error('[CreateDateHandler] Error during full proposal creation:', error.message)
      if (error.code === 'NOT_A_MATCH') {
        return res.status(409).json({ code: error.code, message: error.message })
      }
      if (error.code === 'INSUFFICIENT_FUNDS')
        return res.status(402).json({ message: 'Insufficient tokens to express attraction.' })
      if (error.message.includes('unique constraint'))
        return res.status(409).json({ message: 'A conflict occurred. Please try again.' })
      next(error)
    }
  },
)

// --- ✅✅✅ updateDateHandler (LOGIC REBUILT) ✅✅✅ ---
// Yeh function ab reschedule requests ko 'pending' status mein daalta hai
// aur turn-based approval system ko handle karta hai.
export const updateDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const updaterUserId = req.userId
    const dateId = Number(req.params.dateId)
    const { status, date, time, locationMetadata } = req.body

    if (!updaterUserId) {
      return res.status(401).json({ message: 'Unauthorized.' })
    }
    if (isNaN(dateId)) {
      return res.status(400).json({ message: 'Valid numeric dateId is required.' })
    }

    try {
      const dateToUpdate = await datesService.getDateEntryById(dateId)
      if (!dateToUpdate) {
        return res.status(404).json({ message: 'Date not found.' })
      }

      const isParticipant =
        dateToUpdate.userFrom === updaterUserId || dateToUpdate.userTo === updaterUserId

      if (!isParticipant) {
        return res
          .status(403)
          .json({ message: 'Forbidden. You are not a participant in this date.' })
      }

      const updatePayload: Partial<DateType> = {}
      let notificationAction: 'RESPONSE' | 'RESCHEDULE' | null = null
      const otherUserId =
        dateToUpdate.userFrom === updaterUserId ? dateToUpdate.userTo : dateToUpdate.userFrom

      // Case 1: User is submitting new details (reschedule proposal or counter-proposal).
      if (date || time || locationMetadata) {
        if (!['approved', 'pending'].includes(dateToUpdate.status)) {
          return res
            .status(400)
            .json({ message: 'Only approved or pending dates can be modified.' })
        }
        if (date) updatePayload.date = date
        if (time) updatePayload.time = time
        if (locationMetadata) updatePayload.locationMetadata = locationMetadata

        // A reschedule proposal makes the date 'pending' until the other user responds.
        updatePayload.status = 'pending'

        // The user proposing the change automatically approves it. The other user's approval is now needed.
        if (updaterUserId === dateToUpdate.userFrom) {
          updatePayload.userFromApproved = true
          updatePayload.userToApproved = false
        } else {
          // updater is userTo
          updatePayload.userToApproved = true
          updatePayload.userFromApproved = false
        }
        notificationAction = 'RESCHEDULE'

        // Case 2: User is responding to a proposal (e.g., accepting or declining).
      } else if (status && ['approved', 'declined'].includes(status)) {
        if (dateToUpdate.status !== 'pending') {
          return res.status(400).json({ message: 'This date is no longer pending a response.' })
        }

        // Check if it's the current user's turn to respond (their approval flag must be false).
        const myApprovalFlag =
          updaterUserId === dateToUpdate.userFrom
            ? dateToUpdate.userFromApproved
            : dateToUpdate.userToApproved

        if (myApprovalFlag === true) {
          return res
            .status(403)
            .json({ message: "It's not your turn to respond. Waiting for the other user." })
        }

        if (status === 'declined') {
          // Note: 'declined' is a final status. To cancel, use the cancelDateHandler.
          updatePayload.status = 'declined'
        } else {
          // status === 'approved'
          // The user approves, so we set their flag to true.
          if (updaterUserId === dateToUpdate.userFrom) {
            updatePayload.userFromApproved = true
          } else {
            // updater is userTo
            updatePayload.userToApproved = true
          }
          // Now both parties have approved, so the date becomes 'approved' overall.
          updatePayload.status = 'approved'
        }
        notificationAction = 'RESPONSE'
      } else {
        return res.status(400).json({ message: 'No valid update data provided.' })
      }

      const updatedDate = await datesService.updateDateEntry(dateId, updatePayload)

      if (updatedDate && otherUserId) {
        if (notificationAction === 'RESPONSE') {
          await notificationService.sendDateResponseNotification(
            updaterUserId,
            otherUserId,
            updatedDate.status === 'approved' ? 'ACCEPTED' : 'DECLINED',
            dateId,
          )
        } else if (notificationAction === 'RESCHEDULE') {
          await notificationService.sendDateRescheduledNotification(
            updaterUserId,
            otherUserId,
            dateId,
          )
        }
      }

      res.status(200).json(updatedDate)
    } catch (error) {
      next(error)
    }
  },
)

// --- cancelDateHandler (No changes needed) ---
export const cancelDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const cancellerUserId = req.userId
    const { dateId } = req.params

    if (!cancellerUserId) {
      return res.status(401).json({ message: 'Unauthorized.' })
    }
    if (!dateId || isNaN(Number(dateId))) {
      return res.status(400).json({ message: 'A valid numeric dateId is required.' })
    }

    try {
      const dateIdNum = Number(dateId)
      const dateEntry = await datesService.getDateEntryById(dateIdNum)

      if (!dateEntry) {
        return res.status(404).json({ message: 'Date not found.' })
      }

      if (dateEntry.userFrom !== cancellerUserId && dateEntry.userTo !== cancellerUserId) {
        return res
          .status(403)
          .json({ message: 'Forbidden. You are not a participant in this date.' })
      }

      if (dateEntry.status === 'cancelled' || dateEntry.status === 'completed') {
        return res
          .status(400)
          .json({ message: `Cannot cancel a date that is already ${dateEntry.status}.` })
      }

      const updatedDate = await datesService.updateDateEntry(dateIdNum, {
        status: 'cancelled',
      })

      const otherUserId =
        dateEntry.userFrom === cancellerUserId ? dateEntry.userTo : dateEntry.userFrom
      if (otherUserId) {
        await notificationService.sendDateCancelledNotification(
          cancellerUserId,
          otherUserId,
          dateIdNum,
        )
      }

      res.status(200).json(updatedDate)
    } catch (error) {
      console.error(`[cancelDateHandler] Error cancelling date ${dateId}:`, error)
      next(error)
    }
  },
)

// --- Other handlers (No changes needed) ---
export const addDateFeedbackHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    // Implementation is correct and unchanged
    const userId = req.userId
    const dateId = Number(req.params.dateId)
    const { outcome, notes } = req.body
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })
    if (isNaN(dateId)) return res.status(400).json({ message: 'Valid numeric dateId is required.' })
    const validOutcomes: DateOutcome[] = ['amazing', 'no_show_cancelled', 'other']
    if (!outcome || !validOutcomes.includes(outcome)) {
      return res.status(400).json({ message: 'A valid outcome is required.' })
    }
    try {
      const dateToUpdate = await datesService.getDateEntryById(dateId)
      if (!dateToUpdate) return res.status(404).json({ message: 'Date not found.' })
      if (dateToUpdate.userFrom !== userId && dateToUpdate.userTo !== userId) {
        return res.status(403).json({ message: 'Forbidden. You are not a participant.' })
      }
      const query = `INSERT INTO date_feedback (date_id, user_id, outcome, notes) VALUES ($1, $2, $3, $4) ON CONFLICT (date_id, user_id) DO UPDATE SET outcome = EXCLUDED.outcome, notes = EXCLUDED.notes, created_at = NOW() RETURNING *;`
      const values = [dateId, userId, outcome, notes || null]
      const { rows } = await pool.query(query, values)
      res.status(201).json(humps.camelizeKeys(rows[0]))
    } catch (error) {
      next(error)
    }
  },
)

export const getDateByIdHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    // Implementation is correct and unchanged
    const userId = req.userId
    const { dateId } = req.params
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!dateId || isNaN(Number(dateId)))
      return res.status(400).json({ message: 'A valid numeric dateId is required.' })
    try {
      const date = await datesService.getDateEntryByIdWithUserDetails(Number(dateId))
      if (!date) {
        return res.status(404).json({ message: 'Date not found.' })
      }
      if (date.userFrom !== userId && date.userTo !== userId) {
        return res.status(404).json({ message: 'Date not found.' })
      }
      const responseData = { ...date, userFrom: date.userFromDetails, userTo: date.userToDetails }
      delete responseData.userFromDetails
      delete responseData.userToDetails
      res.status(200).json(responseData)
    } catch (error) {
      next(error)
    }
  },
)

export const getDateByUserFromUserToAndDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    // Implementation is correct and unchanged
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

export const getUpcomingDatesHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    // Implementation is correct and unchanged
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    try {
      const dates = await datesService.getUpcomingDatesByUserId(userId)
      res.status(200).json(dates)
    } catch (error) {
      next(error)
    }
  },
)
