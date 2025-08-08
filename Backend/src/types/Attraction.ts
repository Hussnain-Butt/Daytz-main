// File: src/types/Attraction.ts

export interface Attraction {
  attractionId: number
  userFrom: string | null
  userTo: string | null
  date: string | null
  romanticRating: number | null
  sexualRating: number | null
  friendshipRating: number | null
  longTermPotential: boolean | null
  intellectual: boolean | null
  emotional: boolean | null
  result: boolean | null
  firstMessageRights: boolean | null
  createdAt?: Date
  updatedAt?: Date
}

export interface CreateAttraction {
  // What client sends (userFrom is implicit)
  userTo: string
  date: string
  romanticRating: number
  sexualRating: number
  friendshipRating: number
  longTermPotential?: boolean // Optional from client
  intellectual?: boolean // Optional from client
  emotional?: boolean // Optional from client
  // result and firstMessageRights are NOT sent by client initially
}

// Payload used by the service/repository for internal creation
export interface CreateAttractionInternalPayload {
  userFrom: string // Derived from authenticated user
  userTo: string
  date: string
  romanticRating: number
  sexualRating: number
  friendshipRating: number
  longTermPotential: boolean // Service ensures defaults if not from client
  intellectual: boolean // Service ensures defaults if not from client
  emotional: boolean // Service ensures defaults if not from client
  result: boolean | null // Service sets this (e.g., to null initially)
  firstMessageRights: boolean | null // Service sets this (e.g., to null initially)
}
