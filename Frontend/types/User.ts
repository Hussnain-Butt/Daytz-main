// File: types/User.ts (Frontend)
// ✅ COMPLETE AND FINAL UPDATED CODE

export interface User {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePictureUrl?: string | null;
  videoUrl?: string | null;
  zipcode?: string | null;
  stickers?: Array<{ id: number; name: string; icon: string }> | null;
  tokens: number;
  enableNotifications?: boolean;
  is_profile_complete: boolean;
  one_signal_player_id?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  referralSource?: string | null; // ✅ NAYA FIELD
}

export interface UserProfileEditData {
  firstName?: string;
  lastName?: string;
  zipcode?: string;
  enableNotifications?: boolean;
}

// ✅ BADLAV: UpdateUserApiPayload mein referralSource add karein
export interface UpdateUserApiPayload {
  firstName?: string;
  lastName?: string;
  zipcode?: string | null;
  stickers?: User['stickers'];
  enableNotifications?: boolean;
  is_profile_complete?: boolean;
  videoUrl?: string | null; // Profile.tsx se bheja ja raha hai
  profilePictureUrl?: string | null; // Profile.tsx se bheja ja raha hai
  referralSource?: string; // Naya optional field
}

export interface CreateUserApiPayload {
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string | null;
  email: string;
  zipcode?: string | null;
  // Note: referralSource yahan nahi, updateUser mein jayega.
}
