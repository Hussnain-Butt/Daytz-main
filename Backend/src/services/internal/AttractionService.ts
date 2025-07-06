// File: src/services/internal/AttractionService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import AttractionRepository from '../../repository/AttractionRepository'
import { Attraction, CreateAttractionInternalPayload } from '../../types/Attraction'
import { PoolClient } from 'pg'

class AttractionService {
  private attractionRepository: AttractionRepository

  constructor() {
    this.attractionRepository = new AttractionRepository()
    console.log('[AttractionService] AttractionRepository instantiated.')
  }

  async createOrUpdateAttraction(
    payload: CreateAttractionInternalPayload,
    client: PoolClient,
  ): Promise<Attraction> {
    console.log('[AttractionService] createOrUpdateAttraction called with payload:', payload)

    const existingAttraction = await this.attractionRepository.getAttraction(
      payload.userFrom,
      payload.userTo,
      payload.date,
      client,
    )

    let finalAttraction: Attraction | null

    if (existingAttraction) {
      console.log(
        `[AttractionService] Found existing attraction ${existingAttraction.attractionId}. Updating.`,
      )
      finalAttraction = await this.attractionRepository.updateAttraction(
        existingAttraction.attractionId,
        {
          romanticRating: payload.romanticRating,
          sexualRating: payload.sexualRating,
          friendshipRating: payload.friendshipRating,
        },
        client,
      )
    } else {
      console.log('[AttractionService] No existing attraction found. Creating new one.')
      finalAttraction = await this.attractionRepository.createAttraction(
        { ...payload, result: null, firstMessageRights: null },
        client,
      )
    }

    if (!finalAttraction) {
      throw new Error('Attraction creation or update failed within the repository layer.')
    }

    const otherWayAttraction = await this.attractionRepository.getAttraction(
      payload.userTo,
      payload.userFrom,
      payload.date,
      client,
    )

    if (otherWayAttraction) {
      console.log('[AttractionService] Found mutual attraction. Calculating match result.')
      const isMatch = await this.determineMatchResult(finalAttraction, otherWayAttraction)

      if (isMatch) {
        finalAttraction.result = true
        otherWayAttraction.result = true
        await this.attractionRepository.updateAttraction(
          finalAttraction.attractionId,
          { result: true },
          client,
        )
        await this.attractionRepository.updateAttraction(
          otherWayAttraction.attractionId,
          { result: true },
          client,
        )
      }
    }

    console.log(
      `[AttractionService] Process complete for attraction ID: ${finalAttraction.attractionId}`,
    )
    return finalAttraction
  }

  // ✅ --- THIS IS THE FIX ---
  // The missing determineFirstMessageRights function has been added back.
  async determineFirstMessageRights(
    attraction1: Attraction,
    attraction2: Attraction,
  ): Promise<boolean | null> {
    if (attraction1.result !== true || attraction2.result !== true) {
      return null
    }
    const sum1 =
      (attraction1.romanticRating || 0) +
      (attraction1.sexualRating || 0) +
      (attraction1.friendshipRating || 0)
    const sum2 =
      (attraction2.romanticRating || 0) +
      (attraction2.sexualRating || 0) +
      (attraction2.friendshipRating || 0)

    if (sum1 > sum2) return true
    if (sum2 > sum1) return false
    return Math.random() < 0.5
  }

  // No changes to the functions below, but included for completeness.

  calculateAttractionResultString(r: number | null, s: number | null, f: number | null): string {
    const R = r || 0
    const S = s || 0
    const F = f || 0
    const total = R + S + F
    if (total === 0) return 'No Interest'
    if (R > 0 && S > 0 && F > 0) return 'Full Package'
    if (R > 0 && S > 0) return 'Romantic & Sexual'
    if (R > 0 && F > 0) return 'Romantic Friendship'
    if (S > 0 && F > 0) return 'FWB'
    if (R > 0) return 'Romantic'
    if (S > 0) return 'Sexual'
    if (F > 0) return 'Friendship'
    return 'General Interest'
  }

  async getAttraction(userFrom: string, userTo: string, date: string): Promise<Attraction | null> {
    return this.attractionRepository.getAttraction(userFrom, userTo, date)
  }

  async getAttractionsByUserFrom(userFrom: string): Promise<Attraction[]> {
    return this.attractionRepository.getAttractionsByUserFrom(userFrom)
  }

  async getAttractionsByUserTo(userTo: string): Promise<Attraction[]> {
    return this.attractionRepository.getAttractionsByUserTo(userTo)
  }

  async getAttractionsByUserFromAndUserTo(userFrom: string, userTo: string): Promise<Attraction[]> {
    return (
      (await this.attractionRepository.getAttractionsByUserFromAndUserTo(userFrom, userTo)) || []
    )
  }

  async determineMatchResult(attraction1: Attraction, attraction2: Attraction): Promise<boolean> {
    const r1 = attraction1.romanticRating || 0
    const s1 = attraction1.sexualRating || 0
    const r2 = attraction2.romanticRating || 0
    const s2 = attraction2.sexualRating || 0
    if (r1 > 1 && r2 > 1) return true
    if (r1 === 0 && r2 === 0 && s1 > 1 && s2 > 1) return true
    return false
  }

  async updateAttraction(
    attractionId: number,
    updates: Partial<Attraction>,
  ): Promise<Attraction | null> {
    return this.attractionRepository.updateAttraction(attractionId, updates)
  }
}

export default AttractionService
