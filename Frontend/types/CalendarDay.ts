// File: types/CalendarDay.ts

export type VideoProcessingStatus = 'pending' | 'processing' | 'complete' | 'failed' | null

// Base CalendarDay structure (Matches DB closely)
export interface CalendarDay {
  calendarId: number // Or string depending on DB return type
  userId: string
  date: string // YYYY-MM-DD
  userVideoUrl: string | null // <<<< REQUIRED (can be null)
  vimeoUri: string | null // e.g., /videos/123456
  processingStatus: VideoProcessingStatus
  // createdAt?: Date; // Optional
  // updatedAt?: Date; // Optional
}

// Type for creating a new entry (only required fields)
export interface CreateCalendarDay {
  userId: string
  date: string // YYYY-MM-DD
  userVideoUrl: string | null // Page link or null
}

// Type for updating an entry (all fields optional)
// Used for general updates and video processing updates
export interface UpdateCalendarDay {
  userVideoUrl?: string | null // Page link
  vimeoUri?: string | null
  processingStatus?: VideoProcessingStatus
  // Add other updatable fields if needed, e.g., notes?: string;
}

// Type for nearby video data
export interface NearbyVideoData {
  userId: string
  userVideoUrl: string | null // Page link or null
}

// Type for story data retrieved from the repository (JOIN result)
export interface StoryQueryResult {
  calendarId: number // Or string
  userId: string
  userName: string
  profilePictureUrl?: string | null
  userVideoUrl: string | null // Page link or null
  date: string // YYYY-MM-DD
  vimeoUri: string | null
  processingStatus: VideoProcessingStatus
}

// << NEW TYPE >>
// Type for story data including the freshly fetched playable URL
export interface StoryQueryResultWithUrl extends StoryQueryResult {
  playableUrl: string | null // The fresh URL fetched just before sending to app
} 