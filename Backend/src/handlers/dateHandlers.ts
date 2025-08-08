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

// --- createDateHandler ---
export const createDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const proposerUserId = req.userId
    const payload: CreateDatePayload = req.body
    const { date, time, userTo, romanticRating, sexualRating, friendshipRating } = payload

    if (!proposerUserId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!date || !userTo || !time) {
      return res.status(400).json({ message: 'Date, time, and userTo are required.' })
    }

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
      // ✅✅✅ NAYA FEATURE: CONFLICT ERROR HANDLING ✅✅✅
      if (error.code === 'SCHEDULING_CONFLICT') {
        return res.status(409).json({
          code: error.code,
          message:
            'This time is unavailable due to a scheduling conflict. Please choose a time at least 30 minutes before or after another scheduled date for either person.',
        })
      }
      // ✅✅✅ END OF NAYA FEATURE ✅✅✅
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

// --- updateDateHandler ---
// NOTE: For simplicity, buffer check is not added to update. If required, a similar logic
// can be added here when a date's time is being changed.
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

      if (date || time || locationMetadata) {
        if (!['approved', 'pending'].includes(dateToUpdate.status)) {
          return res
            .status(400)
            .json({ message: 'Only approved or pending dates can be modified.' })
        }
        if (date) updatePayload.date = date
        if (time) updatePayload.time = time
        if (locationMetadata) updatePayload.locationMetadata = locationMetadata

        updatePayload.status = 'pending'

        if (updaterUserId === dateToUpdate.userFrom) {
          updatePayload.userFromApproved = true
          updatePayload.userToApproved = false
        } else {
          updatePayload.userToApproved = true
          updatePayload.userFromApproved = false
        }
        notificationAction = 'RESCHEDULE'
      } else if (status && ['approved', 'declined'].includes(status)) {
        if (dateToUpdate.status !== 'pending') {
          return res.status(400).json({ message: 'This date is no longer pending a response.' })
        }

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
          updatePayload.status = 'declined'
        } else {
          if (updaterUserId === dateToUpdate.userFrom) {
            updatePayload.userFromApproved = true
          } else {
            updatePayload.userToApproved = true
          }
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

// --- cancelDateHandler ---
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

// --- Other handlers ---
export const addDateFeedbackHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
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
