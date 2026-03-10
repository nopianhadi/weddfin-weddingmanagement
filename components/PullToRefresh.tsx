import React, { useState, useRef, useEffect } from 'react';
import { RefreshCwIcon } from '../constants';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    threshold?: number;
    disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
    onRefresh,
    children,
    threshold = 80,
    disabled = false,
}) => {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [startY, setStartY] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const handleTouchStart = (e: React.TouchEvent) => {
        if (disabled || isRefreshing) return;
        
        const scrollTop = containerRef.current?.scrollTop || 0;
        if (scrollTop === 0) {
            setStartY(e.touches[0].clientY);
        }
    };
    
    const handleTouchMove = (e: React.TouchEvent) => {
        if (disabled || isRefreshing || startY === 0) return;
        
        const currentY = e.touches[0].clientY;
        const distance = currentY - startY;
        
        if (distance > 0) {
            setPullDistance(Math.min(distance, threshold * 1.5));
        }
    };
    
    const handleTouchEnd = async () => {
        if (disabled || isRefreshing) return;
        
        if (pullDistance >= threshold) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } catch (error) {
                console.error('Refresh error:', error);
            } finally {
                setIsRefreshing(false);
            }
        }
        
        setPullDistance(0);
        setStartY(0);
    };
    
    const rotation = (pullDistance / threshold) * 360;
    const opacity = Math.min(pullDistance / threshold, 1);
    const scale = Math.min(0.5 + (pullDistance / threshold) * 0.5, 1);
    
    return (
        <div
            ref={containerRef}
            className="relative overflow-auto h-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull Indicator */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200"
                style={{
                    height: `${Math.min(pullDistance, threshold)}px`,
                    opacity: opacity,
                    transform: `translateY(-${threshold - pullDistance}px)`,
                }}
            >
                <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full bg-brand-accent text-white ${
                        isRefreshing ? 'animate-spin' : ''
                    }`}
                    style={{
                        transform: `scale(${scale}) rotate(${isRefreshing ? 0 : rotation}deg)`,
                    }}
                >
                    <RefreshCwIcon className="w-5 h-5" />
                </div>
            </div>
            
            {/* Content */}
            <div
                style={{
                    transform: `translateY(${isRefreshing ? threshold : pullDistance}px)`,
                    transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default PullToRefresh;
