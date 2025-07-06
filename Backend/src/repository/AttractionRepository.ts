// File: src/repository/AttractionRepository.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

import pool from '../db'
import { Attraction, CreateAttractionInternalPayload } from '../types/Attraction'
import { Pool, PoolClient } from 'pg' // Import both Pool and PoolClient
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
  ): Promise<Attraction | null> {
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
    return rows.length > 0 ? mapRowToAttraction(rows[0]) : null
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
  ): Promise<Attraction | null> {
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

    if (fieldsToUpdate.length === 0) {
      return this.getAttractionById(attractionId, db)
    }

    fieldsToUpdate.push(`updated_at = NOW()`)
    values.push(attractionId)

    const query = `UPDATE attractions SET ${fieldsToUpdate.join(
      ', ',
    )} WHERE attraction_id = $${queryIndex} RETURNING *;`
    const { rows } = await db.query(query, values)
    return rows.length > 0 ? mapRowToAttraction(rows[0]) : null
  }

  // ✅ --- THIS IS THE FIX ---
  // The type of the 'db' parameter has been corrected to accept either a PoolClient or a Pool.
  async getAttractionById(
    attractionId: number,
    db: PoolClient | Pool | null = null,
  ): Promise<Attraction | null> {
    const queryRunner = db || pool
    const query = `SELECT * FROM attractions WHERE attraction_id = $1;`
    const { rows } = await queryRunner.query(query, [attractionId])
    return rows.length > 0 ? mapRowToAttraction(rows[0]) : null
  }

  // --- No changes to the functions below ---
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
