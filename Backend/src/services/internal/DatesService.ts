// File: src/services/internal/DatesService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import pool from '../../db'
import { Date, CreateDatePayload, CreateDateInternal, StatusType } from '../../types/Date'
import DatesRepository from '../../repository/DatesRepository'
import AttractionService from './AttractionService'
import UserService from './UserService'
// We need to import this type to use it correctly
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

  async createFullDateProposal(proposerUserId: string, payload: CreateDatePayload): Promise<Date> {
    const client = await pool.connect()
    console.log('[DatesService] Starting transaction for full date proposal.')

    try {
      await client.query('BEGIN')

      // Step 1: Create or Update the Attraction
      console.log('[DatesService] Step 1: Creating/Updating attraction.')

      // ✅ --- THIS IS THE FIX ---
      // The attractionPayload object now includes all required properties from the payload,
      // with default values for those that might not be sent from the frontend.
      const attractionPayload: CreateAttractionInternalPayload = {
        userFrom: proposerUserId,
        userTo: payload.userTo,
        date: payload.date,
        romanticRating: payload.romanticRating,
        sexualRating: payload.sexualRating,
        friendshipRating: payload.friendshipRating,
        // Add the missing properties with default values
        longTermPotential: payload.longTermPotential || false,
        intellectual: payload.intellectual || false,
        emotional: payload.emotional || false,
        result: null, // Always start with null result
        firstMessageRights: null, // Always start with null rights
      }

      const attractionResult = await this.attractionService.createOrUpdateAttraction(
        attractionPayload,
        client,
      )
      if (!attractionResult) {
        throw new Error('Failed to create or update attraction within the transaction.')
      }
      console.log(`[DatesService] Attraction created/updated. Result: ${attractionResult.result}`)

      // Step 2: Deduct Tokens if it's a new attraction
      if (!payload.isUpdate) {
        const tokenCost = payload.romanticRating + payload.sexualRating + payload.friendshipRating
        if (tokenCost > 0) {
          console.log(`[DatesService] Step 2: Deducting ${tokenCost} tokens for new attraction.`)
          await this.userService.spendTokensForUser(
            proposerUserId,
            tokenCost,
            'New Attraction Submission',
            client,
          )
          console.log(`[DatesService] Tokens successfully deducted for user ${proposerUserId}.`)
        }
      } else {
        console.log('[DatesService] Step 2: Skipped token deduction (attraction update).')
      }

      // Step 3: Create the Date Proposal entry
      console.log('[DatesService] Step 3: Creating the date proposal entry.')
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

  // --- No changes to the functions below ---
  async updateDateEntry(dateId: number, partialDate: Partial<Date>): Promise<Date | null> {
    return this.dateRepository.updateDateEntry(dateId, partialDate)
  }

  async getDateEntryById(dateId: number): Promise<Date | null> {
    return this.dateRepository.getDateEntryById(dateId)
  }

  async getDateEntryByUserToUserFromAndDate(
    userTo: string,
    userFrom: string,
    date: string,
  ): Promise<Date | null> {
    return this.dateRepository.getDateEntryByUserToUserFromAndDate(userTo, userFrom, date)
  }

  async getDateEntryByUsersAndDate(
    user1: string,
    user2: string,
    date: string,
  ): Promise<Date | null> {
    return this.dateRepository.getDateEntryByUsersAndDate(user1, user2, date)
  }

  async getDateEntriesByUserId(userId: string): Promise<Date[]> {
    return this.dateRepository.getDateEntriesByUserId(userId)
  }

  async deleteDateEntry(dateId: number): Promise<void> {
    return this.dateRepository.deleteDateEntry(dateId)
  }
}

export default DatesService
