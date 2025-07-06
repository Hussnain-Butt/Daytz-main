// File: src/types/User.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

// Represents the full User object, matching your database schema.
export interface User {
  userId: string
  auth0Id?: string
  email: string | null
  firstName: string | null
  lastName: string | null
  profilePictureUrl: string | null
  videoUrl: string | null
  zipcode: string | null
  stickers: any | null // Keep as 'any' if the structure is complex or varies
  tokens: number
  enableNotifications: boolean
  is_profile_complete: boolean
  createdAt: Date
  updatedAt: Date
}

// ✅ FIX: This type is now corrected to match what the service/repository expects.
// It defines what the frontend is allowed to send to update a user's profile.
// Nullable values are removed to prevent type conflicts.
export interface UpdateUserPayload {
  firstName?: string
  lastName?: string
  zipcode?: string
  stickers?: any
  enableNotifications?: boolean // No longer allows null
  is_profile_complete?: boolean
  videoUrl?: string | null // can be set to null to delete
  profilePictureUrl?: string | null // can be set to null to delete
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
