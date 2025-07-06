// File: src/types/Date.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

// Represents the full Date object from the database.
export interface Date {
  dateId: number
  date: string // YYYY-MM-DD
  time: string | null // HH:MM:SS or null
  userFrom: string
  userTo: string
  userFromApproved: boolean
  userToApproved: boolean
  locationMetadata: any | null
  status: StatusType
  createdAt?: string
  updatedAt?: string
}

// ✅ THIS IS THE FIX
// This type now correctly includes all the optional fields that might come from the frontend.
export interface CreateDatePayload {
  // Fields for the Date Proposal
  userTo: string
  date: string // YYYY-MM-DD
  time: string | null // HH:MM:ss
  locationMetadata: any | null

  // Fields for the Attraction
  romanticRating: number
  sexualRating: number
  friendshipRating: number
  isUpdate: boolean

  // Optional new attraction fields
  longTermPotential?: boolean
  intellectual?: boolean
  emotional?: boolean
}

// This type is used internally by the service and repository.
export interface CreateDateInternal {
  date: string
  time: string | null
  userFrom: string
  userTo: string
  userFromApproved: boolean
  userToApproved: boolean
  locationMetadata: any | null
  status: StatusType
}

// The ENUM for all possible date statuses.
export type StatusType = 'unscheduled' | 'pending' | 'approved' | 'cancelled' | 'completed'
