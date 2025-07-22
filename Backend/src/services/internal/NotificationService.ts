// File: src/services/internal/NotificationService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import * as admin from 'firebase-admin'
import { Pool, QueryResult } from 'pg'
import pool from '../../db'

// --- Firebase Initialization Logic ---
if (!admin.apps.length) {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!serviceAccountString) {
    console.error(
      '[Firebase Admin] FATAL ERROR: The FIREBASE_SERVICE_ACCOUNT environment variable is not set.',
    )
    throw new Error(
      'Firebase service account credentials are not available in environment variables.',
    )
  }
  try {
    const serviceAccount = JSON.parse(serviceAccountString)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
    console.log(
      '[NotificationService] Firebase Admin SDK initialized successfully from environment variable.',
    )
  } catch (error) {
    console.error(
      '[Firebase Admin] FATAL ERROR: Failed to parse or use FIREBASE_SERVICE_ACCOUNT. Check if the variable contains valid JSON.',
      error,
    )
    throw new Error('Failed to initialize Firebase Admin SDK.')
  }
}

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
    this.db = pool
  }

  // ✅✅✅ FIX: Function updated to save proposing_user_id ✅✅✅
  private async createDbNotification(
    userId: string, // Jise notification mil raha hai
    message: string,
    type: string,
    relatedEntityId: string | number | null,
    proposingUserId: string | null = null, // Jo notification bhej raha hai
  ) {
    try {
      const query = `
        INSERT INTO notifications (user_id, message, type, status, related_entity_id, proposing_user_id) 
        VALUES ($1, $2, $3, 'unread', $4, $5);
      `
      await this.db.query(query, [
        userId,
        message,
        type,
        relatedEntityId ? String(relatedEntityId) : null,
        proposingUserId,
      ])
    } catch (error) {
      console.error(`[DB Notification] Failed to store notification for user ${userId}:`, error)
    }
  }

  private async getUserProfile(userId: string): Promise<SenderProfileInfo | null> {
    const query = `SELECT user_id, first_name, last_name, profile_picture_url FROM users WHERE user_id = $1;`
    const result: QueryResult<SenderProfileInfo> = await this.db.query(query, [userId])
    return result.rows.length > 0 ? result.rows[0] : null
  }

  private async getFcmToken(userId: string): Promise<string | null> {
    const result = await this.db.query('SELECT fcm_token FROM users WHERE user_id = $1', [userId])
    return result.rows[0]?.fcm_token || null
  }

  private async sendFcmNotification(
    token: string,
    title: string,
    body: string,
    imageUrl?: string | null,
    data?: { [key: string]: string },
  ) {
    if (!token) {
      console.log(`[FCM] No token found for notification: "${title}". Skipping send.`)
      return
    }
    const finalImageUrl = imageUrl || undefined
    const messagePayload: admin.messaging.Message = {
      token,
      notification: { title, body, imageUrl: finalImageUrl },
      data,
      android: { notification: { imageUrl: finalImageUrl } },
      apns: { payload: { aps: { 'mutable-content': 1 } }, fcmOptions: { imageUrl: finalImageUrl } },
    }
    try {
      await admin.messaging().send(messagePayload)
      console.log(`[FCM] Notification "${title}" sent successfully.`)
    } catch (error) {
      console.error(`[FCM] Error sending notification "${title}":`, error)
    }
  }

  async sendAttractionProposalNotification(
    senderUserId: string,
    receiverUserId: string,
    storyDate: string,
  ) {
    const senderProfile = await this.getUserProfile(senderUserId)
    if (!senderProfile) return

    const senderName = `${senderProfile.firstName || 'Someone'}`.trim()
    const body = `${senderName} is interested in your story! Tap to see who.`
    const type = 'ATTRACTION_PROPOSAL'

    // ✅✅✅ FIX: createDbNotification ko sender ki ID bhi pass karein ✅✅✅
    await this.createDbNotification(receiverUserId, body, type, storyDate, senderUserId)

    const token = await this.getFcmToken(receiverUserId)
    if (token) {
      await this.sendFcmNotification(
        token,
        "Someone's interested! 👀",
        body,
        senderProfile.profilePictureUrl,
        {
          type,
          storyDate: storyDate,
          senderUserId: senderUserId, // Sender ki ID
        },
      )
    }
  }

  async sendDateProposalNotification(
    senderUserId: string,
    receiverUserId: string,
    dateDetails: { dateId: number; date: string; time: string; venue: string },
    attractionRatings: AttractionRatings | null,
  ) {
    const senderProfile = await this.getUserProfile(senderUserId)
    if (!senderProfile) return

    const senderName =
      `${senderProfile.firstName || ''} ${senderProfile.lastName || ''}`.trim() || 'Someone'
    const body = `${senderName} proposed a date at ${dateDetails.venue}. Tap to see details!`
    const type = 'DATE_PROPOSAL'

    await this.createDbNotification(receiverUserId, body, type, dateDetails.dateId, senderUserId)

    const token = await this.getFcmToken(receiverUserId)
    if (token) {
      await this.sendFcmNotification(
        token,
        'New Date Proposal! ✨',
        body,
        senderProfile.profilePictureUrl,
        { type, dateId: String(dateDetails.dateId) },
      )
    }
  }

  async sendMatchNotification(userFromId: string, userToId: string, attractionId: number) {
    const [userFromProfile, userToProfile] = await Promise.all([
      this.getUserProfile(userFromId),
      this.getUserProfile(userToId),
    ])
    if (!userFromProfile || !userToProfile) return

    const fromName = `${userFromProfile.firstName || ''}`.trim() || 'Someone'
    const toName = `${userToProfile.firstName || ''}`.trim() || 'Someone'

    const messageToUserFrom = `It's a Match with ${toName}! 💖`
    await this.createDbNotification(userFromId, messageToUserFrom, 'MATCH', userToId, userToId)
    const tokenFrom = await this.getFcmToken(userFromId)
    if (tokenFrom) {
      await this.sendFcmNotification(
        tokenFrom,
        'You Have a New Match!',
        messageToUserFrom,
        userToProfile.profilePictureUrl,
        { type: 'MATCH', matchedUserId: userToId },
      )
    }

    const messageToUserTo = `It's a Match with ${fromName}! 💖`
    await this.createDbNotification(userToId, messageToUserTo, 'MATCH', userFromId, userFromId)
    const tokenTo = await this.getFcmToken(userToId)
    if (tokenTo) {
      await this.sendFcmNotification(
        tokenTo,
        'You Have a New Match!',
        messageToUserTo,
        userFromProfile.profilePictureUrl,
        { type: 'MATCH', matchedUserId: userFromId },
      )
    }
  }

  async sendDateResponseNotification(
    responderUserId: string,
    receiverUserId: string,
    responseType: 'ACCEPTED' | 'DECLINED',
    dateId: number,
  ) {
    const responderProfile = await this.getUserProfile(responderUserId)
    if (!responderProfile) return

    const responderName = `${responderProfile.firstName || ''}`.trim() || 'Someone'
    const actionText = responseType === 'ACCEPTED' ? 'accepted' : 'declined'
    const title = responseType === 'ACCEPTED' ? 'Date Accepted! ✅' : 'Date Update'
    const body = `${responderName} has ${actionText} your date proposal.`
    const type = `DATE_${responseType === 'ACCEPTED' ? 'APPROVED' : 'DECLINED'}`

    await this.createDbNotification(receiverUserId, body, type, dateId, responderUserId)
    const token = await this.getFcmToken(receiverUserId)
    if (token) {
      await this.sendFcmNotification(token, title, body, responderProfile.profilePictureUrl, {
        type,
        dateId: String(dateId),
      })
    }
  }

  async sendDateRescheduledNotification(
    updaterUserId: string,
    receiverUserId: string,
    dateId: number,
  ) {
    const updaterProfile = await this.getUserProfile(updaterUserId)
    if (!updaterProfile) return

    const updaterName = `${updaterProfile.firstName || ''}`.trim() || 'Someone'
    const body = `${updaterName} has rescheduled your date. Tap to see the new details.`
    const type = 'DATE_RESCHEDULED'

    await this.createDbNotification(receiverUserId, body, type, dateId, updaterUserId)
    const token = await this.getFcmToken(receiverUserId)
    if (token) {
      await this.sendFcmNotification(
        token,
        '🗓️ Date Rescheduled',
        body,
        updaterProfile.profilePictureUrl,
        { type, dateId: String(dateId) },
      )
    }
  }

  async sendDateCancelledNotification(
    cancellerUserId: string,
    receiverUserId: string,
    dateId: number,
  ) {
    const cancellerProfile = await this.getUserProfile(cancellerUserId)
    if (!cancellerProfile) return

    const cancellerName = `${cancellerProfile.firstName || ''}`.trim() || 'Someone'
    const body = `${cancellerName} has cancelled your upcoming date.`
    const type = 'DATE_CANCELLED'

    await this.createDbNotification(receiverUserId, body, type, dateId, cancellerUserId)
    const token = await this.getFcmToken(receiverUserId)
    if (token) {
      await this.sendFcmNotification(
        token,
        '😟 Date Cancelled',
        body,
        cancellerProfile.profilePictureUrl,
        { type, dateId: String(dateId) },
      )
    }
  }
}

export default NotificationService
