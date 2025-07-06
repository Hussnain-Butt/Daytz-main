// File: src/types/Transaction.ts
// This type definition is kept for potential future use with other transaction types,
// but is NOT used for the simplified direct user token grant/replenishment.

export type TransactionTypeValue =
  | 'initial_grant' // This specific type might become unused if no transaction log
  | 'monthly_expiry' // This specific type might become unused
  | 'purchase'
  | 'replenishment' // This specific type might become unused
  | 'admin'
  | 'refund'
  | 'deduction'
  | 'bonus'
  | 'penalty'
  | 'gift'
  | 'subscription'
  | 'advertising'

export interface Transaction {
  transactionId: number
  userId: string
  transactionType: TransactionTypeValue
  amountUsd?: number | null
  tokenAmount: number // Could still be used if you log other token changes
  description: string
  transactionDate: Date
  relatedEntityId?: string | null
  relatedEntityType?: string | null
}

export type CreateTransactionPayload = Pick<
  Transaction,
  'userId' | 'transactionType' | 'tokenAmount' | 'description'
> & {
  amountUsd?: number | null
  relatedEntityId?: string | null
  relatedEntityType?: string | null
}
