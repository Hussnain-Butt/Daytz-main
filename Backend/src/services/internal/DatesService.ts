// File: src/services/internal/DatesService.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

import pool from '../../db'
import {
  // ✅ FIX: Changed 'Date' to 'DateObject'
  DateObject as DateType,
  CreateDatePayload,
  // ✅ FIX: 'CreateDateInternal' can now be correctly imported
  CreateDateInternal,
  UpcomingDate,
} from '../../types/Date'
import DatesRepository from '../../repository/DatesRepository'
import AttractionService from './AttractionService'
import UserService from './UserService'
import { CreateAttractionInternalPayload } from '../../types/Attraction'

class DatesService {
  private dateRepository: DatesRepository
  private attractionService: AttractionService
  private userService: UserService

  constructor() {
    this.dateRepository = new DatesRepository()
    this.attractionService = new AttractionService()
    this.userService = new UserService()
    console.log('[DatesService] All required services (Dates, Attraction, User) instantiated.')
  }

  async getDateEntryByIdWithUserDetails(dateId: number): Promise<any | null> {
    return this.dateRepository.getDateEntryByIdWithUserDetails(dateId)
  }

  async getUpcomingDatesByUserId(userId: string): Promise<UpcomingDate[]> {
    return this.dateRepository.getUpcomingDatesByUserId(userId)
  }

  async createFullDateProposal(
    proposerUserId: string,
    payload: CreateDatePayload,
  ): Promise<DateType> {
    const client = await pool.connect()
    console.log('[DatesService] Starting transaction for full date proposal.')
    try {
      await client.query('BEGIN')
      const attractionPayload: CreateAttractionInternalPayload = {
        userFrom: proposerUserId,
        userTo: payload.userTo,
        date: payload.date,
        romanticRating: payload.romanticRating,
        sexualRating: payload.sexualRating,
        friendshipRating: payload.friendshipRating,
        longTermPotential: payload.longTermPotential || false,
        intellectual: payload.intellectual || false,
        emotional: payload.emotional || false,
        result: null,
        firstMessageRights: null,
      }
      const attractionResult = await this.attractionService.createOrUpdateAttraction(
        attractionPayload,
        client,
      )
      if (!attractionResult)
        throw new Error('Failed to create or update attraction within the transaction.')
      if (!payload.isUpdate) {
        const tokenCost = payload.romanticRating + payload.sexualRating + payload.friendshipRating
        if (tokenCost > 0) {
          await this.userService.spendTokensForUser(
            proposerUserId,
            tokenCost,
            'New Attraction Submission',
            client,
          )
        }
      }
      const datePayload: CreateDateInternal = {
        date: payload.date,
        time: payload.time,
        userFrom: proposerUserId,
        userTo: payload.userTo,
        userFromApproved: true,
        userToApproved: false,
        locationMetadata: payload.locationMetadata,
        status: 'pending',
      }
      const createdDate = await this.dateRepository.createDateEntry(datePayload, client)
      await client.query('COMMIT')
      console.log('[DatesService] Transaction committed successfully. Full proposal created.')
      return createdDate
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('[DatesService] Transaction rolled back due to an error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async updateDateEntry(dateId: number, partialDate: Partial<DateType>): Promise<DateType | null> {
    return this.dateRepository.updateDateEntry(dateId, partialDate)
  }

  async getDateEntryById(dateId: number): Promise<DateType | null> {
    return this.dateRepository.getDateEntryById(dateId)
  }
  async getDateEntryByUsersAndDate(
    user1: string,
    user2: string,
    date: string,
  ): Promise<DateType | null> {
    return this.dateRepository.getDateEntryByUsersAndDate(user1, user2, date)
  }
}

export default DatesService
