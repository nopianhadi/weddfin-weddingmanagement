import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = React.memo(({ title, subtitle, children, icon }) => {
  return (
    <div className="mb-6">
      {/* Header Card with Blue Background and White Text */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 border border-blue-500 rounded-2xl p-4 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title Section with Icon */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {icon && (
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
                  {icon}
                </div>
              )}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-white">
                {title}
              </h2>
            </div>
            {subtitle && (
              <p className="text-sm sm:text-base text-white/90 pl-0 sm:pl-[52px] md:pl-[60px]">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Action Buttons */}
          {children && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:flex-shrink-0">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default PageHeader;