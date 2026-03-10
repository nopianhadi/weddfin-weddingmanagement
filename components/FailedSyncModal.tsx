/**
 * Failed Sync Modal
 * Menampilkan operasi yang gagal sync dan memberikan opsi untuk retry
 */

import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { offlineStorage, PendingOperation } from '../services/offlineStorage';
import { syncManager } from '../services/syncManager';
import { AlertCircleIcon, Trash2Icon, CheckCircleIcon } from '../constants';

// RefreshCw Icon
const RefreshCwIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

interface FailedSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetrySuccess?: () => void;
}

const FailedSyncModal: React.FC<FailedSyncModalProps> = ({ isOpen, onClose, onRetrySuccess }) => {
  const [failedOps, setFailedOps] = useState<PendingOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFailedOperations();
    }
  }, [isOpen]);

  const loadFailedOperations = async () => {
    try {
      const ops = await offlineStorage.getFailedOperations();
      setFailedOps(ops);
    } catch (error) {
      console.error('[FailedSyncModal] Error loading failed operations:', error);
    }
  };

  const handleRetry = async (opId: string) => {
    setRetrying(opId);
    try {
      await offlineStorage.retryFailedOperation(opId);
      await syncManager.sync();
      await loadFailedOperations();
      onRetrySuccess?.();
    } catch (error) {
      console.error('[FailedSyncModal] Retry failed:', error);
      alert('Gagal mencoba ulang operasi. Silakan coba lagi.');
    } finally {
      setRetrying(null);
    }
  };

  const handleRetryAll = async () => {
    setLoading(true);
    try {
      for (const op of failedOps) {
        await offlineStorage.retryFailedOperation(op.id);
      }
      await syncManager.sync();
      await loadFailedOperations();
      onRetrySuccess?.();
    } catch (error) {
      console.error('[FailedSyncModal] Retry all failed:', error);
      alert('Gagal mencoba ulang semua operasi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus semua operasi yang gagal? Data tidak dapat dikembalikan.')) {
      return;
    }

    setLoading(true);
    try {
      await offlineStorage.clearFailedOperations();
      await loadFailedOperations();
    } catch (error) {
      console.error('[FailedSyncModal] Clear all failed:', error);
      alert('Gagal menghapus operasi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const getOperationLabel = (op: PendingOperation): string => {
    const tableLabels: Record<string, string> = {
      clients: 'Pengantin',
      projects: 'Acara',
      transactions: 'Transaksi',
      team_members: 'Anggota Tim',
      leads: 'Prospek',
    };

    const operationLabels: Record<string, string> = {
      INSERT: 'Tambah',
      UPDATE: 'Update',
      DELETE: 'Hapus',
    };

    return `${operationLabels[op.operation] || op.operation} ${tableLabels[op.table] || op.table}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Operasi yang Gagal Sinkronisasi" size="2xl">
      <div className="space-y-4">
        {failedOps.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <p className="text-brand-text-secondary">Tidak ada operasi yang gagal</p>
          </div>
        ) : (
          <>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-500 mb-1">
                    {failedOps.length} operasi gagal disinkronkan
                  </p>
                  <p className="text-xs text-brand-text-secondary">
                    Operasi ini telah dicoba {failedOps[0]?.retryCount || 0}x dan gagal.
                    Anda dapat mencoba ulang atau menghapusnya.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {failedOps.map((op) => (
                <div
                  key={op.id}
                  className="bg-brand-surface border border-brand-border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-brand-text-primary mb-1">
                        {getOperationLabel(op)}
                      </p>
                      <p className="text-xs text-brand-text-secondary mb-2">
                        {new Date(op.timestamp).toLocaleString('id-ID')}
                      </p>
                      {op.error && (
                        <p className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
                          Error: {op.error}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRetry(op.id)}
                      disabled={retrying === op.id || loading}
                      className="button-secondary !py-2 !px-3 !text-xs flex items-center gap-2"
                    >
                      <RefreshCwIcon className={`w-4 h-4 ${retrying === op.id ? 'animate-spin' : ''}`} />
                      {retrying === op.id ? 'Mencoba...' : 'Coba Ulang'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-brand-border">
              <button
                onClick={handleClearAll}
                disabled={loading}
                className="button-secondary !text-red-500 hover:!bg-red-500/10 flex items-center gap-2"
              >
                <Trash2Icon className="w-4 h-4" />
                Hapus Semua
              </button>
              <button
                onClick={handleRetryAll}
                disabled={loading}
                className="button-primary flex items-center gap-2"
              >
                <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Mencoba Semua...' : 'Coba Ulang Semua'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default FailedSyncModal;
