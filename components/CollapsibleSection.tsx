import React, { useState } from 'react';
import { ChevronDownIcon, CheckCircleIcon, AlertCircleIcon } from '../constants';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    status?: 'valid' | 'warning' | 'error' | 'info';
    statusText?: string;
    icon?: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    defaultExpanded = false,
    status,
    statusText,
    icon,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    
    const getStatusIcon = () => {
        switch (status) {
            case 'valid':
                return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
            case 'warning':
                return <AlertCircleIcon className="w-4 h-4 text-orange-500" />;
            case 'error':
                return <AlertCircleIcon className="w-4 h-4 text-red-500" />;
            default:
                return null;
        }
    };
    
    const getStatusColor = () => {
        switch (status) {
            case 'valid':
                return 'text-green-500';
            case 'warning':
                return 'text-orange-500';
            case 'error':
                return 'text-red-500';
            case 'info':
                return 'text-blue-500';
            default:
                return 'text-brand-text-secondary';
        }
    };
    
    return (
        <div className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none border md:border-0 border-brand-border overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 md:p-0 md:pb-2 hover:bg-brand-input md:hover:bg-transparent transition-colors border-b border-brand-border"
            >
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                            {icon}
                        </div>
                    )}
                    <div className="text-left">
                        <h4 className="text-sm md:text-base font-semibold text-gradient">
                            {title}
                        </h4>
                        {statusText && (
                            <p className={`text-xs ${getStatusColor()} mt-0.5`}>
                                {statusText}
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {status && getStatusIcon()}
                    <ChevronDownIcon 
                        className={`w-5 h-5 text-brand-text-secondary transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                        }`}
                    />
                </div>
            </button>
            
            {/* Content */}
            <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="p-4 md:p-0 md:pt-5 space-y-5">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default CollapsibleSection;
