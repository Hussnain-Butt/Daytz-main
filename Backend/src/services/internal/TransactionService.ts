// File: src/services/internal/TransactionService.ts
import TransactionRepository from '../../repository/TransactionRepository'
import UserRepository from '../../repository/UserRepository' // Needed for getAllUsers
import {
  Transaction,
  CreateTransactionPayload,
  TransactionTypeValue,
} from '../../types/Transaction'

const INITIAL_TOKEN_GRANT_AMOUNT = 100
const MONTHLY_REPLENISHMENT_AMOUNT = 100

class TransactionService {
  private transactionRepository: TransactionRepository
  private userRepository: UserRepository // For fetching all users during batch replenishment

  constructor(userRepository: UserRepository) {
    // Pass UserRepository for getAllUsers
    this.transactionRepository = new TransactionRepository()
    this.userRepository = userRepository // Store it
    console.log('[TransactionService] Initialized with UserRepository.')
  }

  /**
   * Grants initial tokens to a newly created user.
   */
  async grantInitialTokens(userId: string): Promise<Transaction | null> {
    console.log(
      `TransactionService.grantInitialTokens: Granting ${INITIAL_TOKEN_GRANT_AMOUNT} tokens to user ${userId}`,
    )
    const payload: CreateTransactionPayload = {
      userId,
      transactionType: 'initial_grant',
      tokenAmount: INITIAL_TOKEN_GRANT_AMOUNT, // Positive for grant
      description: `Initial ${INITIAL_TOKEN_GRANT_AMOUNT} token grant upon account creation.`,
    }
    return this.transactionRepository.createTransaction(payload)
  }

  /**
   * Records a token deduction for a user, e.g., spending tokens.
   * Ensures tokensToDeduct is positive, stores as negative tokenAmount.
   */
  async recordTokenDeduction(
    userId: string,
    tokensToDeduct: number,
    reason: string,
    transactionType: TransactionTypeValue = 'deduction', // Allow specific type like 'purchase'
    relatedEntityId?: string,
    relatedEntityType?: string,
  ): Promise<Transaction | null> {
    if (tokensToDeduct <= 0) {
      throw new Error('Tokens to deduct must be a positive value.')
    }

    // Check balance BEFORE attempting deduction
    const currentBalance = await this.getUserTokenBalance(userId)
    if (currentBalance < tokensToDeduct) {
      throw new Error(
        `Insufficient token balance. Current: ${currentBalance}, Required: ${tokensToDeduct}`,
      )
    }

    const transactionPayload: CreateTransactionPayload = {
      userId: userId,
      transactionType: transactionType,
      tokenAmount: -Math.abs(tokensToDeduct), // Deductions are negative
      description: reason,
      relatedEntityId,
      relatedEntityType,
    }

    console.log('TransactionService.recordTokenDeduction: Recording deduction:', transactionPayload)
    return this.transactionRepository.createTransaction(transactionPayload)
  }

  /**
   * Records a token purchase (user buys tokens).
   * tokenAmount is positive.
   */
  async purchaseTokens(
    userId: string,
    tokenAmount: number,
    description: string,
    amountUsd?: number,
  ): Promise<Transaction | null> {
    if (tokenAmount <= 0) {
      throw new Error('Token amount for purchase must be positive.')
    }

    const transactionPayload: CreateTransactionPayload = {
      userId: userId,
      transactionType: 'purchase', // This means user is buying tokens
      tokenAmount: tokenAmount, // Positive amount
      description: description,
      amountUsd: amountUsd,
    }

    console.log('TransactionService.purchaseTokens: Recording purchase:', transactionPayload)
    return this.transactionRepository.createTransaction(transactionPayload)
  }

  async getUserTokenBalance(userId: string): Promise<number> {
    console.log(`TransactionService.getUserTokenBalance: Fetching balance for user ${userId}`)
    return this.transactionRepository.getUserTokens(userId)
  }

  async getTransactionsForUser(userId: string): Promise<Transaction[]> {
    console.log(
      `TransactionService.getTransactionsForUser: Fetching transactions for user ${userId}`,
    )
    return this.transactionRepository.getTransactionsByUserId(userId)
  }

  /**
   * Replenishes tokens for a single user: expires current, grants new.
   */
  async replenishUserMonthlyTokens(userId: string): Promise<void> {
    console.log(`TransactionService.replenishUserMonthlyTokens: Processing for user ${userId}.`)
    const currentBalance = await this.transactionRepository.getUserTokens(userId)

    // 1. Expire current tokens if balance is positive
    if (currentBalance > 0) {
      const expiryPayload: CreateTransactionPayload = {
        userId,
        transactionType: 'monthly_expiry',
        tokenAmount: -currentBalance, // Negative to deduct
        description: `Monthly expiry of ${currentBalance} tokens.`,
      }
      await this.transactionRepository.createTransaction(expiryPayload)
      console.log(
        `TransactionService.replenishUserMonthlyTokens: Expired ${currentBalance} tokens for user ${userId}.`,
      )
    }

    // 2. Grant new monthly tokens
    const replenishmentPayload: CreateTransactionPayload = {
      userId,
      transactionType: 'replenishment',
      tokenAmount: MONTHLY_REPLENISHMENT_AMOUNT, // Positive for grant
      description: `Monthly replenishment of ${MONTHLY_REPLENISHMENT_AMOUNT} tokens.`,
    }
    await this.transactionRepository.createTransaction(replenishmentPayload)
    console.log(
      `TransactionService.replenishUserMonthlyTokens: Replenished ${MONTHLY_REPLENISHMENT_AMOUNT} tokens for user ${userId}.`,
    )
  }

  /**
   * Processes monthly token replenishment for all users.
   * Intended to be called by a scheduled job.
   */
  async processMonthlyTokenReplenishmentForAllUsers(): Promise<{
    success: number
    failed: number
    skipped: number
  }> {
    console.log('[TransactionService] Starting monthly token replenishment for all users.')
    let successCount = 0
    let failureCount = 0
    let skippedCount = 0

    const usersBaseData = await this.userRepository.getAllUsers() // Gets users without token info
    if (!usersBaseData || usersBaseData.length === 0) {
      console.log('[TransactionService] No users found to process for replenishment.')
      return { success: 0, failed: 0, skipped: 0 }
    }

    console.log(`[TransactionService] Found ${usersBaseData.length} users to process.`)

    for (const userBase of usersBaseData) {
      try {
        await this.replenishUserMonthlyTokens(userBase.userId)
        successCount++
      } catch (error) {
        console.error(
          `[TransactionService] Failed monthly replenishment for user ${userBase.userId}:`,
          error,
        )
        failureCount++
      }
    }

    console.log(
      `[TransactionService] Monthly token replenishment completed. Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}.`,
    )
    return { success: successCount, failed: failureCount, skipped: skippedCount }
  }
}

export default TransactionService
