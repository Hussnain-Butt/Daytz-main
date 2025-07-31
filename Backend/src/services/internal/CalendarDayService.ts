// File: src/services/internal/CalendarDayService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import {
  CalendarDay,
  CreateCalendarDay,
  UpdateCalendarDay,
  NearbyVideoData,
  StoryQueryResultWithUrl,
} from '../../types/CalendarDay'

import CalendarDayRepository from '../../repository/CalendarDayRepository'
import VimeoService from '../external/VimeoService'

class CalendarDayService {
  private calendarDayRepository: CalendarDayRepository
  private vimeoService: VimeoService

  constructor() {
    this.calendarDayRepository = new CalendarDayRepository()
    this.vimeoService = new VimeoService()
    console.log('[CalendarDayService] Initialized.')
  }

  // ✅ BADLAV: Yeh function ab loggedInUserId accept karega
  async getStoriesForDateWithFreshUrls(
    date: string,
    loggedInUserId: string, // Naya zaroori parameter
    zipcodeList?: string[], // Optional parameter
  ): Promise<StoryQueryResultWithUrl[] | null> {
    let storiesFromRepo
    // Agar zipcodeList di gayi hai, to naya location-based function use karein
    if (zipcodeList && zipcodeList.length > 0) {
      console.log(`[Service] Fetching stories for date ${date} in specific zipcodes.`)
      // ✅ BADLAV: loggedInUserId ko pass karein
      storiesFromRepo = await this.calendarDayRepository.findStoriesByDateAndZipcodes(
        date,
        zipcodeList,
        loggedInUserId,
      )
    } else {
      // Fallback: Agar koi zipcode nahi diya, to purana function use karein (sabke liye)
      console.log(`[Service] Fetching all stories for date ${date} (no zipcode filter).`)
      // ✅ BADLAV: loggedInUserId ko pass karein
      storiesFromRepo = await this.calendarDayRepository.findStoriesByDateWithUserDetails(
        date,
        loggedInUserId,
      )
    }

    if (storiesFromRepo === null) {
      console.error(`[Service] Repository returned null for date: ${date}. DB error.`)
      return null
    }

    if (storiesFromRepo.length === 0) {
      return []
    }

    const storiesWithUrls = await Promise.all(
      storiesFromRepo.map(async (story) => {
        let playableUrl: string | null = null
        if (story.processingStatus === 'complete' && story.vimeoUri) {
          try {
            playableUrl = await this.vimeoService.getFreshPlayableUrl(story.vimeoUri)
          } catch (fetchErr) {
            console.error(`[Service] Error fetching fresh URL for ${story.vimeoUri}:`, fetchErr)
          }
        }
        return { ...story, playableUrl: playableUrl }
      }),
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
