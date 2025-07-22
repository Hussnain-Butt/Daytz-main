// File: src/services/internal/DatesService.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

// ✅✅✅ FIX: Path ko theek kiya gaya hai ('../' se '../../') ✅✅✅
import pool from '../../db'
import { PoolClient } from 'pg'
import * as humps from 'humps'
// ✅✅✅ FIX: Path ko theek kiya gaya hai ('../' se '../../') ✅✅✅
import { DateObject as DateType, CreateDatePayload, UpcomingDate } from '../../types/Date'
import DatesRepository from '../../repository/DatesRepository'
import AttractionRepository from '../../repository/AttractionRepository'
import AttractionService from './AttractionService'
import UserService from './UserService'
import NotificationService from './NotificationService'

class DatesService {
  private datesRepository: DatesRepository
  private attractionRepository: AttractionRepository
  private attractionService: AttractionService
  private userService: UserService
  private notificationService: NotificationService

  constructor() {
    this.datesRepository = new DatesRepository()
    this.attractionRepository = new AttractionRepository()
    this.attractionService = new AttractionService()
    this.userService = new UserService()
    this.notificationService = new NotificationService()
    console.log('[DatesService] All repositories and services instantiated.')
  }

  async createFullDateProposal(
    proposerUserId: string,
    payload: CreateDatePayload,
  ): Promise<DateType> {
    const { userTo, date, romanticRating, sexualRating, friendshipRating } = payload
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Step 1: Proposer (User A) ki attraction save/update karein
      const proposerAttraction = await this.attractionService.createOrUpdateAttraction(
        {
          userFrom: proposerUserId,
          userTo,
          date,
          romanticRating,
          sexualRating,
          friendshipRating,
          longTermPotential: false,
          intellectual: false,
          emotional: false,
          result: null,
          firstMessageRights: null,
        },
        client,
      )

      // Step 2: Proposee (User B) ki attraction fetch karein
      const proposeeAttraction = await this.attractionService.getAttraction(
        userTo,
        proposerUserId,
        date,
        client,
      )

      // Agar proposee ne pehle attract nahi kiya to date nahi ban sakti
      if (!proposeeAttraction) {
        throw new Error('Cannot propose a date without prior interest from the other user.')
      }

      // Step 3: Matching algorithm run karein
      const matchResult = this.attractionService.calculateMatchResult(
        proposerAttraction,
        proposeeAttraction,
      )

      // Step 4: Dono attraction records ko match result se update karein
      await Promise.all([
        this.attractionRepository.updateAttraction(
          proposerAttraction.attractionId,
          { result: matchResult.isMatch },
          client,
        ),
        this.attractionRepository.updateAttraction(
          proposeeAttraction.attractionId,
          { result: matchResult.isMatch },
          client,
        ),
      ])

      // Step 5: Agar match nahi hua to error throw karein
      if (!matchResult.isMatch) {
        const error = new Error("It's not a match.")
        ;(error as any).code = 'NOT_A_MATCH'
        throw error
      }

      // Step 6: Agar match ho gaya, to date create karein aur tokens deduct karein
      const tokenCost = romanticRating + sexualRating + friendshipRating
      if (tokenCost > 0 && !payload.isUpdate) {
        await this.userService.spendTokensForUser(
          proposerUserId,
          tokenCost,
          'Date proposal after match',
          client,
        )
      }

      const dateEntry = await this.datesRepository.createDateEntry(
        {
          ...payload,
          userFrom: proposerUserId,
          status: 'pending',
          userFromApproved: true,
          userToApproved: false,
        },
        client,
      )

      // Step 7: Sahi user ko notification bhejein
      const notificationRecipientId = matchResult.firstMessageRightsHolderId
      if (notificationRecipientId) {
        await this.notificationService.sendDateProposalNotification(
          proposerUserId,
          notificationRecipientId, // Notification sirf 'winner' ko jayega
          {
            dateId: dateEntry.dateId,
            date: dateEntry.date,
            time: dateEntry.time || '',
            venue: dateEntry.locationMetadata?.name || 'A new spot!',
          },
          { romanticRating, sexualRating, friendshipRating },
        )
      } else {
        console.warn(`[DatesService] Match occurred but no notification recipient was determined.`)
      }

      await client.query('COMMIT')
      return dateEntry
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('[DatesService.createFullDateProposal] Transaction rolled back. Error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async getDateEntryById(dateId: number): Promise<DateType | null> {
    return this.datesRepository.getDateEntryById(dateId)
  }

  async getDateEntryByIdWithUserDetails(dateId: number): Promise<any | null> {
    return this.datesRepository.getDateEntryByIdWithUserDetails(dateId)
  }

  async getDateEntryByUsersAndDate(
    user1: string,
    user2: string,
    date: string,
  ): Promise<DateType | null> {
    return this.datesRepository.getDateEntryByUsersAndDate(user1, user2, date)
  }

  async updateDateEntry(dateId: number, dateEntry: Partial<DateType>): Promise<DateType | null> {
    return this.datesRepository.updateDateEntry(dateId, dateEntry)
  }

  async getUpcomingDatesByUserId(userId: string): Promise<UpcomingDate[]> {
    return this.datesRepository.getUpcomingDatesByUserId(userId)
  }
}

export default DatesService
