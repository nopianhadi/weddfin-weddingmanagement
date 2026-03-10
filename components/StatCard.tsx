import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
  iconBgColor?: string;
  iconColor?: string;
  subtitle?: string;
  colorVariant?: 'blue' | 'orange' | 'purple' | 'pink' | 'green' | 'default';
  description?: string; // Detail description untuk modal
  onClick?: () => void; // Handler untuk klik
  image?: string; // Gambar opsional untuk widget
}

const StatCard: React.FC<StatCardProps> = React.memo(({
  icon,
  title,
  value,
  change,
  changeType,
  iconBgColor = 'bg-gray-700/50',
  iconColor = 'text-brand-text-primary',
  subtitle,
  colorVariant = 'default',
  description,
  onClick,
  image
}) => {

  const changeColor = changeType === 'increase' ? 'text-brand-success' : 'text-brand-danger';

  // Color variants - Glass with vibrant colors
  const colorVariants = {
    blue: {
      gradient: 'from-blue-500/20 via-indigo-500/15 to-cyan-400/10',
      border: 'border-blue-400/50',
      hoverBorder: 'hover:border-blue-400/80',
      decorative: 'bg-blue-400/25',
      iconBg: 'bg-blue-500/30',
      iconColor: 'text-blue-200'
    },
    orange: {
      gradient: 'from-orange-500/20 via-amber-500/15 to-yellow-400/10',
      border: 'border-orange-400/50',
      hoverBorder: 'hover:border-orange-400/80',
      decorative: 'bg-orange-400/25',
      iconBg: 'bg-orange-500/30',
      iconColor: 'text-orange-200'
    },
    purple: {
      gradient: 'from-purple-500/20 via-violet-500/15 to-fuchsia-400/10',
      border: 'border-purple-400/50',
      hoverBorder: 'hover:border-purple-400/80',
      decorative: 'bg-purple-400/25',
      iconBg: 'bg-purple-500/30',
      iconColor: 'text-purple-200'
    },
    pink: {
      gradient: 'from-pink-500/20 via-rose-500/15 to-red-400/10',
      border: 'border-pink-400/50',
      hoverBorder: 'hover:border-pink-400/80',
      decorative: 'bg-pink-400/25',
      iconBg: 'bg-pink-500/30',
      iconColor: 'text-pink-200'
    },
    green: {
      gradient: 'from-green-500/20 via-emerald-500/15 to-teal-400/10',
      border: 'border-green-400/50',
      hoverBorder: 'hover:border-green-400/80',
      decorative: 'bg-green-400/25',
      iconBg: 'bg-green-500/30',
      iconColor: 'text-green-200'
    },
    default: {
      gradient: 'from-white/15 via-white/10 to-white/5',
      border: 'border-white/30',
      hoverBorder: 'hover:border-white/50',
      decorative: 'bg-white/15',
      iconBg: iconBgColor,
      iconColor: iconColor
    }
  };

  const colors = colorVariants[colorVariant];

  const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
  );

  const TrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );

  return (
    <div
      onClick={onClick}
      className={`
      relative
      p-4 sm:p-5
      rounded-2xl sm:rounded-3xl 
      shadow-lg sm:shadow-xl
      border ${colors.border}
      hover:shadow-xl sm:hover:shadow-2xl 
      ${colors.hoverBorder}
      hover:scale-[1.02]
      transition-all duration-300 ease-out
      group
      overflow-hidden
      h-full
      min-h-[110px] sm:min-h-[130px]
      backdrop-blur-xl
      bg-gradient-to-br ${colors.gradient}
      ${onClick ? 'cursor-pointer' : ''}
    `}>
      {/* Ultra glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/3 to-transparent"></div>

      {/* Shine effect on hover - more subtle */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-white/5 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1200"></div>
      </div>

      {/* Decorative circles - ultra transparent */}
      <div className={`absolute -right-4 -top-4 w-16 h-16 sm:w-20 sm:h-20 rounded-full ${colors.decorative} blur-3xl opacity-30`}></div>
      <div className={`absolute -right-2 top-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full ${colors.decorative} opacity-20 backdrop-blur-sm`}></div>
      <div className={`absolute right-4 top-8 w-8 h-8 rounded-full ${colors.decorative} opacity-15`}></div>

      {/* Noise texture for glass effect */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`
      }}></div>

      <div className="relative z-10 h-full flex flex-col">
        {/* Icon and Title Section */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className={`
            relative
            w-10 h-10 sm:w-12 sm:h-12
            rounded-xl sm:rounded-2xl
            flex items-center justify-center 
            flex-shrink-0 
            ${colors.iconBg} ${colors.iconColor}
            shadow-md sm:shadow-lg
            group-hover:scale-110
            group-hover:shadow-xl
            transition-all duration-300
            backdrop-blur-md
            border border-white/10
            overflow-hidden
          `}>
            {/* Glass shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {image ? (
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-5 h-5 sm:w-6 sm:h-6">
                {icon}
              </div>
            )}
          </div>

          {change && (
            <div className={`
              relative
              flex items-center 
              text-[10px] sm:text-xs 
              font-semibold 
              ${changeColor}
              gap-0.5 sm:gap-1
              bg-white/20
              backdrop-blur-md
              px-2 py-0.5 sm:px-2.5 sm:py-1
              rounded-full
              shadow-sm
              flex-shrink-0
              border border-white/20
              overflow-hidden
            `}>
              {/* Glass overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              {changeType === 'increase' ? (
                <TrendingUpIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              ) : (
                <TrendingDownIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              )}
              <span>{change}</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-end">
          <p className="
            text-[10px] sm:text-xs
            text-brand-text-secondary/90
            font-medium 
            mb-1 sm:mb-2
            leading-tight
          ">
            {title}
          </p>

          <p className="
            text-lg sm:text-2xl lg:text-3xl
            font-bold 
            text-brand-text-light 
            break-words
            group-hover:text-brand-accent
            transition-colors duration-300
            leading-tight
            mb-0.5 sm:mb-1
          ">
            {value}
          </p>

          {subtitle && (
            <p className="
              text-[10px] sm:text-xs 
              text-brand-text-secondary/70
              mt-0.5 sm:mt-1
              line-clamp-2
              leading-relaxed
            ">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

export default StatCard;