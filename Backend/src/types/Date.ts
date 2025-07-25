// File: src/types/Date.ts (Backend)
// ✅ COMPLETE AND FINAL UPDATED CODE

export type DateOutcome = 'amazing' | 'no_show_cancelled' | 'other'
export type DateStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'

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

export interface CreateDateInternal {
  date: string
  time: string | null
  userFrom: string
  userTo: string
  userFromApproved: boolean
  userToApproved: boolean
  locationMetadata?: { name?: string; address?: string } | null
  status: DateStatus
}

export interface UpcomingDate {
  dateId: number
  date: string
  time: string | null
  updatedAt: string
  locationMetadata: { name: string }
  status: DateStatus // ✅ YEH FIELD ADD KI GAYI HAI
  otherUser: {
    userId: string
    firstName: string
    profilePictureUrl: string | null
  }
  userFrom: string
  userTo: string
  romanticRating: number
  sexualRating: number
  friendshipRating: number
  myOutcome: DateOutcome | null
  myNotes: string | null
}

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
