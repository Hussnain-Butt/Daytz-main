// File: src/handlers/notificationHandlers.ts
// ✅ COMPLETE AND FINAL CODE (NO CHANGES NEEDED)

import { Response } from 'express'
import { asyncHandler, CustomRequest } from '../middleware'
import pool from '../db'

// Handler to get all notifications for the authenticated user
export const getMyNotificationsHandler = asyncHandler(async (req: CustomRequest, res: Response) => {
  const userId = req.userId
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const query = `
      SELECT 
        notification_id, 
        user_id,
        message, 
        type, 
        status, 
        related_entity_id, 
        created_at,
        proposing_user_id -- Yeh column ab select ho raha hai
      FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC;
    `
    const { rows } = await pool.query(query, [userId])
    res.status(200).json(rows)
  } catch (error) {
    console.error(
      `[getMyNotificationsHandler] Error fetching notifications for user ${userId}:`,
      error,
    )
    res.status(500).json({ message: 'Failed to retrieve notifications.' })
  }
})

// Handler to mark notifications as read
export const markNotificationsAsReadHandler = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized' })

    try {
      const query = `
        UPDATE notifications 
        SET status = 'read' 
        WHERE user_id = $1 AND status = 'unread';
      `
      await pool.query(query, [userId])
      res.status(200).json({ message: 'All notifications marked as read.' })
    } catch (error) {
      console.error(`[markNotificationsAsReadHandler] Error for user ${userId}:`, error)
      res.status(500).json({ message: 'Failed to update notifications.' })
    }
  },
)

// Handler to get the count of unread notifications for the authenticated user
export const getUnreadNotificationsCountHandler = asyncHandler(
  async (req: CustomRequest, res: Response) => {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    try {
      const query = `
        SELECT COUNT(*) AS unread_count 
        FROM notifications 
        WHERE user_id = $1 AND status = 'unread';
      `
      const { rows } = await pool.query(query, [userId])
      const unreadCount = parseInt(rows[0]?.unread_count || '0', 10)
      res.status(200).json({ unreadCount })
    } catch (error) {
      console.error(
        `[getUnreadNotificationsCountHandler] Error fetching unread count for user ${userId}:`,
        error,
      )
      res.status(500).json({ message: 'Failed to retrieve unread notification count.' })
    }
  },
)
