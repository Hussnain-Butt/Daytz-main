// File: types/Date.ts (Frontend)
// ✅ COMPLETE AND FINAL CORRECTED CODE

// ✅ 'declined' ko yahan bhi add kiya gaya hai taake dono files same rahen
export type DateStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed';

// Represents a detailed Date object with nested user info
export interface DetailedDateObject {
  dateId: number;
  date: string;
  time: string | null;
  status: DateStatus;
  locationMetadata?: { name?: string; address?: string } | null;
  userFrom: {
    userId: string;
    firstName: string;
    profilePictureUrl: string | null;
    videoUrl: string | null;
  };
  userTo: {
    userId: string;
    firstName: string;
    profilePictureUrl: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Represents a single item in the "Upcoming Dates" list
export interface UpcomingDate {
  dateId: number;
  date: string;
  time: string | null;
  locationMetadata: { name: string };
  otherUser: {
    userId: string;
    firstName: string;
    profilePictureUrl: string | null;
  };
  // Needed for frontend logic
  userFrom: string;
  userTo: string;
  // Populated on the frontend
  romanticRating: number;
  sexualRating: number;
  friendshipRating: number;
}

// Represents a basic Date object
export interface DateObject {
  dateId: number;
  date: string;
  time: string | null;
  userFrom: string;
  userTo: string;
  userFromApproved: boolean;
  userToApproved: boolean;
  locationMetadata?: { name?: string; address?: string } | null;
  status: DateStatus;
  createdAt?: string;
  updatedAt?: string;
}

// Payload for creating a new date proposal
export interface CreateDatePayload {
  date: string;
  time: string | null;
  userTo: string;
  locationMetadata?: { name?: string; address?: string } | null;
  isUpdate?: boolean;
  romanticRating: number;
  sexualRating: number;
  friendshipRating: number;
  longTermPotential?: boolean;
  intellectual?: boolean;
  emotional?: boolean;
}
