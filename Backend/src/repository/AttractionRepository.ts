// File: src/repository/AttractionRepository.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import pool from '../db'
import { Attraction, CreateAttractionInternalPayload } from '../types/Attraction'
import { Pool, PoolClient } from 'pg'
import * as humps from 'humps'

const mapRowToAttraction = (row: any): Attraction | null => {
  if (!row) return null
  const camelized = humps.camelizeKeys(row)
  return {
    attractionId: camelized.attractionId,
    userFrom: camelized.userFrom,
    userTo: camelized.userTo,
    date: camelized.date,
    romanticRating: camelized.romanticRating,
    sexualRating: camelized.sexualRating,
    friendshipRating: camelized.friendshipRating,
    result: camelized.result,
    firstMessageRights: camelized.firstMessageRights,
    longTermPotential: camelized.longTermPotential,
    intellectual: camelized.intellectual,
    emotional: camelized.emotional,
    createdAt: camelized.createdAt ? new Date(camelized.createdAt) : new Date(),
    updatedAt: camelized.updatedAt ? new Date(camelized.updatedAt) : new Date(),
  }
}

class AttractionRepository {
  async createAttraction(
    payload: CreateAttractionInternalPayload,
    client: PoolClient | null = null,
  ): Promise<Attraction> {
    // ✅ FIX: Return type is now guaranteed to be Attraction
    const db = client || pool
    const query = `
      INSERT INTO attractions 
        (user_from, user_to, date, romantic_rating, sexual_rating, friendship_rating, result, first_message_rights, long_term_potential, intellectual, emotional)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `
    const values = [
      payload.userFrom,
      payload.userTo,
      payload.date,
      payload.romanticRating,
      payload.sexualRating,
      payload.friendshipRating,
      payload.result,
      payload.firstMessageRights,
      payload.longTermPotential,
      payload.intellectual,
      payload.emotional,
    ]
    const { rows } = await db.query(query, values)

    // ✅ FIX: If INSERT...RETURNING * fails, the rows array will be empty.
    // We must throw a clear error instead of returning null.
    if (rows.length === 0) {
      throw new Error('Database failed to create and return the attraction record.')
    }
    // The '!' tells TypeScript that we are certain mapRowToAttraction will not return null here.
    return mapRowToAttraction(rows[0])!
  }

  async getAttraction(
    userFrom: string,
    userTo: string,
    date: string,
    client: PoolClient | null = null,
  ): Promise<Attraction | null> {
    const db = client || pool
    const query = `SELECT * FROM attractions WHERE user_from = $1 AND user_to = $2 AND date = $3;`
    const { rows } = await db.query(query, [userFrom, userTo, date])
    return rows.length > 0 ? mapRowToAttraction(rows[0]) : null
  }

  async updateAttraction(
    attractionId: number,
    updates: Partial<Attraction>,
    client: PoolClient | null = null,
  ): Promise<Attraction> {
    // ✅ FIX: Return type is now guaranteed to be Attraction
    const db = client || pool
    const fieldsToUpdate: string[] = []
    const values: any[] = []
    let queryIndex = 1

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && key !== 'attractionId' && key !== 'createdAt') {
        fieldsToUpdate.push(`${humps.decamelize(key)} = $${queryIndex}`)
        values.push(value)
        queryIndex++
      }
    }

    // If there's nothing to update, just fetch and return the current state.
    if (fieldsToUpdate.length === 0) {
      const existingAttraction = await this.getAttractionById(attractionId, db)
      if (!existingAttraction) {
        throw new Error(
          `Attraction with ID ${attractionId} not found, cannot perform an empty update.`,
        )
      }
      return existingAttraction
    }

    fieldsToUpdate.push(`updated_at = NOW()`)
    values.push(attractionId)

    const query = `UPDATE attractions SET ${fieldsToUpdate.join(
      ', ',
    )} WHERE attraction_id = $${queryIndex} RETURNING *;`
    const { rows } = await db.query(query, values)

    // ✅ FIX: If the UPDATE fails to find the row, it will return nothing.
    // Throw an error so the calling service knows the update failed.
    if (rows.length === 0) {
      throw new Error(
        `Database failed to update attraction with ID ${attractionId}. It might not exist.`,
      )
    }
    return mapRowToAttraction(rows[0])!
  }

  async getAttractionById(
    attractionId: number,
    db: PoolClient | Pool | null = null,
  ): Promise<Attraction | null> {
    const queryRunner = db || pool
    const query = `SELECT * FROM attractions WHERE attraction_id = $1;`
    const { rows } = await queryRunner.query(query, [attractionId])
    return rows.length > 0 ? mapRowToAttraction(rows[0]) : null
  }

  async getAttractionsByUserFrom(userFrom: string): Promise<Attraction[]> {
    const query = `SELECT * FROM attractions WHERE user_from = $1 ORDER BY date DESC;`
    const { rows } = await pool.query(query, [userFrom])
    return rows.map(mapRowToAttraction).filter((a): a is Attraction => a !== null)
  }

  async getAttractionsByUserTo(userTo: string): Promise<Attraction[]> {
    const query = `SELECT * FROM attractions WHERE user_to = $1 ORDER BY date DESC;`
    const { rows } = await pool.query(query, [userTo])
    return rows.map(mapRowToAttraction).filter((a): a is Attraction => a !== null)
  }

  async getAttractionsByUserFromAndUserTo(userFrom: string, userTo: string): Promise<Attraction[]> {
    const query = `SELECT * FROM attractions WHERE user_from = $1 AND user_to = $2 ORDER BY date DESC;`
    const { rows } = await pool.query(query, [userFrom, userTo])
    return rows.map(mapRowToAttraction).filter((a): a is Attraction => a !== null)
  }
}

export default AttractionRepository
