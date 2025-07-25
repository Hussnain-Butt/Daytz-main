// File: src/services/internal/AttractionService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import { Pool, PoolClient } from 'pg'
import { Attraction, CreateAttractionInternalPayload } from '../../types/Attraction'
import AttractionRepository from '../../repository/AttractionRepository'
// ✅ DatesRepository ki ab yahan zaroorat nahi hai.

class AttractionService {
  private attractionRepository: AttractionRepository

  constructor() {
    this.attractionRepository = new AttractionRepository()
    console.log('[AttractionService] AttractionRepository instance created.')
  }

  // ✅ Return type se dateObject hata diya gaya hai, kyunki date entry ab yahan nahi banegi.
  async createOrUpdateAttraction(
    payload: CreateAttractionInternalPayload,
    client: PoolClient, // Transaction ke liye client zaroori hai
  ): Promise<{
    finalAttraction: Attraction
    matchResult: {
      isMatch: boolean
      counterpartAttraction?: Attraction // Doosre user ki attraction bhi return hogi
    } | null
  }> {
    // Step 1: User ki apni attraction ko create ya update karein
    const existingAttraction = await this.attractionRepository.getAttraction(
      payload.userFrom,
      payload.userTo,
      payload.date,
      client,
    )

    let finalAttraction: Attraction
    if (existingAttraction) {
      console.log(
        `[AttractionService] Updating existing attraction ID: ${existingAttraction.attractionId}`,
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
      console.log(
        `[AttractionService] Creating new attraction from ${payload.userFrom} to ${payload.userTo}`,
      )
      finalAttraction = await this.attractionRepository.createAttraction(payload, client)
    }

    // Step 2: Doosre user ki attraction check karein (reverse direction mein)
    const counterpartAttraction = await this.attractionRepository.getAttraction(
      payload.userTo,
      payload.userFrom,
      payload.date,
      client,
    )

    // Agar doosre user ne abhi tak attraction nahi bheji hai, to match nahi hua
    if (!counterpartAttraction) {
      // Yeh pehli attraction thi, isliye matchResult null return hoga
      return { finalAttraction, matchResult: null }
    }

    // Step 3: Agar dono ne attraction bhej di hai, to match calculate karein
    console.log(`[AttractionService] Both attractions exist. Calculating match result.`)
    const { isMatch } = this.calculateMatchResult(finalAttraction, counterpartAttraction)

    // Dono attraction records ko match result (true/false) ke saath update karein
    await this.attractionRepository.updateAttraction(
      finalAttraction.attractionId,
      { result: isMatch },
      client,
    )
    await this.attractionRepository.updateAttraction(
      counterpartAttraction.attractionId,
      { result: isMatch },
      client,
    )

    // ✅ Match hone par Date entry ab yahan nahi banegi.
    // Yeh logic yahan se hata diya gaya hai.

    // Poora result handler ko return karein
    return {
      finalAttraction,
      matchResult: { isMatch, counterpartAttraction },
    }
  }

  // ✅ Iska return type simplify kar diya gaya hai. firstMessageRights ki ab zaroorat nahi.
  public calculateMatchResult(attr1: Attraction, attr2: Attraction): { isMatch: boolean } {
    const r1 = attr1.romanticRating ?? 0
    const s1 = attr1.sexualRating ?? 0
    const f1 = attr1.friendshipRating ?? 0

    const r2 = attr2.romanticRating ?? 0
    const s2 = attr2.sexualRating ?? 0
    const f2 = attr2.friendshipRating ?? 0

    // Veto logic: Agar ek taraf romantic/sexual interest hai aur doosri taraf nahi, to match nahi
    if ((r1 > 0 && r2 === 0) || (r1 === 0 && r2 > 0)) {
      return { isMatch: false }
    }
    if ((s1 > 0 && s2 === 0) || (s1 === 0 && s2 > 0)) {
      return { isMatch: false }
    }
    // Veto logic: Agar ek taraf sirf friendship hai aur doosri taraf romantic/sexual, to match nahi
    if (r1 === 0 && s1 === 0 && f1 > 0 && (r2 > 0 || s2 > 0)) {
      return { isMatch: false }
    }
    if (r2 === 0 && s2 === 0 && f2 > 0 && (r1 > 0 || s1 > 0)) {
      return { isMatch: false }
    }

    // Agar koi veto condition nahi lagi, to yeh ek match hai
    return { isMatch: true }
  }

  // --- Baaki ke functions mein koi badlav nahi ---
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
    client: Pool | PoolClient | null = null,
  ): Promise<Attraction | null> {
    return this.attractionRepository.getAttractionById(attractionId, client)
  }
}

export default AttractionService
