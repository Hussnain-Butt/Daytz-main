"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
// File: src/repository/TransactionRepository.ts
const db_1 = __importDefault(require("../db")); // Adjust path if necessary
const humps = __importStar(require("humps"));
// Extended mapRowToTransaction to explicitly cast transactionType
const mapRowToTransaction = (row) => {
    if (!row)
        return null;
    const camelized = humps.camelizeKeys(row);
    return Object.assign(Object.assign({}, camelized), { transactionId: parseInt(camelized.transactionId, 10), tokenAmount: parseFloat(camelized.tokenAmount), amountUsd: camelized.amountUsd !== null ? parseFloat(camelized.amountUsd) : null, transactionDate: new Date(camelized.transactionDate), transactionType: camelized.transactionType });
};
class TransactionRepository {
    createTransaction(transactionData) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            INSERT INTO transactions (
                user_id, transaction_type, token_amount, amount_usd, description,
                related_entity_id, related_entity_type
                -- transaction_date defaults to CURRENT_TIMESTAMP in DB schema assumed
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
            const values = [
                transactionData.userId,
                transactionData.transactionType,
                transactionData.tokenAmount, // Should be number (positive for credit, negative for debit)
                transactionData.amountUsd, // Can be null
                transactionData.description,
                transactionData.relatedEntityId, // Can be null
                transactionData.relatedEntityType, // Can be null
            ];
            try {
                console.log('TransactionRepository.createTransaction: Executing query with values:', values);
                const { rows } = yield db_1.default.query(query, values);
                const result = rows.length > 0 ? mapRowToTransaction(rows[0]) : null;
                console.log('TransactionRepository.createTransaction: Result:', result);
                return result;
            }
            catch (error) {
                console.error('TransactionRepository.createTransaction Error:', error);
                throw error;
            }
        });
    }
    getUserTokens(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            SELECT COALESCE(SUM(token_amount), 0) as total_tokens
            FROM transactions
            WHERE user_id = $1;
        `;
            try {
                console.log(`TransactionRepository.getUserTokens: Executing query for user ${userId}`);
                const { rows } = yield db_1.default.query(query, [userId]);
                // COALESCE ensures we get 0 if no transactions or SUM is null
                const balance = rows.length > 0 ? parseFloat(rows[0].total_tokens) : 0; // Use parseFloat for consistency
                console.log(`TransactionRepository.getUserTokens: Balance for ${userId} is ${balance}`);
                return balance;
            }
            catch (error) {
                console.error(`TransactionRepository.getUserTokens Error for user ${userId}:`, error);
                throw error;
            }
        });
    }
    getTransactionsByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
            SELECT * FROM transactions
            WHERE user_id = $1
            ORDER BY transaction_date DESC;
        `;
            try {
                console.log(`TransactionRepository.getTransactionsByUserId: Executing query for user ${userId}`);
                const { rows } = yield db_1.default.query(query, [userId]);
                const results = rows
                    .map((row) => mapRowToTransaction(row))
                    .filter((t) => t !== null);
                console.log(`TransactionRepository.getTransactionsByUserId: Found ${results.length} transactions for user ${userId}`);
                return results;
            }
            catch (error) {
                console.error(`TransactionRepository.getTransactionsByUserId Error for user ${userId}:`, error);
                throw error;
            }
        });
    }
}
exports.default = TransactionRepository;
