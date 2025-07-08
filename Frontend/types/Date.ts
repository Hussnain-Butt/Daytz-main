// File: types/Date.ts (Frontend)
// ✅ COMPLETE AND FINAL UPDATED CODE

// Matches the backend's StatusType enum
export type DateStatus = 'unscheduled' | 'pending' | 'approved' | 'cancelled' | 'completed';

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
    videoUrl: string | null; // Proposer's video URL
  };
  userTo: {
    userId: string;
    firstName: string;
    profilePictureUrl: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
}

// ✅ NEW TYPE: Represents a single item in the "Upcoming Dates" list
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
}

// Represents a basic Date object, typically used for payloads
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
