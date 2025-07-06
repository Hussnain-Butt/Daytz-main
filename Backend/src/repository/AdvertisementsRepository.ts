import pool from '../db'
import { Advertisement } from '../types/Advertisement'

class AdvertisementsRepository {
  async createAdvertisement(advertisement: Advertisement): Promise<void> {
    const query = `INSERT INTO advertisements (video_url, metadata) VALUES ($1, $2)`
    const values = [advertisement.videoUrl, JSON.stringify(advertisement.metadata)]
    await pool.query(query, values)
  }

  async getAdvertisementById(adId: number): Promise<Advertisement | null> {
    const query = `SELECT * FROM advertisements WHERE ad_id = $1`
    const { rows } = await pool.query(query, [adId])
    if (rows.length) {
      const row = rows[0]
      return {
        adId: row.ad_id,
        videoUrl: row.video_url,
        metadata: row.metadata, // Assuming metadata is stored as JSON and automatically parsed by your DB driver
      }
    } else {
      return null
    }
  }

  async getAllAdvertisements(): Promise<Advertisement[]> {
    const query = `SELECT * FROM advertisements ORDER BY ad_id ASC`
    const { rows } = await pool.query(query)
    return rows.map((row) => ({
      adId: row.ad_id,
      videoUrl: row.video_url,
      metadata: row.metadata,
    }))
  }

  async updateAdvertisement(adId: number, advertisement: Partial<Advertisement>): Promise<void> {
    // Dynamically build query based on provided fields to update
    const fieldsToUpdate: string[] = []
    const values = []
    let queryIndex = 1

    Object.entries(advertisement).forEach(([key, value]) => {
      if (value !== undefined) {
        fieldsToUpdate.push(`${key} = $${queryIndex}`)
        values.push(value)
        queryIndex++
      }
    })

    values.push(adId) // For WHERE condition
    const query = `UPDATE advertisements SET ${fieldsToUpdate.join(
      ', ',
    )} WHERE ad_id = $${queryIndex}`
    await pool.query(query, values)
  }

  async deleteAdvertisement(adId: number): Promise<void> {
    const query = `DELETE FROM advertisements WHERE ad_id = $1`
    await pool.query(query, [adId])
  }
}

export default AdvertisementsRepository
