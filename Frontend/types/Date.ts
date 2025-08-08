// File: types/Date.ts (Frontend)
// ✅ COMPLETE AND FINAL CORRECTED CODE

export type DateOutcome = 'amazing' | 'no_show_cancelled' | 'other';
export type DateStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed';

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

export interface UpcomingDate {
  dateId: number;
  date: string;
  time: string | null;
  updatedAt?: string; // ✅ YEH FIELD ADD KI GAYI HAI
  locationMetadata: { name: string };
  otherUser: {
    userId: string;
    firstName: string;
    profilePictureUrl: string | null;
  };
  userFrom: string;
  userTo: string;
  romanticRating: number;
  sexualRating: number;
  friendshipRating: number;
  myOutcome: DateOutcome | null;
  myNotes: string | null;
}

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
