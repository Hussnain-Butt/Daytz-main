// File: src/handlers/userHandlers.ts
// ✅ COMPLETE AND FINAL CORRECTED CODE

import { Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs/promises'

import { asyncHandler, CustomRequest } from '../middleware' // Import CustomRequest
import UserService from '../services/internal/UserService'
import VimeoService from '../services/external/VimeoService'
import UserRepository from '../repository/UserRepository'

import {
  upload,
  handleMulterError,
  uploadImageHandler,
  deleteImageHandler,
  deleteVideoFromVimeo,
} from '../uploadUtils'
import { User, UpdateUserPayload, CreateUserInternalData } from '../types/User'

const userService = new UserService()
const vimeoService = new VimeoService()
const userRepository = new UserRepository()

console.log('[UserHandler] Services instantiated.')

// --- Create User Handler ---
export const createUserHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const auth0UserId = req.userId
    if (!auth0UserId) {
      return res.status(401).json({ message: 'Unauthorized: User identifier missing from token.' })
    }

    try {
      const existingUser = await userService.getUserById(auth0UserId)
      if (existingUser) {
        console.log(
          `[CreateUser] Auth0 User ${auth0UserId}: Already exists. Returning existing data.`,
        )
        return res.status(200).json(existingUser)
      }

      const { firstName, lastName, profilePictureUrl, email, zipcode } = req.body
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email is required.' })
      }

      const newUserInternalData: CreateUserInternalData = {
        userId: auth0UserId,
        firstName,
        lastName,
        email,
        profilePictureUrl,
        zipcode,
      }

      const createdUser = await userService.createUser(newUserInternalData)
      if (!createdUser) {
        throw new Error('User creation failed unexpectedly in service.')
      }

      console.log(`[CreateUser] User ${auth0UserId} created successfully.`)
      res.status(201).json(createdUser)
    } catch (error: any) {
      console.error(`[CreateUser] Error for Auth0 User ${auth0UserId}:`, error)
      if (error.message?.includes('users_email_key')) {
        return res.status(409).json({ message: 'Email already in use.' })
      }
      next(error)
    }
  },
)

// ✅ --- THIS IS THE MAIN FIX ---
// This handler now correctly uses the logged-in user's ID for all operations
// and returns the correct updated user profile.
export const updateUserHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const loggedInUserId = req.userId
    if (!loggedInUserId) {
      return res.status(401).json({ message: 'Unauthorized: User ID missing from token.' })
    }

    const updateDataFromRequest: UpdateUserPayload = req.body

    console.log(
      `[UpdateUser] User ${loggedInUserId} attempting to update profile with data:`,
      updateDataFromRequest,
    )

    try {
      const updatedUser = await userService.updateUser(loggedInUserId, updateDataFromRequest)
      if (!updatedUser) {
        console.warn(`[UpdateUser] User ${loggedInUserId} not found for update.`)
        return res.status(404).json({ message: 'User not found or update failed.' })
      }

      console.log(`[UpdateUser] User ${loggedInUserId} profile updated successfully.`)
      res.status(200).json(updatedUser)
    } catch (error) {
      console.error(`[UpdateUser] Error updating user ${loggedInUserId}:`, error)
      next(error)
    }
  },
)

// --- Get User By ID Handler ---
export const getUserByIdHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const targetUserId = req.params.id
    const authenticatedUserId = req.userId

    if (!targetUserId) {
      return res.status(400).json({ message: 'User ID parameter is required.' })
    }

    try {
      console.log(`[GetUserById] User ${authenticatedUserId} fetching profile for ${targetUserId}.`)
      const user = await userService.getUserById(targetUserId)
      if (!user) {
        return res.status(404).json({ message: 'User not found.' })
      }
      res.status(200).json(user)
    } catch (error) {
      console.error(`[GetUserById] Error fetching user ${targetUserId}:`, error)
      next(error)
    }
  },
)

// --- Get User Token Balance Handler ---
export const getUserTokenBalanceHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User ID missing.' })
    }

    try {
      const user = await userService.getUserById(userId)
      if (!user) {
        return res.status(404).json({ message: 'User not found.' })
      }
      res.status(200).json({ tokenBalance: user.tokens })
    } catch (error) {
      console.error(`[GetUserTokenBalance] Error for user ${userId}:`, error)
      next(error)
    }
  },
)

// --- Handler for CRON job ---
export const processMonthlyTokenReplenishmentHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const cronSecret = req.headers['x-cron-secret'] || req.body.secret
    const expectedSecret = process.env.CRON_JOB_SECRET

    if (!expectedSecret) {
      return res.status(500).json({ message: 'Service configuration error.' })
    }
    if (cronSecret !== expectedSecret) {
      return res.status(403).json({ message: 'Forbidden.' })
    }

    try {
      const result = await userService.replenishAllUsersMonthlyTokens()
      res.status(200).json({ message: 'Token replenishment successful.', ...result })
    } catch (error) {
      next(error)
    }
  },
)

// --- File Upload Handlers ---
export const uploadHomepageVideoHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    upload.single('video')(req, res, async (err) => {
      if (err) return handleMulterError(err, next)

      const videoPath = req.file?.path
      const userId = req.userId

      try {
        if (!userId) {
          if (videoPath) await fs.unlink(videoPath).catch(console.error)
          return res.status(401).json({ message: 'Unauthorized.' })
        }
        if (!req.file) {
          return res.status(400).json({ message: 'No video file uploaded.' })
        }
        const user = await userService.getUserById(userId)
        if (!user) {
          if (videoPath) await fs.unlink(videoPath).catch(console.error)
          return res.status(404).json({ message: 'User not found.' })
        }

        const videoName = `user_${userId}_bio_video_${Date.now()}`
        let vimeoUriOnSuccess: string | undefined

        try {
          if (user.videoUrl && user.videoUrl.includes('vimeo.com/')) {
            const existingVimeoId = user.videoUrl.split('/').pop()?.split('?')[0]
            if (existingVimeoId) {
              await deleteVideoFromVimeo(existingVimeoId)
            }
          }

          const vimeoResult = await vimeoService.uploadVideo(req.file.path, videoName)
          vimeoUriOnSuccess = vimeoResult.uri
          const vimeoPageUrl = vimeoResult.pageLink
          if (!vimeoPageUrl || !vimeoUriOnSuccess) {
            throw new Error('Vimeo upload failed to return necessary URLs.')
          }

          const updatedUser = await userService.updateUser(userId, { videoUrl: vimeoPageUrl })
          if (!updatedUser) {
            if (vimeoUriOnSuccess)
              await vimeoService
                .deleteVideo(vimeoUriOnSuccess)
                .catch((delErr) =>
                  console.error(
                    `CRITICAL FAIL: Failed to delete orphaned Vimeo video ${vimeoUriOnSuccess}`,
                    delErr,
                  ),
                )
            throw new Error('Failed to update user with new video URL.')
          }

          res
            .status(200)
            .json({
              message: 'Homepage video uploaded.',
              videoUrl: vimeoPageUrl,
              vimeoUri: vimeoUriOnSuccess,
              user: updatedUser,
            })
        } catch (uploadOrUpdateError: any) {
          if (vimeoUriOnSuccess && !res.headersSent) {
            await vimeoService
              .deleteVideo(vimeoUriOnSuccess)
              .catch((delErr) =>
                console.error(
                  `CRITICAL: Failed to cleanup Vimeo video ${vimeoUriOnSuccess}`,
                  delErr,
                ),
              )
          }
          if (!res.headersSent) {
            res
              .status(500)
              .json({ message: uploadOrUpdateError.message || 'Video processing failed.' })
          }
        }
      } catch (initialError) {
        if (!res.headersSent) next(initialError)
      } finally {
        if (videoPath) {
          await fs
            .unlink(videoPath)
            .catch((e) =>
              console.warn(`Non-critical error unlinking temp video ${videoPath}`, e.message),
            )
        }
      }
    })
  },
)

export const deleteHomepageVideoHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })

    try {
      const user = await userService.getUserById(userId)
      if (!user) return res.status(404).json({ message: 'User not found.' })
      if (!user.videoUrl) return res.status(200).json({ message: 'No video to delete.', user })

      if (user.videoUrl.includes('vimeo.com/')) {
        const vimeoIdOrUri = user.videoUrl.split('/').pop()?.split('?')[0]
        if (vimeoIdOrUri) await deleteVideoFromVimeo(vimeoIdOrUri)
      }

      const updatedUser = await userService.updateUser(userId, { videoUrl: null })
      if (!updatedUser) throw new Error('Failed to update user after deleting video.')

      res.status(200).json({ message: 'Homepage video deleted.', user: updatedUser })
    } catch (error) {
      next(error)
    }
  },
)

export const uploadProfilePictureHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    upload.single('image')(req, res, async (err) => {
      if (err) return handleMulterError(err, next)

      const userId = req.userId
      const tempFilePath = req.file?.path

      try {
        if (!userId) {
          if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error)
          return res.status(401).json({ message: 'Unauthorized.' })
        }
        if (!req.file) return res.status(400).json({ message: 'No image file uploaded.' })

        const user = await userService.getUserById(userId)
        if (!user) {
          if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error)
          return res.status(404).json({ message: 'User not found.' })
        }

        const s3BucketName = process.env.AWS_S3_BUCKET_NAME
        if (!s3BucketName) {
          if (tempFilePath) await fs.unlink(tempFilePath).catch(console.error)
          return res.status(500).json({ message: 'Server configuration error.' })
        }

        if (user.profilePictureUrl) {
          const s3BaseUrlPattern = new RegExp(
            `^https://${s3BucketName}\\.s3\\.[^./]+\\.amazonaws\\.com/`,
          )
          const oldImageS3Key = user.profilePictureUrl.replace(s3BaseUrlPattern, '')
          if (oldImageS3Key && oldImageS3Key !== user.profilePictureUrl) {
            await deleteImageHandler(s3BucketName, oldImageS3Key).catch((e) =>
              console.error(`Failed to delete old S3 profile picture`, e),
            )
          }
        }

        const imageExtension = path.extname(req.file.originalname).toLowerCase() || '.png'
        const newImageS3Key = `user-${userId}/profile-${Date.now()}${imageExtension}`

        await uploadImageHandler(
          req,
          res,
          next,
          userId,
          s3BucketName,
          newImageS3Key,
          'profilePictureUrl',
          userService.updateUser.bind(userService),
        )
      } catch (error) {
        if (tempFilePath && !res.headersSent) await fs.unlink(tempFilePath).catch(console.error)
        if (!res.headersSent) next(error)
      }
    })
  },
)

export const deleteProfilePictureHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' })

    try {
      const user = await userService.getUserById(userId)
      if (!user) return res.status(404).json({ message: 'User not found.' })
      if (!user.profilePictureUrl)
        return res.status(200).json({ message: 'No profile picture to delete.', user })

      const s3BucketName = process.env.AWS_S3_BUCKET_NAME
      if (!s3BucketName) return res.status(500).json({ message: 'Server configuration error.' })

      const s3BaseUrlPattern = new RegExp(
        `^https://${s3BucketName}\\.s3\\.[^./]+\\.amazonaws\\.com/`,
      )
      const imageKey = user.profilePictureUrl.replace(s3BaseUrlPattern, '')
      if (imageKey && imageKey !== user.profilePictureUrl) {
        await deleteImageHandler(s3BucketName, imageKey).catch((e) =>
          console.error(`Failed to delete S3 profile picture`, e),
        )
      }

      const updatedUser = await userService.updateUser(userId, { profilePictureUrl: null })
      if (!updatedUser) throw new Error('Failed to update user profile after picture deletion.')

      res.status(200).json({ message: 'Profile picture deleted.', user: updatedUser })
    } catch (error) {
      next(error)
    }
  },
)

// --- Register Push Token Handler ---
export const registerPushTokenHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    const { playerId } = req.body

    if (!userId) return res.status(401).json({ message: 'User not authenticated.' })
    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ message: 'Player ID is required.' })
    }

    try {
      const success = await userRepository.registerPushToken(userId, playerId)
      if (!success) {
        return res.status(404).json({ message: 'User not found or token registration failed.' })
      }
      res.status(200).json({ message: 'Push token registered successfully.' })
    } catch (error) {
      next(error)
    }
  },
)
