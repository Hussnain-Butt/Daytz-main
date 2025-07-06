// File: types/Date.ts (Frontend)

// Matches the backend's StatusType enum
export type DateStatus = 'unscheduled' | 'pending' | 'approved' | 'cancelled' | 'completed';

// Represents a Date object fetched from or sent to the backend
export interface DateObject {
  dateId: number;
  date: string; // YYYY-MM-DD ISO string
  time: string | null; // HH:MM:SS or HH:MM, or null
  userFrom: string; // User ID of the proposer
  userTo: string; // User ID of the proposed-to
  userFromApproved: boolean;
  userToApproved: boolean;
  locationMetadata?: {
    // Optional, matches backend JSON structure
    name?: string;
    address?: string;
    place_id?: string;
    // other Google Places details you store
  } | null;
  status: DateStatus;
  createdAt?: string; // ISO Date string
  updatedAt?: string; // ISO Date string
}

// Payload for creating a new date proposal
export interface CreateDatePayload {
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM or HH:MM:SS
  userTo: string; // ID of the user being invited
  // userFrom is derived from the authenticated user by the backend
  locationMetadata?: {
    name?: string;
    address?: string;
    place_id?: string;
    // other details...
  } | null;
  // userFromApproved, userToApproved, status are typically set by backend logic on creation
}

// Payload for updating an existing date
export interface UpdateDatePayload {
  dateId: number; // Required to identify the date
  date?: string;
  time?: string | null;
  locationMetadata?: {
    name?: string;
    address?: string;
    place_id?: string;
  } | null;
  userFromApproved?: boolean;
  userToApproved?: boolean;
  status?: DateStatus; // e.g., 'approved', 'cancelled'
}
