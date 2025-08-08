// File: src/handlers/videoHandlers.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

import { Request, Response } from 'express'
import VimeoService from '../services/external/VimeoService' // Adjust path if necessary
import pool from '../db' // Assuming your pg Pool is exported from here

const vimeoService = new VimeoService()

/**
 * Fetches the Vimeo URI associated with a given calendarId from the database
 * using a direct SQL query. This function is kept for completeness.
 */
async function getVimeoUriFromCalendarId(calendarId: number): Promise<string | null> {
  console.log(`[VideoHandler-DB] Attempting to fetch vimeoUri for calendar_id: ${calendarId}`)
  const queryText = 'SELECT vimeo_uri FROM calendar_day WHERE calendar_id = $1'
  try {
    const result = await pool.query(queryText, [calendarId])
    if (result.rows.length > 0 && result.rows[0].vimeo_uri) {
      console.log(
        `[VideoHandler-DB] Found vimeo_uri: '${result.rows[0].vimeo_uri}' for calendar_id: ${calendarId}`,
      )
      return result.rows[0].vimeo_uri
    }
    console.warn(`[VideoHandler-DB] No entry or vimeo_uri found for calendar_id: ${calendarId}`)
    return null
  } catch (dbError: any) {
    console.error(
      `[VideoHandler-DB] Database error fetching vimeo_uri for calendar_id ${calendarId}:`,
      dbError.message,
    )
    throw dbError
  }
}

export const getVideoPlayableUrlHandler = async (req: Request, res: Response) => {
  const { uri, calendarId: calendarIdStr } = req.query

  let videoIdentifier: string | null = null
  let identifierSource: 'uri' | 'calendarId' | null = null

  // --- THIS IS THE CORRECTED LOGIC BLOCK ---
  // 1. Try to process the 'uri' parameter first.
  if (uri && typeof uri === 'string') {
    // A. Check if the URI is already in the correct format (e.g., "videos/12345").
    if (uri.startsWith('videos/')) {
      videoIdentifier = uri
      identifierSource = 'uri'
      console.log(`[VideoHandler] Using 'uri' parameter directly: ${videoIdentifier}`)
    }
    // B. NEW: If it's a full URL, parse it to get the correct identifier.
    else if (uri.includes('vimeo.com')) {
      // This regex extracts the numerical video ID from a full Vimeo URL.
      const match = uri.match(/vimeo\.com\/(\d+)/)
      if (match && match[1]) {
        videoIdentifier = `videos/${match[1]}`
        identifierSource = 'uri'
        console.log(
          `[VideoHandler] Extracted identifier '${videoIdentifier}' from full URL: ${uri}`,
        )
      } else {
        console.warn(`[VideoHandler] Could not parse a video ID from the Vimeo URL: ${uri}`)
      }
    } else {
      console.warn(`[VideoHandler] 'uri' parameter ('${uri}') is not a recognized format.`)
    }
  }

  // 2. If 'uri' did not yield an identifier, try 'calendarId'.
  if (
    !videoIdentifier &&
    calendarIdStr &&
    typeof calendarIdStr === 'string' &&
    /^\d+$/.test(calendarIdStr)
  ) {
    console.log(`[VideoHandler] 'uri' not used, attempting 'calendarId': ${calendarIdStr}`)
    try {
      const parsedCalendarId = parseInt(calendarIdStr, 10)
      const vimeoUriFromDb = await getVimeoUriFromCalendarId(parsedCalendarId)

      if (vimeoUriFromDb) {
        videoIdentifier = vimeoUriFromDb.trim()
        identifierSource = 'calendarId'
        console.log(
          `[VideoHandler] Resolved calendarId ${parsedCalendarId} to vimeoUri: '${videoIdentifier}'`,
        )
      } else {
        return res
          .status(404)
          .json({ message: `Video not associated with calendarId: ${parsedCalendarId}.` })
      }
    } catch (dbError: any) {
      return res.status(500).json({ message: 'Server error while resolving video by calendar ID.' })
    }
  }

  // 3. If we still don't have an identifier, return an error.
  if (!videoIdentifier) {
    console.error(
      `[VideoHandler] Could not determine a valid video identifier. URI: '${uri}', CalendarID: '${calendarIdStr}'`,
    )
    return res.status(400).json({ message: 'A valid video identifier is required.' })
  }

  // 4. Fetch the playable URL from the Vimeo service.
  console.log(
    `[VideoHandler] Requesting playable URL from VimeoService for identifier: '${videoIdentifier}'`,
  )
  try {
    const playableUrl = await vimeoService.getFreshPlayableUrl(videoIdentifier)
    if (playableUrl) {
      console.log(`[VideoHandler] Playable URL found by VimeoService.`)
      return res.json({ playableUrl })
    } else {
      console.warn(`[VideoHandler] Playable URL not found for identifier: '${videoIdentifier}'.`)
      return res
        .status(404)
        .json({ message: 'Playable URL not found. The video may be private or still processing.' })
    }
  } catch (error: any) {
    console.error(`[VideoHandler] Error from VimeoService for '${videoIdentifier}':`, error.message)
    return res
      .status(500)
      .json({ message: 'Server error fetching playable URL.', error: error.message })
  }
}
