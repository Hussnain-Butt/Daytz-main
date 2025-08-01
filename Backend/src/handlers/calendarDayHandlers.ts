// File: src/handlers/calendarDayHandlers.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import { Request, Response, NextFunction } from 'express'
import moment from 'moment'
import fs from 'fs/promises'
import {
  CreateCalendarDay,
  CalendarDay,
  UpdateCalendarDay,
  StoryQueryResultWithUrl,
  NearbyVideoData as HandlerNearbyVideoData,
} from '../types/CalendarDay'
import { asyncHandler, CustomRequest } from '../middleware'
import { upload, handleMulterError, handleVideoUpload, deleteVideoHandler } from '../uploadUtils'

import CalendarDayService from '../services/internal/CalendarDayService'
import UserService from '../services/internal/UserService'
// Repository yahan se hata dein, ab iski zaroorat nahi hai
// import CalendarDayRepository from '../repository/CalendarDayRepository'

const calendarDayService = new CalendarDayService()
const userService = new UserService()
// const calendarDayRepository = new CalendarDayRepository() // Iski zaroorat nahi

console.log('[CalendarDayHandler] Services instantiated.')

// --- ✅✅✅ Get Stories By Date Handler (LOGIC REBUILT FOR BLOCKING) ✅✅✅ ---
export const getStoriesByDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const targetDate = req.params.date
    const loggedInUserId = req.userId

    if (!loggedInUserId) {
      return res.status(401).json({ message: 'Unauthorized. User not found.' })
    }

    if (!targetDate || !moment(targetDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: 'Invalid or missing date parameter (YYYY-MM-DD).' })
    }

    console.log(
      `[Handler:GetStories] User ${loggedInUserId} fetching stories for date: ${targetDate}, applying block filter.`,
    )

    try {
      // ✅ BADLAV: Yahan se zipcode ka logic hata diya gaya hai. Aap isse wapas add kar sakte hain agar zaroorat ho.
      // Ab hum sirf service ko call karenge.
      const storiesData = await calendarDayService.getStoriesForDateWithFreshUrls(
        targetDate,
        loggedInUserId, // Zaroori parameter
      )

      if (storiesData === null) {
        throw new Error('Service failed to retrieve stories data.')
      }

      // Backend se pehle se hi filtered data aayega, isliye frontend par filtering ki zaroorat nahi.
      console.log(
        `[Handler:GetStories] Found and returning ${storiesData.length} stories to user ${loggedInUserId}.`,
      )

      res.status(200).json(storiesData)
    } catch (error) {
      console.error(`[Handler:GetStories] Error for date ${targetDate}:`, error)
      next(error)
    }
  },
)

// --- Baaki sabhi handlers bilkul waise hi rahenge ---
// Note: Maine zipcode logic upar se nikal diya hai, agar aapko wo bhi chahiye to batayein.
// Main abhi sirf block filter par focus kar raha hoon.

// --- Upload Calendar Video Handler ---
export const uploadCalendarVideoHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    upload.single('video')(req, res, async (err) => {
      if (err) return handleMulterError(err, next)
      const userId = req.userId
      const date = req.body.date as string
      const videoFile = req.file

      if (!userId || !date || !videoFile) {
        if (videoFile?.path) await fs.unlink(videoFile.path).catch(console.error)
        return res
          .status(400)
          .json({ message: 'Bad Request: Missing userId, date, or video file.' })
      }
      if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
        if (videoFile?.path) await fs.unlink(videoFile.path).catch(console.error)
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' })
      }

      try {
        if (!(await userService.getUserById(userId))) {
          if (videoFile?.path) await fs.unlink(videoFile.path).catch(console.error)
          return res.status(404).json({ message: `User ${userId} not found.` })
        }

        let calendarDay = await calendarDayService.getCalendarDayByUserIdAndDate(userId, date)
        if (!calendarDay) {
          const newDay = await calendarDayService.createCalendarDay({
            userId,
            date,
            userVideoUrl: null,
          })
          if (!newDay) throw new Error('Failed to create calendar day entry.')
          calendarDay = newDay
        }

        const calendarId = calendarDay.calendarId
        if (!calendarId) throw new Error('Critical: Failed to determine calendar entry ID.')

        let existingVimeoId: string | undefined
        if (calendarDay.vimeoUri) {
          const idPart = calendarDay.vimeoUri.split('/').pop()
          if (idPart && /^\d+$/.test(idPart)) existingVimeoId = idPart
        }

        await handleVideoUpload(req, res, next, calendarId, existingVimeoId)
      } catch (error) {
        if (videoFile?.path && !res.headersSent)
          await fs.unlink(videoFile.path).catch(console.error)
        if (!res.headersSent) next(error)
      }
    })
  },
)

// --- Get Community Active Dates Handler ---
export const getCommunityActiveDatesHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const loggedInUserId = req.userId
    if (!loggedInUserId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const myVideoEntries = await calendarDayService.getCalendarDaysByUserId(loggedInUserId)
      const formattedDates = myVideoEntries.map((day) => ({
        date: day.date,
        hasMyVideo: true,
      }))

      res.status(200).json(formattedDates)
    } catch (error) {
      next(error)
    }
  },
)

// --- Delete Calendar Video Handler ---
export const deleteCalendarVideoHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    const date = req.params.date as string

    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: 'Valid date parameter (YYYY-MM-DD) is required.' })
    }

    try {
      const calendarDay = await calendarDayService.getCalendarDayByUserIdAndDate(userId, date)
      if (!calendarDay?.calendarId) {
        return res
          .status(404)
          .json({ message: 'Calendar day entry not found for this user and date.' })
      }

      const deleteResult = await deleteVideoHandler(calendarDay.calendarId)

      if (deleteResult.success) {
        return res.status(200).json({ message: deleteResult.message })
      } else {
        return res
          .status(500)
          .json({ message: deleteResult.message, details: deleteResult.details })
      }
    } catch (error) {
      if (!res.headersSent) next(error)
    }
  },
)

// --- Get Calendar Day By UserID and Date Handler ---
export const getCalendarDayByUserIdAndDateHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId, date } = req.params
    if (!userId || !date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res
        .status(400)
        .json({ message: 'Valid User ID and Date (YYYY-MM-DD) parameters are required.' })
    }
    try {
      const calendarDay = await calendarDayService.getCalendarDayByUserIdAndDate(userId, date)
      if (!calendarDay) {
        return res.status(404).json({ message: 'Calendar day entry not found.', calendarDay: null })
      }
      res.status(200).json({ calendarDay })
    } catch (error) {
      next(error)
    }
  },
)

// --- Get ALL Calendar Days By Authenticated User Handler ---
export const getCalendarDaysByUserIdHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })

    try {
      const calendarDays: CalendarDay[] = await calendarDayService.getCalendarDaysByUserId(userId)
      res.status(200).json(calendarDays)
    } catch (error) {
      next(error)
    }
  },
)

// --- Create Calendar Day Handler ---
export const createCalendarDayHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    const { date } = req.body

    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: 'Valid date (YYYY-MM-DD) is required.' })
    }

    try {
      if (!(await userService.getUserById(userId))) {
        return res.status(404).json({ message: `User ${userId} not found.` })
      }

      if (await calendarDayService.getCalendarDayByUserIdAndDate(userId, date)) {
        return res.status(409).json({ message: 'Calendar day already exists.' })
      }

      const newCalendarDayData: CreateCalendarDay = { userId, date, userVideoUrl: null }
      const createdCalendarDay = await calendarDayService.createCalendarDay(newCalendarDayData)
      if (!createdCalendarDay) throw new Error('DB failed to create calendar day entry.')

      res.status(201).json(createdCalendarDay)
    } catch (error) {
      next(error)
    }
  },
)

// --- Update Calendar Day Handler ---
export const updateCalendarDayHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    res.status(510).json({ message: 'Generic update not implemented. Use specific endpoints.' })
  },
)

// --- Get Nearby Videos Handler ---
export const getCalendarDayVideosByUserAndDateHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const targetUserId = req.params.userId
    const targetDate = req.params.date

    if (!targetUserId || !targetDate || !moment(targetDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: 'Valid User ID and Date parameters required.' })
    }
    try {
      const user = await userService.getUserById(targetUserId)
      if (!user?.zipcode) {
        return res.status(200).json({ message: 'User zipcode not set.', nearbyVideos: [] })
      }

      const zipcodeList = [user.zipcode]

      const nearbyVideosFromRepo = await calendarDayService.getCalendarDayVideosByDateAndZipCode(
        targetDate,
        user.zipcode,
      )
      if (!nearbyVideosFromRepo) {
        throw new Error('Failed to retrieve nearby video data from repository.')
      }

      const filteredNearbyVideos = nearbyVideosFromRepo.filter(
        (v: HandlerNearbyVideoData) => v.userId !== targetUserId,
      )

      res
        .status(200)
        .json({ message: 'Nearby user videos found.', nearbyVideos: filteredNearbyVideos })
    } catch (error) {
      next(error)
    }
  },
)
