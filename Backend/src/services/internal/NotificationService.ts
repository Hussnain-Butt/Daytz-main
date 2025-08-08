// File: src/services/internal/NotificationService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import * as admin from 'firebase-admin'
import { Pool, PoolClient, QueryResult } from 'pg'
import pool from '../../db'
import { Attraction } from '../../types/Attraction'
import { format as formatDate } from 'date-fns' // ✅ date-fns library ko import karein

// --- Firebase Initialization Logic ---
// This ensures Firebase Admin is initialized only once.
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

// --- Type Interfaces ---

interface SenderProfileInfo {
  userId: string
  firstName: string | null
  lastName: string | null
  profilePictureUrl?: string | null
  videoUrl?: string | null
}

// --- Service Class ---

class NotificationService {
  // --- Private Helper Methods (Database Interactions) ---

  private async createDbNotification(
    userId: string,
    message: string,
    type: string,
    relatedEntityId: string | number | null,
    proposingUserId: string | null = null,
    client: PoolClient | null = null,
  ) {
    const db = client || pool
    try {
      const query = `
        INSERT INTO notifications (user_id, message, type, status, related_entity_id, proposing_user_id) 
        VALUES ($1, $2, $3, 'unread', $4, $5);
      `
      await db.query(query, [
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

  private async getUserProfile(
    userId: string,
    client: PoolClient | null = null,
  ): Promise<SenderProfileInfo | null> {
    const db = client || pool
    const query = `SELECT user_id, first_name, last_name, profile_picture_url FROM users WHERE user_id = $1;`
    const result: QueryResult<SenderProfileInfo> = await db.query(query, [userId])
    return result.rows.length > 0 ? result.rows[0] : null
  }

  private async getFcmToken(
    userId: string,
    client: PoolClient | null = null,
  ): Promise<string | null> {
    const db = client || pool
    const result = await db.query('SELECT fcm_token FROM users WHERE user_id = $1', [userId])
    return result.rows[0]?.fcm_token || null
  }

  // --- Private Helper Method (FCM Push Notification) ---
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

  // --- Public Methods ---

  async sendAttractionProposalNotification(
    senderUserId: string,
    receiverUserId: string,
    storyDate: string, // Example: "2023-08-01"
    client: PoolClient | null = null,
  ) {
    const senderProfile = await this.getUserProfile(senderUserId, client)
    if (!senderProfile) return

    // ✅ BADLAV YAHAN SE SHURU HAI
    // Date ko user-friendly format mein badlein (e.g., "2023-08-01" -> "August 1st")
    const formattedDate = formatDate(new Date(storyDate), 'MMMM do')

    // Naya title aur body text banayein
    const title = `Interest for your ${formattedDate} story`
    const body = `Someone wants to meet you on ${formattedDate}. Did you see anyone on that date you want to meet?`
    const type = 'ATTRACTION_PROPOSAL'

    // Database mein naya message save karein
    await this.createDbNotification(receiverUserId, body, type, storyDate, senderUserId, client)

    const token = await this.getFcmToken(receiverUserId, client)
    if (token) {
      // Push notification mein naya title aur body bhejein
      await this.sendFcmNotification(
        token,
        title, // Naya title
        body, // Naya body
        senderProfile.profilePictureUrl,
        { type, storyDate: storyDate, senderUserId: senderUserId }, // Data payload wahi rahega
      )
    }
    // ✅ BADLAV YAHAN KHATAM HAI
  }

  async sendNewMatchProposalNotification(
    attraction1: Attraction,
    attraction2: Attraction,
    client: PoolClient | null = null,
  ) {
    const score1 =
      (attraction1.romanticRating || 0) +
      (attraction1.sexualRating || 0) +
      (attraction1.friendshipRating || 0)
    const score2 =
      (attraction2.romanticRating || 0) +
      (attraction2.sexualRating || 0) +
      (attraction2.friendshipRating || 0)

    let recipientId: string, senderId: string
    if (score1 < score2) {
      recipientId = attraction1.userFrom!
      senderId = attraction2.userFrom!
    } else if (score2 < score1) {
      recipientId = attraction2.userFrom!
      senderId = attraction1.userFrom!
    } else {
      recipientId = Math.random() < 0.5 ? attraction1.userFrom! : attraction2.userFrom!
      senderId =
        recipientId === attraction1.userFrom ? attraction2.userFrom! : attraction1.userFrom!
    }

    const senderProfile = await this.getUserProfile(senderId, client)
    if (!senderProfile) {
      console.error(`[Notification] Could not find profile for sender ${senderId}. Aborting.`)
      return
    }

    const title = 'It’s a Match! 🎉'
    const body = 'They feel the same. Does their Plan work for you to meet in real life?'
    const type = 'MATCH_PROPOSAL'

    const formattedDate = formatDate(new Date(attraction1.date!), 'yyyy-MM-dd')

    await this.createDbNotification(recipientId, body, type, formattedDate, senderId, client)

    const token = await this.getFcmToken(recipientId, client)
    if (token) {
      await this.sendFcmNotification(token, title, body, senderProfile.profilePictureUrl, {
        type: type,
        dateForProposal: formattedDate,
        userToId: senderId,
      })
    }
    console.log(
      `[Notification] Sent MATCH_PROPOSAL to ${recipientId} for story date ${formattedDate}.`,
    )
  }

  // --- Baaki sabhi notification functions (inmein koi badlav nahi hai) ---

  async sendDateProposalNotification(
    senderUserId: string,
    receiverUserId: string,
    dateDetails: { dateId: number; date: string; time: string; venue: string },
    client: PoolClient | null = null,
  ) {
    const senderProfile = await this.getUserProfile(senderUserId, client)
    if (!senderProfile) return

    const senderName = `${senderProfile.firstName || 'Someone'}`.trim()
    const body = `${senderName} proposed a date at ${dateDetails.venue}. Tap to see details!`
    const type = 'DATE_PROPOSAL'

    await this.createDbNotification(
      receiverUserId,
      body,
      type,
      dateDetails.dateId,
      senderUserId,
      client,
    )

    const token = await this.getFcmToken(receiverUserId, client)
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

  async sendDateResponseNotification(
    responderUserId: string,
    receiverUserId: string,
    responseType: 'ACCEPTED' | 'DECLINED',
    dateId: number,
    client: PoolClient | null = null,
  ) {
    const responderProfile = await this.getUserProfile(responderUserId, client)
    if (!responderProfile) return

    const responderName = `${responderProfile.firstName || 'Someone'}`.trim()
    const actionText = responseType === 'ACCEPTED' ? 'accepted' : 'declined'
    const title = responseType === 'ACCEPTED' ? 'Date Accepted! ✅' : 'Date Update'
    const body = `${responderName} has ${actionText} your date proposal.`
    const type = `DATE_${responseType === 'ACCEPTED' ? 'APPROVED' : 'DECLINED'}`

    await this.createDbNotification(receiverUserId, body, type, dateId, responderUserId, client)
    const token = await this.getFcmToken(receiverUserId, client)
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
    client: PoolClient | null = null,
  ) {
    const updaterProfile = await this.getUserProfile(updaterUserId, client)
    if (!updaterProfile) return

    const updaterName = `${updaterProfile.firstName || 'Someone'}`.trim()
    const body = `${updaterName} has rescheduled your date. Tap to see the new details.`
    const type = 'DATE_RESCHEDULED'

    await this.createDbNotification(receiverUserId, body, type, dateId, updaterUserId, client)
    const token = await this.getFcmToken(receiverUserId, client)
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
    client: PoolClient | null = null,
  ) {
    const cancellerProfile = await this.getUserProfile(cancellerUserId, client)
    if (!cancellerProfile) return

    const cancellerName = `${cancellerProfile.firstName || 'Someone'}`.trim()
    const body = `${cancellerName} has cancelled your upcoming date.`
    const type = 'DATE_CANCELLED'

    await this.createDbNotification(receiverUserId, body, type, dateId, cancellerUserId, client)
    const token = await this.getFcmToken(receiverUserId, client)
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
