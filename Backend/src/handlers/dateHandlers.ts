// File: src/handlers/dateHandlers.ts
// ✅ THIS CODE IS NOW CORRECT BECAUSE THE TYPE DEFINITION IS FIXED

import { Response, NextFunction } from 'express'
import { asyncHandler, CustomRequest } from '../middleware'
import DatesService from '../services/internal/DatesService'
import NotificationService from '../services/internal/NotificationService'
import { CreateDatePayload, DateObject as DateType } from '../types/Date'
import pool from '../db'

const datesService = new DatesService()
const notificationService = new NotificationService()

console.log('[DateHandler] Services instantiated (Dates, Notification).')

export const updateDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const updaterUserId = req.userId
    const dateIdFromParams = req.params.dateId
    const { status } = req.body

    if (!updaterUserId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!dateIdFromParams || isNaN(Number(dateIdFromParams))) {
      return res.status(400).json({ message: 'Valid numeric dateId is required.' })
    }
    if (!status || !['approved', 'declined'].includes(status)) {
      return res
        .status(400)
        .json({ message: "A valid status ('approved' or 'declined') is required." })
    }

    const dateId = Number(dateIdFromParams)

    try {
      const dateToUpdate = await datesService.getDateEntryById(dateId)
      if (!dateToUpdate) {
        return res.status(404).json({ message: 'Date not found.' })
      }

      if (dateToUpdate.userTo !== updaterUserId) {
        return res.status(403).json({ message: 'Forbidden. Only the date recipient can respond.' })
      }

      // Yeh line ab error nahi degi kyunki 'declined' ab DateStatus ka hissa hai
      let updatePayload: Partial<DateType> = {
        status: status as 'approved' | 'declined',
      }

      if (status === 'approved') {
        updatePayload.userToApproved = true
        updatePayload.userFromApproved = true
      }

      const updatedDate = await datesService.updateDateEntry(dateId, updatePayload)

      if (updatedDate) {
        if (status === 'approved') {
          await notificationService.sendDateResponseNotification(
            updaterUserId,
            dateToUpdate.userFrom,
            'ACCEPTED',
            dateId,
          )
        } else if (status === 'declined') {
          await notificationService.sendDateResponseNotification(
            updaterUserId,
            dateToUpdate.userFrom,
            'DECLINED',
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

// ... baaqi sab handlers waise hi rahenge ...

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
      console.log(
        `[CreateDateHandler] Full proposal created by ${proposerUserId} to ${userTo}. Date ID: ${createdDate.dateId}`,
      )
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
          { romanticRating, sexualRating, friendshipRating },
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
      if (error.code === 'INSUFFICIENT_FUNDS')
        return res.status(402).json({ message: 'Insufficient tokens to express attraction.' })
      if (error.message.includes('unique constraint'))
        return res.status(409).json({ message: 'A conflict occurred. Please try again.' })
      next(error)
    }
  },
)

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

      const updatedDate = await datesService.updateDateEntry(dateIdNum, {
        status: 'cancelled',
      })
      res.status(200).json(updatedDate)
    } catch (error) {
      console.error(`[cancelDateHandler] Error cancelling date ${dateId}:`, error)
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
