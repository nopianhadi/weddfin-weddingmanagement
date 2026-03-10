import React, { useState } from 'react';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  className?: string;
  showValues?: boolean;
}

const DonutChart: React.FC<DonutChartProps> = React.memo(({ data, className = '', showValues = false }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-brand-bg border-2 border-dashed border-brand-border flex items-center justify-center mb-3">
                    <svg className="w-10 h-10 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <p className="text-sm text-brand-text-secondary">Tidak ada data untuk ditampilkan</p>
            </div>
        );
    }

    let accumulatedPercentage = 0;

    return (
        <div className={`flex flex-col md:flex-row items-center gap-6 ${className}`}>
            {/* Donut Chart */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
                <svg className="w-full h-full drop-shadow-lg" viewBox="0 0 36 36" transform="rotate(-90)">
                    {/* Background circle */}
                    <circle
                        cx="18" cy="18" r="15.9154943092"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        className="text-brand-bg opacity-30"
                    />
                    {/* Data segments */}
                    {data.map((item, index) => {
                        const percentage = (item.value / total) * 100;
                        const isHovered = hoveredIndex === index;
                        const element = (
                            <circle
                                key={index}
                                cx="18" cy="18" r="15.9154943092"
                                fill="transparent"
                                stroke={item.color}
                                strokeWidth={isHovered ? "4.5" : "3.5"}
                                strokeDasharray={`${percentage} ${100 - percentage}`}
                                strokeDashoffset={-accumulatedPercentage}
                                className="transition-all duration-300 cursor-pointer"
                                style={{ 
                                    filter: isHovered ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'none',
                                    opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        );
                        accumulatedPercentage += percentage;
                        return element;
                    })}
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xs text-brand-text-secondary">Total</p>
                    <p className="text-sm md:text-base font-bold text-brand-text-light">
                        {data.length}
                    </p>
                </div>
            </div>

            {/* Legend */}
            <div className="text-xs md:text-sm space-y-2 w-full">
                {data.map((item, index) => {
                    const percentage = ((item.value / total) * 100).toFixed(1);
                    const isHovered = hoveredIndex === index;
                    return (
                        <div 
                            key={item.label} 
                            className={`
                                flex items-center justify-between gap-3 p-2 rounded-lg
                                transition-all duration-200 cursor-pointer
                                ${isHovered ? 'bg-brand-bg shadow-sm scale-105' : 'hover:bg-brand-bg/50'}
                            `}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <span 
                                    className={`
                                        w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-200
                                        ${isHovered ? 'scale-125 ring-2 ring-offset-2 ring-offset-brand-surface' : ''}
                                    `}
                                    style={{ 
                                        backgroundColor: item.color
                                    }}
                                ></span>
                                <span className="text-brand-text-secondary truncate">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {showValues && (
                                    <span className="text-brand-text-primary font-medium text-xs">
                                        {typeof item.value === 'number' && item.value > 1000 
                                            ? formatCurrency(item.value) 
                                            : item.value}
                                    </span>
                                )}
                                <span className={`
                                    font-bold px-2 py-0.5 rounded-md
                                    ${isHovered ? 'bg-brand-accent/20 text-brand-accent' : 'text-brand-text-light'}
                                `}>
                                    {percentage}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default DonutChart;