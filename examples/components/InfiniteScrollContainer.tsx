import React from 'react';
import { LoadingState } from './LoadingState';

interface InfiniteScrollContainerProps {
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  onRetry: () => void;
  loadingRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
  className?: string;
  loadingMessage?: string;
  noMoreMessage?: string;
}

export const InfiniteScrollContainer: React.FC<InfiniteScrollContainerProps> = ({
  loading,
  hasMore,
  error,
  onRetry,
  loadingRef,
  children,
  className = '',
  loadingMessage = 'Memuat lebih banyak...',
  noMoreMessage = 'Semua data telah dimuat'
}) => {
  return (
    <div className={`infinite-scroll-container ${className}`}>
      {children}
      
      {/* Loading trigger element */}
      <div ref={loadingRef} className="h-4" />
      
      {/* Loading state */}
      {loading && (
        <div className="py-4">
          <LoadingState message={loadingMessage} size="small" />
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="py-4 text-center">
          <div className="text-red-600 mb-2">❌ Gagal memuat data</div>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Coba Lagi
          </button>
        </div>
      )}
      
      {/* No more data */}
      {!loading && !hasMore && !error && (
        <div className="py-4 text-center text-gray-500 text-sm">
          {noMoreMessage}
        </div>
      )}
    </div>
  );
};