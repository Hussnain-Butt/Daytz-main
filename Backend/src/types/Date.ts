// File: src/types/Date.ts (Backend)
// ✅ COMPLETE AND FINAL CORRECTED CODE

// Represents the status of a date, must match database enum
export type StatusType = 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'

// The full Date object as it exists in the database
export interface Date {
  dateId: number
  date: string // YYYY-MM-DD
  time: string | null // HH:MM:SS
  userFrom: string
  userTo: string
  userFromApproved: boolean
  userToApproved: boolean
  locationMetadata?: {
    name?: string
    address?: string
    place_id?: string
  } | null
  status: StatusType
  createdAt: Date
  updatedAt: Date
}

// ✅ NEW TYPE: This defines the structure for the upcoming dates list.
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
}

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
  status: StatusType
}

// Payload received from the frontend to create a new date proposal
export interface CreateDatePayload {
  date: string
  time: string | null
  userTo: string
  locationMetadata?: {
    name?: string
    address?: string
  } | null
  romanticRating: number
  sexualRating: number
  friendshipRating: number
  longTermPotential?: boolean
  intellectual?: boolean
  emotional?: boolean
  isUpdate?: boolean
}
