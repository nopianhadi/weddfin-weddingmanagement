/**
 * Balance Validator Service
 * Validates balance before transactions to prevent negative balances
 */

import { Card, FinancialPocket, TransactionType } from '../types';

export class BalanceValidationError extends Error {
  constructor(
    message: string,
    public readonly currentBalance: number,
    public readonly requiredAmount: number,
    public readonly entityType: 'card' | 'pocket'
  ) {
    super(message);
    this.name = 'BalanceValidationError';
  }
}

/**
 * Validate card balance before transaction.
 * Accepts Card or any object with balance (e.g. Supabase row with only balance selected).
 */
export function validateCardBalance(
  card: Card | Pick<Card, 'balance'>,
  amount: number,
  transactionType: TransactionType
): void {
  // Only validate for expenses
  if (transactionType !== TransactionType.EXPENSE) {
    return;
  }
  
  const currentBalance = Number(card.balance ?? 0);
  const requiredAmount = Number(amount);
  
  if (currentBalance < requiredAmount) {
    throw new BalanceValidationError(
      `Saldo kartu tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${requiredAmount.toLocaleString('id-ID')}`,
      currentBalance,
      requiredAmount,
      'card'
    );
  }
}

/**
 * Validate pocket balance before transaction
 */
export function validatePocketBalance(
  pocket: FinancialPocket,
  amount: number
): void {
  const currentBalance = Number(pocket.amount || 0);
  const requiredAmount = Number(amount);
  
  if (currentBalance < requiredAmount) {
    throw new BalanceValidationError(
      `Saldo pocket tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')}, Dibutuhkan: Rp ${requiredAmount.toLocaleString('id-ID')}`,
      currentBalance,
      requiredAmount,
      'pocket'
    );
  }
}

/**
 * Check if card has sufficient balance (non-throwing)
 */
export function hasCardBalance(
  card: Card,
  amount: number,
  transactionType: TransactionType
): boolean {
  if (transactionType !== TransactionType.EXPENSE) {
    return true;
  }
  
  const currentBalance = Number(card.balance || 0);
  const requiredAmount = Number(amount);
  
  return currentBalance >= requiredAmount;
}

/**
 * Check if pocket has sufficient balance (non-throwing)
 */
export function hasPocketBalance(
  pocket: FinancialPocket,
  amount: number
): boolean {
  const currentBalance = Number(pocket.amount || 0);
  const requiredAmount = Number(amount);
  
  return currentBalance >= requiredAmount;
}

/**
 * Get available balance after transaction
 */
export function getBalanceAfterTransaction(
  currentBalance: number,
  amount: number,
  transactionType: TransactionType
): number {
  const delta = transactionType === TransactionType.INCOME ? amount : -amount;
  return currentBalance + delta;
}

/**
 * Validate multiple transactions (batch validation)
 */
export function validateBatchTransactions(
  card: Card,
  transactions: Array<{ amount: number; type: TransactionType }>
): void {
  let runningBalance = Number(card.balance || 0);
  
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const delta = tx.type === TransactionType.INCOME ? tx.amount : -tx.amount;
    runningBalance += delta;
    
    if (runningBalance < 0) {
      throw new BalanceValidationError(
        `Transaksi ke-${i + 1} akan menyebabkan saldo negatif. Saldo setelah transaksi: Rp ${runningBalance.toLocaleString('id-ID')}`,
        runningBalance,
        Math.abs(delta),
        'card'
      );
    }
  }
}
