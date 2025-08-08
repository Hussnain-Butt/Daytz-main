// File: src/handlers/transactionHandlers.ts
import { Request, Response, NextFunction } from 'express'
import { asyncHandler } from '../middleware' // Ensure this path is correct
import TransactionService from '../services/internal/TransactionService'
// CreateTransactionPayload and TransactionTypeValue might be needed if you create transactions directly here
// import { CreateTransactionPayload, TransactionTypeValue } from '../types/Transaction';
import UserRepository from '../repository/UserRepository'

// Instantiate services needed by these handlers
const userRepository = new UserRepository()
const transactionService = new TransactionService(userRepository)

// --- Existing Handlers ---
export const createPurchaseTransactionHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any)?.userId
    const { tokenAmount, description, amountUsd } = req.body

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' })
    }
    if (!tokenAmount || typeof tokenAmount !== 'number' || tokenAmount <= 0) {
      return res.status(400).json({ message: 'Invalid or missing tokenAmount (must be positive).' })
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ message: 'Invalid or missing description.' })
    }
    if (amountUsd !== undefined && (typeof amountUsd !== 'number' || amountUsd < 0)) {
      return res.status(400).json({ message: 'Invalid amountUsd.' })
    }

    try {
      const createdTransaction = await transactionService.purchaseTokens(
        userId,
        tokenAmount,
        description.trim(),
        amountUsd,
      )
      if (!createdTransaction) {
        return res.status(500).json({ message: 'Failed to record token purchase.' })
      }
      const newTokenBalance = await transactionService.getUserTokenBalance(userId)
      res.status(201).json({
        message: 'Tokens purchased successfully.',
        transaction: createdTransaction,
        newTokenBalance: newTokenBalance,
      })
    } catch (error) {
      console.error(`Handler (createPurchase): Error for user ${userId}:`, error)
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message })
      }
      next(error)
    }
  },
)

export const spendTokensHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any)?.userId
    const { tokenAmount, description, relatedEntityId, relatedEntityType } = req.body as {
      tokenAmount: number
      description: string
      relatedEntityId?: string
      relatedEntityType?: string
    }

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' })
    }
    if (!tokenAmount || typeof tokenAmount !== 'number' || tokenAmount <= 0) {
      return res
        .status(400)
        .json({ message: 'Invalid or missing tokenAmount to spend (must be positive).' })
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ message: 'Invalid or missing description for spending.' })
    }

    try {
      const transaction = await transactionService.recordTokenDeduction(
        userId,
        tokenAmount,
        description,
        'purchase', // This type implies user is spending tokens to acquire something
        relatedEntityId,
        relatedEntityType,
      )
      if (!transaction) {
        return res.status(500).json({ message: 'Failed to record token spending.' })
      }
      const newTokenBalance = await transactionService.getUserTokenBalance(userId)
      res.status(200).json({
        message: 'Tokens spent successfully.',
        transaction,
        newTokenBalance,
      })
    } catch (error) {
      console.error(`Handler (spendTokens): Error for user ${userId}:`, error)
      if (error instanceof Error && error.message.includes('Insufficient token balance')) {
        return res.status(400).json({ message: error.message })
      }
      next(error)
    }
  },
)

export const getUserTransactionsHandler = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any)?.userId
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized.' })
    }
    try {
      const transactions = await transactionService.getTransactionsForUser(userId)
      res.status(200).json(transactions)
    } catch (error) {
      console.error(`Handler (getUserTransactions): Error for user ${userId}:`, error)
      next(error)
    }
  },
)

// --- ADDED/MOVED HANDLER ---
export const processMonthlyTokenReplenishmentHandler = asyncHandler(
  // <<<< MAKE SURE THIS IS EXPORTED
  async (req: Request, res: Response, next: NextFunction) => {
    const cronSecret = req.headers['x-cron-secret'] || req.body.secret
    if (!process.env.CRON_JOB_SECRET || cronSecret !== process.env.CRON_JOB_SECRET) {
      console.warn(
        '[ReplenishTokensCron] Forbidden attempt. Invalid or missing secret.',
        `Received: ${cronSecret}, Expected: ${
          process.env.CRON_JOB_SECRET ? 'exists' : 'MISSING_ENV_VAR'
        }`,
      )
      return res.status(403).json({ message: 'Forbidden.' })
    }

    console.log('[ReplenishTokensCron] Authorized request to process monthly tokens.')
    try {
      // Use the transactionService instance defined at the top of this file
      const result = await transactionService.processMonthlyTokenReplenishmentForAllUsers()
      console.log('[ReplenishTokensCron] Token replenishment process finished.', result)
      res.status(200).json({
        message: 'Monthly token replenishment process executed successfully.',
        ...result,
      })
    } catch (error) {
      console.error('[ReplenishTokensCron] Critical error during token replenishment:', error)
      next(error)
    }
  },
)
