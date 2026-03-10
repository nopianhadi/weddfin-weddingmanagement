import React from 'react';
import { Project, ProjectStatusConfig } from '../types';
import { CheckCircleIcon, ClockIcon, AlertCircleIcon } from '../constants';

interface ProgressTrackerProps {
    project: Project;
    statusConfig: ProjectStatusConfig[];
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
    project,
    statusConfig,
}) => {
    const currentStatusIndex = statusConfig.findIndex(s => s.name === project.status);
    const overallProgress = currentStatusIndex >= 0 
        ? ((currentStatusIndex + 1) / statusConfig.length) * 100 
        : 0;
    
    const getStatusIcon = (statusName: string, index: number) => {
        if (index < currentStatusIndex) {
            return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
        }
        if (index === currentStatusIndex) {
            return (
                <div className="relative">
                    <div className="w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-500/20 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                </div>
            );
        }
        return (
            <div className="w-5 h-5 rounded-full border-2 border-brand-border bg-brand-bg" />
        );
    };
    
    const getStatusState = (index: number): 'completed' | 'current' | 'pending' => {
        if (index < currentStatusIndex) return 'completed';
        if (index === currentStatusIndex) return 'current';
        return 'pending';
    };
    
    return (
        <div className="space-y-6">
            {/* Overall Progress */}
            <div className="bg-brand-surface rounded-xl p-4 border border-brand-border">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-brand-text-secondary">
                        Progress Keseluruhan
                    </h4>
                    <span className="text-lg font-bold text-brand-accent">
                        {Math.round(overallProgress)}%
                    </span>
                </div>
                <div className="w-full h-3 bg-brand-bg rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-brand-accent to-brand-accent-hover transition-all duration-500 rounded-full"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
                {project.deadlineDate && (
                    <p className="text-xs text-brand-text-secondary mt-2 flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        Target selesai: {formatDate(project.deadlineDate)}
                    </p>
                )}
            </div>
            
            {/* Status Timeline */}
            <div className="space-y-1">
                {statusConfig.map((status, index) => {
                    const state = getStatusState(index);
                    const statusColor = status.color;
                    const isLast = index === statusConfig.length - 1;
                    
                    return (
                        <div key={status.id} className="relative">
                            {/* Connector Line */}
                            {!isLast && (
                                <div 
                                    className="absolute left-[10px] top-8 w-0.5 h-full"
                                    style={{
                                        backgroundColor: state === 'completed' 
                                            ? '#10b981' 
                                            : 'var(--color-border)'
                                    }}
                                />
                            )}
                            
                            {/* Status Item */}
                            <div className={`relative flex items-start gap-3 p-3 rounded-lg transition-all ${
                                state === 'current' 
                                    ? 'bg-blue-500/10 border-2 border-blue-500/30' 
                                    : state === 'completed'
                                    ? 'bg-green-500/5'
                                    : 'bg-brand-bg'
                            }`}>
                                {/* Icon */}
                                <div className="flex-shrink-0 mt-0.5">
                                    {getStatusIcon(status.name, index)}
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <h5 
                                            className={`font-semibold text-sm ${
                                                state === 'current' 
                                                    ? 'text-blue-500' 
                                                    : state === 'completed'
                                                    ? 'text-green-500'
                                                    : 'text-brand-text-secondary'
                                            }`}
                                        >
                                            {status.name}
                                        </h5>
                                        {state === 'current' && (
                                            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 font-semibold">
                                                In Progress
                                            </span>
                                        )}
                                        {state === 'completed' && (
                                            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 font-semibold">
                                                Selesai
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Sub-statuses for current status */}
                                    {state === 'current' && project.activeSubStatuses && project.activeSubStatuses.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {project.activeSubStatuses.map((subStatus, subIndex) => (
                                                <div 
                                                    key={subIndex}
                                                    className="flex items-center gap-2 text-xs text-brand-text-secondary"
                                                >
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                    <span>{subStatus}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Progress bar for current status */}
                                    {state === 'current' && (
                                        <div className="mt-2">
                                            <div className="w-full h-1.5 bg-brand-bg rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-500 rounded-full animate-pulse"
                                                    style={{ width: '80%' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {/* Estimated Completion */}
            {project.deadlineDate && (
                <div className="bg-brand-surface rounded-xl p-4 border border-brand-border">
                    <div className="flex items-start gap-3">
                        <AlertCircleIcon className="w-5 h-5 text-brand-accent flex-shrink-0 mt-0.5" />
                        <div>
                            <h5 className="text-sm font-semibold text-brand-text-light mb-1">
                                Estimasi Penyelesaian
                            </h5>
                            <p className="text-sm text-brand-text-secondary">
                                Target: {formatDate(project.deadlineDate)}
                            </p>
                            {(() => {
                                const deadline = new Date(project.deadlineDate);
                                const today = new Date();
                                const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                
                                if (daysLeft < 0) {
                                    return (
                                        <p className="text-xs text-red-500 mt-1 font-semibold">
                                            Terlambat {Math.abs(daysLeft)} hari
                                        </p>
                                    );
                                } else if (daysLeft === 0) {
                                    return (
                                        <p className="text-xs text-orange-500 mt-1 font-semibold">
                                            Deadline hari ini!
                                        </p>
                                    );
                                } else if (daysLeft <= 3) {
                                    return (
                                        <p className="text-xs text-orange-500 mt-1 font-semibold">
                                            {daysLeft} hari lagi
                                        </p>
                                    );
                                } else {
                                    return (
                                        <p className="text-xs text-green-500 mt-1 font-semibold">
                                            {daysLeft} hari lagi
                                        </p>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgressTracker;
