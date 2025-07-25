// File: src/services/internal/DatesService.ts
// ✅ COMPLETE AND FINAL CODE (NO CHANGES NEEDED)

import pool from '../../db'
import { PoolClient } from 'pg'
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

      const proposeeAttraction = await this.attractionService.getAttraction(
        userTo,
        proposerUserId,
        date,
        client,
      )

      if (!proposeeAttraction) {
        const error = new Error(
          'You can propose a date once both of you have shown mutual interest for this day. The other user has been notified of your interest!',
        )
        ;(error as any).code = 'NOT_A_MATCH'
        throw error
      }

      const matchResult = this.attractionService.calculateMatchResult(
        proposerAttraction,
        proposeeAttraction,
      )

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

      if (!matchResult.isMatch) {
        const error = new Error(
          'Your interests for this date are not aligned. You can adjust your interest levels and try again if you wish.',
        )
        ;(error as any).code = 'NOT_A_MATCH'
        throw error
      }

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

      const notificationRecipientId = userTo

      console.log(
        `[DatesService] Sending date proposal notification from ${proposerUserId} to ${notificationRecipientId}.`,
      )

      await this.notificationService.sendDateProposalNotification(
        proposerUserId,
        notificationRecipientId,
        {
          dateId: dateEntry.dateId,
          date: dateEntry.date,
          time: dateEntry.time || '',
          venue: dateEntry.locationMetadata?.name || 'A new spot!',
        },
        { romanticRating, sexualRating, friendshipRating },
        client,
      )

      await client.query('COMMIT')
      console.log(
        `[DatesService] Transaction COMMITTED for date proposal between ${proposerUserId} and ${userTo}.`,
      )
      return dateEntry
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('[DatesService.createFullDateProposal] Transaction ROLLED BACK. Error:', error)
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

  // This method now correctly gets both pending and approved dates because the repository does.
  async getUpcomingDatesByUserId(userId: string): Promise<UpcomingDate[]> {
    return this.datesRepository.getUpcomingDatesByUserId(userId)
  }
}

export default DatesService
