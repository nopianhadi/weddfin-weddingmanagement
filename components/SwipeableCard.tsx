import React, { useState, useRef, useEffect } from 'react';
import { PencilIcon, Trash2Icon, Share2Icon, StarIcon, CheckCircleIcon } from '../constants';

interface SwipeAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    onAction: () => void;
}

interface SwipeableCardProps {
    children: React.ReactNode;
    leftActions?: SwipeAction[];
    rightActions?: SwipeAction[];
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    threshold?: number;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
    children,
    leftActions = [],
    rightActions = [],
    onSwipeLeft,
    onSwipeRight,
    threshold = 80,
}) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const cardRef = useRef<HTMLDivElement>(null);
    
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        setStartX(e.touches[0].clientX);
    };
    
    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        setOffsetX(diff);
    };
    
    const handleTouchEnd = () => {
        setIsDragging(false);
        
        if (Math.abs(offsetX) > threshold) {
            if (offsetX > 0 && onSwipeRight) {
                onSwipeRight();
            } else if (offsetX < 0 && onSwipeLeft) {
                onSwipeLeft();
            }
        }
        
        // Reset position
        setTimeout(() => setOffsetX(0), 300);
    };
    
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartX(e.clientX);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const diff = e.clientX - startX;
        setOffsetX(diff);
    };
    
    const handleMouseUp = () => {
        setIsDragging(false);
        
        if (Math.abs(offsetX) > threshold) {
            if (offsetX > 0 && onSwipeRight) {
                onSwipeRight();
            } else if (offsetX < 0 && onSwipeLeft) {
                onSwipeLeft();
            }
        }
        
        setTimeout(() => setOffsetX(0), 300);
    };
    
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, startX]);
    
    const showLeftActions = offsetX > 20;
    const showRightActions = offsetX < -20;
    const actionsOpacity = Math.min(Math.abs(offsetX) / threshold, 1);
    
    return (
        <div className="relative overflow-hidden rounded-2xl">
            {/* Left Actions */}
            {leftActions.length > 0 && (
                <div 
                    className="absolute left-0 top-0 bottom-0 flex items-center gap-2 px-4 transition-opacity"
                    style={{ 
                        opacity: showLeftActions ? actionsOpacity : 0,
                        pointerEvents: showLeftActions ? 'auto' : 'none'
                    }}
                >
                    {leftActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                action.onAction();
                                setOffsetX(0);
                            }}
                            className="flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all hover:scale-110"
                            style={{ 
                                backgroundColor: action.bgColor,
                                color: action.color
                            }}
                            title={action.label}
                        >
                            {action.icon}
                            <span className="text-xs font-semibold mt-1">{action.label}</span>
                        </button>
                    ))}
                </div>
            )}
            
            {/* Right Actions */}
            {rightActions.length > 0 && (
                <div 
                    className="absolute right-0 top-0 bottom-0 flex items-center gap-2 px-4 transition-opacity"
                    style={{ 
                        opacity: showRightActions ? actionsOpacity : 0,
                        pointerEvents: showRightActions ? 'auto' : 'none'
                    }}
                >
                    {rightActions.map((action) => (
                        <button
                            key={action.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                action.onAction();
                                setOffsetX(0);
                            }}
                            className="flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all hover:scale-110"
                            style={{ 
                                backgroundColor: action.bgColor,
                                color: action.color
                            }}
                            title={action.label}
                        >
                            {action.icon}
                            <span className="text-xs font-semibold mt-1">{action.label}</span>
                        </button>
                    ))}
                </div>
            )}
            
            {/* Card Content */}
            <div
                ref={cardRef}
                className="relative transition-transform duration-300 ease-out cursor-grab active:cursor-grabbing"
                style={{ 
                    transform: `translateX(${offsetX}px)`,
                    touchAction: 'pan-y'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
            >
                {children}
            </div>
        </div>
    );
};

// Preset action configurations
export const SwipeActions = {
    edit: (onEdit: () => void): SwipeAction => ({
        id: 'edit',
        label: 'Edit',
        icon: <PencilIcon className="w-5 h-5" />,
        color: '#3b82f6',
        bgColor: '#3b82f620',
        onAction: onEdit,
    }),
    
    delete: (onDelete: () => void): SwipeAction => ({
        id: 'delete',
        label: 'Hapus',
        icon: <Trash2Icon className="w-5 h-5" />,
        color: '#ef4444',
        bgColor: '#ef444420',
        onAction: onDelete,
    }),
    
    share: (onShare: () => void): SwipeAction => ({
        id: 'share',
        label: 'Bagikan',
        icon: <Share2Icon className="w-5 h-5" />,
        color: '#10b981',
        bgColor: '#10b98120',
        onAction: onShare,
    }),
    
    favorite: (onFavorite: () => void): SwipeAction => ({
        id: 'favorite',
        label: 'Favorit',
        icon: <StarIcon className="w-5 h-5" />,
        color: '#eab308',
        bgColor: '#eab30820',
        onAction: onFavorite,
    }),
    
    complete: (onComplete: () => void): SwipeAction => ({
        id: 'complete',
        label: 'Selesai',
        icon: <CheckCircleIcon className="w-5 h-5" />,
        color: '#10b981',
        bgColor: '#10b98120',
        onAction: onComplete,
    }),
};

export default SwipeableCard;
