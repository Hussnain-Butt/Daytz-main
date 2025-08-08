// File: src/types/CalendarDay.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

export type VideoProcessingStatus = 'pending' | 'processing' | 'complete' | 'failed' | null

// Base CalendarDay structure from DB
export interface CalendarDay {
  calendarId: number
  userId: string
  date: string // YYYY-MM-DD
  userVideoUrl: string | null
  vimeoUri: string | null
  processingStatus: VideoProcessingStatus
}

// For creating a new entry
export interface CreateCalendarDay {
  userId: string
  date: string // YYYY-MM-DD
  userVideoUrl: string | null
}

// For updating an entry
export interface UpdateCalendarDay {
  userVideoUrl?: string | null
  vimeoUri?: string | null
  processingStatus?: VideoProcessingStatus
}

// For nearby videos feature
export interface NearbyVideoData {
  userId: string
  userVideoUrl: string | null
}

// Type for story data from Repository (JOIN result)
export interface StoryQueryResult {
  calendarId: number
  userId: string
  userName: string
  profilePictureUrl: string | null
  userVideoUrl: string | null
  date: string // YYYY-MM-DD
  vimeoUri: string | null
  processingStatus: VideoProcessingStatus
  isBlocked: boolean // ✅ NAYI PROPERTY: Blocked users ko filter karne ke liye.
  zipcode?: string // ✅ NAYI PROPERTY: Distance ke hisab se sort karne ke liye.
}

// Final type with fresh playable URL for the frontend
export interface StoryQueryResultWithUrl extends StoryQueryResult {
  playableUrl: string | null
}
