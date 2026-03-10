import React from 'react';
import Modal from './Modal';

interface StatCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  description?: string;
  colorVariant?: 'blue' | 'orange' | 'purple' | 'pink' | 'green' | 'default';
  children?: React.ReactNode; // Untuk konten tambahan seperti list, chart, dll
}

const StatCardModal: React.FC<StatCardModalProps> = ({
  isOpen,
  onClose,
  icon,
  title,
  value,
  subtitle,
  description,
  colorVariant = 'default',
  children
}) => {
  
  const colorVariants = {
    blue: {
      gradient: 'from-blue-500/20 via-indigo-500/15 to-cyan-400/10',
      iconBg: 'bg-blue-500/30',
      iconColor: 'text-blue-200',
      textColor: 'text-blue-600'
    },
    orange: {
      gradient: 'from-orange-500/20 via-amber-500/15 to-yellow-400/10',
      iconBg: 'bg-orange-500/30',
      iconColor: 'text-orange-200',
      textColor: 'text-orange-600'
    },
    purple: {
      gradient: 'from-purple-500/20 via-violet-500/15 to-fuchsia-400/10',
      iconBg: 'bg-purple-500/30',
      iconColor: 'text-purple-200',
      textColor: 'text-purple-600'
    },
    pink: {
      gradient: 'from-pink-500/20 via-rose-500/15 to-red-400/10',
      iconBg: 'bg-pink-500/30',
      iconColor: 'text-pink-200',
      textColor: 'text-pink-600'
    },
    green: {
      gradient: 'from-green-500/20 via-emerald-500/15 to-teal-400/10',
      iconBg: 'bg-green-500/30',
      iconColor: 'text-green-200',
      textColor: 'text-green-600'
    },
    default: {
      gradient: 'from-white/15 via-white/10 to-white/5',
      iconBg: 'bg-gray-700/50',
      iconColor: 'text-brand-text-primary',
      textColor: 'text-brand-accent'
    }
  };
  
  const colors = colorVariants[colorVariant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-6">
        {/* Header dengan Icon dan Value */}
        <div className={`
          relative
          p-6
          rounded-2xl
          bg-gradient-to-br ${colors.gradient}
          border border-brand-border
          backdrop-blur-xl
          overflow-hidden
        `}>
          {/* Decorative background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/3 to-transparent"></div>
          
          <div className="relative z-10 flex items-center gap-4">
            {/* Icon */}
            <div className={`
              w-16 h-16
              rounded-2xl
              flex items-center justify-center
              ${colors.iconBg} ${colors.iconColor}
              shadow-lg
              backdrop-blur-md
              border border-white/10
              flex-shrink-0
            `}>
              <div className="w-8 h-8">
                {icon}
              </div>
            </div>
            
            {/* Value dan Subtitle */}
            <div className="flex-1">
              <p className={`
                text-4xl font-bold
                ${colors.textColor}
                mb-1
              `}>
                {value}
              </p>
              {subtitle && (
                <p className="text-sm text-brand-text-secondary">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Description */}
        {description && (
          <div className="bg-brand-bg p-4 rounded-xl border border-brand-border">
            <h4 className="font-semibold text-brand-text-light mb-2">Deskripsi</h4>
            <p className="text-sm text-brand-text-secondary leading-relaxed whitespace-pre-line">
              {description}
            </p>
          </div>
        )}
        
        {/* Additional Content */}
        {children && (
          <div>
            {children}
          </div>
        )}
        
        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-brand-border">
          <button
            onClick={onClose}
            className="button-secondary"
          >
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StatCardModal;
