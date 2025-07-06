// File: types/Attraction.ts (Frontend)

export interface Attraction {
  attractionId: number;
  userFrom: string; // Changed from string | null, should always be string from backend
  userTo: string; // Changed from string | null, should always be string from backend
  date: string; // Changed from string | null, should always be string from backend
  romanticRating: number | null;
  sexualRating: number | null;
  friendshipRating: number | null;
  longTermPotential: boolean | null;
  intellectual: boolean | null;
  emotional: boolean | null;
  result: boolean | null; // True if it's a match, false otherwise, null if not yet processed for match
  firstMessageRights: boolean | null;
  createdAt?: string; // ISO Date string from backend
  updatedAt?: string; // ISO Date string from backend
}

// Payload sent from frontend when creating an attraction
export interface CreateAttractionPayload {
  // userFrom is added by the backend using the authenticated user's ID
  userTo: string;
  date: string; // The specific date (YYYY-MM-DD) this attraction is for
  romanticRating: number; // 0-3
  sexualRating: number; // 0-3
  friendshipRating: number; // 0-3
  // These booleans are optional and default to false if not sent
  longTermPotential?: boolean;
  intellectual?: boolean;
  emotional?: boolean;
  // result and firstMessageRights are determined by the backend,
  // so the frontend does not need to send them for creation.
}
