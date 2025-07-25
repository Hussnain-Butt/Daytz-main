// File: src/types/User.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

// Represents the full User object, matching your database schema.
export interface User {
  userId: string
  auth0Id?: string
  email: string | null
  firstName: string | null // Allows null
  lastName: string | null // Allows null
  profilePictureUrl: string | null
  videoUrl: string | null
  zipcode: string | null
  stickers: any | null
  tokens: number
  enableNotifications: boolean
  is_profile_complete: boolean
  createdAt: Date
  updatedAt: Date
  fcm_token?: string | null
  referralSource?: string | null
}

// Defines what the frontend is allowed to send to update a user's profile.
// ✅ BADLAV: Ab `null` bhi allow karein, taaki yeh `Partial<User>` ke saath zyaada compatible ho.
export interface UpdateUserPayload {
  firstName?: string | null
  lastName?: string | null
  zipcode?: string
  stickers?: any
  enableNotifications?: boolean
  is_profile_complete?: boolean
  videoUrl?: string | null
  profilePictureUrl?: string | null
  fcm_token?: string | null
  referralSource?: string
  tokens?: number // UserService se internally use hota hai
}

// Data structure used internally to create a new user.
export interface CreateUserInternalData {
  userId: string
  auth0Id?: string
  firstName?: string
  lastName?: string
  email: string | null
  profilePictureUrl?: string
  zipcode?: string
}
