import React from 'react';

interface LoadMoreButtonProps {
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  className?: string;
}

export const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  loading,
  hasMore,
  onLoadMore,
  className = ''
}) => {
  if (!hasMore) {
    return (
      <div className={`text-center py-4 text-gray-500 ${className}`}>
        Semua data telah dimuat
      </div>
    );
  }

  return (
    <div className={`text-center py-4 ${className}`}>
      <button
        onClick={onLoadMore}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
      </button>
    </div>
  );
};