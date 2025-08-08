// File: src/services/internal/CalendarDayService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE (WITH MORE DEBUG LOGS)

import {
  CalendarDay,
  CreateCalendarDay,
  UpdateCalendarDay,
  NearbyVideoData,
  StoryQueryResultWithUrl,
  StoryQueryResult,
} from '../../types/CalendarDay'

import CalendarDayRepository from '../../repository/CalendarDayRepository'
import VimeoService from '../external/VimeoService'
import ZipcodeService from '../external/ZipcodeService'
import UserService from './UserService'

class CalendarDayService {
  private calendarDayRepository: CalendarDayRepository
  private vimeoService: VimeoService
  private zipcodeService: ZipcodeService
  private userService: UserService

  constructor() {
    this.calendarDayRepository = new CalendarDayRepository()
    this.vimeoService = new VimeoService()
    this.zipcodeService = new ZipcodeService()
    this.userService = new UserService()
    console.log('[CalendarDayService] Initialized.')
  }

  async getStoriesForDateWithFreshUrls(
    date: string,
    loggedInUserId: string,
  ): Promise<StoryQueryResultWithUrl[] | null> {
    console.log(
      `[DEBUG: Service] --- Service Function 'getStoriesForDateWithFreshUrls' Started ---`,
    )

    // 1. Logged-in user ka zipcode fetch karein
    console.log(`[DEBUG: Service] Step 1: Fetching zipcode for user: ${loggedInUserId}`)
    const loggedInUserZipcode = await this.userService.getUserZipcode(loggedInUserId)

    // ✅ DEBUG LOG 1: Check karein ki user aur uska zipcode mil raha hai ya nahi.
    console.log(`[DEBUG: Service] Step 2: Found user's zipcode: >> ${loggedInUserZipcode} <<`)

    if (!loggedInUserZipcode) {
      console.warn(
        `[Service:GetStories] CRITICAL: User ${loggedInUserId} has no zipcode. Returning empty list.`,
      )
      return [] // Yahan se khaali array wapas chala jayega
    }

    // 2. 80-mile radius mein sabhi zipcodes find karein
    console.log(`[DEBUG: Service] Step 3: Finding nearby zipcodes for ${loggedInUserZipcode}.`)
    const nearbyZipcodes = await this.zipcodeService.findNearbyZipcodes(loggedInUserZipcode)

    // ✅ DEBUG LOG 2: Check karein ki library se nearby zipcodes mil rahe hain ya nahi.
    console.log(`[DEBUG: Service] Step 4: Nearby zipcodes found by library:`, nearbyZipcodes)

    if (!nearbyZipcodes || nearbyZipcodes.length === 0) {
      console.warn(`[Service:GetStories] No nearby zipcodes found for ${loggedInUserZipcode}.`)
      return []
    }
    console.log(
      `[DEBUG: Service] Step 5: Found ${nearbyZipcodes.length} zipcodes. Fetching stories from repository...`,
    )

    // 3. Repository se in zipcodes ke liye stories fetch karein
    const storiesFromRepo = await this.calendarDayRepository.findStoriesByDateAndZipcodes(
      date,
      nearbyZipcodes,
      loggedInUserId,
      loggedInUserZipcode,
    )

    // ✅ DEBUG LOG 3: Check karein ki repository (database) se kya data mila.
    console.log(
      `[DEBUG: Service] Step 6: Stories received from repository. Count: ${
        storiesFromRepo?.length ?? 'null/error'
      }`,
    )

    if (storiesFromRepo === null) {
      console.error(`[Service:GetStories] Repository returned null for date: ${date}. DB error.`)
      return null
    }

    if (storiesFromRepo.length === 0) {
      console.log(
        `[Service:GetStories] Repository found 0 stories for the given zipcodes and date.`,
      )
      return []
    }

    // Block kiye gaye users ko filter karein
    const unblockedStories = storiesFromRepo.filter((story) => !story.isBlocked)
    console.log(
      `[DEBUG: Service] Step 7: Stories after filtering blocked users. Count: ${unblockedStories.length}`,
    )

    // 4. Videos ke liye fresh URLs fetch karein
    const storiesWithUrls = await Promise.all(
      unblockedStories.map(async (story) => {
        let playableUrl: string | null = null
        if (story.processingStatus === 'complete' && story.vimeoUri) {
          try {
            playableUrl = await this.vimeoService.getFreshPlayableUrl(story.vimeoUri)
          } catch (fetchErr) {
            console.error(
              `[Service:GetStories] Error fetching fresh URL for ${story.vimeoUri}:`,
              fetchErr,
            )
          }
        }
        return { ...story, playableUrl: playableUrl }
      }),
    )

    console.log(
      `[DEBUG: Service] Step 8: Final stories ready to be sent to app. Count: ${storiesWithUrls.length}`,
    )
    return storiesWithUrls
  }

  // --- Baaki sabhi service methods bilkul waise hi rahenge ---

  async createCalendarDay(calendarDay: CreateCalendarDay): Promise<CalendarDay | null> {
    return this.calendarDayRepository.createCalendarDay(calendarDay)
  }

  async getCalendarDaysByUserId(userId: string): Promise<CalendarDay[]> {
    return this.calendarDayRepository.getCalendarDaysByUserId(userId)
  }

  async getCalendarDayById(calendarId: number): Promise<CalendarDay | null> {
    return this.calendarDayRepository.getCalendarDayById(calendarId)
  }

  async getCalendarDayByUserIdAndDate(userId: string, date: string): Promise<CalendarDay | null> {
    return this.calendarDayRepository.getCalendarDayByUserIdAndDate(userId, date)
  }

  async updateCalendarDay(calendarId: number, updateData: UpdateCalendarDay): Promise<boolean> {
    return this.calendarDayRepository.updateCalendarDay(calendarId, updateData)
  }

  async getCalendarDayVideosByDateAndZipCode(
    date: string,
    zipcode: string,
  ): Promise<NearbyVideoData[] | null> {
    const zipcodeList = [zipcode]
    if (!zipcodeList || zipcodeList.length === 0) return []
    return this.calendarDayRepository.getCalendarDayVideosByDateAndZipCode(date, zipcodeList)
  }

  async deleteCalendarDay(calendarId: number): Promise<boolean> {
    return this.calendarDayRepository.deleteCalendarDay(calendarId)
  }
}

export default CalendarDayService
