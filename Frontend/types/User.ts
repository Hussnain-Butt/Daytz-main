// File: types/User.ts (Frontend)

export interface User {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string; // Assuming backend includes this if available
  profilePictureUrl?: string | null;
  videoUrl?: string | null;
  zipcode?: string | null;
  stickers?: Array<{
    id: number;
    name: string;
    icon: string;
  }> | null;
  tokens: number; // Changed to non-optional, backend should always provide this
  enableNotifications?: boolean; // Default usually true from backend
  is_profile_complete: boolean; // Always boolean from backend
  one_signal_player_id?: string; // <-- add this line
  createdAt?: string | Date;
  updatedAt?: string | Date;
  // one_signal_player_id is backend internal, not usually sent to frontend User model
}

// For profile editing form
export interface UserProfileEditData {
  firstName?: string;
  lastName?: string;
  zipcode?: string;
  enableNotifications?: boolean;
}

// For PATCH /api/users
export interface UpdateUserApiPayload {
  firstName?: string;
  lastName?: string;
  zipcode?: string | null;
  stickers?: User['stickers'];
  enableNotifications?: boolean;
  is_profile_complete?: boolean; // Client might send this to indicate completion
}

// For POST /api/users (initial creation beyond token info)
export interface CreateUserApiPayload {
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string | null; // If provided by Auth0 and client wants to sync
  email: string; // Email is now required by backend for creation
  zipcode?: string | null;
}
