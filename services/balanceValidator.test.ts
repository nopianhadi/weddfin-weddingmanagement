import { describe, it, expect } from 'vitest';
import {
  validateCardBalance,
  validatePocketBalance,
  BalanceValidationError,
  hasCardBalance,
  getBalanceAfterTransaction,
} from './balanceValidator';
import { TransactionType } from '../types';

describe('balanceValidator', () => {
  describe('validateCardBalance', () => {
    it('does not throw for INCOME', () => {
      expect(() =>
        validateCardBalance({ balance: 0 }, 1000, TransactionType.INCOME)
      ).not.toThrow();
    });

    it('does not throw when balance >= amount for EXPENSE', () => {
      expect(() =>
        validateCardBalance({ balance: 5000 }, 3000, TransactionType.EXPENSE)
      ).not.toThrow();
    });

    it('throws BalanceValidationError when balance < amount for EXPENSE', () => {
      expect(() =>
        validateCardBalance({ balance: 1000 }, 5000, TransactionType.EXPENSE)
      ).toThrow(BalanceValidationError);
    });
  });

  describe('validatePocketBalance', () => {
    it('throws when pocket amount < required', () => {
      expect(() =>
        validatePocketBalance({ amount: 100 } as any, 500)
      ).toThrow(BalanceValidationError);
    });

    it('does not throw when amount >= required', () => {
      expect(() =>
        validatePocketBalance({ amount: 1000 } as any, 500)
      ).not.toThrow();
    });
  });

  describe('hasCardBalance', () => {
    it('returns true for INCOME', () => {
      expect(hasCardBalance({ balance: 0 }, 100, TransactionType.INCOME)).toBe(true);
    });

    it('returns true when balance >= amount', () => {
      expect(hasCardBalance({ balance: 100 }, 50, TransactionType.EXPENSE)).toBe(true);
    });

    it('returns false when balance < amount for EXPENSE', () => {
      expect(hasCardBalance({ balance: 10 }, 50, TransactionType.EXPENSE)).toBe(false);
    });
  });

  describe('getBalanceAfterTransaction', () => {
    it('adds amount for INCOME', () => {
      expect(getBalanceAfterTransaction(100, 50, TransactionType.INCOME)).toBe(150);
    });

    it('subtracts amount for EXPENSE', () => {
      expect(getBalanceAfterTransaction(100, 30, TransactionType.EXPENSE)).toBe(70);
    });
  });
});
