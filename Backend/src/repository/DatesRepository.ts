// File: src/repository/DatesRepository.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import pool from '../db'
import { Date, CreateDateInternal } from '../types/Date' // Use the internal type
import { PoolClient } from 'pg'
import * as humps from 'humps'

// Helper function to map a database row to our Date object
const mapRowToDate = (row: any): Date | null => {
  if (!row) return null
  const camelized = humps.camelizeKeys(row)
  return {
    dateId: camelized.dateId,
    date: camelized.date,
    time: camelized.time,
    userFrom: camelized.userFrom,
    userTo: camelized.userTo,
    userFromApproved: camelized.userFromApproved,
    userToApproved: camelized.userToApproved,
    locationMetadata: camelized.locationMetadata,
    status: camelized.status,
    createdAt: camelized.createdAt,
    updatedAt: camelized.updatedAt,
  }
}

class DatesRepository {
  // ✅ This function is now updated to accept an optional 'client' for transactions.
  // If a client is provided, it uses it; otherwise, it uses the main pool.
  async createDateEntry(
    dateEntry: CreateDateInternal,
    client: PoolClient | null = null,
  ): Promise<Date> {
    const db = client || pool // Use transaction client if available, else the main pool
    const query = `
      INSERT INTO dates 
        (date, time, user_from, user_to, user_from_approved, user_to_approved, location_metadata, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *` // Return all columns to avoid a second query
    const values = [
      dateEntry.date,
      dateEntry.time,
      dateEntry.userFrom,
      dateEntry.userTo,
      dateEntry.userFromApproved,
      dateEntry.userToApproved,
      dateEntry.locationMetadata ? JSON.stringify(dateEntry.locationMetadata) : null,
      dateEntry.status,
    ]

    try {
      const { rows } = await db.query(query, values)
      const newDate = mapRowToDate(rows[0])
      if (!newDate) {
        throw new Error('Date creation failed, repository did not return a date object.')
      }
      return newDate
    } catch (error) {
      console.error('[DatesRepository.createDateEntry] Error:', error)
      throw error
    }
  }

  // No changes needed for the functions below, but they are included for completeness.

  async getDateEntryByUserToUserFromAndDate(
    userTo: string,
    userFrom: string,
    date: string,
  ): Promise<Date | null> {
    const query = `SELECT * FROM dates WHERE user_to = $1 AND user_from = $2 AND date = $3`
    const { rows } = await pool.query(query, [userTo, userFrom, date])
    return rows.length ? mapRowToDate(rows[0]) : null
  }

  async getDateEntryByUsersAndDate(
    user1: string,
    user2: string,
    date: string,
  ): Promise<Date | null> {
    const query = `SELECT * FROM dates WHERE (user_from = $1 AND user_to = $2 OR user_from = $2 AND user_to = $1) AND date = $3`
    const { rows } = await pool.query(query, [user1, user2, date])
    return rows.length ? mapRowToDate(rows[0]) : null
  }

  async getDateEntryById(dateId: number): Promise<Date | null> {
    const query = `SELECT * FROM dates WHERE date_id = $1`
    const { rows } = await pool.query(query, [dateId])
    return rows.length ? mapRowToDate(rows[0]) : null
  }

  async getDateEntriesByUserId(userId: string): Promise<Date[]> {
    const query = `SELECT * FROM dates WHERE user_from = $1 OR user_to = $1`
    const { rows } = await pool.query(query)
    return rows.map((row) => mapRowToDate(row)).filter((d): d is Date => d !== null)
  }

  async updateDateEntry(dateId: number, dateEntry: Partial<Date>): Promise<Date | null> {
    const fieldsToUpdate: string[] = []
    const values: any[] = []
    let queryIndex = 1
    Object.entries(dateEntry).forEach(([key, value]) => {
      if (value !== undefined && key !== 'dateId') {
        const snakeCaseKey = humps.decamelize(key)
        fieldsToUpdate.push(`${snakeCaseKey} = $${queryIndex}`)
        values.push(key === 'locationMetadata' ? JSON.stringify(value) : value)
        queryIndex++
      }
    })
    if (fieldsToUpdate.length === 0) return this.getDateEntryById(dateId)
    fieldsToUpdate.push('updated_at = NOW()')
    values.push(dateId)
    const query = `UPDATE dates SET ${fieldsToUpdate.join(
      ', ',
    )} WHERE date_id = $${queryIndex} RETURNING *`
    const { rows } = await pool.query(query, values)
    return rows.length ? mapRowToDate(rows[0]) : null
  }

  async deleteDateEntry(dateId: number): Promise<void> {
    const query = `DELETE FROM dates WHERE date_id = $1`
    await pool.query(query, [dateId])
  }
}

export default DatesRepository
