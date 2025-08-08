import pool from '../db'
import { Tutorial } from '../types/Tutorial'

class TutorialsRepository {
  async createTutorial(tutorial: Tutorial): Promise<void> {
    const query = `INSERT INTO tutorials (video_url, description) VALUES ($1, $2)`
    const values = [tutorial.videoUrl, tutorial.description]
    await pool.query(query, values)
  }

  async getTutorialById(tutorialId: number): Promise<Tutorial | null> {
    const query = `SELECT * FROM tutorials WHERE tutorial_id = $1`
    const { rows } = await pool.query(query, [tutorialId])
    if (rows.length) {
      const row = rows[0]
      return {
        tutorialId: row.tutorial_id,
        videoUrl: row.video_url,
        description: row.description,
      }
    } else {
      return null
    }
  }

  async getAllTutorials(): Promise<Tutorial[]> {
    const query = `SELECT * FROM tutorials ORDER BY tutorial_id ASC`
    const { rows } = await pool.query(query)
    return rows.map((row) => ({
      tutorialId: row.tutorial_id,
      videoUrl: row.video_url,
      description: row.description,
    }))
  }

  async updateTutorial(tutorialId: number, tutorial: Partial<Tutorial>): Promise<void> {
    // Dynamically build query based on provided fields to update
    const fieldsToUpdate: string[] = []
    const values = []
    let queryIndex = 1

    Object.entries(tutorial).forEach(([key, value]) => {
      if (value !== undefined) {
        fieldsToUpdate.push(`${key} = $${queryIndex}`)
        values.push(value)
        queryIndex++
      }
    })

    values.push(tutorialId) // For WHERE condition
    const query = `UPDATE tutorials SET ${fieldsToUpdate.join(
      ', ',
    )} WHERE tutorial_id = $${queryIndex}`
    await pool.query(query, values)
  }

  async deleteTutorial(tutorialId: number): Promise<void> {
    const query = `DELETE FROM tutorials WHERE tutorial_id = $1`
    await pool.query(query, [tutorialId])
  }
}

export default TutorialsRepository
