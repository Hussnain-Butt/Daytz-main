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
exports.processMonthlyTokenReplenishmentHandler = exports.getUserTransactionsHandler = exports.spendTokensHandler = exports.createPurchaseTransactionHandler = void 0;
const middleware_1 = require("../middleware"); // Ensure this path is correct
const TransactionService_1 = __importDefault(require("../services/internal/TransactionService"));
// CreateTransactionPayload and TransactionTypeValue might be needed if you create transactions directly here
// import { CreateTransactionPayload, TransactionTypeValue } from '../types/Transaction';
const UserRepository_1 = __importDefault(require("../repository/UserRepository"));
// Instantiate services needed by these handlers
const userRepository = new UserRepository_1.default();
const transactionService = new TransactionService_1.default(userRepository);
// --- Existing Handlers ---
exports.createPurchaseTransactionHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    const { tokenAmount, description, amountUsd } = req.body;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    if (!tokenAmount || typeof tokenAmount !== 'number' || tokenAmount <= 0) {
        return res.status(400).json({ message: 'Invalid or missing tokenAmount (must be positive).' });
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ message: 'Invalid or missing description.' });
    }
    if (amountUsd !== undefined && (typeof amountUsd !== 'number' || amountUsd < 0)) {
        return res.status(400).json({ message: 'Invalid amountUsd.' });
    }
    try {
        const createdTransaction = yield transactionService.purchaseTokens(userId, tokenAmount, description.trim(), amountUsd);
        if (!createdTransaction) {
            return res.status(500).json({ message: 'Failed to record token purchase.' });
        }
        const newTokenBalance = yield transactionService.getUserTokenBalance(userId);
        res.status(201).json({
            message: 'Tokens purchased successfully.',
            transaction: createdTransaction,
            newTokenBalance: newTokenBalance,
        });
    }
    catch (error) {
        console.error(`Handler (createPurchase): Error for user ${userId}:`, error);
        if (error instanceof Error) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
}));
exports.spendTokensHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    const { tokenAmount, description, relatedEntityId, relatedEntityType } = req.body;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    if (!tokenAmount || typeof tokenAmount !== 'number' || tokenAmount <= 0) {
        return res
            .status(400)
            .json({ message: 'Invalid or missing tokenAmount to spend (must be positive).' });
    }
    if (!description || typeof description !== 'string' || description.trim() === '') {
        return res.status(400).json({ message: 'Invalid or missing description for spending.' });
    }
    try {
        const transaction = yield transactionService.recordTokenDeduction(userId, tokenAmount, description, 'purchase', // This type implies user is spending tokens to acquire something
        relatedEntityId, relatedEntityType);
        if (!transaction) {
            return res.status(500).json({ message: 'Failed to record token spending.' });
        }
        const newTokenBalance = yield transactionService.getUserTokenBalance(userId);
        res.status(200).json({
            message: 'Tokens spent successfully.',
            transaction,
            newTokenBalance,
        });
    }
    catch (error) {
        console.error(`Handler (spendTokens): Error for user ${userId}:`, error);
        if (error instanceof Error && error.message.includes('Insufficient token balance')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
}));
exports.getUserTransactionsHandler = (0, middleware_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req === null || req === void 0 ? void 0 : req.userId;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized.' });
    }
    try {
        const transactions = yield transactionService.getTransactionsForUser(userId);
        res.status(200).json(transactions);
    }
    catch (error) {
        console.error(`Handler (getUserTransactions): Error for user ${userId}:`, error);
        next(error);
    }
}));
// --- ADDED/MOVED HANDLER ---
exports.processMonthlyTokenReplenishmentHandler = (0, middleware_1.asyncHandler)(
// <<<< MAKE SURE THIS IS EXPORTED
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const cronSecret = req.headers['x-cron-secret'] || req.body.secret;
    if (!process.env.CRON_JOB_SECRET || cronSecret !== process.env.CRON_JOB_SECRET) {
        console.warn('[ReplenishTokensCron] Forbidden attempt. Invalid or missing secret.', `Received: ${cronSecret}, Expected: ${process.env.CRON_JOB_SECRET ? 'exists' : 'MISSING_ENV_VAR'}`);
        return res.status(403).json({ message: 'Forbidden.' });
    }
    console.log('[ReplenishTokensCron] Authorized request to process monthly tokens.');
    try {
        // Use the transactionService instance defined at the top of this file
        const result = yield transactionService.processMonthlyTokenReplenishmentForAllUsers();
        console.log('[ReplenishTokensCron] Token replenishment process finished.', result);
        res.status(200).json(Object.assign({ message: 'Monthly token replenishment process executed successfully.' }, result));
    }
    catch (error) {
        console.error('[ReplenishTokensCron] Critical error during token replenishment:', error);
        next(error);
    }
}));
