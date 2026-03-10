import React, { useMemo, useState } from 'react';
import { Project, ProjectStatusConfig } from '../types';
import Modal from './Modal';
import { CheckCircleIcon, BellIcon, SettingsIcon } from '../constants';

interface QuickStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    statusConfig: ProjectStatusConfig[];
    onStatusChange: (
        projectId: string,
        newStatus: string,
        notifyClient: boolean,
        activeSubStatuses: string[],
        customSubStatuses: { name: string; note: string }[],
    ) => Promise<void>;
    showNotification: (message: string) => void;
}

export const QuickStatusModal: React.FC<QuickStatusModalProps> = ({
    isOpen,
    onClose,
    project,
    statusConfig,
    onStatusChange,
    showNotification,
}) => {
    const [selectedStatus, setSelectedStatus] = useState('');
    const [notifyClient, setNotifyClient] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeSubStatuses, setActiveSubStatuses] = useState<string[]>([]);

    React.useEffect(() => {
        if (project) {
            setSelectedStatus(project.status);
            setActiveSubStatuses(project.activeSubStatuses || []);
        }
    }, [project]);

    const selectedStatusConfig = useMemo(() => {
        return statusConfig.find(s => s.name === selectedStatus);
    }, [statusConfig, selectedStatus]);

    const availableSubStatuses = useMemo(() => {
        return selectedStatusConfig?.subStatuses || [];
    }, [selectedStatusConfig]);

    if (!project) return null;

    const handleSave = async () => {
        if (!selectedStatus) return;
        const nextCustomSubStatuses = (selectedStatusConfig?.subStatuses || []).map(s => ({ name: s.name, note: s.note }));
        const allowedSet = new Set(nextCustomSubStatuses.map(s => s.name));
        const nextActive = (activeSubStatuses || []).filter(n => allowedSet.has(n));

        setIsProcessing(true);
        try {
            await onStatusChange(project.id, selectedStatus, notifyClient, nextActive, nextCustomSubStatuses);
            showNotification(`Status berhasil diubah ke "${selectedStatus}"`);
            onClose();
        } catch (error) {
            console.error('Status change error:', error);
            showNotification('Gagal mengubah status');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleSubStatus = (name: string, checked: boolean) => {
        setActiveSubStatuses(prev => {
            const set = new Set(prev || []);
            if (checked) set.add(name);
            else set.delete(name);
            return Array.from(set);
        });
    };

    const handleManageMasterStatuses = () => {
        try {
            window.localStorage.setItem('vena-settings-tab', 'projectStatus');
        } catch (e) {
        }
        window.location.hash = '#/settings';
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Ubah Status: ${project.projectName}`}
            size="md"
            footer={
                <div className="flex items-center justify-end gap-2 md:gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="px-4 md:px-6 py-2 md:py-2.5 text-sm md:text-base rounded-lg border border-brand-border text-brand-text-primary font-semibold hover:bg-brand-input transition-all disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isProcessing}
                        className="px-4 md:px-6 py-2 md:py-2.5 text-sm md:text-base rounded-lg bg-brand-accent text-white font-semibold hover:bg-brand-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 md:gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span className="hidden sm:inline">Menyimpan...</span>
                                <span className="sm:hidden">Simpan...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span className="hidden sm:inline">Simpan & {notifyClient ? 'Notif Pengantin' : 'Tanpa Notif'}</span>
                                <span className="sm:hidden">Simpan</span>
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <div className="space-y-4 md:space-y-6 pb-2">
                {/* Current Status */}
                <div className="bg-brand-bg rounded-lg p-3 md:p-4">
                    <p className="text-xs text-brand-text-secondary mb-1">Status Saat Ini</p>
                    <p className="text-base md:text-lg font-bold text-brand-text-light">{project.status}</p>
                </div>

                {/* Status Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-brand-text-secondary">
                        Pilih Status Baru
                    </label>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleManageMasterStatuses}
                            className="text-xs md:text-sm text-brand-accent hover:underline inline-flex items-center gap-1.5"
                        >
                            <SettingsIcon className="w-4 h-4" />
                            Kelola Master Status
                        </button>
                    </div>
                    <div className="space-y-2 max-h-[35vh] md:max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-brand-border scrollbar-track-transparent">
                        {statusConfig.map((status) => {
                            const isSelected = selectedStatus === status.name;
                            const isCurrent = project.status === status.name;

                            return (
                                <label
                                    key={status.id}
                                    className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                        ? 'border-brand-accent bg-brand-accent/5'
                                        : 'border-brand-border hover:border-brand-accent/50 bg-brand-bg'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="status"
                                        value={status.name}
                                        checked={isSelected}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            setSelectedStatus(next);
                                            const nextCfg = statusConfig.find(s => s.name === next);
                                            const allowed = new Set((nextCfg?.subStatuses || []).map(s => s.name));
                                            setActiveSubStatuses(prev => (prev || []).filter(n => allowed.has(n)));
                                        }}
                                        className="w-4 h-4 md:w-5 md:h-5 text-brand-accent focus:ring-brand-accent flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="font-semibold text-sm truncate"
                                                style={{ color: status.color }}
                                            >
                                                {status.name}
                                            </span>
                                            {isCurrent && (
                                                <span className="text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent whitespace-nowrap">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div
                                        className="w-3 h-3 md:w-4 md:h-4 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: status.color }}
                                    />
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Sub-status Selection */}
                {availableSubStatuses.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-brand-text-secondary">
                            Sub-Status
                        </label>
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-brand-border scrollbar-track-transparent">
                            {availableSubStatuses.map((sub) => {
                                const checked = (activeSubStatuses || []).includes(sub.name);
                                return (
                                    <label
                                        key={sub.name}
                                        className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg border cursor-pointer transition-all ${checked
                                            ? 'border-brand-accent bg-brand-accent/5'
                                            : 'border-brand-border hover:border-brand-accent/50 bg-brand-bg'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => handleToggleSubStatus(sub.name, e.target.checked)}
                                            className="h-4 w-4 text-brand-accent rounded focus:ring-brand-accent flex-shrink-0 transition-colors"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-brand-text-light truncate">{sub.name}</p>
                                            {sub.note ? <p className="text-xs text-brand-text-secondary truncate">{sub.note}</p> : null}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Notify Client Option */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 md:p-4">
                    <label className="flex items-start gap-2 md:gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={notifyClient}
                            onChange={(e) => setNotifyClient(e.target.checked)}
                            className="h-4 w-4 text-brand-accent rounded focus:ring-brand-accent mt-0.5 flex-shrink-0 transition-colors"
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <BellIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
                                <span className="font-semibold text-xs md:text-sm text-blue-500">
                                    Notifikasi Pengantin
                                </span>
                            </div>
                            <p className="text-xs text-brand-text-secondary">
                                Kirim notifikasi otomatis ke pengantin tentang perubahan status acara
                            </p>
                        </div>
                    </label>
                </div>
            </div>
        </Modal>
    );
};

export default QuickStatusModal;
