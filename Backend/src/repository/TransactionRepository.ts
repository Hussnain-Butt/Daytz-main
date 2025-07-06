// File: src/repository/TransactionRepository.ts
import pool from '../db' // Adjust path if necessary
import { Transaction, CreateTransactionPayload, TransactionTypeValue } from '../types/Transaction' // Use refined types
import * as humps from 'humps'

// Extended mapRowToTransaction to explicitly cast transactionType
const mapRowToTransaction = (row: any): Transaction | null => {
  if (!row) return null
  const camelized = humps.camelizeKeys(row)
  return {
    ...camelized,
    transactionId: parseInt(camelized.transactionId, 10),
    tokenAmount: parseFloat(camelized.tokenAmount), // Ensure tokenAmount is number
    amountUsd: camelized.amountUsd !== null ? parseFloat(camelized.amountUsd) : null,
    transactionDate: new Date(camelized.transactionDate),
    transactionType: camelized.transactionType as TransactionTypeValue, // Cast to the specific union type
  } as Transaction
}

class TransactionRepository {
  async createTransaction(transactionData: CreateTransactionPayload): Promise<Transaction | null> {
    const query = `
            INSERT INTO transactions (
                user_id, transaction_type, token_amount, amount_usd, description,
                related_entity_id, related_entity_type
                -- transaction_date defaults to CURRENT_TIMESTAMP in DB schema assumed
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `
    const values = [
      transactionData.userId,
      transactionData.transactionType,
      transactionData.tokenAmount, // Should be number (positive for credit, negative for debit)
      transactionData.amountUsd, // Can be null
      transactionData.description,
      transactionData.relatedEntityId, // Can be null
      transactionData.relatedEntityType, // Can be null
    ]
    try {
      console.log('TransactionRepository.createTransaction: Executing query with values:', values)
      const { rows } = await pool.query(query, values)
      const result = rows.length > 0 ? mapRowToTransaction(rows[0]) : null
      console.log('TransactionRepository.createTransaction: Result:', result)
      return result
    } catch (error) {
      console.error('TransactionRepository.createTransaction Error:', error)
      throw error
    }
  }

  async getUserTokens(userId: string): Promise<number> {
    const query = `
            SELECT COALESCE(SUM(token_amount), 0) as total_tokens
            FROM transactions
            WHERE user_id = $1;
        `
    try {
      console.log(`TransactionRepository.getUserTokens: Executing query for user ${userId}`)
      const { rows } = await pool.query(query, [userId])
      // COALESCE ensures we get 0 if no transactions or SUM is null
      const balance = rows.length > 0 ? parseFloat(rows[0].total_tokens) : 0 // Use parseFloat for consistency
      console.log(`TransactionRepository.getUserTokens: Balance for ${userId} is ${balance}`)
      return balance
    } catch (error) {
      console.error(`TransactionRepository.getUserTokens Error for user ${userId}:`, error)
      throw error
    }
  }

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    const query = `
            SELECT * FROM transactions
            WHERE user_id = $1
            ORDER BY transaction_date DESC;
        `
    try {
      console.log(
        `TransactionRepository.getTransactionsByUserId: Executing query for user ${userId}`,
      )
      const { rows } = await pool.query(query, [userId])
      const results = rows
        .map((row) => mapRowToTransaction(row))
        .filter((t) => t !== null) as Transaction[]
      console.log(
        `TransactionRepository.getTransactionsByUserId: Found ${results.length} transactions for user ${userId}`,
      )
      return results
    } catch (error) {
      console.error(
        `TransactionRepository.getTransactionsByUserId Error for user ${userId}:`,
        error,
      )
      throw error
    }
  }
}

export default TransactionRepository
