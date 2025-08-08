"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// File: src/services/internal/TransactionService.ts
const TransactionRepository_1 = __importDefault(require("../../repository/TransactionRepository"));
const INITIAL_TOKEN_GRANT_AMOUNT = 100;
const MONTHLY_REPLENISHMENT_AMOUNT = 100;
class TransactionService {
    constructor(userRepository) {
        // Pass UserRepository for getAllUsers
        this.transactionRepository = new TransactionRepository_1.default();
        this.userRepository = userRepository; // Store it
        console.log('[TransactionService] Initialized with UserRepository.');
    }
    /**
     * Grants initial tokens to a newly created user.
     */
    grantInitialTokens(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`TransactionService.grantInitialTokens: Granting ${INITIAL_TOKEN_GRANT_AMOUNT} tokens to user ${userId}`);
            const payload = {
                userId,
                transactionType: 'initial_grant',
                tokenAmount: INITIAL_TOKEN_GRANT_AMOUNT, // Positive for grant
                description: `Initial ${INITIAL_TOKEN_GRANT_AMOUNT} token grant upon account creation.`,
            };
            return this.transactionRepository.createTransaction(payload);
        });
    }
    /**
     * Records a token deduction for a user, e.g., spending tokens.
     * Ensures tokensToDeduct is positive, stores as negative tokenAmount.
     */
    recordTokenDeduction(userId_1, tokensToDeduct_1, reason_1) {
        return __awaiter(this, arguments, void 0, function* (userId, tokensToDeduct, reason, transactionType = 'deduction', // Allow specific type like 'purchase'
        relatedEntityId, relatedEntityType) {
            if (tokensToDeduct <= 0) {
                throw new Error('Tokens to deduct must be a positive value.');
            }
            // Check balance BEFORE attempting deduction
            const currentBalance = yield this.getUserTokenBalance(userId);
            if (currentBalance < tokensToDeduct) {
                throw new Error(`Insufficient token balance. Current: ${currentBalance}, Required: ${tokensToDeduct}`);
            }
            const transactionPayload = {
                userId: userId,
                transactionType: transactionType,
                tokenAmount: -Math.abs(tokensToDeduct), // Deductions are negative
                description: reason,
                relatedEntityId,
                relatedEntityType,
            };
            console.log('TransactionService.recordTokenDeduction: Recording deduction:', transactionPayload);
            return this.transactionRepository.createTransaction(transactionPayload);
        });
    }
    /**
     * Records a token purchase (user buys tokens).
     * tokenAmount is positive.
     */
    purchaseTokens(userId, tokenAmount, description, amountUsd) {
        return __awaiter(this, void 0, void 0, function* () {
            if (tokenAmount <= 0) {
                throw new Error('Token amount for purchase must be positive.');
            }
            const transactionPayload = {
                userId: userId,
                transactionType: 'purchase', // This means user is buying tokens
                tokenAmount: tokenAmount, // Positive amount
                description: description,
                amountUsd: amountUsd,
            };
            console.log('TransactionService.purchaseTokens: Recording purchase:', transactionPayload);
            return this.transactionRepository.createTransaction(transactionPayload);
        });
    }
    getUserTokenBalance(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`TransactionService.getUserTokenBalance: Fetching balance for user ${userId}`);
            return this.transactionRepository.getUserTokens(userId);
        });
    }
    getTransactionsForUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`TransactionService.getTransactionsForUser: Fetching transactions for user ${userId}`);
            return this.transactionRepository.getTransactionsByUserId(userId);
        });
    }
    /**
     * Replenishes tokens for a single user: expires current, grants new.
     */
    replenishUserMonthlyTokens(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`TransactionService.replenishUserMonthlyTokens: Processing for user ${userId}.`);
            const currentBalance = yield this.transactionRepository.getUserTokens(userId);
            // 1. Expire current tokens if balance is positive
            if (currentBalance > 0) {
                const expiryPayload = {
                    userId,
                    transactionType: 'monthly_expiry',
                    tokenAmount: -currentBalance, // Negative to deduct
                    description: `Monthly expiry of ${currentBalance} tokens.`,
                };
                yield this.transactionRepository.createTransaction(expiryPayload);
                console.log(`TransactionService.replenishUserMonthlyTokens: Expired ${currentBalance} tokens for user ${userId}.`);
            }
            // 2. Grant new monthly tokens
            const replenishmentPayload = {
                userId,
                transactionType: 'replenishment',
                tokenAmount: MONTHLY_REPLENISHMENT_AMOUNT, // Positive for grant
                description: `Monthly replenishment of ${MONTHLY_REPLENISHMENT_AMOUNT} tokens.`,
            };
            yield this.transactionRepository.createTransaction(replenishmentPayload);
            console.log(`TransactionService.replenishUserMonthlyTokens: Replenished ${MONTHLY_REPLENISHMENT_AMOUNT} tokens for user ${userId}.`);
        });
    }
    /**
     * Processes monthly token replenishment for all users.
     * Intended to be called by a scheduled job.
     */
    processMonthlyTokenReplenishmentForAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('[TransactionService] Starting monthly token replenishment for all users.');
            let successCount = 0;
            let failureCount = 0;
            let skippedCount = 0;
            const usersBaseData = yield this.userRepository.getAllUsers(); // Gets users without token info
            if (!usersBaseData || usersBaseData.length === 0) {
                console.log('[TransactionService] No users found to process for replenishment.');
                return { success: 0, failed: 0, skipped: 0 };
            }
            console.log(`[TransactionService] Found ${usersBaseData.length} users to process.`);
            for (const userBase of usersBaseData) {
                try {
                    yield this.replenishUserMonthlyTokens(userBase.userId);
                    successCount++;
                }
                catch (error) {
                    console.error(`[TransactionService] Failed monthly replenishment for user ${userBase.userId}:`, error);
                    failureCount++;
                }
            }
            console.log(`[TransactionService] Monthly token replenishment completed. Success: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}.`);
            return { success: successCount, failed: failureCount, skipped: skippedCount };
        });
    }
}
exports.default = TransactionService;
