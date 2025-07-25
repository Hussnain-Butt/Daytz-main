// File: src/services/internal/UserService.ts
// ✅ COMPLETE AND FINAL UPDATED CODE

import { User, CreateUserInternalData, UpdateUserPayload } from '../../types/User'
import UserRepository from '../../repository/UserRepository'
import { PoolClient } from 'pg'

const MONTHLY_REPLENISH_AMOUNT = 100
const REFERRAL_BONUS_COINS = 10 // Bonus coins ki value

class UserService {
  private userRepository: UserRepository

  constructor() {
    this.userRepository = new UserRepository()
    console.log('[UserService] UserRepository instance created.')
  }

  // ✅ BADLAV: updateUser function mein bonus logic add kiya gaya hai
  async updateUser(userId: string, updateData: UpdateUserPayload): Promise<User | null> {
    console.log(`[UserService.updateUser] Updating user ${userId} with:`, updateData)

    // Agar update data khali hai, to kuch na karein
    if (Object.keys(updateData).length === 0) {
      return this.getUserById(userId)
    }

    // Bonus coins ka logic
    if (updateData.referralSource) {
      const currentUser = await this.userRepository.getUserById(userId)

      // Bonus sirf tab dein jab user maujood ho, usne pehle referral source nahi diya ho,
      // aur naya referral source khali na ho.
      if (currentUser && !currentUser.referralSource && updateData.referralSource.trim() !== '') {
        console.log(
          `[UserService.updateUser] User ${userId} provided a referral source for the first time. Awarding bonus.`,
        )
        // Current tokens mein bonus add karein
        const newTotalTokens = (currentUser.tokens || 0) + REFERRAL_BONUS_COINS
        updateData.tokens = newTotalTokens // updateData object ko modify karein
        console.log(`[UserService.updateUser] New token balance for ${userId}: ${newTotalTokens}`)
      }
    }

    return this.userRepository.updateUser(userId, updateData)
  }

  // ... (Baaki sabhi functions jaise spendTokensForUser, createUser etc. same rahenge)

  async spendTokensForUser(
    userId: string,
    amount: number,
    reason: string,
    client: PoolClient | null = null,
  ): Promise<User | null> {
    console.log(
      `[UserService.spendTokensForUser] User ${userId} attempting to spend ${amount} tokens for: ${reason}.`,
    )
    if (amount <= 0) {
      console.warn(
        `[UserService.spendTokensForUser] Amount to spend must be positive. User: ${userId}, Amount: ${amount}`,
      )
      throw new Error('Amount to spend must be positive.')
    }
    try {
      const updatedUser = await this.userRepository.spendUserTokens(userId, amount, client)
      if (updatedUser) {
        console.log(
          `[UserService.spendTokensForUser] User ${userId} spent ${amount} tokens. New balance: ${updatedUser.tokens}. Reason: ${reason}`,
        )
      } else {
        console.warn(`[UserService.spendTokensForUser] User ${userId} not found or spend failed.`)
      }
      return updatedUser
    } catch (error: any) {
      console.error(
        `[UserService.spendTokensForUser] Error for user ${userId} spending ${amount} for ${reason}: ${error.message}`,
      )
      throw error
    }
  }

  async createUser(userData: CreateUserInternalData): Promise<User | null> {
    console.log('[UserService.createUser] Attempting with data:', userData)
    try {
      if (!userData.email) {
        throw new Error('Email is required to create a user.')
      }
      // New user gets 100 coins by default. Bonus is added later on first profile save.
      const payloadForRepo = {
        userId: userData.userId,
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        profilePictureUrl: userData.profilePictureUrl || null,
        videoUrl: null,
        zipcode: userData.zipcode || null,
        stickers: null,
        tokens: 100,
        enableNotifications: true,
        is_profile_complete: false,
      }
      const createdUser = await this.userRepository.createUser(payloadForRepo)
      if (!createdUser) {
        return null
      }
      console.log(
        `[UserService.createUser] User created successfully. UserID: ${createdUser.userId}, Email: ${createdUser.email}, Initial Tokens: ${createdUser.tokens}`,
      )
      return createdUser
    } catch (error) {
      console.error('[UserService.createUser] Error:', error)
      throw error
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.getUserById(userId)
  }

  async deleteUser(userId: string): Promise<boolean> {
    console.log(`[UserService.deleteUser] Attempting to delete user ID: ${userId}`)
    return this.userRepository.deleteUser(userId)
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.getAllUsers()
  }

  async replenishAllUsersMonthlyTokens(): Promise<{ successCount: number; errorCount: number }> {
    console.log(
      '[UserService.replenishAllUsersMonthlyTokens] Starting monthly token replenishment.',
    )
    try {
      const updatedCount = await this.userRepository.replenishAllUserTokens(
        MONTHLY_REPLENISH_AMOUNT,
      )
      return { successCount: updatedCount, errorCount: 0 }
    } catch (error) {
      console.error('[UserService.replenishAllUsersMonthlyTokens] Error:', error)
      return { successCount: 0, errorCount: -1 }
    }
  }

  async grantTokensToUser(userId: string, amount: number, reason: string): Promise<User | null> {
    console.log(
      `[UserService.grantTokensToUser] Granting ${amount} tokens to user ${userId} for: ${reason}.`,
    )
    if (amount <= 0) {
      throw new Error('Amount to grant must be positive.')
    }
    try {
      const user = await this.userRepository.getUserById(userId)
      if (!user) {
        return null
      }
      const newTotal = (user.tokens || 0) + amount
      return this.userRepository.updateUser(userId, { tokens: newTotal })
    } catch (error: any) {
      console.error(`[UserService.grantTokensToUser] Error: ${error.message}`)
      throw error
    }
  }
}

export default UserService
