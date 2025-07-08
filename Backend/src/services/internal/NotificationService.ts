// File: src/services/internal/NotificationService.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

import * as admin from 'firebase-admin'
import { Pool, QueryResult } from 'pg'
import pool from '../../db'
import * as path from 'path'

const serviceAccountPath = path.join(__dirname, '..', '..', 'firebase-service-account-key.json')
const serviceAccount = require(serviceAccountPath)

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
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
      console.log('[NotificationService] Firebase Admin SDK initialized.')
    }
    this.db = pool
  }

  private async createDbNotification(
    userId: string,
    message: string,
    type: string,
    relatedEntityId: string | number | null,
  ) {
    try {
      const query = `INSERT INTO notifications (user_id, message, type, status, related_entity_id) VALUES ($1, $2, $3, 'unread', $4);`
      // Ensure relatedEntityId is a string for the database
      await this.db.query(query, [
        userId,
        message,
        type,
        relatedEntityId ? String(relatedEntityId) : null,
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

    await this.createDbNotification(receiverUserId, body, type, dateDetails.dateId)

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

    // Notification for the person who initiated the match
    const messageToUserFrom = `It's a Match with ${toName}! 💖`
    await this.createDbNotification(userFromId, messageToUserFrom, 'MATCH', userToId)
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

    // Notification for the other person
    const messageToUserTo = `It's a Match with ${fromName}! 💖`
    await this.createDbNotification(userToId, messageToUserTo, 'MATCH', userFromId)
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

  async sendDateUpdateNotification(
    updaterUserId: string,
    receiverUserId: string,
    dateId: number,
    updateDetails: { venue?: string },
  ) {
    const updaterProfile = await this.getUserProfile(updaterUserId)
    if (!updaterProfile) return

    const updaterName = `${updaterProfile.firstName || ''}`.trim() || 'Someone'
    const body = `${updaterName} has updated the details for your upcoming date.`
    const type = 'DATE_UPDATE'

    await this.createDbNotification(receiverUserId, body, type, dateId)

    const token = await this.getFcmToken(receiverUserId)
    if (token) {
      await this.sendFcmNotification(
        token,
        'Date Details Updated!',
        body,
        updaterProfile.profilePictureUrl,
        { type, dateId: String(dateId) },
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
    const type = `DATE_${responseType === 'ACCEPTED' ? 'APPROVED' : 'DECLINED'}` // Use APPROVED/DECLINED for consistency

    await this.createDbNotification(receiverUserId, body, type, dateId)

    const token = await this.getFcmToken(receiverUserId)
    if (token) {
      await this.sendFcmNotification(token, title, body, responderProfile.profilePictureUrl, {
        type,
        dateId: String(dateId),
      })
    }
  }
}

// ✅ --- THIS IS THE FIX ---
// Export the class definition itself, not an instance of it.
// This makes it "constructable" and allows `new NotificationService()` to work in other files.
export default NotificationService
