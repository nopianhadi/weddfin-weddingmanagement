import React, { useState } from 'react';
import { PlusIcon, XIcon } from '../constants';

interface FABAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    color?: string;
    onClick: () => void;
}

interface FloatingActionButtonProps {
    actions: FABAction[];
    mainIcon?: React.ReactNode;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
    actions,
    mainIcon = <PlusIcon className="w-6 h-6" />,
    position = 'bottom-right',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const positionClasses = {
        'bottom-right': 'bottom-6 right-6',
        'bottom-left': 'bottom-6 left-6',
        'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    };
    
    const handleToggle = () => {
        setIsOpen(!isOpen);
    };
    
    const handleActionClick = (action: FABAction) => {
        action.onClick();
        setIsOpen(false);
    };
    
    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}
            
            {/* FAB Container */}
            <div className={`fixed ${positionClasses[position]} z-50`}>
                {/* Action Buttons */}
                <div
                    className={`absolute bottom-16 right-0 flex flex-col-reverse gap-3 transition-all duration-300 ${
                        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
                >
                    {actions.map((action, index) => (
                        <div
                            key={action.id}
                            className="flex items-center gap-3 animate-fade-in"
                            style={{
                                animationDelay: `${index * 50}ms`,
                            }}
                        >
                            {/* Label */}
                            <div className="bg-brand-surface px-3 py-2 rounded-lg shadow-lg border border-brand-border whitespace-nowrap">
                                <span className="text-sm font-semibold text-brand-text-light">
                                    {action.label}
                                </span>
                            </div>
                            
                            {/* Action Button */}
                            <button
                                onClick={() => handleActionClick(action)}
                                className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                                style={{
                                    backgroundColor: action.color || '#8b5cf6',
                                    color: 'white',
                                }}
                                title={action.label}
                            >
                                {action.icon}
                            </button>
                        </div>
                    ))}
                </div>
                
                {/* Main FAB */}
                <button
                    onClick={handleToggle}
                    className={`w-14 h-14 rounded-full bg-brand-accent hover:bg-brand-accent-hover text-white shadow-2xl flex items-center justify-center transition-all duration-300 ${
                        isOpen ? 'rotate-45 scale-110' : 'rotate-0 scale-100'
                    }`}
                    aria-label="Menu aksi cepat"
                >
                    {isOpen ? <XIcon className="w-6 h-6" /> : mainIcon}
                </button>
            </div>
            
            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </>
    );
};

export default FloatingActionButton;
