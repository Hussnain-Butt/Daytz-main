// File: src/services/internal/AttractionService.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

// ✅✅✅ FIX: Path ko theek kiya gaya hai ('../' se '../../') ✅✅✅
import pool from '../../db'
import { Attraction, CreateAttractionInternalPayload } from '../../types/Attraction'
import { Pool, PoolClient } from 'pg'
import * as humps from 'humps'
// ✅✅✅ FIX: Path ko theek kiya gaya hai ('../' se '../../') ✅✅✅
import AttractionRepository from '../../repository/AttractionRepository'

class AttractionService {
  private attractionRepository: AttractionRepository

  constructor() {
    this.attractionRepository = new AttractionRepository()
    console.log('[AttractionService] AttractionRepository instance created.')
  }

  async createOrUpdateAttraction(
    payload: CreateAttractionInternalPayload,
    client: PoolClient | null = null,
  ): Promise<Attraction> {
    const existingAttraction = await this.attractionRepository.getAttraction(
      payload.userFrom,
      payload.userTo,
      payload.date,
      client,
    )
    if (existingAttraction) {
      console.log(
        `[AttractionService] Updating existing attraction ID: ${existingAttraction.attractionId}`,
      )
      const updatedAttraction = await this.attractionRepository.updateAttraction(
        existingAttraction.attractionId,
        {
          romanticRating: payload.romanticRating,
          sexualRating: payload.sexualRating,
          friendshipRating: payload.friendshipRating,
        },
        client,
      )
      if (!updatedAttraction) throw new Error('Failed to update attraction.')
      return updatedAttraction
    } else {
      console.log(
        `[AttractionService] Creating new attraction from ${payload.userFrom} to ${payload.userTo}`,
      )
      const newAttraction = await this.attractionRepository.createAttraction(payload, client)
      if (!newAttraction) throw new Error('Failed to create attraction.')
      return newAttraction
    }
  }

  public calculateMatchResult(
    attr1: Attraction,
    attr2: Attraction,
  ): {
    isMatch: boolean
    firstMessageRightsHolderId: string | null
  } {
    const r1 = attr1.romanticRating ?? 0
    const s1 = attr1.sexualRating ?? 0
    const f1 = attr1.friendshipRating ?? 0

    const r2 = attr2.romanticRating ?? 0
    const s2 = attr2.sexualRating ?? 0
    const f2 = attr2.friendshipRating ?? 0

    // Rule: Mismatch if one wants romance and the other doesn't.
    if ((r1 > 0 && r2 === 0) || (r1 === 0 && r2 > 0)) {
      return { isMatch: false, firstMessageRightsHolderId: null }
    }

    // Rule: Mismatch if one wants sexual and the other doesn't.
    if ((s1 > 0 && s2 === 0) || (s1 === 0 && s2 > 0)) {
      return { isMatch: false, firstMessageRightsHolderId: null }
    }

    // Rule: Mismatch if one is ONLY friends, but the other wants more.
    if (r1 === 0 && s1 === 0 && f1 > 0 && (r2 > 0 || s2 > 0)) {
      return { isMatch: false, firstMessageRightsHolderId: null }
    }
    if (r2 === 0 && s2 === 0 && f2 > 0 && (r1 > 0 || s1 > 0)) {
      return { isMatch: false, firstMessageRightsHolderId: null }
    }

    // If all checks pass, it's a match.
    const sum1 = r1 + s1 + f1
    const sum2 = r2 + s2 + f2
    let firstMessageRightsHolderId: string | null = null

    if (attr1.userFrom && attr2.userFrom) {
      if (sum1 < sum2) {
        firstMessageRightsHolderId = attr1.userFrom
      } else if (sum2 < sum1) {
        firstMessageRightsHolderId = attr2.userFrom
      } else {
        // Randomly assign if sums are equal
        firstMessageRightsHolderId = Math.random() < 0.5 ? attr1.userFrom : attr2.userFrom
      }
    }

    return { isMatch: true, firstMessageRightsHolderId }
  }

  async getAttraction(
    userFrom: string,
    userTo: string,
    date: string,
    client: PoolClient | null = null,
  ): Promise<Attraction | null> {
    return this.attractionRepository.getAttraction(userFrom, userTo, date, client)
  }

  async getAttractionsByUserFromAndUserTo(userFrom: string, userTo: string): Promise<Attraction[]> {
    return this.attractionRepository.getAttractionsByUserFromAndUserTo(userFrom, userTo)
  }

  async getAttractionById(
    attractionId: number,
    client: PoolClient | Pool | null = null,
  ): Promise<Attraction | null> {
    return this.attractionRepository.getAttractionById(attractionId, client)
  }
}

export default AttractionService
