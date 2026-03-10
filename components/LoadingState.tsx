import React from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Memuat data...',
  size = 'medium',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`}></div>
      <p className="mt-2 text-gray-600 text-sm">{message}</p>
    </div>
  );
};

interface DataLoadingWrapperProps {
  loading: boolean;
  loaded: boolean;
  error?: string | null;
  children: React.ReactNode;
  loadingMessage?: string;
  onRetry?: () => void;
}

export const DataLoadingWrapper: React.FC<DataLoadingWrapperProps> = ({
  loading,
  loaded,
  error,
  children,
  loadingMessage,
  onRetry
}) => {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-red-600 mb-2">❌ Gagal memuat data</div>
        <p className="text-gray-600 text-sm mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Coba Lagi
          </button>
        )}
      </div>
    );
  }

  if (loading && !loaded) {
    return <LoadingState message={loadingMessage} />;
  }

  return <>{children}</>;
};