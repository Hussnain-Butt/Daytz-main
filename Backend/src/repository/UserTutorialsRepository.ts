import pool from '../db'
import { UserTutorial } from '../types/UserTutorials'

class UserTutorialsRepository {
  async createUserTutorial(userTutorial: UserTutorial): Promise<void> {
    const query = `INSERT INTO user_tutorials (user_id, tutorial_id, shown) VALUES ($1, $2, $3)`
    const values = [userTutorial.userId, userTutorial.tutorialId, userTutorial.shown]
    await pool.query(query, values)
  }

  async getUserTutorialsByUserId(userId: string): Promise<UserTutorial[]> {
    const query = `SELECT * FROM user_tutorials WHERE user_id = $1`
    const { rows } = await pool.query(query, [userId])
    return rows.map((row) => {
      return {
        userTutorialId: row.user_tutorial_id,
        userId: row.user_id,
        tutorialId: row.tutorial_id,
        shown: row.shown,
      }
    })
  }

  async updateUserTutorialShown(userTutorialId: number, shown: boolean): Promise<void> {
    const query = `UPDATE user_tutorials SET shown = $2 WHERE user_tutorial_id = $1`
    await pool.query(query, [userTutorialId, shown])
  }

  async deleteUserTutorial(userTutorialId: number): Promise<void> {
    const query = `DELETE FROM user_tutorials WHERE user_tutorial_id = $1`
    await pool.query(query, [userTutorialId])
  }
}

export default UserTutorialsRepository
