import React, { useState } from 'react';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

interface ChartDataPoint {
    label: string;
    income: number;
    expense: number;
    balance: number;
}

interface InteractiveCashflowChartProps {
    data: ChartDataPoint[];
}

const InteractiveCashflowChart: React.FC<InteractiveCashflowChartProps> = React.memo(({ data }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; data: ChartDataPoint } | null>(null);
    const width = 800;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 40, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 rounded-2xl bg-brand-bg border-2 border-dashed border-brand-border flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-brand-text-light mb-1">Belum Ada Data Cashflow</p>
                <p className="text-xs text-brand-text-secondary">Mulai catat transaksi untuk melihat grafik cashflow</p>
            </div>
        );
    }

    const maxBarValue = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);
    const minBalance = Math.min(...data.map(d => d.balance), 0);
    const maxBalance = Math.max(...data.map(d => d.balance), 1);

    const bandWidth = chartWidth / data.length;
    const barWidth = Math.max(2, bandWidth * 0.4);

    const xScale = (index: number) => padding.left + index * bandWidth + bandWidth / 2;
    const yBarScale = (value: number) => chartHeight - (value / maxBarValue) * chartHeight;
    const yLineScale = (value: number) => {
        const range = maxBalance - minBalance;
        if (range === 0) return chartHeight / 2;
        return chartHeight - ((value - minBalance) / range) * chartHeight;
    };
    
    const balancePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${padding.top + yLineScale(d.balance)}`).join(' ');

    const handleMouseMove = (e: React.MouseEvent<SVGRectElement>, index: number) => {
        const svg = e.currentTarget.ownerSVGElement;
        if (svg) {
            const point = svg.createSVGPoint();
            point.x = e.clientX;
            point.y = e.clientY;
            const { x, y } = point.matrixTransform(svg.getScreenCTM()?.inverse());
            setTooltip({ x, y: y - 10, data: data[index] });
        }
    };
    const handleMouseLeave = () => setTooltip(null);
    
    // Y-Axis grid lines and labels for bars
    const yBarAxisLabels = Array.from({ length: 5 }, (_, i) => {
        const value = maxBarValue * (i / 4);
        return { value: (value/1_000_000).toFixed(1), y: padding.top + yBarScale(value) };
    });

    return (
        <div className="relative bg-brand-bg/30 rounded-xl p-4">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <defs><clipPath id="chartArea"><rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} /></clipPath></defs>
                
                {/* Y-axis grid and labels */}
                {yBarAxisLabels.map(({ value, y }, i) => (
                    <g key={i} className="text-xs text-brand-text-secondary">
                        <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeDasharray="2,3" opacity="0.2" />
                        <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="currentColor">{value}jt</text>
                    </g>
                ))}

                {/* X-axis labels */}
                {data.map((d, i) => {
                    if (data.length <= 12 || i % Math.ceil(data.length / 10) === 0) {
                         return (
                            <text key={i} x={xScale(i)} y={height - padding.bottom + 15} textAnchor="middle" fontSize="10" className="fill-current text-brand-text-secondary">
                                {d.label}
                            </text>
                        );
                    }
                    return null;
                })}

                <g clipPath="url(#chartArea)">
                    {/* Bars */}
                    {data.map((d, i) => (
                        <g key={`bar-${i}`}>
                             <rect
                                x={xScale(i) - barWidth / 2}
                                y={padding.top + yBarScale(d.expense)}
                                width={barWidth}
                                height={chartHeight - yBarScale(d.expense)}
                                fill="#FB5D5D" // brand-danger
                                className="transition-opacity"
                                opacity={tooltip && tooltip.data.label === d.label ? 1 : 0.7}
                                rx="4"
                            />
                            <rect
                                x={xScale(i) - barWidth / 2}
                                y={padding.top + yBarScale(d.income)}
                                width={barWidth}
                                height={chartHeight - yBarScale(d.income)}
                                fill="#34D399" // brand-success
                                className="transition-opacity"
                                opacity={tooltip && tooltip.data.label === d.label ? 1 : 0.8}
                                rx="4"
                            />
                        </g>
                    ))}

                    {/* Balance Line */}
                    <path d={balancePath} fill="none" stroke="#FFF27A" strokeWidth="2.5" />
                    {data.map((d, i) => (
                         <circle key={`point-${i}`} cx={xScale(i)} cy={padding.top + yLineScale(d.balance)} r={tooltip && tooltip.data.label === d.label ? 5 : 3} fill="#FFF27A" stroke="#2E3137" strokeWidth="1.5" className="transition-all" />
                    ))}
                </g>

                {/* Interaction layer */}
                {data.map((d, i) => (
                    <rect key={`interaction-${i}`} x={padding.left + i*bandWidth} y={padding.top} width={bandWidth} height={chartHeight} fill="transparent"
                        onMouseMove={(e) => handleMouseMove(e, i)}
                        onMouseLeave={handleMouseLeave}
                    />
                ))}
                
                {tooltip && (
                    <g className="pointer-events-none transition-opacity" transform={`translate(${tooltip.x}, ${tooltip.y})`}>
                       <foreignObject x="-95" y="-135" width="190" height="125">
                           <div className="p-3.5 bg-gradient-to-br from-brand-surface to-brand-bg border-2 border-brand-accent/30 text-white rounded-xl shadow-2xl text-xs backdrop-blur-sm">
                                <p className="font-bold mb-2.5 text-center border-b border-brand-accent/30 pb-2 text-brand-accent">{tooltip.data.label}</p>
                                <div className="space-y-2">
                                   <div className="flex items-center justify-between gap-3">
                                       <div className="flex items-center gap-2">
                                           <span className="w-3 h-3 bg-brand-success rounded-full"></span>
                                           <span className="text-brand-text-secondary">Pemasukan</span>
                                       </div>
                                       <span className="font-semibold text-brand-success">{formatCurrency(tooltip.data.income)}</span>
                                   </div>
                                   <div className="flex items-center justify-between gap-3">
                                       <div className="flex items-center gap-2">
                                           <span className="w-3 h-3 bg-brand-danger rounded-full"></span>
                                           <span className="text-brand-text-secondary">Pengeluaran</span>
                                       </div>
                                       <span className="font-semibold text-brand-danger">{formatCurrency(tooltip.data.expense)}</span>
                                   </div>
                                   <div className="flex items-center justify-between gap-3 pt-2 border-t border-brand-border">
                                       <div className="flex items-center gap-2">
                                           <span className="w-3 h-3 bg-brand-accent rounded-full"></span>
                                           <span className="text-brand-text-secondary">Saldo</span>
                                       </div>
                                       <span className="font-bold text-brand-accent">{formatCurrency(tooltip.data.balance)}</span>
                                   </div>
                                </div>
                            </div>
                       </foreignObject>
                    </g>
                )}
            </svg>
        </div>
    );
});

export default InteractiveCashflowChart;