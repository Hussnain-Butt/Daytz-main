// File: src/types/User.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

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
  stickers: any | null
  tokens: number
  enableNotifications: boolean
  is_profile_complete: boolean
  createdAt: Date
  updatedAt: Date
  // ✅ --- THIS IS THE FIX ---
  // Add the fcm_token property to the User interface to match the database schema.
  fcm_token?: string | null
}

// Defines what the frontend is allowed to send to update a user's profile.
export interface UpdateUserPayload {
  firstName?: string
  lastName?: string
  zipcode?: string
  stickers?: any
  enableNotifications?: boolean
  is_profile_complete?: boolean
  videoUrl?: string | null
  profilePictureUrl?: string | null
  fcm_token?: string | null // Also add it here for consistency
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
