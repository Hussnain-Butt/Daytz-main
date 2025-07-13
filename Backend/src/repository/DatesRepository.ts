// File: src/repository/DatesRepository.ts
// ✅ COMPLETE AND FINAL UPDATED CODE (with the temporary fix for testing)

import pool from '../db'
import { DateObject as DateType, CreateDateInternal, UpcomingDate } from '../types/Date'
import { PoolClient } from 'pg'
import * as humps from 'humps'

// mapRowToDate ab 'DateObject' expect karta hai aur usko 'DateType' banata hai.
const mapRowToDate = (row: any): DateType | null => {
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
  async getDateEntryByIdWithUserDetails(dateId: number): Promise<any | null> {
    const query = `
      SELECT 
        d.*,
        json_build_object('userId', uf.user_id, 'firstName', uf.first_name, 'profilePictureUrl', uf.profile_picture_url, 'videoUrl', uf.video_url) as "user_from_details",
        json_build_object('userId', ut.user_id, 'firstName', ut.first_name, 'profilePictureUrl', ut.profile_picture_url) as "user_to_details"
      FROM dates d
      JOIN users uf ON d.user_from = uf.user_id
      JOIN users ut ON d.user_to = ut.user_id
      WHERE d.date_id = $1;
    `
    const { rows } = await pool.query(query, [dateId])
    if (rows.length === 0) return null
    return humps.camelizeKeys(rows[0])
  }

  // This query is updated for easy testing.
  async getUpcomingDatesByUserId(userId: string): Promise<UpcomingDate[]> {
    console.log(`[DatesRepository] Fetching upcoming dates for user: ${userId}`)
    const query = `
      SELECT
        d.date_id as "dateId", 
        d.date, 
        d.time, 
        d.location_metadata as "locationMetadata",
        d.user_from as "userFrom",
        d.user_to as "userTo",
        CASE
          WHEN d.user_from = $1 THEN 
            json_build_object(
              'userId', ut.user_id, 
              'firstName', ut.first_name, 
              'profilePictureUrl', ut.profile_picture_url
            )
          ELSE 
            json_build_object(
              'userId', uf.user_id, 
              'firstName', uf.first_name, 
              'profilePictureUrl', uf.profile_picture_url
            )
        END as "otherUser"
      FROM dates d
      JOIN users uf ON d.user_from = uf.user_id
      JOIN users ut ON d.user_to = ut.user_id
      WHERE (d.user_from = $1 OR d.user_to = $1)
      AND d.status = 'approved'
      -- AND d.date >= CURRENT_DATE -- ✅ WAQTI TAUR PAR COMMENT KAR DIYA GAYA HAI, taake testing mein purani dates bhi nazar aayein.
      ORDER BY d.date ASC, d.time ASC;
    `
    try {
      const { rows } = await pool.query(query, [userId])
      console.log(
        `[DatesRepository] SQL query found ${rows.length} dates with 'approved' status for user ${userId}.`,
      )
      return rows as UpcomingDate[]
    } catch (error) {
      console.error(`[DatesRepository] Error executing getUpcomingDatesByUserId query:`, error)
      throw error
    }
  }

  async createDateEntry(
    dateEntry: CreateDateInternal,
    client: PoolClient | null = null,
  ): Promise<DateType> {
    const db = client || pool
    const query = `INSERT INTO dates (date, time, user_from, user_to, user_from_approved, user_to_approved, location_metadata, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`
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
    const { rows } = await db.query(query, values)
    const newDate = mapRowToDate(rows[0])
    if (!newDate) {
      throw new Error('Date creation failed, repository did not return a date object.')
    }
    return newDate
  }

  async getDateEntryById(dateId: number): Promise<DateType | null> {
    const query = `SELECT * FROM dates WHERE date_id = $1`
    const { rows } = await pool.query(query, [dateId])
    return rows.length ? mapRowToDate(rows[0]) : null
  }

  async getDateEntryByUsersAndDate(
    user1: string,
    user2: string,
    date: string,
  ): Promise<DateType | null> {
    const query = `SELECT * FROM dates WHERE (user_from = $1 AND user_to = $2 OR user_from = $2 AND user_to = $1) AND date = $3`
    const { rows } = await pool.query(query, [user1, user2, date])
    return rows.length ? mapRowToDate(rows[0]) : null
  }

  async updateDateEntry(dateId: number, dateEntry: Partial<DateType>): Promise<DateType | null> {
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

    values.push(dateId)
    const query = `UPDATE dates SET ${fieldsToUpdate.join(
      ', ',
    )} WHERE date_id = $${queryIndex} RETURNING *`
    const { rows } = await pool.query(query, values)
    return rows.length ? mapRowToDate(rows[0]) : null
  }
}

export default DatesRepository
