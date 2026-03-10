import React from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message, // Ignored
  size = 'medium',
  className = ''
}) => {
  const sizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-10 h-10',
    large: 'w-16 h-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="relative flex justify-center items-center">
        <div className={`absolute border-4 border-brand-accent/20 rounded-full ${sizeClasses[size]}`}></div>
        <div className={`animate-spin border-4 border-transparent border-t-brand-accent rounded-full ${sizeClasses[size]}`}></div>
      </div>
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