// File: src/services/internal/NotificationService.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE (with typo fix)

import * as admin from 'firebase-admin'
import { Pool, QueryResult } from 'pg'
import pool from '../../db'

const serviceAccount = require('../../firebase-service-account-key.json')

interface SenderProfileInfo {
  userId: string
  firstName: string | null
  lastName: string | null
  profilePictureUrl?: string | null
  videoUrl?: string | null
}

interface AttractionRatings {
  romanticRating?: number | null
  sexualRating?: number | null
  friendshipRating?: number | null
}

class NotificationService {
  private db: Pool

  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log('[NotificationService] Firebase Admin SDK initialized successfully.')
    } else {
      console.log('[NotificationService] Firebase Admin SDK was already initialized.')
    }
    this.db = pool
  }

  private async getUserProfile(userId: string): Promise<SenderProfileInfo | null> {
    try {
      const query = `SELECT user_id, first_name, last_name, profile_picture_url, video_url FROM users WHERE user_id = $1;`
      const result: QueryResult<SenderProfileInfo> = await this.db.query(query, [userId])
      return result.rows.length > 0 ? result.rows[0] : null
    } catch (error) {
      console.error(`[NotificationService] Error fetching user profile for ${userId}:`, error)
      return null
    }
  }

  private async getFcmToken(userId: string): Promise<string | null> {
    try {
      const result = await this.db.query('SELECT fcm_token FROM users WHERE user_id = $1', [userId])
      if (result.rows.length > 0 && result.rows[0].fcm_token) {
        return result.rows[0].fcm_token
      }
      console.warn(`[NotificationService] No FCM token found for user ${userId}`)
      return null
    } catch (error) {
      console.error(`[NotificationService] Error fetching FCM token for user ${userId}:`, error)
      return null
    }
  }

  async sendDateProposalNotification(
    senderUserId: string,
    receiverUserId: string,
    dateDetails: { dateId: number; date: string; time: string; venue: string },
    attractionRatings: AttractionRatings | null,
  ) {
    console.log(
      `[NotificationService-FCM] Attempting to send date proposal from ${senderUserId} to ${receiverUserId}`,
    )
    const senderProfile = await this.getUserProfile(senderUserId)
    if (!senderProfile) {
      console.error(
        `[NotificationService-FCM] Cannot send proposal, sender profile for ${senderUserId} not found.`,
      )
      return
    }

    const receiverFcmToken = await this.getFcmToken(receiverUserId)
    if (!receiverFcmToken) {
      console.warn(
        `[NotificationService-FCM] No FCM token for receiver ${receiverUserId}. Notification not sent.`,
      )
      return
    }

    const senderDisplayName =
      `${senderProfile.firstName || ''} ${senderProfile.lastName || ''}`.trim() || 'Someone'

    const messagePayload: admin.messaging.Message = {
      token: receiverFcmToken,
      notification: {
        title: 'New Date Proposal! ✨',
        body: `${senderDisplayName} has proposed a date. Tap to see the details!`,
        imageUrl: senderProfile.profilePictureUrl || undefined,
      },
      data: {
        type: 'DATE_PROPOSAL',
        dateId: String(dateDetails.dateId),
        senderId: senderUserId,
        senderName: senderDisplayName,
        senderProfilePic: senderProfile.profilePictureUrl || '',
      },
      android: {
        notification: {
          imageUrl: senderProfile.profilePictureUrl || undefined,
        },
      },
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
          },
        },
        fcmOptions: {
          // ✅ --- THIS IS THE FIX ---
          // 'image' has been corrected to 'imageUrl'.
          imageUrl: senderProfile.profilePictureUrl || undefined,
        },
      },
    }

    try {
      const response = await admin.messaging().send(messagePayload)
      console.log(
        `[NotificationService-FCM] Date proposal notification sent successfully to ${receiverUserId}:`,
        response,
      )
    } catch (error) {
      console.error('[NotificationService-FCM] Error sending date proposal notification:', error)
    }
  }

  // Other functions remain as stubs
  async sendMatchNotification(userFromId: string, userToId: string) {
    console.log(
      `[NotificationService-FCM-Stub] Match notification for ${userFromId} and ${userToId} would be sent here.`,
    )
  }

  async sendDateUpdateNotification(
    updaterUserId: string,
    receiverUserId: string,
    dateId: number,
    updateDetails: object,
  ) {
    console.log(
      `[NotificationService-FCM-Stub] Date update notification for dateId ${dateId} would be sent here.`,
    )
  }

  async sendDateResponseNotification(
    responderUserId: string,
    receiverUserId: string,
    responseType: 'ACCEPTED' | 'DECLINED',
    dateId: number,
  ) {
    console.log(
      `[NotificationService-FCM-Stub] Date response (${responseType}) for dateId ${dateId} would be sent here.`,
    )
  }
}

export default NotificationService
