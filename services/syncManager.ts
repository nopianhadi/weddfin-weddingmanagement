/**
 * Sync Manager
 * Mengelola sinkronisasi data antara offline storage dan Supabase
 */

import { supabase } from '../lib/supabaseClient';
import { offlineStorage, PendingOperation } from './offlineStorage';

const ONLINE_ONLY_SOFT = true;

export type SyncEventType = 'sync-start' | 'sync-progress' | 'sync-complete' | 'sync-error';

export interface SyncEvent {
  type: SyncEventType;
  message: string;
  progress?: number;
  total?: number;
  error?: any;
}

type SyncListener = (event: SyncEvent) => void;

class SyncManager {
  private isSyncing = false;
  private listeners: SyncListener[] = [];
  private syncInterval: number | null = null;

  // Daftar tabel yang didukung untuk sinkronisasi
  private readonly SUPPORTED_TABLES = [
    'clients',
    'projects',
    'team_members',
    'transactions',
    'leads',
    'client_feedback',
    'notifications',
    'team_project_payments',
    'team_payment_records',
    'reward_ledger',
    'pockets',
    'cards',
    'packages',
    'add_ons',
    'promo_codes',
  ];

  private syncQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor() {
    if (!ONLINE_ONLY_SOFT) {
      this.startAutoSync(30000);
    }
  }

  // === EVENT LISTENERS ===

  on(listener: SyncListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: SyncEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[SyncManager] Listener error:', error);
      }
    });
  }

  // === AUTO SYNC ===

  startAutoSync(intervalMs: number = 30000): void {
    this.stopAutoSync();
    
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.sync().catch(error => {
          console.error('[SyncManager] Auto-sync error:', error);
        });
      }
    }, intervalMs);
  }

  stopAutoSync(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // === MAIN SYNC FUNCTION ===

  async sync(): Promise<void> {
    // Queue sync request if already syncing
    if (this.isSyncing) {
      console.log('[SyncManager] Sync already in progress, queueing request');
      return new Promise((resolve, reject) => {
        this.syncQueue.push(async () => {
          try {
            await this.performSync();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        this.processQueue();
      });
    }

    if (!navigator.onLine) {
      console.log('[SyncManager] Offline, skipping sync');
      return;
    }

    return this.performSync();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    while (this.syncQueue.length > 0) {
      const syncFn = this.syncQueue.shift();
      if (syncFn) {
        try {
          await syncFn();
        } catch (error) {
          console.error('[SyncManager] Queue processing error:', error);
        }
      }
    }
    this.isProcessingQueue = false;
  }

  private async performSync(): Promise<void> {

    this.isSyncing = true;
    this.emit({ type: 'sync-start', message: 'Memulai sinkronisasi...' });

    try {
      const operations = await offlineStorage.getPendingOperations();
      
      if (operations.length === 0) {
        this.emit({ type: 'sync-complete', message: 'Tidak ada data untuk disinkronkan' });
        await offlineStorage.updateSyncStatus({
          lastSync: Date.now(),
          pendingCount: 0,
        });
        return;
      }

      console.log(`[SyncManager] Syncing ${operations.length} operations`);
      
      let successCount = 0;
      let failedCount = 0;

      // Process operations in order (FIFO)
      const sortedOps = operations.sort((a, b) => a.timestamp - b.timestamp);

      for (let i = 0; i < sortedOps.length; i++) {
        const op = sortedOps[i];
        
        this.emit({
          type: 'sync-progress',
          message: `Sinkronisasi ${i + 1} dari ${sortedOps.length}...`,
          progress: i + 1,
          total: sortedOps.length,
        });

        try {
          await this.processOperation(op);
          await offlineStorage.removePendingOperation(op.id);
          successCount++;
        } catch (error: any) {
          console.error(`[SyncManager] Failed to sync operation ${op.id}:`, error);
          failedCount++;

          // Update retry count
          await offlineStorage.updatePendingOperation(op.id, {
            retryCount: op.retryCount + 1,
            error: error.message || 'Unknown error',
          });

          // Move to failed operations if retry count exceeds limit
          if (op.retryCount >= 5) {
            console.warn(`[SyncManager] Operation ${op.id} exceeded retry limit, moving to failed operations`);
            await offlineStorage.moveToFailedOperations(op);
            await offlineStorage.removePendingOperation(op.id);
          }
        }
      }

      await offlineStorage.updateSyncStatus({
        lastSync: Date.now(),
        pendingCount: failedCount,
        failedCount,
      });

      this.emit({
        type: 'sync-complete',
        message: `Sinkronisasi selesai: ${successCount} berhasil, ${failedCount} gagal`,
      });

    } catch (error: any) {
      console.error('[SyncManager] Sync error:', error);
      this.emit({
        type: 'sync-error',
        message: 'Gagal melakukan sinkronisasi',
        error,
      });
    } finally {
      this.isSyncing = false;
    }
  }

  // === PROCESS INDIVIDUAL OPERATION ===

  private async processOperation(op: PendingOperation): Promise<void> {
    if (!this.SUPPORTED_TABLES.includes(op.table)) {
      throw new Error(`Unsupported table: ${op.table}`);
    }

    switch (op.operation) {
      case 'INSERT':
        await this.syncInsert(op);
        break;
      case 'UPDATE':
        await this.syncUpdate(op);
        break;
      case 'DELETE':
        await this.syncDelete(op);
        break;
      default:
        throw new Error(`Unknown operation: ${op.operation}`);
    }
  }

  private async syncInsert(op: PendingOperation): Promise<void> {
    const { error } = await supabase
      .from(op.table)
      .insert(op.data);

    if (error) throw error;
  }

  private async syncUpdate(op: PendingOperation): Promise<void> {
    const { id, ...updateData } = op.data;
    
    const { error } = await supabase
      .from(op.table)
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  }

  private async syncDelete(op: PendingOperation): Promise<void> {
    const { error } = await supabase
      .from(op.table)
      .delete()
      .eq('id', op.data.id);

    if (error) throw error;
  }

  // === HELPER METHODS ===

  async getPendingCount(): Promise<number> {
    const operations = await offlineStorage.getPendingOperations();
    return operations.length;
  }

  async getLastSyncTime(): Promise<number> {
    const status = await offlineStorage.getSyncStatus();
    return status.lastSync;
  }

  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  // === MANUAL OPERATIONS ===

  async queueInsert(table: string, data: any): Promise<string> {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }
    return offlineStorage.addPendingOperation({
      table,
      operation: 'INSERT',
      data,
    });
  }

  async queueUpdate(table: string, data: any): Promise<string> {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }
    return offlineStorage.addPendingOperation({
      table,
      operation: 'UPDATE',
      data,
    });
  }

  async queueDelete(table: string, id: string): Promise<string> {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }
    return offlineStorage.addPendingOperation({
      table,
      operation: 'DELETE',
      data: { id },
    });
  }
}

export const syncManager = new SyncManager();
