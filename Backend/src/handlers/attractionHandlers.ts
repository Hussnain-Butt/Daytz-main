// File: src/handlers/attractionHandlers.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

import { Response, NextFunction } from 'express'
import pool from '../db'
import { asyncHandler, CustomRequest } from '../middleware'
import AttractionService from '../services/internal/AttractionService'
import UserService from '../services/internal/UserService'
import NotificationService from '../services/internal/NotificationService'
import { CreateAttractionInternalPayload } from '../types/Attraction'

const attractionService = new AttractionService()
const userService = new UserService()
const notificationService = new NotificationService()

console.log('[AttractionHandler] Services instantiated (Attraction, User, Notification).')

export const createAttractionHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const authenticatedUserId = req.userId
    if (!authenticatedUserId) {
      return res.status(401).json({ message: 'Unauthorized.' })
    }

    const {
      userTo,
      date,
      romanticRating = 0,
      sexualRating = 0,
      friendshipRating = 0,
      longTermPotential = false,
      intellectual = false,
      emotional = false,
      isUpdate = false,
    } = req.body

    if (
      !userTo ||
      !date ||
      typeof romanticRating !== 'number' ||
      typeof sexualRating !== 'number' ||
      typeof friendshipRating !== 'number'
    ) {
      return res.status(400).json({ message: 'Missing or invalid required fields.' })
    }
    if (authenticatedUserId === userTo) {
      return res.status(400).json({ message: 'Cannot express attraction to oneself.' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const servicePayload: CreateAttractionInternalPayload = {
        userFrom: authenticatedUserId,
        userTo,
        date,
        romanticRating,
        sexualRating,
        friendshipRating,
        longTermPotential,
        intellectual,
        emotional,
        result: null,
        firstMessageRights: null,
      }

      // Step 1: Perform all database operations within the transaction
      const finalAttraction = await attractionService.createOrUpdateAttraction(
        servicePayload,
        client,
      )

      const tokenCost = romanticRating + sexualRating + friendshipRating
      if (!isUpdate && tokenCost > 0) {
        await userService.spendTokensForUser(
          authenticatedUserId,
          tokenCost,
          'New attraction submission',
          client,
        )
      }

      // Step 2: Commit the transaction to save all DB changes
      await client.query('COMMIT')

      // Step 3: Send notifications AFTER the transaction is successfully committed.
      // This prevents a notification failure from rolling back the database state.
      try {
        if (!isUpdate) {
          // Send proposal notification on new attraction
          await notificationService.sendAttractionProposalNotification(
            authenticatedUserId,
            userTo,
            date,
          )
        }

        // Send match notification only if there is a match result
        if (finalAttraction.result) {
          await notificationService.sendMatchNotification(
            authenticatedUserId,
            userTo,
            finalAttraction.attractionId,
          )
        }
      } catch (notificationError) {
        // Log notification errors but don't fail the entire request,
        // as the core action (attraction submission) was successful.
        console.error(
          '[CreateAttractionHandler] Notification failed to send after successful commit:',
          notificationError,
        )
      }

      // Step 4: Send a successful response to the client
      const statusCode =
        finalAttraction.createdAt?.getTime() === finalAttraction.updatedAt?.getTime() ? 201 : 200
      res.status(statusCode).json(finalAttraction)
    } catch (error: any) {
      // If any DB operation fails, roll back the entire transaction
      await client.query('ROLLBACK')
      console.error('[CreateAttractionHandler] Transaction rolled back. Error:', error.message)
      if (error.code === 'INSUFFICIENT_FUNDS') {
        return res.status(402).json({ message: 'Insufficient tokens for this action.' })
      }
      next(error)
    } finally {
      // Always release the client back to the pool
      client.release()
    }
  },
)

// No changes to the handlers below
export const getAttractionsByUserFromAndUserToHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userFrom = req.params.userFrom
    const userTo = req.params.userTo
    const authenticatedUserId = req.userId
    if (!userFrom || !userTo) {
      return res.status(400).json({ message: 'userFrom and userTo parameters are required.' })
    }
    if (
      !authenticatedUserId ||
      (userFrom !== authenticatedUserId && userTo !== authenticatedUserId)
    ) {
      return res.status(403).json({ message: 'Forbidden.' })
    }
    try {
      const attractions = await attractionService.getAttractionsByUserFromAndUserTo(
        userFrom,
        userTo,
      )
      return res.status(200).json(attractions)
    } catch (error: any) {
      next(error)
    }
  },
)

export const getAttractionByUserFromUserToAndDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userFrom = req.params.userFrom
    const userTo = req.params.userTo
    const date = req.params.date
    const authenticatedUserId = req.userId
    if (!userFrom || !userTo || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ message: 'Valid userFrom, userTo, and date (YYYY-MM-DD) are required.' })
    }
    if (
      !authenticatedUserId ||
      (userFrom !== authenticatedUserId && userTo !== authenticatedUserId)
    ) {
      return res.status(403).json({ message: 'Forbidden.' })
    }
    try {
      const attraction = await attractionService.getAttraction(userFrom, userTo, date)
      if (!attraction) {
        return res
          .status(404)
          .json({ message: 'Attraction not found for the specified users and date.' })
      }
      return res.status(200).json(attraction)
    } catch (error: any) {
      next(error)
    }
  },
)
