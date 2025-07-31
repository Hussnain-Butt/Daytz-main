// File: src/handlers/userHandlers.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import { Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs/promises'

import { asyncHandler, CustomRequest } from '../middleware'
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

      console.log(`[CreateUser] New user flow initiated for Auth0 ID: ${auth0UserId}`)
      const { email } = req.body
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email is required for new user creation.' })
      }

      const newUserInternalData: CreateUserInternalData = { userId: auth0UserId, ...req.body }
      const createdUser = await userService.createUser(newUserInternalData)

      if (!createdUser || !createdUser.userId) {
        console.error(
          `[CreateUser] CRITICAL: UserService.createUser returned null or invalid data for Auth0 ID ${auth0UserId}.`,
        )
        throw new Error('User creation failed unexpectedly in the service layer.')
      }

      console.log(`[CreateUser] User ${auth0UserId} created successfully in database.`)
      res.status(201).json(createdUser)
    } catch (error: any) {
      console.error(`[CreateUser] Error processing request for Auth0 User ${auth0UserId}:`, error)
      if (error.message?.includes('users_email_key')) {
        return res.status(409).json({ message: 'Email already in use.' })
      }
      next(error)
    }
  },
)

// --- Update User Handler ---
export const updateUserHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const loggedInUserId = req.userId
    if (!loggedInUserId) {
      return res.status(401).json({ message: 'Unauthorized: User ID missing from token.' })
    }

    const updateDataFromRequest: UpdateUserPayload = req.body
    try {
      const updatedUser = await userService.updateUser(loggedInUserId, updateDataFromRequest)
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found or update failed.' })
      }
      res.status(200).json(updatedUser)
    } catch (error) {
      next(error)
    }
  },
)

// --- Get User By ID Handler ---
export const getUserByIdHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const targetUserId = req.params.id
    if (!targetUserId) {
      return res.status(400).json({ message: 'User ID parameter is required.' })
    }
    try {
      const user = await userService.getUserById(targetUserId)
      if (!user) {
        return res.status(404).json({ message: 'User not found.' })
      }
      res.status(200).json(user)
    } catch (error) {
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
      next(error)
    }
  },
)

// --- Handler for CRON job ---
export const processMonthlyTokenReplenishmentHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const cronSecret = req.headers['x-cron-secret'] || req.body.secret
    const expectedSecret = process.env.CRON_JOB_SECRET
    if (!expectedSecret || cronSecret !== expectedSecret) {
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
        if (!userId) throw new Error('Unauthorized.')
        if (!req.file) throw new Error('No video file uploaded.')
        const user = await userService.getUserById(userId)
        if (!user) throw new Error('User not found.')

        const videoName = `user_${userId}_bio_video_${Date.now()}`
        if (user.videoUrl && user.videoUrl.includes('vimeo.com/')) {
          const existingVimeoId = user.videoUrl.split('/').pop()?.split('?')[0]
          if (existingVimeoId) await deleteVideoFromVimeo(existingVimeoId)
        }

        const vimeoResult = await vimeoService.uploadVideo(req.file.path, videoName)
        if (!vimeoResult.pageLink || !vimeoResult.uri) throw new Error('Vimeo upload failed.')

        const updatedUser = await userService.updateUser(userId, { videoUrl: vimeoResult.pageLink })
        if (!updatedUser) {
          await vimeoService.deleteVideo(vimeoResult.uri).catch(console.error)
          throw new Error('Failed to update user with new video URL.')
        }

        res.status(200).json({
          message: 'Homepage video uploaded.',
          videoUrl: vimeoResult.pageLink,
          vimeoUri: vimeoResult.uri,
          user: updatedUser,
        })
      } catch (error: any) {
        res.status(500).json({ message: error.message || 'Video processing failed.' })
      } finally {
        if (videoPath) await fs.unlink(videoPath).catch(console.warn)
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
        if (!userId || !req.file) throw new Error('Unauthorized or no file uploaded.')
        const user = await userService.getUserById(userId)
        if (!user) throw new Error('User not found.')
        const s3BucketName = process.env.AWS_S3_BUCKET_NAME
        if (!s3BucketName) throw new Error('Server configuration error.')

        if (user.profilePictureUrl) {
          const s3BaseUrlPattern = new RegExp(
            `^https://${s3BucketName}\\.s3\\.[^./]+\\.amazonaws\\.com/`,
          )
          const oldImageS3Key = user.profilePictureUrl.replace(s3BaseUrlPattern, '')
          if (oldImageS3Key && oldImageS3Key !== user.profilePictureUrl) {
            await deleteImageHandler(s3BucketName, oldImageS3Key).catch(console.error)
          }
        }

        const imageExtension = path.extname(req.file.originalname).toLowerCase() || '.png'
        const newImageS3Key = `user-${userId}/profile-${Date.now()}${imageExtension}`

        const updateUserForUpload = (id: string, data: Partial<User>): Promise<User | null> => {
          return userService.updateUser(id, data as UpdateUserPayload)
        }

        await uploadImageHandler(
          req,
          res,
          next,
          userId,
          s3BucketName,
          newImageS3Key,
          'profilePictureUrl',
          updateUserForUpload,
        )
      } catch (error) {
        if (!res.headersSent) next(error)
      } finally {
        if (tempFilePath) await fs.unlink(tempFilePath).catch(console.warn)
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
      if (!user || !user.profilePictureUrl)
        return res.status(404).json({ message: 'User or picture not found.' })

      const s3BucketName = process.env.AWS_S3_BUCKET_NAME
      if (!s3BucketName) throw new Error('Server configuration error.')

      const s3BaseUrlPattern = new RegExp(
        `^https://${s3BucketName}\\.s3\\.[^./]+\\.amazonaws\\.com/`,
      )
      const imageKey = user.profilePictureUrl.replace(s3BaseUrlPattern, '')
      if (imageKey && imageKey !== user.profilePictureUrl) {
        await deleteImageHandler(s3BucketName, imageKey).catch(console.error)
      }

      const updatedUser = await userService.updateUser(userId, { profilePictureUrl: null })
      if (!updatedUser) throw new Error('Failed to update user profile.')
      res.status(200).json({ message: 'Profile picture deleted.', user: updatedUser })
    } catch (error) {
      next(error)
    }
  },
)

export const registerPushTokenHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId
    const { token } = req.body

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated.' })
    }
    if (!token || typeof token !== 'string') {
      return res
        .status(400)
        .json({ message: 'A valid FCM token is required in the "token" field.' })
    }

    try {
      const success = await userRepository.registerPushToken(userId, token)
      if (!success) {
        return res.status(404).json({ message: 'User not found or token registration failed.' })
      }
      res.status(200).json({ message: 'FCM token registered successfully.' })
    } catch (error) {
      console.error(`[RegisterPushToken] Error for user ${userId}:`, error)
      next(error)
    }
  },
)

// ✅✅✅ --- NAYE HANDLERS: BLOCK/UNBLOCK --- ✅✅✅
export const blockUserHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const blockerId = req.userId
    const { userId: blockedId } = req.body

    if (!blockerId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!blockedId) return res.status(400).json({ message: 'User ID to block is required.' })

    try {
      await userService.blockUser(blockerId, blockedId)
      res.status(200).json({ message: 'User blocked successfully.' })
    } catch (error: any) {
      if (error.message.includes('duplicate key')) {
        return res.status(409).json({ message: 'User already blocked.' })
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ message: error.message })
      }
      next(error)
    }
  },
)

export const unblockUserHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const blockerId = req.userId
    const { userId: blockedId } = req.body

    if (!blockerId) return res.status(401).json({ message: 'Unauthorized.' })
    if (!blockedId) return res.status(400).json({ message: 'User ID to unblock is required.' })

    try {
      const success = await userService.unblockUser(blockerId, blockedId)
      if (!success) {
        return res.status(404).json({ message: 'Block relationship not found.' })
      }
      res.status(200).json({ message: 'User unblocked successfully.' })
    } catch (error) {
      next(error)
    }
  },
)

export const getBlockedUsersHandler = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const blockerId = req.userId
    if (!blockerId) return res.status(401).json({ message: 'Unauthorized.' })

    try {
      const blockedUsers = await userService.getBlockedUsers(blockerId)
      res.status(200).json(blockedUsers)
    } catch (error) {
      next(error)
    }
  },
)
