// File: src/repository/CalendarDayRepository.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

import pool from '../db'
import {
  CalendarDay,
  CreateCalendarDay,
  UpdateCalendarDay,
  VideoProcessingStatus,
  StoryQueryResult,
  NearbyVideoData,
} from '../types/CalendarDay'
import * as humps from 'humps'
import moment from 'moment'

class CalendarDayRepository {
  async findStoriesByDateWithUserDetails(
    date: string,
    loggedInUserId: string,
  ): Promise<StoryQueryResult[] | null> {
    const query = `
      SELECT
          cd.calendar_id AS "calendarId", 
          cd.user_id AS "userId", 
          cd.date,
          cd.user_video_url AS "userVideoUrl", 
          cd.vimeo_uri AS "vimeoUri",
          cd.processing_status AS "processingStatus",
          (u.first_name || ' ' || u.last_name) AS "userName", 
          u.profile_picture_url AS "profilePictureUrl",
          (ub.blocker_id IS NOT NULL) AS "isBlocked"
      FROM calendar_day cd
      JOIN users u ON cd.user_id = u.user_id
      LEFT JOIN user_blocks ub ON u.user_id = ub.blocked_id AND ub.blocker_id = $2
      WHERE 
        cd.date::date = $1::date
        AND cd.vimeo_uri IS NOT NULL
        AND cd.processing_status = 'complete'
        AND u.user_id != $2;
    `
    try {
      const { rows } = await pool.query(query, [date, loggedInUserId])
      return rows.map((row) => ({
        ...row,
        calendarId: parseInt(row.calendarId, 10),
        date: moment(row.date).format('YYYY-MM-DD'),
        userName: (row.userName || 'User').trim(),
      }))
    } catch (error) {
      console.error('Error in findStoriesByDateWithUserDetails:', error)
      return null
    }
  }

  async findStoriesByDateAndZipcodes(
    date: string,
    zipcodeList: string[],
    loggedInUserId: string,
    loggedInUserZipcode: string,
  ): Promise<StoryQueryResult[] | null> {
    const query = `
      SELECT
          cd.calendar_id AS "calendarId", 
          cd.user_id AS "userId", 
          cd.date,
          cd.user_video_url AS "userVideoUrl", 
          cd.vimeo_uri AS "vimeoUri",
          cd.processing_status AS "processingStatus",
          (u.first_name || ' ' || u.last_name) AS "userName",
          u.profile_picture_url AS "profilePictureUrl",
          u.zipcode,
          (ub.blocker_id IS NOT NULL) AS "isBlocked"
      FROM calendar_day cd
      JOIN users u ON cd.user_id = u.user_id
      LEFT JOIN user_blocks ub ON u.user_id = ub.blocked_id AND ub.blocker_id = $3
      WHERE 
        cd.date::date = $1::date
        AND u.zipcode = ANY($2::text[])
        AND cd.vimeo_uri IS NOT NULL
        AND cd.processing_status = 'complete'
        AND u.user_id != $3
      ORDER BY
        CASE WHEN u.zipcode = $4 THEN 0 ELSE 1 END,
        u.zipcode ASC;
    `
    try {
      const { rows } = await pool.query(query, [
        date,
        zipcodeList,
        loggedInUserId,
        loggedInUserZipcode,
      ])
      return rows.map((row) => ({
        ...row,
        calendarId: parseInt(row.calendarId, 10),
        date: moment(row.date).format('YYYY-MM-DD'),
        userName: (row.userName || 'User').trim(),
      }))
    } catch (error) {
      console.error('Error in findStoriesByDateAndZipcodes:', error)
      return null
    }
  }

  // --- Baaki sabhi functions bilkul waise hi rahenge ---
  async getCalendarDayById(calendarId: number): Promise<CalendarDay | null> {
    const query = `SELECT * FROM calendar_day WHERE calendar_id = $1`
    try {
      const { rows } = await pool.query(query, [calendarId])
      if (rows.length === 0) return null
      const row = rows[0]
      return {
        calendarId: row.calendar_id,
        userId: row.user_id,
        date: moment(row.date).format('YYYY-MM-DD'),
        userVideoUrl: row.user_video_url,
        vimeoUri: row.vimeo_uri,
        processingStatus: row.processing_status,
      }
    } catch (error) {
      console.error('Error in getCalendarDayById:', error)
      return null
    }
  }

  async updateCalendarDay(calendarId: number, updateData: UpdateCalendarDay): Promise<boolean> {
    const fieldsToUpdate: string[] = []
    const values: any[] = []
    let queryIndex = 1

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeCaseKey = humps.decamelize(key)
        fieldsToUpdate.push(`${snakeCaseKey} = $${queryIndex++}`)
        values.push(value)
      }
    })

    if (fieldsToUpdate.length === 0) return true

    fieldsToUpdate.push(`updated_at = CURRENT_TIMESTAMP`)
    const setClause = fieldsToUpdate.join(', ')
    values.push(calendarId)
    const query = `UPDATE calendar_day SET ${setClause} WHERE calendar_id = $${queryIndex} RETURNING calendar_id`

    try {
      const result = await pool.query(query, values)
      return (result.rowCount || 0) > 0
    } catch (error) {
      console.error(`Error updating calendar day (ID: ${calendarId}):`, error)
      return false
    }
  }

  async getCalendarDayVideosByDateAndZipCode(
    date: string,
    zipcodeList: string[],
  ): Promise<NearbyVideoData[] | null> {
    const query = `
      SELECT cd.user_id, cd.user_video_url FROM calendar_day cd
      INNER JOIN users u ON cd.user_id = u.user_id
      WHERE cd.date::date = $1::date AND u.zipcode = ANY($2::text[]) AND cd.user_video_url IS NOT NULL;`
    try {
      const { rows } = await pool.query(query, [date, zipcodeList])
      return rows.map((row) => ({ userId: row.user_id, userVideoUrl: row.user_video_url }))
    } catch (error) {
      console.error('Error in getCalendarDayVideosByDateAndZipCode:', error)
      return null
    }
  }

  async createCalendarDay(calendarDay: CreateCalendarDay): Promise<CalendarDay | null> {
    const query = `INSERT INTO calendar_day (user_id, date, user_video_url) VALUES ($1, $2, $3) RETURNING calendar_id`
    try {
      const result = await pool.query(query, [
        calendarDay.userId,
        calendarDay.date,
        calendarDay.userVideoUrl,
      ])
      return result.rows.length > 0 ? this.getCalendarDayById(result.rows[0].calendar_id) : null
    } catch (error) {
      console.error('Error in createCalendarDay:', error)
      return null
    }
  }

  async getCalendarDaysByUserId(userId: string): Promise<CalendarDay[]> {
    const query = `SELECT * FROM calendar_day WHERE user_id = $1 ORDER BY date DESC`
    try {
      const { rows } = await pool.query(query, [userId])
      return rows.map((row) => ({
        calendarId: row.calendar_id,
        userId: row.user_id,
        date: moment(row.date).format('YYYY-MM-DD'),
        userVideoUrl: row.user_video_url,
        vimeoUri: row.vimeo_uri,
        processingStatus: row.processing_status,
      }))
    } catch (error) {
      console.error('Error in getCalendarDaysByUserId:', error)
      return []
    }
  }

  async getCalendarDayByUserIdAndDate(userId: string, date: string): Promise<CalendarDay | null> {
    const query = `SELECT * FROM calendar_day WHERE user_id = $1 AND date::date = $2::date`
    try {
      const { rows } = await pool.query(query, [userId, date])
      if (rows.length === 0) return null
      const row = rows[0]
      return {
        calendarId: row.calendar_id,
        userId: row.user_id,
        date: moment(row.date).format('YYYY-MM-DD'),
        userVideoUrl: row.user_video_url,
        vimeoUri: row.vimeo_uri,
        processingStatus: row.processing_status,
      }
    } catch (error) {
      console.error('Error in getCalendarDayByUserIdAndDate:', error)
      return null
    }
  }

  async deleteCalendarDay(calendarId: number): Promise<boolean> {
    const query = `DELETE FROM calendar_day WHERE calendar_id = $1`
    try {
      const result = await pool.query(query, [calendarId])
      return (result.rowCount || 0) > 0
    } catch (error) {
      console.error('Error deleting calendar day:', error)
      return false
    }
  }
}

export default CalendarDayRepository
