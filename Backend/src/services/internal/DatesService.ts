// File: src/services/internal/DatesService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

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
    const { userTo, date } = payload
    const client = await pool.connect()

    try {
      await client.query('BEGIN') // Step 1: Verify karein ki in dono users ke beech is date ke liye ek successful match hai.

      const [proposerAttraction, proposeeAttraction] = await Promise.all([
        this.attractionRepository.getAttraction(proposerUserId, userTo, date, client),
        this.attractionRepository.getAttraction(userTo, proposerUserId, date, client),
      ])

      if (
        !proposerAttraction ||
        !proposeeAttraction ||
        !proposerAttraction.result ||
        !proposeeAttraction.result
      ) {
        const error = new Error('A mutual match is required before a date can be proposed.')
        ;(error as any).code = 'NOT_A_MATCH'
        throw error
      } // Step 2: Check karein ki is din ke liye pehle se koi active date to nahi hai.

      const existingDate = await this.datesRepository.getDateEntryByUsersAndDate(
        proposerUserId,
        userTo,
        date,
        client,
      )
      if (
        existingDate &&
        existingDate.status !== 'cancelled' &&
        existingDate.status !== 'declined' &&
        existingDate.status !== 'completed'
      ) {
        throw new Error('An active date proposal already exists for this day.')
      } // Step 3: Nayi date entry create karein.

      const dateEntry = await this.datesRepository.createDateEntry(
        {
          ...payload,
          userFrom: proposerUserId,
          status: 'pending',
          userFromApproved: true,
          userToApproved: false,
        },
        client,
      ) // Step 4: Doosre user ko date proposal ki notification bhejein.

      await this.notificationService.sendDateProposalNotification(
        proposerUserId,
        userTo,
        {
          dateId: dateEntry.dateId,
          date: dateEntry.date,
          time: dateEntry.time || '',
          venue: dateEntry.locationMetadata?.name || 'A new spot!',
        },
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
  } // --- Baaki ke functions mein koi badlav nahi ---

  async getDateEntryById(dateId: number, client?: PoolClient): Promise<DateType | null> {
    return this.datesRepository.getDateEntryById(dateId, client)
  }

  async getDateEntryByIdWithUserDetails(dateId: number): Promise<any | null> {
    return this.datesRepository.getDateEntryByIdWithUserDetails(dateId)
  }

  async getDateEntryByUsersAndDate(
    user1: string,
    user2: string,
    date: string,
    client?: PoolClient,
  ): Promise<DateType | null> {
    return this.datesRepository.getDateEntryByUsersAndDate(user1, user2, date, client)
  }

  async updateDateEntry(
    dateId: number,
    dateEntry: Partial<DateType>,
    client?: PoolClient,
  ): Promise<DateType | null> {
    return this.datesRepository.updateDateEntry(dateId, dateEntry, client)
  }

  async getUpcomingDatesByUserId(userId: string): Promise<UpcomingDate[]> {
    return this.datesRepository.getUpcomingDatesByUserId(userId)
  }
}

export default DatesService
