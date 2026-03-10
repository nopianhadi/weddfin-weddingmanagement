/**
 * Transactions Service dengan Offline Support
 */

import { supabase } from '../lib/supabaseClient';
import { syncManager } from './syncManager';
import { offlineStorage } from './offlineStorage';
import type { Transaction } from '../types';

const TABLE_NAME = 'transactions';
const CACHE_KEY = 'transactions_list';
const CACHE_TTL_MINUTES = 15; // Transactions lebih sering berubah

export async function listTransactionsOffline(): Promise<Transaction[]> {
  try {
    if (!navigator.onLine) {
      console.log('[TransactionsOffline] Offline, returning empty list');
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    await offlineStorage.cacheData(CACHE_KEY, data, CACHE_TTL_MINUTES);
    return data || [];
  } catch (error) {
    console.error('[TransactionsOffline] Error fetching transactions:', error);
    if (!navigator.onLine) return [];
    const cached = await offlineStorage.getCachedData<Transaction[]>(CACHE_KEY);
    return cached || [];
  }
}

export async function createTransactionOffline(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
  const newTransaction: Transaction = {
    ...transaction,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  } as Transaction;

  try {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(newTransaction)
      .select()
      .single();

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
    return data;
  } catch (error) {
    console.error('[TransactionsOffline] Error creating transaction:', error);
    throw error;
  }
}

export async function updateTransactionOffline(id: string, updates: Partial<Transaction>): Promise<Transaction> {
  const updatedTransaction = { id, ...updates };

  try {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
    return data;
  } catch (error) {
    console.error('[TransactionsOffline] Error updating transaction:', error);
    throw error;
  }
}

export async function deleteTransactionOffline(id: string): Promise<void> {
  try {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
  } catch (error) {
    console.error('[TransactionsOffline] Error deleting transaction:', error);
    throw error;
  }
}

export async function getTransactionOffline(id: string): Promise<Transaction | null> {
  try {
    if (!navigator.onLine) {
      console.log('[TransactionsOffline] Offline, returning null');
      return null;
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[TransactionsOffline] Error getting transaction:', error);
    return null;
  }
}

// Helper untuk filter transactions by date range (useful untuk reports)
export async function getTransactionsByDateRangeOffline(
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  try {
    if (!navigator.onLine) {
      console.log('[TransactionsOffline] Offline, returning empty list');
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[TransactionsOffline] Error getting transactions by date:', error);
    return [];
  }
}

async function updateCacheOptimistically(action: 'add' | 'update' | 'delete', item: any): Promise<void> {
  const cached = await offlineStorage.getCachedData<Transaction[]>(CACHE_KEY);
  if (!cached) return;

  let updated: Transaction[];
  switch (action) {
    case 'add':
      updated = [item, ...cached];
      break;
    case 'update':
      updated = cached.map(t => t.id === item.id ? { ...t, ...item } : t);
      break;
    case 'delete':
      updated = cached.filter(t => t.id !== item.id);
      break;
  }

  await offlineStorage.cacheData(CACHE_KEY, updated, CACHE_TTL_MINUTES);
}
