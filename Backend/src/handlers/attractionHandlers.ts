// File: src/handlers/attractionHandlers.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

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
      isUpdate = false,
    } = req.body

    // --- Basic Validation (No changes) ---
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
      // Step 1: Database transaction shuru karein
      await client.query('BEGIN')

      // Step 2: Token deduct karein (agar nayi attraction hai)
      const tokenCost = romanticRating + sexualRating + friendshipRating
      if (!isUpdate && tokenCost > 0) {
        await userService.spendTokensForUser(
          authenticatedUserId,
          tokenCost,
          'New attraction submission',
          client,
        )
      }

      // Step 3: Attraction create/update karein aur match result check karein
      const { finalAttraction, matchResult } = await attractionService.createOrUpdateAttraction(
        {
          userFrom: authenticatedUserId,
          userTo,
          date,
          romanticRating,
          sexualRating,
          friendshipRating,
          // Baki fields service layer mein handle ho jaati hain
          longTermPotential: false,
          intellectual: false,
          emotional: false,
          result: null,
          firstMessageRights: null,
        },
        client,
      )

      // Step 4: Agar sab theek hai, to transaction commit karein
      await client.query('COMMIT')

      // Step 5: Sahi notification bhejein (transaction ke bahar)
      try {
        if (matchResult) {
          // Case A: Yeh doosri attraction thi, isliye match calculate hua
          if (matchResult.isMatch && matchResult.counterpartAttraction) {
            // Match successful hua! Nayi "MATCH_PROPOSAL" notification bhejein.
            await notificationService.sendNewMatchProposalNotification(
              finalAttraction, // User ki apni attraction
              matchResult.counterpartAttraction, // Doosre user ki attraction
            )
          } else {
            // Match-up to hua, lekin result 'false' tha (mismatch). Koi notification nahi bhejni.
            console.log(`[AttractionHandler] Mismatch for date ${date}. No notification sent.`)
          }
        } else {
          // Case B: Yeh pehli attraction thi. Sirf "ATTRACTION_PROPOSAL" notification bhejein.
          await notificationService.sendAttractionProposalNotification(
            authenticatedUserId,
            userTo,
            date,
          )
        }
      } catch (notificationError) {
        console.error(
          '[CreateAttractionHandler] Notification failed to send after successful commit:',
          notificationError,
        )
      }

      // Step 6: Frontend ko successful response bhejein
      res.status(200).json({
        message: 'Attraction submitted successfully.',
        attraction: finalAttraction,
        match: matchResult?.isMatch ?? null, // Frontend ko batayein ki match hua ya nahi
      })
    } catch (error: any) {
      // Agar koi bhi step fail hua, to transaction rollback karein
      await client.query('ROLLBACK')
      console.error('[CreateAttractionHandler] Transaction rolled back. Error:', error.message)
      if (error.code === 'INSUFFICIENT_FUNDS') {
        return res.status(402).json({ message: 'Insufficient tokens for this action.' })
      }
      next(error) // Doosre errors ke liye error middleware ko call karein
    } finally {
      // Client ko pool mein wapas release karein
      client.release()
    }
  },
)

// --- Baaki ke handlers mein koi badlav nahi ---
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
