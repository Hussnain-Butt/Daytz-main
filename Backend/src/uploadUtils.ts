// File: src/uploadUtils.ts

import { Request, Response, NextFunction } from 'express'
import multer, { FileFilterCallback } from 'multer'
import fsSync from 'fs' // For synchronous operations like existsSync, mkdirSync
import fs from 'fs/promises' // For asynchronous operations like readFile, unlink
import path from 'path'

import VimeoService from './services/external/VimeoService'
import AwsService from './services/external/AwsService' // Ensure this service is correctly implemented
import CalendarDayRepository from './repository/CalendarDayRepository'
import { UpdateCalendarDay } from './types/CalendarDay' // Assumes this type has vimeoUri, userVideoUrl, processingStatus
import { User } from './types/User'

const vimeoService = new VimeoService()
const awsService = new AwsService() // Make sure this is initialized with AWS config
const calendarDayRepository = new CalendarDayRepository()

const TMP_UPLOAD_DIR = path.resolve(__dirname, '..', 'tmp_uploads')

// Ensure temp directory exists on startup
if (!fsSync.existsSync(TMP_UPLOAD_DIR)) {
  try {
    fsSync.mkdirSync(TMP_UPLOAD_DIR, { recursive: true })
    console.log(`[UploadUtils] Created temp upload directory: ${TMP_UPLOAD_DIR}`)
  } catch (mkdirErr) {
    console.error(
      `[UploadUtils] FATAL: Failed to create temp upload directory ${TMP_UPLOAD_DIR}:`,
      mkdirErr,
    )
    // Consider exiting the process if this fails, as uploads will not work
    // process.exit(1);
  }
} else {
  console.log(`[UploadUtils] Temp upload directory already exists: ${TMP_UPLOAD_DIR}`)
}

const storage = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb) {
    cb(null, TMP_UPLOAD_DIR)
  },
  filename: function (req: Request, file: Express.Multer.File, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  },
})

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  console.log(
    `[UploadUtils] Multer fileFilter: Processing field '${file.fieldname}', originalname '${file.originalname}', mimetype '${file.mimetype}'`,
  )

  // Check fieldname and mimetype
  if (file.fieldname === 'image' && file.mimetype.startsWith('image/')) {
    console.log(`[UploadUtils] Multer fileFilter: Allowing image file '${file.originalname}'.`)
    cb(null, true)
  } else if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
    console.log(`[UploadUtils] Multer fileFilter: Allowing video file '${file.originalname}'.`)
    cb(null, true)
  } else {
    console.warn(
      `[UploadUtils] Multer fileFilter: Rejecting file '${file.originalname}' (fieldname: ${file.fieldname}, mimetype: ${file.mimetype}). Invalid type or fieldname.`,
    )
    const err = new Error(
      'Invalid file type or fieldname. Please upload an image for "image" fields or a video for "video" fields.',
    ) as any
    err.code = 'INVALID_FILE_TYPE_OR_FIELDNAME' // Custom code
    cb(err) // Reject file
  }
}

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // Example: 100MB limit for videos (adjust as needed)
    // files: 1 // Example: Only 1 file per request for these handlers
  },
})

export const handleMulterError = (err: any, next: NextFunction) => {
  console.error('[UploadUtils] Handling Multer/Upload Error:', err.message, err.code, err.field)
  if (err instanceof multer.MulterError) {
    const clientError = new Error(
      `File upload error: ${err.message}.` + (err.field ? ` (Field: ${err.field})` : ''),
    )
    ;(clientError as any).status = 400 // Bad Request
    return next(clientError)
  } else if (err && err.code === 'INVALID_FILE_TYPE_OR_FIELDNAME') {
    const clientError = new Error(err.message)
    ;(clientError as any).status = 400
    return next(clientError)
  } else if (err instanceof Error) {
    const clientError = new Error(`Upload processing failed: ${err.message}`)
    ;(clientError as any).status = (err as any).status || 500
    return next(clientError)
  }
  // Fallback for truly unknown errors
  const unexpectedError = new Error('An unexpected upload error occurred.')
  ;(unexpectedError as any).status = 500
  return next(unexpectedError)
}

// --- Vimeo Video Polling Logic ---
const MAX_POLL_ATTEMPTS = 12 // Approx 6 minutes with 30s interval
const POLL_INTERVAL_MS = 30000 // 30 seconds

async function pollForVideoProcessing(calendarId: number, vimeoUri: string, attempt = 1) {
  console.log(
    `[UploadUtils POLLING Attempt ${attempt}/${MAX_POLL_ATTEMPTS}] for Vimeo URI: ${vimeoUri} (Calendar DB ID: ${calendarId})`,
  )

  if (attempt > MAX_POLL_ATTEMPTS) {
    console.error(
      `[UploadUtils POLLING FAILED] Max attempts reached for ${vimeoUri} (Calendar DB ID: ${calendarId}). Marking as failed.`,
    )
    try {
      // Ensure processingStatus is part of UpdateCalendarDay type
      await calendarDayRepository.updateCalendarDay(calendarId, { processingStatus: 'failed' })
    } catch (dbErr) {
      console.error(
        `[UploadUtils POLLING DB UPDATE FAILED] Could not mark 'failed' status for Calendar ID ${calendarId}:`,
        dbErr,
      )
    }
    return
  }

  try {
    const metadata = await vimeoService.getVideoMetadata(vimeoUri)
    if (!metadata) {
      console.warn(
        `[UploadUtils POLLING WARN] No metadata returned for Vimeo URI ${vimeoUri} (Attempt ${attempt}). Retrying...`,
      )
      setTimeout(() => pollForVideoProcessing(calendarId, vimeoUri, attempt + 1), POLL_INTERVAL_MS)
      return
    }

    const transcodeStatus = metadata.transcode?.status
    const uploadStatus = metadata.upload?.status // Check this too, as transcoding might be complete but upload still finishing
    console.log(
      `[UploadUtils POLLING Status] Vimeo URI ${vimeoUri} (DB ID: ${calendarId}): Transcode='${transcodeStatus}', Upload='${uploadStatus}'`,
    )

    if (
      transcodeStatus === 'complete' &&
      (uploadStatus === 'complete' || uploadStatus === 'terminated')
    ) {
      // Ensure upload is also done
      console.log(
        `[UploadUtils POLLING SUCCESS] Transcoding and upload complete for ${vimeoUri}. Updating DB for Calendar ID: ${calendarId}.`,
      )
      try {
        await calendarDayRepository.updateCalendarDay(calendarId, { processingStatus: 'complete' })
      } catch (dbErr) {
        console.error(
          `[UploadUtils POLLING DB UPDATE SUCCESS FAILED] Could not mark 'complete' for Calendar ID ${calendarId}:`,
          dbErr,
        )
      }
      return // Polling successful
    } else if (
      transcodeStatus === 'in_progress' ||
      transcodeStatus === 'uploading' || // Old Vimeo status, might still appear
      uploadStatus === 'in_progress' ||
      uploadStatus === 'uploading' // Newer Vimeo status
    ) {
      console.log(
        `[UploadUtils POLLING] Video ${vimeoUri} (DB ID: ${calendarId}) is still processing (Transcode: ${transcodeStatus}, Upload: ${uploadStatus}). Retrying...`,
      )
      setTimeout(() => pollForVideoProcessing(calendarId, vimeoUri, attempt + 1), POLL_INTERVAL_MS)
    } else {
      // Any other status (e.g., error, or unexpected null/undefined if upload was also complete)
      console.error(
        `[UploadUtils POLLING FAILED] Unexpected status for ${vimeoUri} (DB ID: ${calendarId}): Transcode='${transcodeStatus}', Upload='${uploadStatus}'. Marking as failed.`,
      )
      try {
        await calendarDayRepository.updateCalendarDay(calendarId, { processingStatus: 'failed' })
      } catch (dbErr) {
        console.error(
          `[UploadUtils POLLING DB UPDATE FAILED-STATUS] Could not mark 'failed' for Calendar ID ${calendarId}:`,
          dbErr,
        )
      }
      return // Polling failed due to status
    }
  } catch (fetchError) {
    console.error(
      `[UploadUtils POLLING Metadata Fetch ERROR] for ${vimeoUri} (Attempt ${attempt}):`,
      fetchError,
    )
    // Retry on fetch error
    setTimeout(() => pollForVideoProcessing(calendarId, vimeoUri, attempt + 1), POLL_INTERVAL_MS)
  }
}

// --- Handle Calendar Video Upload (New or Replace) ---
export const handleVideoUpload = async (
  req: Request,
  res: Response,
  next: NextFunction,
  calendarId: number,
  vimeoVideoIdToReplace?: string, // Existing Vimeo Video ID (not URI part like /videos/123)
): Promise<void> => {
  if (!req.file) {
    if (!res.headersSent) res.status(400).json({ message: 'A video file is required for upload.' })
    return
  }
  const tempFilePath = req.file.path
  console.log(
    `[UploadUtils handleVideoUpload] Processing ${
      req.file.filename
    } for Calendar ID: ${calendarId}. Replacing Vimeo ID: ${vimeoVideoIdToReplace || 'N/A'}`,
  )

  let vimeoUploadResponse: { uri: string; pageLink: string } | null = null

  try {
    const videoNameForVimeo = `calendar_${calendarId}_${Date.now()}` // Unique name for Vimeo

    if (vimeoVideoIdToReplace) {
      console.log(
        `[UploadUtils handleVideoUpload] Replacing existing Vimeo video (ID: ${vimeoVideoIdToReplace}) with new file: ${tempFilePath}`,
      )
      const vimeoUriToReplace = `/videos/${vimeoVideoIdToReplace}`
      vimeoUploadResponse = await vimeoService.replaceVideoSource(tempFilePath, vimeoUriToReplace)
    } else {
      console.log(
        `[UploadUtils handleVideoUpload] Uploading new video "${videoNameForVimeo}" from file: ${tempFilePath}`,
      )
      vimeoUploadResponse = await vimeoService.uploadVideo(tempFilePath, videoNameForVimeo)
    }

    if (!vimeoUploadResponse?.uri || !vimeoUploadResponse?.pageLink) {
      console.error(
        '[UploadUtils handleVideoUpload] Vimeo operation (upload/replace) failed to return a valid URI or page link.',
      )
      throw new Error('Vimeo video processing failed on their end.')
    }

    const vimeoApiUri = vimeoUploadResponse.uri
    const vimeoPageLink = vimeoUploadResponse.pageLink

    console.log(
      `[UploadUtils handleVideoUpload] Vimeo operation successful. API URI: ${vimeoApiUri}, Page Link: ${vimeoPageLink}. Updating Calendar ID: ${calendarId}.`,
    )

    const initialUpdateData: UpdateCalendarDay = {
      vimeoUri: vimeoApiUri,
      userVideoUrl: vimeoPageLink,
      processingStatus: 'processing',
    }

    if (typeof calendarId !== 'number' || isNaN(calendarId)) {
      console.error(`[UploadUtils handleVideoUpload] Invalid Calendar ID type: ${calendarId}`)
      throw new Error(`Invalid calendarId provided.`)
    }

    const dbUpdateSuccess = await calendarDayRepository.updateCalendarDay(
      calendarId,
      initialUpdateData,
    )
    if (!dbUpdateSuccess) {
      console.error(
        `[UploadUtils handleVideoUpload] CRITICAL: Failed to update calendar_day record (ID: ${calendarId}) after successful Vimeo operation (URI: ${vimeoApiUri}). Attempting to delete orphaned Vimeo video.`,
      )
      try {
        await vimeoService.deleteVideo(vimeoApiUri)
      } catch (delError) {
        console.error(
          `[UploadUtils handleVideoUpload] CRITICAL - Failed to delete orphaned Vimeo video ${vimeoApiUri} after DB update failure:`,
          delError,
        )
      }

      if (!res.headersSent) {
        res.status(500).json({
          message: 'Video uploaded to provider but failed to link to your calendar day record.',
        })
      }
      return
    }

    if (!res.headersSent) {
      res.status(200).json({
        message: 'Upload initiated. Your video is now processing.',
        videoUrl: vimeoPageLink,
        vimeoUri: vimeoApiUri,
        calendarId: calendarId,
        processingStatus: 'processing',
      })
    }

    console.log(
      `[UploadUtils handleVideoUpload] Initiating background polling for Calendar ID: ${calendarId}, Vimeo URI: ${vimeoApiUri}`,
    )
    setImmediate(() => {
      pollForVideoProcessing(calendarId, vimeoApiUri).catch((pollingUnhandledError: Error) => {
        console.error(
          `[UploadUtils handleVideoUpload] UNHANDLED POLLING ERROR for Calendar ID ${calendarId}, Vimeo URI ${vimeoApiUri}:`,
          pollingUnhandledError,
        )
        calendarDayRepository
          .updateCalendarDay(calendarId, { processingStatus: 'failed' })
          .catch((dbFinalErr) =>
            console.error(
              `[UploadUtils handleVideoUpload] POLLING DB FINAL FAIL for Calendar ID ${calendarId}:`,
              dbFinalErr,
            ),
          )
      })
    })
  } catch (error) {
    console.error(`[UploadUtils handleVideoUpload] Error for Calendar ID ${calendarId}:`, error)
    next(error instanceof Error ? error : new Error(String(error)))
  } finally {
    if (tempFilePath) {
      try {
        // Check if file exists before unlinking to prevent ENOENT errors if already deleted
        if (
          await fs
            .access(tempFilePath)
            .then(() => true)
            .catch(() => false)
        ) {
          await fs.unlink(tempFilePath)
          console.log(`[UploadUtils handleVideoUpload] Temp file ${tempFilePath} deleted.`)
        } else {
          console.log(
            `[UploadUtils handleVideoUpload] Temp file ${tempFilePath} already deleted or not found.`,
          )
        }
      } catch (unlinkErr) {
        console.error(
          `[UploadUtils handleVideoUpload] Failed to delete temp file ${tempFilePath}:`,
          unlinkErr,
        )
      }
    }
  }
}

// --- Delete Video From Vimeo (Utility) ---
export const deleteVideoFromVimeo = async (vimeoVideoIdOrUri: string): Promise<void> => {
  let videoId = vimeoVideoIdOrUri
  if (vimeoVideoIdOrUri.startsWith('/videos/')) {
    videoId = vimeoVideoIdOrUri.substring('/videos/'.length)
  }
  videoId = videoId?.split('/')?.pop()?.split('?')[0] ?? ''

  if (!videoId || !/^\d+$/.test(videoId)) {
    console.warn(
      `[UploadUtils deleteVideoFromVimeo] Invalid numeric Video ID from "${vimeoVideoIdOrUri}" (parsed as "${videoId}"). Skipping.`,
    )
    return
  }
  try {
    console.log(
      `[UploadUtils deleteVideoFromVimeo] Attempting to delete Vimeo video with ID: ${videoId}`,
    )
    await vimeoService.deleteVideo(videoId)
    console.log(
      `[UploadUtils deleteVideoFromVimeo] Deletion request sent for Vimeo video ID: ${videoId}`,
    )
  } catch (error) {
    console.error(
      `[UploadUtils deleteVideoFromVimeo] Failed to delete video ID ${videoId} from Vimeo:`,
      error,
    )
    throw error
  }
}

// --- Type for DB Update Function (Used by uploadImageHandler) ---
type UpdateUserDbFunc = (userId: string, updateData: Partial<User>) => Promise<User | null>

// --- Generic Image Upload Handler (e.g., for Profile Pictures to S3) ---
export const uploadImageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
  userId: string,
  bucketName: string,
  s3Key: string,
  dbFieldToUpdate: keyof Pick<User, 'profilePictureUrl'>,
  updateUserDbFunc: UpdateUserDbFunc,
): Promise<void> => {
  if (!req.file) {
    console.error('[UploadUtils uploadImageHandler] req.file undefined.')
    if (!res.headersSent) res.status(400).json({ message: 'No valid image file.' })
    return
  }
  const tempFilePath = req.file.path
  console.log(
    `[UploadUtils uploadImageHandler] Processing image ${tempFilePath} for User: ${userId}. S3: ${s3Key}, Bucket: ${bucketName}`,
  )

  try {
    const fileBuffer = await fs.readFile(tempFilePath)
    await awsService.storeImage(fileBuffer, bucketName, s3Key)

    const awsRegion = process.env.AWS_REGION
    if (!awsRegion) throw new Error('Server config error: AWS_REGION missing.')
    const s3FileUrl = `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${s3Key}`

    console.log(
      `[UploadUtils uploadImageHandler] S3 upload OK: ${s3FileUrl}. Updating DB for user ${userId}...`,
    )
    const updatedUser = await updateUserDbFunc(userId, { [dbFieldToUpdate]: s3FileUrl })

    if (!updatedUser) {
      console.error(
        `[UploadUtils uploadImageHandler] CRITICAL: DB update failed for user ${userId} after S3 upload ${s3Key}. Deleting S3 object.`,
      )
      try {
        await awsService.deleteImage(bucketName, s3Key)
      } catch (cleanupError) {
        console.error(
          `[UploadUtils uploadImageHandler] CRITICAL - Failed to delete orphaned S3 object ${s3Key}:`,
          cleanupError,
        )
      }
      if (!res.headersSent)
        res.status(500).json({ message: 'Image uploaded but profile update failed.' })
      return
    }

    console.log(`[UploadUtils uploadImageHandler] DB updated for user ${userId}. URL: ${s3FileUrl}`)
    if (!res.headersSent) {
      res.status(200).json({
        message: 'Image uploaded and profile updated.',
        [dbFieldToUpdate]: s3FileUrl,
        user: updatedUser,
      })
    }
  } catch (error) {
    console.error(`[UploadUtils uploadImageHandler] Error for User ${userId}, S3 ${s3Key}:`, error)
    if (!res.headersSent) {
      const message = error instanceof Error ? error.message : 'Image upload process failed.'
      const status = error instanceof Error && (error as any).status ? (error as any).status : 500
      res.status(status).json({ message })
    } else {
      next(error)
    }
  } finally {
    if (tempFilePath) {
      try {
        if (
          await fs
            .access(tempFilePath)
            .then(() => true)
            .catch(() => false)
        ) {
          await fs.unlink(tempFilePath)
          console.log(`[UploadUtils uploadImageHandler] Deleted temp image: ${tempFilePath}`)
        }
      } catch (unlinkErr) {
        console.error(
          `[UploadUtils uploadImageHandler] Failed to delete temp image ${tempFilePath}:`,
          unlinkErr,
        )
      }
    }
  }
}

// --- Generic S3 Image/Object Delete Handler (Defined here) ---
export const deleteImageHandler = async (bucketName: string, s3Key: string): Promise<void> => {
  if (!bucketName || !s3Key) {
    console.error('[UploadUtils deleteImageHandler] Missing bucketName or s3Key.')
    throw new Error('Internal error: Missing S3 deletion parameters.')
  }
  try {
    console.log(`[UploadUtils deleteImageHandler] Deleting S3 object: s3://${bucketName}/${s3Key}`)
    await awsService.deleteImage(bucketName, s3Key)
    console.log(`[UploadUtils deleteImageHandler] S3 delete OK: ${s3Key}`)
  } catch (error) {
    console.error(
      `[UploadUtils deleteImageHandler] Failed to delete ${s3Key} from ${bucketName}:`,
      error,
    )
    throw error
  }
}

// --- Delete Calendar Video (Utility for handlers) ---
export const deleteVideoHandler = async (
  calendarId: number,
): Promise<{ success: boolean; message: string; details?: any }> => {
  console.log(`[UploadUtils deleteVideoHandler] Deleting video for Calendar ID: ${calendarId}`)
  try {
    const calendarDay = await calendarDayRepository.getCalendarDayById(calendarId)
    if (!calendarDay) {
      const msg = `Calendar record not found for ID: ${calendarId}.`
      console.warn(`[UploadUtils deleteVideoHandler] ${msg}`)
      return { success: false, message: msg }
    }

    if (!calendarDay.vimeoUri) {
      let dbCleared = false
      if (calendarDay.userVideoUrl) {
        await calendarDayRepository.updateCalendarDay(calendarId, {
          userVideoUrl: null,
          vimeoUri: null,
          processingStatus: null,
        })
        dbCleared = true
        console.log(
          `[UploadUtils deleteVideoHandler] Cleared DB URL for Calendar ID ${calendarId} (no Vimeo URI).`,
        )
      }
      const msg =
        `No Vimeo URI for Calendar ID ${calendarId}. Nothing to delete.` +
        (dbCleared ? ' DB record cleared.' : '')
      console.log(`[UploadUtils deleteVideoHandler] ${msg}`)
      return { success: true, message: msg }
    }

    await deleteVideoFromVimeo(calendarDay.vimeoUri) // Deletes from Vimeo

    console.log(
      `[UploadUtils deleteVideoHandler] Clearing DB video fields for Calendar ID: ${calendarId}`,
    )
    await calendarDayRepository.updateCalendarDay(calendarId, {
      userVideoUrl: null,
      vimeoUri: null,
      processingStatus: null,
    })
    const successMsg = `Video for Calendar ID ${calendarId} deleted from Vimeo and DB.`
    console.log(`[UploadUtils deleteVideoHandler] ${successMsg}`)
    return { success: true, message: successMsg }
  } catch (error) {
    const errorMsg = `Failed to delete video for Calendar ID ${calendarId}.`
    console.error(`[UploadUtils deleteVideoHandler] ${errorMsg}`, error)
    return {
      success: false,
      message: errorMsg,
      details: error instanceof Error ? error.message : String(error),
    }
  }
}
