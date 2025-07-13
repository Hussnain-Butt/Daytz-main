// File: src/types/Date.ts (Backend)
// ✅ COMPLETE AND FINAL CORRECTED CODE

export type DateStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'

// Represents the full Date object from the database
export interface DateObject {
  dateId: number
  date: string
  time: string | null
  userFrom: string
  userTo: string
  userFromApproved: boolean
  userToApproved: boolean
  locationMetadata?: { name?: string; address?: string; place_id?: string } | null
  status: DateStatus
  createdAt: Date
  updatedAt: Date
}

// ✅ THIS TYPE IS NOW CORRECTLY EXPORTED AGAIN
// Data structure for creating a new date entry, used internally by services
export interface CreateDateInternal {
  date: string
  time: string | null
  userFrom: string
  userTo: string
  userFromApproved: boolean
  userToApproved: boolean
  locationMetadata?: {
    name?: string
    address?: string
  } | null
  status: DateStatus
}

// Represents an item for the upcoming dates list
export interface UpcomingDate {
  dateId: number
  date: string
  time: string | null
  locationMetadata: { name: string }
  otherUser: {
    userId: string
    firstName: string
    profilePictureUrl: string | null
  }
  // Needed for frontend logic
  userFrom: string
  userTo: string
  // Populated on the frontend
  romanticRating: number
  sexualRating: number
  friendshipRating: number
}

// Payload for creating a new date
export interface CreateDatePayload {
  date: string
  time: string | null
  userTo: string
  locationMetadata?: { name?: string; address?: string } | null
  isUpdate?: boolean
  romanticRating: number
  sexualRating: number
  friendshipRating: number
  longTermPotential?: boolean
  intellectual?: boolean
  emotional?: boolean
}
