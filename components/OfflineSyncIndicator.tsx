/**
 * Offline Sync Indicator Component
 * Menampilkan status koneksi dan sinkronisasi
 */

import React, { useState } from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { AlertCircleIcon } from '../constants';
import FailedSyncModal from './FailedSyncModal';

// Icons
const CloudIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
  </svg>
);

const CloudOffIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const RefreshCwIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <polyline points="1 20 1 14 7 14"></polyline>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
  </svg>
);

export const OfflineSyncIndicator: React.FC = () => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    lastSync,
    syncMessage,
    syncProgress,
    syncTotal,
    triggerSync,
    failedCount,
  } = useOfflineSync();
  
  const [showFailedModal, setShowFailedModal] = useState(false);

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Belum pernah';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} hari lalu`;
    if (hours > 0) return `${hours} jam lalu`;
    if (minutes > 0) return `${minutes} menit lalu`;
    return 'Baru saja';
  };

  return (
    <div className="fixed bottom-20 xl:bottom-4 right-4 z-50">
      <div className={`
        bg-brand-surface 
        border border-brand-border 
        rounded-xl 
        shadow-lg 
        p-3
        min-w-[280px]
        transition-all duration-300
        ${!isOnline || pendingCount > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        {/* Status Header */}
        <div className="flex items-center gap-3 mb-2">
          {isOnline ? (
            isSyncing ? (
              <RefreshCwIcon className="w-5 h-5 text-blue-500 animate-spin" />
            ) : (
              <CloudIcon className="w-5 h-5 text-green-500" />
            )
          ) : (
            <CloudOffIcon className="w-5 h-5 text-red-500" />
          )}
          
          <div className="flex-1">
            <div className="text-sm font-semibold text-brand-text-primary">
              {isOnline ? (isSyncing ? 'Menyinkronkan...' : 'Online') : 'Offline'}
            </div>
            {pendingCount > 0 && (
              <div className="text-xs text-brand-text-secondary">
                {pendingCount} data menunggu sinkronisasi
              </div>
            )}
          </div>

          {isOnline && !isSyncing && pendingCount > 0 && (
            <button
              onClick={triggerSync}
              className="
                p-1.5 
                rounded-lg 
                hover:bg-brand-input 
                transition-colors
                text-brand-accent
              "
              title="Sinkronkan sekarang"
            >
              <RefreshCwIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sync Progress */}
        {isSyncing && syncTotal > 0 && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-brand-text-secondary mb-1">
              <span>{syncMessage}</span>
              <span>{syncProgress}/{syncTotal}</span>
            </div>
            <div className="w-full bg-brand-input rounded-full h-1.5">
              <div
                className="bg-brand-accent h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(syncProgress / syncTotal) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Last Sync Info */}
        {!isSyncing && lastSync && (
          <div className="text-xs text-brand-text-secondary">
            Terakhir disinkronkan: {formatLastSync(lastSync)}
          </div>
        )}

        {/* Offline Message */}
        {!isOnline && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircleIcon className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-800">
                Anda sedang offline. Data akan disimpan secara lokal dan disinkronkan otomatis saat online kembali.
              </div>
            </div>
          </div>
        )}

        {/* Failed Operations Warning */}
        {failedCount > 0 && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircleIcon className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs text-red-800 mb-1">
                  {failedCount} operasi gagal disinkronkan
                </div>
                <button
                  onClick={() => setShowFailedModal(true)}
                  className="text-xs text-red-600 underline hover:text-red-700"
                >
                  Lihat detail
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Failed Sync Modal */}
      <FailedSyncModal
        isOpen={showFailedModal}
        onClose={() => setShowFailedModal(false)}
        onRetrySuccess={() => {
          // Refresh counts after successful retry
          triggerSync();
        }}
      />
    </div>
  );
};
