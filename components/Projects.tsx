import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, PaymentStatus, TeamMember, Client, Package, TeamProjectPayment, Transaction, TransactionType, AssignedTeamMember, Profile, NavigationAction, AddOn, PrintingItem, Card, ProjectStatusConfig, SubStatusConfig, CustomCost, FinancialPocket } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import StatCard from './StatCard';
import StatCardModal from './StatCardModal';
import DonutChart from './DonutChart';
import { EyeIcon, PlusIcon, PencilIcon, Trash2Icon, ListIcon, LayoutGridIcon, FolderKanbanIcon, AlertCircleIcon, CalendarIcon, CheckSquareIcon, Share2Icon, ClockIcon, UsersIcon, ArrowDownIcon, ArrowUpIcon, FileTextIcon, SendIcon, CheckCircleIcon, ClipboardListIcon, DollarSignIcon, MessageSquareIcon, BriefcaseIcon, LightbulbIcon, ArrowUpIcon as ArrowUpIconStat, ArrowDownIcon as ArrowDownIconStat } from '../constants';
import { createProjectWithRelations, updateProject as updateProjectInDb, deleteProject as deleteProjectInDb, sanitizeProjectData, getProjectWithRelations } from '../services/projects';

import { upsertAssignmentsForProject } from '../services/projectTeamAssignments';
import { upsertTeamPaymentsForProject } from '../services/teamProjectPayments';
import { createTransaction, updateCardBalance, updateTransaction as updateTransactionRow, deleteTransaction as deleteTransactionRow } from '../services/transactions';
import { generateWhatsAppLink, cleanPhoneNumber } from '../utils/whatsapp';

export interface ProjectsProps {
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    clients: Client[];
    packages: Package[];
    teamMembers: TeamMember[];
    teamProjectPayments: TeamProjectPayment[];
    setTeamProjectPayments: React.Dispatch<React.SetStateAction<TeamProjectPayment[]>>;
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    initialAction: NavigationAction | null;
    setInitialAction: (action: NavigationAction | null) => void;
    profile: Profile;
    showNotification: (message: string) => void;
    cards: Card[];
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    pockets: FinancialPocket[];
    setPockets: React.Dispatch<React.SetStateAction<FinancialPocket[]>>;
    totals: {
        projects: number;
        activeProjects: number;
        clients: number;
        activeClients: number;
        leads: number;
        discussionLeads: number;
        followUpLeads: number;
        teamMembers: number;
        transactions: number;
        revenue: number;
        expense: number;
    };
}

// UI/UX Improvement Components
import ProjectCard from './ProjectCard';
import CollapsibleSection from './CollapsibleSection';
import ProgressTracker from './ProgressTracker';
import QuickStatusModal from './QuickStatusModal';

const ensureOnlineOrNotify = (showNotification: (message: string) => void): boolean => {
    if (!navigator.onLine) {
        showNotification('Harus online untuk melakukan perubahan');
        return false;
    }
    return true;
};

type StatModalItem = {
    id: string;
    primary: string;
    secondary: string;
    value: string;
};

type StatModalData = {
    title: string;
    items: StatModalItem[];
    total: number | null;
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const getSubStatusText = (project: Project): string => {
    if (project.activeSubStatuses && project.activeSubStatuses.length > 0) {
        return project.activeSubStatuses.join(', ');
    }
    if (project.status === 'Dikirim' && project.shippingDetails) {
        return `Dikirim: ${project.shippingDetails}`;
    }
    return project.status;
};

const getStatusColor = (status: string, config: ProjectStatusConfig[]): string => {
    const statusConfig = config.find(c => c.name === status);
    return statusConfig ? statusConfig.color : '#64748b'; // slate-500 default
};

const getStatusClass = (status: string, config: ProjectStatusConfig[]) => {
    const color = getStatusColor(status, config);
    const colorMap: { [key: string]: string } = {
        '#10b981': 'status-badge status-success', // Selesai
        '#3b82f6': 'status-badge status-info', // Dikonfirmasi
        '#8b5cf6': 'status-badge status-purple', // Editing
        '#f97316': 'status-badge status-orange', // Produksi Fisik
        '#06b6d4': 'status-badge status-cyan', // Dikirim
        '#eab308': 'status-badge status-warning', // Tertunda
        '#6366f1': 'status-badge status-info', // Persiapan
        '#ef4444': 'status-badge status-danger', // Dibatalkan
        '#14b8a6': 'status-badge status-cyan', // Revisi
    };
    return colorMap[color] || 'status-badge status-gray';
};

/** Progress 0-100 from project.progress or derived from status order / defaultProgress in config */
const getDisplayProgress = (project: Project, config: ProjectStatusConfig[]): number => {
    const raw = project.progress;
    if (typeof raw === 'number' && !Number.isNaN(raw) && raw >= 0 && raw <= 100) return Math.round(raw);
    const idx = config.findIndex(s => s.name === project.status);
    if (idx === -1) return 0;
    const statusConfig = config[idx];
    if (statusConfig.defaultProgress != null && statusConfig.defaultProgress !== undefined) {
        return Math.min(100, Math.max(0, statusConfig.defaultProgress));
    }
    return Math.round(((idx + 1) / config.length) * 100);
};

const getProgressForStatus = (status: string, config: ProjectStatusConfig[]): number => {
    const idx = config.findIndex(s => s.name === status);
    if (idx === -1) return 0;
    const statusConfig = config[idx];
    if (statusConfig.defaultProgress != null && statusConfig.defaultProgress !== undefined) {
        return Math.min(100, Math.max(0, statusConfig.defaultProgress));
    }
    return Math.round(((idx + 1) / config.length) * 100);
};



// --- [NEW] ProjectForm Component ---
interface ProjectFormProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    formData: any; // Simplified for now
    onFormChange: (e: React.ChangeEvent<any>) => void;
    onSubStatusChange: (option: string, isChecked: boolean) => void;
    onClientChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onTeamChange: (member: TeamMember) => void;
    onTeamFeeChange: (memberId: string, fee: number) => void;
    onTeamRewardChange: (memberId: string, reward: number) => void;
    onTeamSubJobChange: (memberId: string, subJob: string) => void;
    onTeamClientPortalLinkChange: (memberId: string, link: string) => void;
    onCustomSubStatusChange: (index: number, field: 'name' | 'note', value: string) => void;
    onAddCustomSubStatus: () => void;
    onRemoveCustomSubStatus: (index: number) => void;
    onSubmit: (e: React.FormEvent) => void;
    clients: Client[];
    teamMembers: TeamMember[];
    profile: Profile;
    teamByCategory: Record<string, Record<string, TeamMember[]>>;
    showNotification: (message: string) => void;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
    isOpen, onClose, mode, formData, onFormChange, onSubStatusChange, onClientChange,
    onTeamChange, onTeamFeeChange, onTeamRewardChange, onTeamSubJobChange, onTeamClientPortalLinkChange,
    onCustomSubStatusChange, onAddCustomSubStatus, onRemoveCustomSubStatus,
    onSubmit, clients, teamMembers,
    profile, teamByCategory,
    showNotification, setFormData
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'add' ? 'Tambah Acara Baru (Operasional)' : `Edit Acara: ${formData.projectName}`}
            size="4xl"
        >
            <form onSubmit={onSubmit} className="space-y-4 md:space-y-6 form-compact form-compact--ios-scale">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-4 md:gap-y-6 max-h-[70vh] overflow-y-auto pr-2 pb-4">
                    {/* --- LEFT COLUMN --- */}
                    <div className="space-y-5 md:space-y-6">
                        {/* Section 1: Basic Info */}
                        <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                            <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Informasi Dasar Acara</h4>
                            <div className="space-y-5">
                                {mode === 'add' && (
                                    <div className="space-y-2">
                                        <label htmlFor="clientId" className="block text-xs text-brand-text-secondary">Pengantin</label>
                                        <select id="clientId" name="clientId" value={formData.clientId} onChange={onClientChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                                            <option value="" className="bg-brand-surface text-brand-text-primary">Pilih Pengantin...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <p className="text-xs text-brand-text-secondary">Pilih pengantin yang terkait dengan acara ini</p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label htmlFor="projectName" className="block text-xs text-brand-text-secondary">Nama Acara</label>
                                    <input type="text" id="projectName" name="projectName" value={formData.projectName} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Masukkan nama acara" required />
                                    <p className="text-xs text-brand-text-secondary">Nama acara (contoh: Wedding John & Jane)</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="projectType" className="block text-xs text-brand-text-secondary">Jenis Acara</label>
                                        <select id="projectType" name="projectType" value={formData.projectType} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                                            <option value="" disabled>Pilih Jenis...</option>
                                            {profile.projectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                        </select>
                                        <p className="text-xs text-brand-text-secondary">Kategori jenis acara</p>
                                    </div>
                                    {mode === 'add' ? (
                                        <div className="space-y-2">
                                            <label htmlFor="status" className="block text-xs text-brand-text-secondary">Status Acara</label>
                                            <select id="status" name="status" value={formData.status} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                                                {profile.projectStatusConfig.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            </select>
                                            <p className="text-xs text-brand-text-secondary">Status progres acara saat ini</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <label className="block text-xs text-brand-text-secondary">Status Acara</label>
                                            <div className={`px-4 py-3 rounded-xl border border-brand-border bg-brand-input/30 text-brand-text-secondary flex items-center justify-between`}>
                                                <span>{formData.status}</span>
                                                <span className="text-[10px] bg-brand-bg px-2 py-0.5 rounded-md border border-brand-border">Kelola di Detail Acara</span>
                                            </div>
                                            <p className="text-xs text-brand-text-secondary italic">Status sekarang dikelola langsung di halaman Detail Acara.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label htmlFor="location" className="block text-xs text-brand-text-secondary">Lokasi (Kota)</label>
                                        <input type="text" id="location" name="location" value={formData.location} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Kota Contoh: Jakarta" />
                                        <p className="text-xs text-brand-text-secondary">Kota tempat acara berlangsung</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="address" className="block text-xs text-brand-text-secondary">Alamat Lengkap / Gedung</label>
                                        <textarea id="address" name="address" value={formData.address} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Contoh: Gedung Mulia, Jl. Gatot Subroto No. 1" rows={3}></textarea>
                                        <p className="text-xs text-brand-text-secondary">Alamat spesifik venue acara</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Schedule & Details */}
                        <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                            <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Jadwal & Detail</h4>
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="date" className="block text-xs text-brand-text-secondary">Tanggal Acara</label>
                                        <input type="date" id="date" name="date" value={formData.date || ''} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required />
                                        <p className="text-xs text-brand-text-secondary">Tanggal pelaksanaan acara</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="deadlineDate" className="block text-xs text-brand-text-secondary">Deadline</label>
                                        <input type="date" id="deadlineDate" name="deadlineDate" value={formData.deadlineDate || ''} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                        <p className="text-xs text-brand-text-secondary">Batas waktu penyerahan hasil</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="startTime" className="block text-xs text-brand-text-secondary">Waktu Mulai</label>
                                        <input type="time" id="startTime" name="startTime" value={formData.startTime || ''} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                        <p className="text-xs text-brand-text-secondary">Jam mulai acara</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="endTime" className="block text-xs text-brand-text-secondary">Waktu Selesai</label>
                                        <input type="time" id="endTime" name="endTime" value={formData.endTime || ''} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                        <p className="text-xs text-brand-text-secondary">Jam selesai acara</p>
                                    </div>
                                </div>
                                {formData.status === 'Dikirim' && (
                                    <div className="space-y-2">
                                        <label htmlFor="shippingDetails" className="block text-xs text-brand-text-secondary">Detail Pengiriman</label>
                                        <input type="text" id="shippingDetails" name="shippingDetails" value={formData.shippingDetails} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Masukkan detail pengiriman" />
                                        <p className="text-xs text-brand-text-secondary">Informasi pengiriman hasil ke pengantin</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Section 3: Links & Notes - Using CollapsibleSection */}
                        <CollapsibleSection
                            title="Tautan & Catatan"
                            defaultExpanded={false}
                            status={formData.driveLink || formData.notes ? 'valid' : undefined}
                            statusText={formData.driveLink || formData.notes ? 'Terisi' : undefined}
                        >
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label htmlFor="driveLink" className="block text-xs text-brand-text-secondary">Link Brief/Moodboard (Internal)</label>
                                    <input type="url" id="driveLink" name="driveLink" value={formData.driveLink} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="https://..." />
                                    <p className="text-xs text-brand-text-secondary">Link ke folder brief atau moodboard untuk tim internal</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="clientDriveLink" className="block text-xs text-brand-text-secondary">Link File dari Pengantin</label>
                                    <input type="url" id="clientDriveLink" name="clientDriveLink" value={formData.clientDriveLink || ''} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="https://drive.google.com/..." />
                                    <p className="text-xs text-brand-text-secondary">Link file atau referensi yang diberikan pengantin</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="finalDriveLink" className="block text-xs text-brand-text-secondary">Link File Jadi (untuk Pengantin)</label>
                                    <input type="url" id="finalDriveLink" name="finalDriveLink" value={formData.finalDriveLink || ''} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="https://drive.google.com/..." />
                                    <p className="text-xs text-brand-text-secondary">Link hasil akhir yang akan dibagikan ke pengantin</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="notes" className="block text-xs text-brand-text-secondary">Catatan Tambahan</label>
                                    <textarea id="notes" name="notes" value={formData.notes} onChange={onFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none" placeholder="Catatan tambahan untuk acara ini..." rows={4}></textarea>
                                    <p className="text-xs text-brand-text-secondary">Catatan penting terkait acara ini</p>
                                </div>
                            </div>
                        </CollapsibleSection>
                    </div>

                    {/* --- RIGHT COLUMN --- */}
                    <div className="space-y-5 md:space-y-6">
                        {/* Section 4: Team Assignment */}
                        <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                            <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Tugas Tim</h4>
                            <div className="space-y-6">
                                {(['Tim', 'Vendor'] as const).map(category => (
                                    <div key={category} className="space-y-4">
                                        <h5 className={`text-sm font-bold uppercase tracking-widest pb-2 border-b-2 flex items-center gap-2 ${category === 'Tim' ? 'text-blue-400 border-blue-400/20' : 'text-purple-400 border-purple-400/20'}`}>
                                            <div className={`w-2 h-2 rounded-full ${category === 'Tim' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                                            {category === 'Tim' ? 'Pilih Tim Internal' : 'Pilih Vendor / Freelancer'}
                                        </h5>

                                        <div className="space-y-4">
                                            {Object.entries(teamByCategory[category] || {}).map(([role, members]) => (
                                                <div key={role} className="space-y-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h6 className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-tighter">{role}</h6>
                                                        <div className="h-px flex-grow bg-brand-border/30"></div>
                                                    </div>
                                                    {(members as TeamMember[]).map(member => {
                                                        const assignedMember = formData.team.find((t: any) => t.memberId === member.id);
                                                        const isSelected = !!assignedMember;
                                                        return (
                                                            <div key={member.id} className={`p-4 rounded-xl transition-all ${isSelected ? 'bg-blue-50/10 border-2 border-blue-400' : 'bg-brand-bg border border-brand-border hover:border-brand-accent/30'}`}>
                                                                <div className="flex justify-between items-center">
                                                                    <label className="flex items-center gap-3 cursor-pointer flex-grow">
                                                                        <input type="checkbox" checked={isSelected} onChange={() => onTeamChange(member)} className="h-5 w-5 text-blue-600 rounded-lg border-brand-border bg-white/5 focus:ring-blue-500" />
                                                                        <div>
                                                                            <p className="font-semibold text-brand-text-light">{member.name}</p>
                                                                            {isSelected && <p className="text-[10px] text-brand-text-secondary mt-0.5">Fee Standar: {formatCurrency(member.standardFee)}</p>}
                                                                        </div>
                                                                    </label>
                                                                </div>
                                                                {isSelected && (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-brand-border/40">
                                                                        <div className="space-y-1.5">
                                                                            <label className="block text-[10px] uppercase font-bold text-brand-text-secondary">Fee Acara</label>
                                                                            <input
                                                                                type="number"
                                                                                value={assignedMember.fee}
                                                                                onChange={e => onTeamFeeChange(member.id, Number(e.target.value))}
                                                                                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white/5 text-brand-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-right font-mono"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1.5">
                                                                            <label className="block text-[10px] uppercase font-bold text-brand-text-secondary">Reward (Bonus)</label>
                                                                            <input
                                                                                type="number"
                                                                                value={assignedMember.reward || ''}
                                                                                onChange={e => onTeamRewardChange(member.id, Number(e.target.value))}
                                                                                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white/5 text-brand-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all text-right font-mono text-yellow-400"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                        <div className="sm:col-span-2 space-y-1.5">
                                                                            <label className="block text-[10px] uppercase font-bold text-brand-text-secondary">Sub-Job / Keterangan Tugas</label>
                                                                            <input
                                                                                type="text"
                                                                                value={assignedMember.subJob || ''}
                                                                                onChange={e => onTeamSubJobChange(member.id, e.target.value)}
                                                                                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white/5 text-brand-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                                                placeholder="Tugas spesifik (misal: Leader, Drone Operator, dll)"
                                                                            />
                                                                        </div>
                                                                        <div className="sm:col-span-2 space-y-1.5">
                                                                            <label className="block text-[10px] uppercase font-bold text-brand-text-secondary">Link Portal Pengantin</label>
                                                                            <input
                                                                                type="url"
                                                                                value={assignedMember.clientPortalLink || ''}
                                                                                onChange={e => onTeamClientPortalLinkChange(member.id, e.target.value)}
                                                                                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white/5 text-brand-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all font-mono opacity-80"
                                                                                placeholder="https://client-portal..."
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>


                        <CollapsibleSection
                            title="Vendor (Allpackage)"
                            defaultExpanded={false}
                            status={(formData.printingDetails || []).length > 0 ? 'info' : undefined}
                            statusText={(formData.printingDetails || []).length > 0 ? `${(formData.printingDetails || []).length} item` : undefined}
                        >
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {(formData.printingDetails || []).length > 0 ? (formData.printingDetails || []).map((item: PrintingItem) => (
                                    <div key={item.id} className="p-3 rounded-lg bg-brand-bg flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-brand-text-light">{item.customName || item.type}</p>

                                        </div>
                                    </div>
                                )) : <p className="text-sm text-center text-brand-text-secondary py-4">Tidak ada layanan/produk yang ditambahkan ke paket ini.</p>}
                            </div>
                        </CollapsibleSection>



                        {mode === 'add' && (
                            <section className="bg-brand-surface md:bg-transparent rounded-2xl md:rounded-none p-4 md:p-0 border md:border-0 border-brand-border">
                                <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 mb-4">Sub-Status untuk "{formData.status}"</h4>
                                <div className="p-4 bg-brand-bg rounded-xl">
                                    <label className="block text-xs font-semibold text-blue-600 mb-2">Pilih sub-status aktif:</label>
                                    <p className="text-xs text-brand-text-secondary mb-3">Centang sub-status yang sedang aktif untuk acara ini</p>
                                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                                        {(formData.customSubStatuses || []).map((sub: SubStatusConfig) => (
                                            <label key={sub.name} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${(formData.activeSubStatuses || []).includes(sub.name)
                                                ? 'bg-blue-50/10 border-2 border-blue-400'
                                                : 'bg-brand-input border border-brand-border hover:border-blue-300'
                                                }`}>
                                                <input
                                                    type="checkbox"
                                                    checked={(formData.activeSubStatuses || []).includes(sub.name)}
                                                    onChange={e => onSubStatusChange(sub.name, e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
                                                />
                                                <span className="font-medium">{sub.name}</span>
                                            </label>
                                        ))}
                                    </div>

                                    <h5 className="text-sm font-semibold text-brand-text-secondary mt-6 pt-4 border-t border-brand-border">Edit Sub-Status (khusus acara ini)</h5>
                                    <p className="text-xs text-brand-text-secondary mb-3">Kelola sub-status khusus untuk acara ini</p>
                                    <div className="space-y-4 mt-3 max-h-60 overflow-y-auto pr-2">
                                        {(formData.customSubStatuses || []).map((sub: SubStatusConfig, index: number) => (
                                            <div key={index} className="p-4 bg-brand-surface rounded-xl border border-brand-border space-y-4">
                                                <div className="space-y-2">
                                                    <label className="block text-xs text-brand-text-secondary">Nama Sub-Status</label>
                                                    <input
                                                        type="text"
                                                        value={sub.name || ''}
                                                        onChange={e => onCustomSubStatusChange(index, 'name', e.target.value)}
                                                        placeholder="Masukkan nama sub-status"
                                                        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                    />
                                                    <p className="text-xs text-brand-text-secondary">Nama tahapan atau status (contoh: Persiapan Materi / Produksi)</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="block text-xs text-brand-text-secondary">Catatan (Opsional)</label>
                                                    <input
                                                        type="text"
                                                        value={sub.note || ''}
                                                        onChange={e => onCustomSubStatusChange(index, 'note', e.target.value)}
                                                        placeholder="Catatan tambahan"
                                                        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                    />
                                                    <p className="text-xs text-brand-text-secondary">Keterangan atau detail tambahan</p>
                                                </div>
                                                <div className="flex justify-end pt-2 border-t border-brand-border">
                                                    <button
                                                        type="button"
                                                        onClick={() => onRemoveCustomSubStatus(index)}
                                                        className="flex items-center gap-2 px-3 py-2 text-sm text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2Icon className="w-4 h-4" />
                                                        Hapus
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onAddCustomSubStatus}
                                        className="mt-3 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50/10 rounded-lg transition-colors"
                                    >
                                        + Tambah Sub-Status Baru
                                    </button>
                                </div>
                            </section>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-end items-stretch md:items-center gap-3 pt-6 border-t border-brand-border">
                    <button type="button" onClick={onClose} className="button-secondary w-full md:w-auto order-2 md:order-1">Batal</button>
                    <button type="submit" className="button-primary w-full md:w-auto order-1 md:order-2 active:scale-95 transition-transform">{mode === 'add' ? 'Simpan Acara' : 'Update Acara'}</button>
                </div>
            </form>
        </Modal>
    );
};


// --- Project Value by Type Chart Component ---
const ProjectValueByTypeChart: React.FC<{ projects: Project[] }> = ({ projects }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const chartData = useMemo(() => {
        const typeValues = projects.reduce((acc, p) => {
            acc[p.projectType] = (acc[p.projectType] || 0) + p.totalCost;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(typeValues)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6); // Top 6 types
    }, [projects]);

    const maxValue = Math.max(...chartData.map(d => d.value), 1);
    const colors = ['from-blue-500 to-cyan-400', 'from-purple-500 to-pink-400', 'from-green-500 to-emerald-400', 'from-orange-500 to-amber-400', 'from-pink-500 to-rose-400', 'from-indigo-500 to-blue-400'];

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-sm text-brand-text-secondary">
                Belum ada data acara
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {chartData.map((item, index) => {
                const percentage = (item.value / maxValue) * 100;
                const isHovered = hoveredIndex === index;
                return (
                    <div
                        key={item.name}
                        className="relative"
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-sm font-medium transition-colors ${isHovered ? 'text-brand-accent' : 'text-brand-text-light'}`}>
                                {item.name}
                            </span>
                            <span className="text-xs font-semibold text-brand-text-secondary">
                                {formatCurrency(item.value)}
                            </span>
                        </div>
                        <div className="h-3 bg-brand-bg rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r ${colors[index % colors.length]} transition-all duration-500 rounded-full ${isHovered ? 'shadow-lg' : ''}`}
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- [NEW] ProjectAnalytics Component - Fokus detil pekerjaan, tanpa pembayaran ---
const ProjectAnalytics: React.FC<{
    projects: Project[];
    projectStatusConfig: ProjectStatusConfig[];
    totals: ProjectsProps['totals'];
    onStatCardClick: (stat: 'count' | 'deadline' | 'top_type' | 'status_dist') => void;
}> = ({ projects, projectStatusConfig, totals, onStatCardClick }) => {
    const activeProjects = useMemo(() => projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [projects]);

    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);

        const deadlineSoonCount = activeProjects.filter(p => {
            const d = new Date(p.deadlineDate || p.date);
            d.setHours(0, 0, 0, 0);
            return d >= today && d <= in7Days;
        }).length;

        const projectTypeCounts = projects.reduce((acc, p) => {
            acc[p.projectType] = (acc[p.projectType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topProjectType = Object.keys(projectTypeCounts).length > 0
            ? Object.entries(projectTypeCounts).sort(([, a], [, b]) => b - a)[0][0]
            : 'N/A';

        const statusCounts = activeProjects.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topStatus = Object.keys(statusCounts).length > 0
            ? Object.entries(statusCounts).sort(([, a], [, b]) => b - a)[0][0]
            : 'N/A';

        return { activeCount: totals.activeProjects, deadlineSoonCount, topProjectType, topStatus };
    }, [activeProjects, projects]);

    const projectStatusDistribution = useMemo(() => {
        const statusCounts = activeProjects.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(statusCounts).map(([label, value]) => {
            const config = projectStatusConfig.find(s => s.name === label);
            return {
                label,
                value,
                color: config ? config.color : '#64748b'
            };
        }).sort((a, b) => b.value - a.value);
    }, [activeProjects, projectStatusConfig]);

    return (
        <div className="mb-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                <div className="widget-animate transition-transform duration-200 hover:scale-105" style={{ animationDelay: '100ms' }}>
                    <StatCard
                        icon={<FolderKanbanIcon className="w-5 h-5 md:w-6 md:h-6" />}
                        title="Acara Aktif"
                        value={String(stats.activeCount)}
                        subtitle="Acara yang sedang berjalan"
                        colorVariant="blue"
                        description={`Jumlah acara yang sedang aktif (belum selesai atau dibatalkan).\n\nTotal: ${stats.activeCount} acara\n\nFokus pada penyelesaian pekerjaan acara-acara ini.`}
                        onClick={() => onStatCardClick('count')}
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-105" style={{ animationDelay: '200ms' }}>
                    <StatCard
                        icon={<ClockIcon className="w-5 h-5 md:w-6 md:h-6" />}
                        title="Deadline Dekat"
                        value={String(stats.deadlineSoonCount)}
                        subtitle="Acara jatuh tempo 7 hari ke depan"
                        colorVariant="orange"
                        description={`Acara dengan deadline dalam 7 hari ke depan.\n\nPerlu perhatian: ${stats.deadlineSoonCount} acara\n\nPastikan acara selesai tepat waktu.`}
                        onClick={() => onStatCardClick('deadline')}
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-105" style={{ animationDelay: '300ms' }}>
                    <StatCard
                        icon={<CheckSquareIcon className="w-5 h-5 md:w-6 md:h-6" />}
                        title="Status Terbanyak"
                        value={stats.topStatus}
                        subtitle="Status acara paling banyak saat ini"
                        colorVariant="purple"
                        description={`Status yang paling banyak saat ini: ${stats.topStatus}.\n\nMembantu memahami di tahap mana acara-acara Anda berada.`}
                        onClick={() => onStatCardClick('status_dist')}
                    />
                </div>
                <div className="widget-animate transition-transform duration-200 hover:scale-105" style={{ animationDelay: '400ms' }}>
                    <StatCard
                        icon={<FolderKanbanIcon className="w-5 h-5 md:w-6 md:h-6" />}
                        title="Jenis Acara Teratas"
                        value={stats.topProjectType}
                        subtitle="Jenis paling banyak dikerjakan"
                        colorVariant="purple"
                        description={`Jenis acara yang paling sering Anda kerjakan.\n\nJenis Teratas: ${stats.topProjectType}\n\nInformasi ini membantu memahami fokus pekerjaan.`}
                        onClick={() => onStatCardClick('top_type')}
                    />
                </div>
            </div>

            <div className="bg-brand-surface p-4 md:p-6 rounded-2xl shadow-lg border border-brand-border widget-animate" style={{ animationDelay: '500ms' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="md:col-span-1">
                        <h3 className="text-base md:text-lg font-bold text-gradient mb-2">Distribusi Status Acara</h3>
                        <p className="text-xs text-brand-text-secondary mb-3 md:mb-4">Breakdown status acara aktif</p>
                        <DonutChart data={projectStatusDistribution} />
                    </div>
                    <div className="md:col-span-2">
                        <h3 className="text-base md:text-lg font-bold text-gradient mb-2">Nilai Acara per Jenis</h3>
                        <p className="text-xs text-brand-text-secondary mb-3 md:mb-4">Total nilai acara berdasarkan jenis acara</p>
                        <ProjectValueByTypeChart projects={activeProjects} />
                    </div>
                </div>
            </div>
        </div>
    );
};


interface ProjectListViewProps {
    projects: Project[];
    handleOpenDetailModal: (project: Project) => void;
    handleOpenForm: (mode: 'edit', project: Project) => void;
    handleProjectDelete: (projectId: string) => void;
    config: ProjectStatusConfig[];
    clients: Client[];
    handleQuickStatusChange: (projectId: string, newStatus: string, notifyClient: boolean) => Promise<void>;
    handleSendMessage: (project: Project) => void;
    hasMore: boolean;
    isLoadingMore: boolean;
    onLoadMore: () => void;
}

const ProjectListView: React.FC<ProjectListViewProps> = ({ projects, handleOpenDetailModal, handleOpenForm, handleProjectDelete, config, clients, handleQuickStatusChange, handleSendMessage, hasMore, isLoadingMore, onLoadMore }) => {

    const ProgressBar: React.FC<{ progress: number, status: string, config: ProjectStatusConfig[] }> = ({ progress, status, config }) => (
        <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: getStatusColor(status, config) }}></div>
        </div>
    );

    return (
        <div>
            {/* Mobile cards - Using ProjectCard Component */}
            <div className="md:hidden space-y-3">
                {projects.map(p => {
                    const client = clients.find(c => c.id === p.clientId);
                    return (
                        <ProjectCard
                            key={p.id}
                            project={p}
                            client={client}
                            projectStatusConfig={config}
                            onStatusChange={(projectId, newStatus) => handleQuickStatusChange(projectId, newStatus, false)}
                            onViewDetails={handleOpenDetailModal}
                            onEdit={(project) => handleOpenForm('edit', project)}
                            onSendMessage={handleSendMessage}
                        />
                    );
                })}
                {projects.length === 0 && <p className="text-center py-8 text-sm text-brand-text-secondary">Tidak ada acara dalam kategori ini.</p>}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-brand-text-secondary uppercase">
                        <tr>
                            <th className="px-6 py-4 font-medium tracking-wider">Nama Acara</th>
                            <th className="px-6 py-4 font-medium tracking-wider">Pengantin</th>
                            <th className="px-6 py-4 font-medium tracking-wider">Tanggal</th>
                            <th className="px-6 py-4 font-medium tracking-wider min-w-[200px]">Progress</th>
                            <th className="px-6 py-4 font-medium tracking-wider">Tim</th>
                            <th className="px-6 py-4 font-medium tracking-wider text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {projects.map(p => (
                            <tr key={p.id} className="hover:bg-brand-bg transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-brand-text-light">{p.projectName}</p>
                                    </div>
                                    <p className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1 ${getStatusClass(p.status, config)}`}>
                                        {getSubStatusText(p)}
                                    </p>
                                </td>
                                <td className="px-6 py-4 text-brand-text-primary">{p.clientName}</td>
                                <td className="px-6 py-4 text-brand-text-primary">{new Date(p.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <ProgressBar progress={getDisplayProgress(p, config)} status={p.status} config={config} />
                                        <span className="text-xs font-semibold text-brand-text-secondary">{getDisplayProgress(p, config)}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-brand-text-primary">{p.team.map(t => t.name.split(' ')[0]).join(', ') || '-'}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center space-x-1">
                                        <button onClick={() => handleOpenDetailModal(p)} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors" title="Detail Acara"><EyeIcon className="w-5 h-5 text-white" /></button>
                                        <button onClick={() => handleOpenForm('edit', p)} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors" title="Edit Acara"><PencilIcon className="w-5 h-5 text-white" /></button>
                                        <button onClick={() => handleProjectDelete(p.id)} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-600 hover:bg-red-700 transition-colors" title="Hapus Acara"><Trash2Icon className="w-5 h-5 text-white" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {hasMore && (
                <div className="mt-8 flex justify-center pb-8">
                    <button
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-bg border border-brand-border text-brand-text-primary hover:bg-brand-surface transition-all disabled:opacity-50"
                    >
                        {isLoadingMore ? (
                            <>
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                Loading...
                            </>
                        ) : (
                            <>
                                <ArrowDownIcon className="w-4 h-4" />
                                Muat Lebih Banyak
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

interface ProjectKanbanViewProps {
    projects: Project[];
    handleOpenDetailModal: (project: Project) => void;
    draggedProjectId: string | null;
    handleDragStart: (e: React.DragEvent<HTMLDivElement>, projectId: string) => void;
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDrop: (e: React.DragEvent<HTMLDivElement>, newStatus: string) => void;
    config: ProjectStatusConfig[];
}

const ProjectKanbanView: React.FC<ProjectKanbanViewProps> = ({ projects, handleOpenDetailModal, draggedProjectId, handleDragStart, handleDragOver, handleDrop, config }) => {

    const ProgressBar: React.FC<{ progress: number, status: string, config: ProjectStatusConfig[] }> = ({ progress, status, config }) => (
        <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: getStatusColor(status, config) }}></div>
        </div>
    );

    return (
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 overscroll-x-contain scroll-smooth projects-kanban-scroll hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
            {config
                .filter(statusConfig => statusConfig.name !== 'Dibatalkan')
                .map(statusConfig => {
                    const status = statusConfig.name;
                    return (
                        <div
                            key={status}
                            className="w-72 min-w-[280px] md:w-80 flex-shrink-0 bg-brand-bg rounded-2xl border border-brand-border snap-start"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, status)}
                        >
                            <div className="p-4 font-semibold text-brand-text-light border-b-2 flex justify-between items-center sticky top-0 bg-brand-bg/80 backdrop-blur-sm rounded-t-2xl z-10" style={{ borderBottomColor: getStatusColor(status, config) }}>
                                <span>{status}</span>
                                <span className="text-sm font-normal bg-brand-surface text-brand-text-secondary px-2.5 py-1 rounded-full">{projects.filter(p => p.status === status).length}</span>
                            </div>
                            <div className="p-3 space-y-3 min-h-[200px] h-[calc(100vh-380px)] sm:h-[calc(100vh-420px)] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                                {projects
                                    .filter(p => p.status === status)
                                    .map(p => (
                                        <div
                                            key={p.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, p.id)}
                                            onClick={() => handleOpenDetailModal(p)}
                                            className={`p-4 bg-brand-surface rounded-xl cursor-grab border-l-4 shadow-lg ${draggedProjectId === p.id ? 'opacity-50 ring-2 ring-brand-accent' : 'opacity-100'}`}
                                            style={{ borderLeftColor: getStatusColor(p.status, config) }}
                                        >
                                            <p className="font-semibold text-sm text-brand-text-light">{p.projectName}</p>
                                            <p className="text-xs text-brand-text-secondary mt-1">{p.clientName}</p>
                                            <p className="text-xs font-bold text-brand-text-primary mt-1">
                                                {getSubStatusText(p)}
                                            </p>
                                            <ProgressBar progress={getDisplayProgress(p, config)} status={p.status} config={config} />
                                            <div className="flex justify-between items-center mt-3 text-xs">
                                                <span className="text-brand-text-secondary">{new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )
                })
            }
        </div>
    );
};

interface ProjectDetailModalProps {
    selectedProject: Project | null;
    setSelectedProject: React.Dispatch<React.SetStateAction<Project | null>>;
    teamMembers: TeamMember[];
    clients: Client[];
    profile: Profile;
    showNotification: (message: string) => void;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    onClose: () => void;
    handleOpenForm: (mode: 'edit', project: Project) => void;
    handleProjectDelete: (projectId: string) => void;
    handleOpenBriefingModal: (project: Project) => void;
    packages: Package[];
    transactions: Transaction[];
    teamProjectPayments: TeamProjectPayment[];
    cards: Card[];
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ selectedProject, setSelectedProject, teamMembers, clients, profile, showNotification, setProjects, onClose, handleOpenForm, handleProjectDelete, handleOpenBriefingModal, packages, transactions, teamProjectPayments, cards }) => {
    const [detailTab, setDetailTab] = useState<'details' | 'files'>('details');
    const [newCharge, setNewCharge] = useState({ name: '', amount: '' });

    const teamByCategory = useMemo(() => {
        if (!selectedProject?.team) return { 'Tim': {}, 'Vendor': {} };
        return selectedProject.team.reduce((acc, member) => {
            const originalMember = teamMembers.find(m => m.id === member.memberId);
            const category = originalMember?.category || 'Tim';
            if (!acc[category]) acc[category] = {};
            if (!acc[category][member.role]) acc[category][member.role] = [];
            acc[category][member.role].push(member);
            return acc;
        }, { 'Tim': {}, 'Vendor': {} } as Record<string, Record<string, AssignedTeamMember[]>>);
    }, [selectedProject?.team, teamMembers]);

    const formatDateFull = (dateString: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const handleToggleDigitalItem = (itemText: string) => {
        if (!selectedProject) return;

        const currentCompleted = selectedProject.completedDigitalItems || [];
        const isCompleted = currentCompleted.includes(itemText);
        const newCompleted = isCompleted
            ? currentCompleted.filter(item => item !== itemText)
            : [...currentCompleted, itemText];

        const updatedProject = { ...selectedProject, completedDigitalItems: newCompleted };

        setProjects(prevProjects => prevProjects.map(p => p.id === selectedProject.id ? updatedProject : p));
        setSelectedProject(updatedProject); // Update local state for immediate UI feedback in the modal
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!selectedProject) return;
        const nextProgress = getProgressForStatus(newStatus, profile.projectStatusConfig);
        const statusConfig = profile.projectStatusConfig.find(s => s.name === newStatus);

        try {
            const updated = {
                ...selectedProject,
                status: newStatus,
                progress: nextProgress,
                activeSubStatuses: [], // Reset active sub-statuses on major status shift
                customSubStatuses: statusConfig?.subStatuses || [], // Load defaults for the new status
            } as Project;

            await updateProjectInDb(selectedProject.id, {
                status: newStatus as any,
                progress: nextProgress as any,
                activeSubStatuses: [] as any,
                customSubStatuses: (statusConfig?.subStatuses || []) as any,
            } as any);

            setProjects(prev => prev.map(p => p.id === selectedProject.id ? updated : p));
            setSelectedProject(updated);
            showNotification(`Status diubah ke "${newStatus}"`);
        } catch (err) {
            console.error('[DetailModal] Status update failed:', err);
            showNotification('Gagal memperbarui status. Coba lagi.');
        }
    };

    const handleSubStatusToggle = async (subName: string, isChecked: boolean) => {
        if (!selectedProject) return;
        const currentActive = selectedProject.activeSubStatuses || [];
        const nextActive = isChecked
            ? [...currentActive, subName]
            : currentActive.filter(s => s !== subName);

        try {
            const updated = { ...selectedProject, activeSubStatuses: nextActive };

            await updateProjectInDb(selectedProject.id, {
                activeSubStatuses: nextActive as any,
            } as any);

            setProjects(prev => prev.map(p => p.id === selectedProject.id ? updated : p));
            setSelectedProject(updated);
        } catch (err) {
            console.error('[DetailModal] Sub-status toggle failed:', err);
            showNotification('Gagal memperbarui tahapan.');
        }
    };

    const handleNewChargeSubmit = async () => {
        if (!selectedProject || !newCharge.name.trim() || !newCharge.amount) {
            showNotification('Harap isi nama dan jumlah biaya dengan benar.');
            return;
        }

        const amount = Number(newCharge.amount);
        if (isNaN(amount) || amount <= 0) {
            showNotification('Jumlah biaya harus angka positif.');
            return;
        }

        const newCustomCost = {
            id: `custom-${Date.now()}`,
            description: newCharge.name.trim(),
            amount: amount
        };

        const existingCustomCosts = selectedProject.customCosts || [];
        const updatedCustomCosts = [...existingCustomCosts, newCustomCost];
        const newTotalCost = selectedProject.totalCost + amount;

        // Calculate new payment status based on current amountPaid
        const remaining = newTotalCost - selectedProject.amountPaid;
        const newPaymentStatus = remaining <= 0 ? PaymentStatus.LUNAS : (selectedProject.amountPaid > 0 ? PaymentStatus.DP_TERBAYAR : PaymentStatus.BELUM_BAYAR);

        try {
            const updated = {
                ...selectedProject,
                customCosts: updatedCustomCosts,
                totalCost: newTotalCost,
                paymentStatus: newPaymentStatus
            };

            await updateProjectInDb(selectedProject.id, {
                custom_costs: updatedCustomCosts as any,
                total_cost: newTotalCost as any,
                payment_status: newPaymentStatus as any
            } as any);

            setProjects(prev => prev.map(p => p.id === selectedProject.id ? updated : p));
            setSelectedProject(updated);
            setNewCharge({ name: '', amount: '' });
            showNotification('Biaya tambahan berhasil ditambahkan.');
        } catch (err) {
            console.error('[DetailModal] Add custom cost failed:', err);
            showNotification('Gagal menambahkan biaya tambahan.');
        }
    };

    if (!selectedProject) return null;

    const allSubStatusesForCurrentStatus = selectedProject.customSubStatuses || profile.projectStatusConfig.find(s => s.name === selectedProject.status)?.subStatuses || [];

    return (
        <div className="flex flex-col h-full">
            {/* Desktop Tab Navigation - Top */}
            <div className="hidden md:block border-b border-brand-border">
                <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setDetailTab('details')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${detailTab === 'details' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><ClipboardListIcon className="w-5 h-5" /> Detail</button>
                    <button onClick={() => setDetailTab('files')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${detailTab === 'files' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><FileTextIcon className="w-5 h-5" /> File & Tautan</button>
                </nav>
            </div>

            {/* Mobile Tab Navigation - Top Pills */}
            <div className="md:hidden mb-3">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setDetailTab('details')}
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${detailTab === 'details'
                            ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30'
                            : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                            }`}
                    >
                        <ClipboardListIcon className="w-4 h-4" />
                        <span>Detail</span>
                    </button>
                    <button
                        onClick={() => setDetailTab('files')}
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${detailTab === 'files'
                            ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30'
                            : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                            }`}
                    >
                        <FileTextIcon className="w-4 h-4" />
                        <span>File</span>
                    </button>
                </div>
            </div>

            <div className="pt-0 md:pt-6 max-h-[65vh] overflow-y-auto pr-2 pb-4">
                {detailTab === 'details' && (
                    <div className="space-y-6 tab-content-mobile">
                        {/* Mobile cards */}
                        <div className="md:hidden space-y-4">
                            {/* Header card */}
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-base font-semibold text-brand-text-light leading-tight">{selectedProject.projectName}</p>
                                        <p className="text-xs text-brand-text-secondary mt-0.5">{selectedProject.clientName}</p>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                                    <span className="text-brand-text-secondary">Tanggal</span>
                                    <span className="text-brand-text-light text-right">{formatDateFull(selectedProject.date)}</span>
                                    <span className="text-brand-text-secondary">Lokasi</span>
                                    <span className="text-brand-text-light text-right">{selectedProject.location || '-'}</span>
                                    <span className="text-brand-text-secondary">Alamat</span>
                                    <span className="text-brand-text-light text-right text-xs">{selectedProject.address || '-'}</span>
                                </div>
                            </div>

                            {/* Paket & Vendor */}
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                <h4 className="font-semibold text-brand-text-primary mb-1">Rincian Paket</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Informasi paket dan rincian acara</p>
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                    <span className="text-brand-text-secondary">Paket</span>
                                    <span className="text-brand-text-light text-right">{selectedProject.packageName}</span>
                                    <span className="text-brand-text-secondary">Add-ons</span>
                                    <span className="text-brand-text-light text-right">{selectedProject.addOns.map(a => a.name).join(', ') || '-'}</span>
                                    <span className="text-brand-text-secondary">Biaya Produksi Fisik</span>
                                    <span className="text-brand-text-light text-right">{formatCurrency(selectedProject.printingCost || 0)}</span>
                                </div>

                                {/* Custom Costs Mobile */}
                                {(selectedProject.customCosts && selectedProject.customCosts.length > 0) && (
                                    <div className="mt-4 pt-4 border-t border-brand-border/30 space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Biaya Tambahan Terdaftar</p>
                                        {selectedProject.customCosts.map(cost => (
                                            <div key={cost.id} className="flex justify-between items-center text-sm">
                                                <span className="text-orange-400 font-medium">+ {cost.description}</span>
                                                <span className="text-orange-400 font-bold">{formatCurrency(cost.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add New Charge Form Mobile */}
                                <div className="mt-4 pt-4 border-t border-brand-border/30">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary mb-2">Tambah Biaya Tambahan</p>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Nama Biaya (mis: Overtime)"
                                            value={newCharge.name}
                                            onChange={(e) => setNewCharge({ ...newCharge, name: e.target.value })}
                                            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text-light focus:outline-none focus:ring-1 focus:ring-brand-accent"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                placeholder="Jumlah (Rp)"
                                                value={newCharge.amount}
                                                onChange={(e) => setNewCharge({ ...newCharge, amount: e.target.value })}
                                                className="flex-1 bg-brand-bg border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text-light focus:outline-none focus:ring-1 focus:ring-brand-accent"
                                            />
                                            <button
                                                onClick={handleNewChargeSubmit}
                                                className="bg-brand-accent text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-3 pb-3 border-b border-brand-border/30">
                                    <h4 className="font-semibold text-brand-text-primary">Status Acara</h4>
                                    <div className="relative group">
                                        <select
                                            value={selectedProject.status}
                                            onChange={(e) => handleStatusUpdate(e.target.value)}
                                            className={`
                                                appearance-none
                                                px-3 py-1.5 pr-8
                                                text-[11px] font-bold 
                                                rounded-xl border-2
                                                bg-white/5 active:scale-95 transition-all
                                                cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-accent/50
                                                ${getStatusClass(selectedProject.status, profile.projectStatusConfig)}
                                            `}
                                        >
                                            {profile.projectStatusConfig.map(s => (
                                                <option key={s.id} value={s.name} className="bg-brand-surface text-brand-text-primary px-2">{s.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-brand-text-light opacity-60">
                                            <ArrowDownIcon className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>

                                <h4 className="font-semibold text-brand-text-primary mb-1">Tahapan Pengerjaan</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Tahapan detail dalam status acara saat ini</p>
                                {allSubStatusesForCurrentStatus.length > 0 ? (
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {allSubStatusesForCurrentStatus.map(subStatus => {
                                            const isActive = selectedProject.activeSubStatuses?.includes(subStatus.name);

                                            return (
                                                <label
                                                    key={subStatus.name}
                                                    className={`
                                                            flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98]
                                                            ${isActive
                                                            ? 'bg-brand-accent/10 border-2 border-brand-accent shadow-sm'
                                                            : 'bg-brand-surface border border-brand-border hover:border-brand-accent/50'
                                                        }
                                                        `}
                                                >
                                                    <div className="flex-shrink-0">
                                                        <div className={`
                                                                w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                                                                ${isActive ? 'bg-brand-accent border-brand-accent' : 'border-brand-border bg-white/5'}
                                                            `}>
                                                            {isActive && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={isActive}
                                                            onChange={(e) => handleSubStatusToggle(subStatus.name, e.target.checked)}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-grow">
                                                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-brand-text-light' : 'text-brand-text-secondary'}`}>{subStatus.name}</p>
                                                        {subStatus.note && <p className="text-[10px] text-brand-text-secondary line-clamp-1">{subStatus.note}</p>}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-brand-text-secondary">Tidak ada sub-status aktif.</p>
                                )}
                            </div>

                            {/* Output */}
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-brand-border">
                                    <h5 className="font-semibold text-brand-text-primary text-sm mb-2">Vendor (Allpackage)</h5>
                                    <p className="text-[10px] text-brand-text-secondary mb-2">Rincian vendor dan item fisik</p>
                                    {(() => {
                                        const printingItems = selectedProject.printingDetails || [];
                                        if (printingItems.length > 0) {
                                            return (
                                                <ul className="divide-y divide-brand-border/60">
                                                    {printingItems.map(item => (
                                                        <li key={item.id} className="py-2 text-sm text-brand-text-light">
                                                            {item.customName || item.type}
                                                        </li>
                                                    ))}
                                                </ul>
                                            );
                                        }
                                        const pkg = packages.find(p => p.id === selectedProject.packageId);
                                        if (pkg && pkg.physicalItems && pkg.physicalItems.length > 0) {
                                            return (
                                                <ul className="list-disc list-inside text-sm space-y-1">
                                                    {pkg.physicalItems.map((it, idx) => (
                                                        <li key={idx} className="text-brand-text-light">{it.name}</li>
                                                    ))}
                                                </ul>
                                            );
                                        }
                                        return <p className="text-sm text-brand-text-secondary italic">Tidak ada rincian vendor.</p>;
                                    })()}
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-brand-border">
                                    <h5 className="font-semibold text-brand-text-primary text-sm mb-2">Deskripsi Paket</h5>
                                    <p className="text-[10px] text-brand-text-secondary mb-2">Rincian layanan dan deskripsi paket</p>
                                    {(() => {
                                        const pkg = packages.find(p => p.id === selectedProject.packageId);
                                        if (!pkg || pkg.digitalItems.length === 0) {
                                            return <p className="text-sm text-brand-text-secondary italic">Tidak ada deskripsi paket.</p>;
                                        }
                                        return (
                                            <div className="space-y-2 text-sm">
                                                {pkg.digitalItems.map((item, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-brand-bg">
                                                        <span className="text-brand-text-primary text-sm">{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Tim */}
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                <h4 className="font-semibold text-brand-text-primary mb-1">Tim & Vendor</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Tugas anggota tim dan vendor acara</p>

                                {(['Tim', 'Vendor'] as const).map(category => (
                                    <div key={category} className="mb-6 last:mb-0">
                                        <h5 className={`text-sm font-bold uppercase tracking-wider mb-3 pb-1 border-b ${category === 'Tim' ? 'text-blue-400 border-blue-400/30' : 'text-purple-400 border-purple-400/30'}`}>
                                            {category === 'Tim' ? 'Tim Internal' : 'Vendor / Freelancer'}
                                        </h5>

                                        {Object.entries(teamByCategory[category]).length > 0 ? (
                                            Object.entries(teamByCategory[category]).map(([role, members]) => (
                                                <div key={role} className="mb-4 last:mb-0">
                                                    <h6 className="text-[10px] uppercase text-brand-text-secondary mb-1.5 ml-1">{role}</h6>
                                                    <div className="space-y-2">
                                                        {members.map(member => (
                                                            <div key={member.memberId} className="p-3 bg-brand-bg rounded-lg flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-sm text-brand-text-light font-medium">{member.name}</p>
                                                                    {member.subJob && <p className="text-xs text-brand-text-secondary">{member.subJob}</p>}
                                                                </div>
                                                                <div className="text-right text-xs flex items-center gap-3">
                                                                    <span className="text-brand-text-secondary">Fee</span>
                                                                    <span className="font-semibold text-brand-text-primary">{formatCurrency(member.fee)}</span>
                                                                    {(member.reward && member.reward > 0) && (
                                                                        <span className="font-semibold text-yellow-400">{formatCurrency(member.reward)}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-brand-text-secondary italic ml-1">Belum ada {category === 'Tim' ? 'tim internal' : 'vendor'} yang ditugaskan.</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Catatan */}
                            {selectedProject.notes && (
                                <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                    <h4 className="font-semibold text-brand-text-primary mb-1">Catatan</h4>
                                    <p className="text-xs text-brand-text-secondary mb-2">Catatan tambahan terkait acara ini</p>
                                    <p className="text-sm text-brand-text-primary whitespace-pre-wrap">{selectedProject.notes}</p>
                                </div>
                            )}

                            {/* Aksi Cepat */}
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                <h4 className="font-semibold text-brand-text-primary mb-1">Aksi Cepat</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Tombol aksi untuk mengelola acara dengan cepat</p>
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={() => { handleOpenForm('edit', selectedProject); onClose(); }} className="button-secondary text-sm inline-flex items-center gap-2">
                                        <PencilIcon className="w-4 h-4" /> Edit Acara
                                    </button>
                                    <button type="button" onClick={() => handleOpenBriefingModal(selectedProject)} className="button-secondary text-sm inline-flex items-center gap-2">
                                        <Share2Icon className="w-4 h-4" /> Briefing Tim
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Desktop (existing) */}
                        <div className="hidden md:block space-y-6">
                            <div className="text-sm space-y-2">
                                <p><strong className="font-semibold text-brand-text-secondary w-32 inline-block">Pengantin:</strong> {selectedProject.clientName}</p>
                                <p><strong className="font-semibold text-brand-text-secondary w-32 inline-block">Tanggal Acara:</strong> {formatDateFull(selectedProject.date)}</p>
                                <p><strong className="font-semibold text-brand-text-secondary w-32 inline-block">Lokasi:</strong> {selectedProject.location}</p>
                                <p><strong className="font-semibold text-brand-text-secondary w-32 inline-block">Alamat Lengkap:</strong> {selectedProject.address || '-'}</p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gradient mb-1">Rincian Paket & Biaya</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Informasi paket dan rincian biaya tambahan</p>
                                <div className="p-4 bg-brand-bg rounded-xl border border-brand-border/30">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                                        <span className="text-brand-text-secondary">Paket:</span> <span className="font-medium text-brand-text-light">{selectedProject.packageName}</span>
                                        <span className="text-brand-text-secondary">Add-ons:</span> <span className="font-medium text-brand-text-light">{selectedProject.addOns.map(a => a.name).join(', ') || '-'}</span>
                                        <span className="text-brand-text-secondary">Biaya Produksi Fisik:</span> <span className="font-medium text-brand-text-light">{formatCurrency(selectedProject.printingCost || 0)}</span>
                                    </div>

                                    {/* Custom Costs Desktop */}
                                    {(selectedProject.customCosts && selectedProject.customCosts.length > 0) && (
                                        <div className="pt-4 border-t border-brand-border/30 space-y-2 mb-4">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Biaya Tambahan Terdaftar</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {selectedProject.customCosts.map(cost => (
                                                    <div key={cost.id} className="flex justify-between items-center text-sm bg-orange-400/5 p-2 rounded-lg border border-orange-400/20">
                                                        <span className="text-orange-400 font-medium">+ {cost.description}</span>
                                                        <span className="text-orange-400 font-bold">{formatCurrency(cost.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add New Charge Form Desktop */}
                                    <div className="pt-4 border-t border-brand-border/30">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary mb-3">Tambah Biaya Tambahan</p>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="flex-1 min-w-[200px]">
                                                <input
                                                    type="text"
                                                    placeholder="Nama Biaya (mis: Overtime)"
                                                    value={newCharge.name}
                                                    onChange={(e) => setNewCharge({ ...newCharge, name: e.target.value })}
                                                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2 text-sm text-brand-text-light focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                                                />
                                            </div>
                                            <div className="w-48">
                                                <input
                                                    type="number"
                                                    placeholder="Jumlah (Rp)"
                                                    value={newCharge.amount}
                                                    onChange={(e) => setNewCharge({ ...newCharge, amount: e.target.value })}
                                                    className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-2 text-sm text-brand-text-light focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                                                />
                                            </div>
                                            <button
                                                onClick={handleNewChargeSubmit}
                                                className="bg-brand-accent hover:bg-brand-accent-hover text-white px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand-accent/20 flex items-center gap-2"
                                            >
                                                <PlusIcon className="w-4 h-4" /> Tambah
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-4 mb-4 p-4 bg-brand-bg rounded-xl border border-brand-border/30">
                                    <strong className="font-semibold text-brand-text-secondary w-32 inline-block">Status Acara:</strong>
                                    <div className="relative inline-block w-64">
                                        <select
                                            value={selectedProject.status}
                                            onChange={(e) => handleStatusUpdate(e.target.value)}
                                            className={`
                                                    appearance-none
                                                    w-full px-4 py-2 pr-10
                                                    text-sm font-bold 
                                                    rounded-xl border-2
                                                    bg-white/5 hover:bg-white/10 active:scale-95 transition-all
                                                    cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-accent/50
                                                    ${getStatusClass(selectedProject.status, profile.projectStatusConfig)}
                                                `}
                                        >
                                            {profile.projectStatusConfig.map(s => (
                                                <option key={s.id} value={s.name} className="bg-brand-surface text-brand-text-primary px-3 py-2 text-base">{s.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-text-light opacity-60">
                                            <ArrowDownIcon className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-brand-text-secondary italic">Pilih status untuk mengubah progres secara otomatis</p>
                                </div>

                                <h4 className="font-semibold text-gradient mb-1">Tahapan Pengerjaan</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Tahapan detail dalam status acara saat ini</p>
                                {allSubStatusesForCurrentStatus.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-brand-bg rounded-lg max-h-80 overflow-y-auto">
                                        {allSubStatusesForCurrentStatus.map(subStatus => {
                                            const isActive = selectedProject.activeSubStatuses?.includes(subStatus.name);

                                            return (
                                                <label
                                                    key={subStatus.name}
                                                    className={`
                                                        flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98]
                                                        ${isActive
                                                            ? 'bg-brand-accent/10 border-2 border-brand-accent'
                                                            : 'bg-brand-surface border border-brand-border hover:border-brand-accent/50 text-brand-text-secondary'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex-shrink-0">
                                                        <div className={`
                                                            w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                                                            ${isActive ? 'bg-brand-accent border-brand-accent' : 'border-brand-border bg-white/5'}
                                                        `}>
                                                            {isActive && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={isActive}
                                                            onChange={(e) => handleSubStatusToggle(subStatus.name, e.target.checked)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className={`font-semibold ${isActive ? 'text-brand-text-light' : 'group-hover:text-brand-text-light'}`}>{subStatus.name}</p>
                                                        {subStatus.note && <p className="text-xs text-brand-text-secondary">{subStatus.note}</p>}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-brand-text-secondary p-4 bg-brand-bg rounded-lg">Tidak ada sub-status untuk status acara saat ini.</p>
                                )}
                            </div>

                            <div>
                                <h4 className="font-semibold text-gradient mb-1">Rincian Layanan & Vendor</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Daftar rincian layanan dan vendor yang diterima (digital dan fisik)</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-brand-bg rounded-lg">
                                        <h5 className="font-semibold text-brand-text-primary text-sm mb-2">Vendor (Allpackage)</h5>
                                        {(() => {
                                            const printingItems = selectedProject.printingDetails || [];
                                            if (printingItems.length > 0) {
                                                return (
                                                    <ul className="space-y-2 text-sm">
                                                        {printingItems.map(item => (
                                                            <li key={item.id} className="flex justify-between items-center">
                                                                <span className="text-brand-text-light">{item.customName || item.type}</span>

                                                            </li>
                                                        ))}
                                                    </ul>
                                                );
                                            }
                                            const pkg = packages.find(p => p.id === selectedProject.packageId);
                                            if (pkg && pkg.physicalItems && pkg.physicalItems.length > 0) {
                                                return (
                                                    <ul className="space-y-1 text-sm list-disc list-inside">
                                                        {pkg.physicalItems.map((it, idx) => (
                                                            <li key={idx} className="text-brand-text-light">{it.name}</li>
                                                        ))}
                                                    </ul>
                                                );
                                            }
                                            return <p className="text-sm text-brand-text-secondary italic">Tidak ada rincian vendor.</p>;
                                        })()}
                                    </div>
                                    <div className="p-4 bg-brand-bg rounded-lg">
                                        <h5 className="font-semibold text-brand-text-primary text-sm mb-2">Deskripsi Paket</h5>
                                        {(() => {
                                            const pkg = packages.find(p => p.id === selectedProject.packageId);
                                            if (!pkg || pkg.digitalItems.length === 0) {
                                                return <p className="text-sm text-brand-text-secondary italic">Tidak ada rincian layanan.</p>;
                                            }
                                            return (
                                                <div className="space-y-2 text-sm">
                                                    {pkg.digitalItems.map((item, index) => (
                                                        <div key={index} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-brand-input">
                                                            <span className="text-sm text-brand-text-primary">{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gradient mb-1">Tim & Vendor Tugas</h4>
                                <p className="text-xs text-brand-text-secondary mb-4">Pembagian tugas tim internal dan vendor/freelancer untuk acara ini</p>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {(['Tim', 'Vendor'] as const).map(category => (
                                        <div key={category} className="space-y-4">
                                            <h5 className={`font-bold uppercase tracking-widest text-xs pb-2 border-b-2 flex items-center gap-2 ${category === 'Tim' ? 'text-blue-400 border-blue-400/20' : 'text-purple-400 border-purple-400/20'}`}>
                                                <div className={`w-2 h-2 rounded-full ${category === 'Tim' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                                                {category === 'Tim' ? 'Tim Internal' : 'Vendor / Freelancer'}
                                            </h5>

                                            <div className="space-y-5">
                                                {Object.entries(teamByCategory[category]).length > 0 ? (
                                                    Object.entries(teamByCategory[category]).map(([role, members]) => (
                                                        <div key={role}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <h6 className="font-semibold text-brand-text-secondary text-[10px] uppercase tracking-wider">{role}</h6>
                                                                <div className="h-px flex-grow bg-brand-border/40"></div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {members.map(member => (
                                                                    <div key={member.memberId} className="p-3 bg-brand-bg rounded-xl flex justify-between items-center border border-transparent hover:border-brand-border/50 transition-colors">
                                                                        <div>
                                                                            <p className="text-sm text-brand-text-light font-medium">{member.name}</p>
                                                                            {member.subJob && <p className="text-[10px] text-brand-text-secondary mt-0.5">{member.subJob}</p>}
                                                                        </div>
                                                                        <div className="text-[10px] flex items-center gap-4">
                                                                            <div className="text-right">
                                                                                <p className="text-brand-text-secondary opacity-60">Fee</p>
                                                                                <p className="font-semibold text-brand-text-primary">{formatCurrency(member.fee)}</p>
                                                                            </div>
                                                                            {(member.reward && member.reward > 0) && (
                                                                                <div className="text-right">
                                                                                    <p className="text-brand-text-secondary opacity-60">Hadiah</p>
                                                                                    <p className="font-semibold text-yellow-500">{formatCurrency(member.reward)}</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-8 text-center bg-brand-bg/30 rounded-2xl border border-dashed border-brand-border">
                                                        <p className="text-xs text-brand-text-secondary italic">Belum ada {category === 'Tim' ? 'tim internal' : 'vendor'} bertugas.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {selectedProject.notes && (
                                <div>
                                    <h4 className="font-semibold text-gradient mb-1">Catatan</h4>
                                    <p className="text-xs text-brand-text-secondary mb-3">Catatan tambahan terkait acara ini</p>
                                    <div className="p-4 bg-brand-bg rounded-lg">
                                        <p className="text-sm text-brand-text-primary whitespace-pre-wrap">{selectedProject.notes}</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="font-semibold text-gradient mb-1">Aksi Cepat</h4>
                                <p className="text-xs text-brand-text-secondary mb-3">Tombol aksi untuk mengelola acara dengan cepat</p>
                                <div className="p-4 bg-brand-bg rounded-lg flex items-center gap-3">
                                    <button type="button" onClick={() => { handleOpenForm('edit', selectedProject); onClose(); }} className="button-secondary text-sm inline-flex items-center gap-2">
                                        <PencilIcon className="w-4 h-4" /> Edit Acara
                                    </button>
                                    <button type="button" onClick={() => handleOpenBriefingModal(selectedProject)} className="button-secondary text-sm inline-flex items-center gap-2">
                                        <Share2Icon className="w-4 h-4" /> Bagikan Briefing Tim
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
                {detailTab === 'files' && (
                    <div className="space-y-4 tab-content-mobile">
                        {/* Mobile */}
                        <div className="md:hidden space-y-3">
                            <div className="rounded-2xl bg-white/5 border border-brand-border p-4">
                                <h4 className="font-semibold text-brand-text-primary mb-2">File & Tautan</h4>
                                <div className="divide-y divide-brand-border/60 text-sm">
                                    <div className="py-3 flex items-center justify-between">
                                        <span className="text-brand-text-secondary">Brief/Moodboard</span>
                                        {selectedProject.driveLink ? <a href={selectedProject.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold">Buka</a> : <span className="text-brand-text-secondary">N/A</span>}
                                    </div>
                                    <div className="py-3 flex items-center justify-between">
                                        <span className="text-brand-text-secondary">File dari Pengantin</span>
                                        {selectedProject.clientDriveLink ? <a href={selectedProject.clientDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold">Buka</a> : <span className="text-brand-text-secondary">N/A</span>}
                                    </div>
                                    <div className="py-3 flex items-center justify-between">
                                        <span className="text-brand-text-secondary">File Jadi</span>
                                        {selectedProject.finalDriveLink ? <a href={selectedProject.finalDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold">Buka</a> : <span className="text-brand-text-secondary">Belum tersedia</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Desktop existing */}
                        <div className="hidden md:block">
                            <h4 className="font-semibold text-gradient mb-2">File & Tautan Penting</h4>
                            <div className="p-4 bg-brand-bg rounded-lg space-y-3 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-brand-border"><span className="text-brand-text-secondary">Link Moodboard/Brief (Internal)</span>{selectedProject.driveLink ? <a href={selectedProject.driveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">Buka Tautan</a> : <span className="text-brand-text-secondary">N/A</span>}</div>
                                <div className="flex justify-between items-center py-2 border-b border-brand-border"><span className="text-brand-text-secondary">Link File dari Pengantin</span>{selectedProject.clientDriveLink ? <a href={selectedProject.clientDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">Buka Tautan</a> : <span className="text-brand-text-secondary">N/A</span>}</div>
                                <div className="flex justify-between items-center py-2"><span className="text-brand-text-secondary">Link File Jadi (untuk Pengantin)</span>{selectedProject.finalDriveLink ? <a href={selectedProject.finalDriveLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-semibold">Buka Tautan</a> : <span className="text-brand-text-secondary">Belum tersedia</span>}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};




export const Projects: React.FC<ProjectsProps> = ({ projects, setProjects, clients, packages, teamMembers, teamProjectPayments, setTeamProjectPayments, transactions, setTransactions, initialAction, setInitialAction, profile, showNotification, cards, setCards, pockets, setPockets, totals }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

    // UI/UX Improvement States
    const [quickStatusModalOpen, setQuickStatusModalOpen] = useState(false);
    const [selectedProjectForStatus, setSelectedProjectForStatus] = useState<Project | null>(null);

    const initialFormState = useMemo(() => ({
        id: '',
        clientId: '',
        projectName: '',
        clientName: '',
        projectType: '',
        packageName: '',
        status: profile.projectStatusConfig.find(s => s.name === 'Persiapan')?.name || profile.projectStatusConfig[0]?.name || '',
        activeSubStatuses: [] as string[],
        customSubStatuses: [] as SubStatusConfig[],
        customCosts: [] as { id: string, description: string, amount: string | number }[],
        location: '',
        date: new Date().toISOString().split('T')[0],
        deadlineDate: '',
        team: [] as AssignedTeamMember[],
        notes: '',
        driveLink: '',
        clientDriveLink: '',
        finalDriveLink: '',
        startTime: '',
        endTime: '',
        shippingDetails: '',
        printingDetails: [] as PrintingItem[],
        printingCost: 0,
        address: '',
        // duration/unit price for packages that offer durationOptions
        durationSelection: undefined as string | undefined,
        unitPrice: undefined as number | undefined,
    }), [profile]);

    const [formData, setFormData] = useState(initialFormState);

    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
    const [briefingText, setBriefingText] = useState('');
    const [whatsappLink, setWhatsappLink] = useState('');
    const [googleCalendarLink, setGoogleCalendarLink] = useState('');
    const [icsDataUri, setIcsDataUri] = useState('');

    const [activeStatModal, setActiveStatModal] = useState<string | null>(null);
    const [offset, setOffset] = useState(100);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const loadMoreProjects = async () => {
        if (isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        try {
            const { listProjectsWithRelations } = await import('../services/projects');
            const nextProjects = await listProjectsWithRelations({ limit: 100, offset });
            if (nextProjects.length < 100) {
                setHasMore(false);
            }
            if (nextProjects.length > 0) {
                setProjects(prev => {
                    // Filter out duplicates just in case
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNew = nextProjects.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNew];
                });
                setOffset(prev => prev + 100);
            } else {
                setHasMore(false);
            }
        } catch (e) {
            console.error('[Projects] Failed to load more projects:', e);
            showNotification('Gagal memuat lebih banyak acara.');
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Calculate stats for modals
    const allActiveProjectsForStats = useMemo(() => projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [projects]);
    const statsForModal = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);
        const deadlineSoonProjects = allActiveProjectsForStats.filter(p => {
            const d = new Date(p.deadlineDate || p.date);
            d.setHours(0, 0, 0, 0);
            return d >= today && d <= in7Days;
        });
        const projectTypeCounts = projects.reduce((acc, p) => {
            acc[p.projectType] = (acc[p.projectType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topProjectType = Object.keys(projectTypeCounts).length > 0
            ? Object.entries(projectTypeCounts).sort(([, a], [, b]) => b - a)[0][0]
            : 'N/A';
        const statusCounts = allActiveProjectsForStats.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const topStatus = Object.keys(statusCounts).length > 0
            ? Object.entries(statusCounts).sort(([, a], [, b]) => b - a)[0][0]
            : 'N/A';
        return { activeCount: allActiveProjectsForStats.length, deadlineSoonProjects, topProjectType, topStatus };
    }, [allActiveProjectsForStats, projects]);

    const [activeSectionOpen, setActiveSectionOpen] = useState(true);
    const [completedSectionOpen, setCompletedSectionOpen] = useState(false);

    // Keep selectedProject in sync when projects list updates
    useEffect(() => {
        if (!selectedProject) return;
        const updated = projects.find(p => p.id === selectedProject.id);
        if (updated && updated !== selectedProject) {
            // Preserve richer fields from selectedProject (e.g., team) if the incoming snapshot lacks them
            const merged = {
                ...updated,
                team: (updated as any).team && (updated as any).team.length > 0 ? (updated as any).team : (selectedProject as any).team,
            } as Project;
            setSelectedProject(merged);
        }
    }, [projects, selectedProject?.id]);

    const handleOpenDetailModal = async (project: Project) => {
        try {
            const fresh = await getProjectWithRelations(project.id);
            let next = fresh || project;
            // Fallback: if team is empty, enrich from teamProjectPayments
            if (!next.team || next.team.length === 0) {
                const payments = teamProjectPayments.filter(p => p.projectId === project.id);
                if (payments.length > 0) {
                    const enrichedTeam = payments.map(p => {
                        const tm = teamMembers.find(m => m.id === p.teamMemberId);
                        return {
                            memberId: p.teamMemberId,
                            name: p.teamMemberName,
                            role: tm?.role || 'Tim',
                            fee: p.fee,
                            reward: p.reward || 0,
                        } as AssignedTeamMember;
                    });
                    next = { ...next, team: enrichedTeam } as Project;
                }
            }
            setSelectedProject(next);
        } catch {
            setSelectedProject(project);
        }
        setIsDetailModalOpen(true);
    };

    useEffect(() => {
        if (initialAction && initialAction.type === 'VIEW_PROJECT_DETAILS' && initialAction.id) {
            const projectToView = projects.find(p => p.id === initialAction.id);
            if (projectToView) {
                handleOpenDetailModal(projectToView);
            }
            setInitialAction(null);
        }
    }, [initialAction, projects, setInitialAction]);

    const teamByCategory = useMemo(() => {
        return teamMembers.reduce((acc, member) => {
            const category = member.category || 'Tim';
            if (!acc[category]) acc[category] = {};
            if (!acc[category][member.role]) acc[category][member.role] = [];
            acc[category][member.role].push(member);
            return acc;
        }, { 'Tim': {}, 'Vendor': {} } as Record<string, Record<string, TeamMember[]>>);
    }, [teamMembers]);

    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => viewMode === 'kanban' || statusFilter === 'all' || p.status === statusFilter)
            .filter(p => p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) || p.clientName.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(p => {
                if (!dateFrom && !dateTo) return true;
                const d = new Date(p.date);
                d.setHours(0, 0, 0, 0);
                if (dateFrom) {
                    const from = new Date(dateFrom);
                    from.setHours(0, 0, 0, 0);
                    if (d < from) return false;
                }
                if (dateTo) {
                    const to = new Date(dateTo);
                    to.setHours(23, 59, 59, 999);
                    if (d > to) return false;
                }
                return true;
            });
    }, [projects, searchTerm, statusFilter, viewMode, dateFrom, dateTo]);

    const allActiveProjects = useMemo(() => projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [projects]);
    const activeProjects = useMemo(() => filteredProjects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan'), [filteredProjects]);
    const completedAndCancelledProjects = useMemo(() => filteredProjects.filter(p => p.status === 'Selesai' || p.status === 'Dibatalkan'), [filteredProjects]);

    const modalData = useMemo<StatModalData | null>(() => {
        if (!activeStatModal) return null;

        const activeProjectsList = projects.filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);

        switch (activeStatModal) {
            case 'count':
                return {
                    title: 'Daftar Acara Aktif',
                    items: activeProjectsList.map(p => ({
                        id: p.id,
                        primary: p.projectName,
                        secondary: p.clientName,
                        value: p.status
                    })),
                    total: null
                };
            case 'deadline':
                const deadlineSoonList = activeProjectsList.filter(p => {
                    const d = new Date(p.deadlineDate || p.date);
                    d.setHours(0, 0, 0, 0);
                    return d >= today && d <= in7Days;
                });
                return {
                    title: 'Acara dengan Deadline Dekat',
                    items: deadlineSoonList.map(p => ({
                        id: p.id,
                        primary: p.projectName,
                        secondary: p.clientName,
                        value: new Date(p.deadlineDate || p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                    })),
                    total: null
                };
            case 'status_dist':
                const statusCounts = activeProjectsList.reduce((acc, p) => {
                    acc[p.status] = (acc[p.status] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                const topStatus = Object.keys(statusCounts).length > 0
                    ? Object.entries(statusCounts).sort(([, a], [, b]) => b - a)[0][0]
                    : 'N/A';
                const statusProjects = activeProjectsList.filter(p => p.status === topStatus);
                return {
                    title: `Acara dengan Status: ${topStatus}`,
                    items: statusProjects.map(p => ({
                        id: p.id,
                        primary: p.projectName,
                        secondary: p.clientName,
                        value: p.status
                    })),
                    total: null
                };
            case 'top_type':
                const projectTypeCounts = projects.reduce((acc, p) => {
                    acc[p.projectType] = (acc[p.projectType] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                const topProjectType = Object.keys(projectTypeCounts).length > 0
                    ? Object.entries(projectTypeCounts).sort(([, a], [, b]) => b - a)[0][0]
                    : 'N/A';

                const topTypeProjects = projects.filter(p => p.projectType === topProjectType);

                return {
                    title: `Daftar Acara Jenis: ${topProjectType}`,
                    items: topTypeProjects.map((p: Project) => ({
                        id: p.id,
                        primary: p.projectName,
                        secondary: p.clientName,
                        value: p.projectType
                    })),
                    total: null
                };
            default:
                return null;
        }
    }, [activeStatModal, projects]);


    const handleOpenForm = async (mode: 'add' | 'edit', project?: Project) => {
        setFormMode(mode);
        if (mode === 'edit' && project) {
            // fetch fresh project to ensure latest team/details
            let current = project;
            try {
                const fresh = await getProjectWithRelations(project.id);
                if (fresh) current = fresh as Project;
            } catch { }
            // Fallback: if team is empty, enrich from teamProjectPayments
            if (!current.team || current.team.length === 0) {
                const payments = teamProjectPayments.filter(p => p.projectId === project.id);
                if (payments.length > 0) {
                    const enrichedTeam = payments.map(p => {
                        const tm = teamMembers.find(m => m.id === p.teamMemberId);
                        return {
                            memberId: p.teamMemberId,
                            name: p.teamMemberName,
                            role: tm?.role || 'Tim',
                            fee: p.fee,
                            reward: p.reward || 0,
                        } as AssignedTeamMember;
                    });
                    current = { ...current, team: enrichedTeam } as Project;
                }
            }
            const { addOns, paymentStatus, amountPaid, totalCost, progress, packageId, dpProofUrl, ...operationalData } = current;
            const statusConfig = profile.projectStatusConfig.find(s => s.name === project.status);
            const subStatuses = project.customSubStatuses ?? statusConfig?.subStatuses ?? [];
            // Auto-populate printingDetails from package physicalItems when empty
            let printingDetailsBase = (current.printingDetails || []) as PrintingItem[];
            if (!printingDetailsBase || printingDetailsBase.length === 0) {
                const pkg = packages.find(p => (p as any).id === (current as any).packageId || p.name === current.packageName);
                if (pkg && Array.isArray(pkg.physicalItems) && pkg.physicalItems.length > 0) {
                    printingDetailsBase = pkg.physicalItems.map((it, idx) => ({
                        id: `pi-${current.id}-${idx}`,
                        type: 'Custom' as const,
                        customName: it.name,
                        details: '',
                        cost: Number(it.price || 0),
                        paymentStatus: 'Unpaid' as const,
                    }));
                }
            }
            const printingDetailsWithStatus = (printingDetailsBase || []).map(item => ({ ...item, paymentStatus: item.paymentStatus || 'Unpaid' }));


            setFormData({
                ...initialFormState,
                ...operationalData,
                // Ensure no undefined values and enforce YYYY-MM-DD / HH:mm formats for HTML5 inputs
                date: (current.date || initialFormState.date).split('T')[0],
                deadlineDate: current.deadlineDate ? current.deadlineDate.split('T')[0] : '',
                startTime: current.startTime ? current.startTime.split(':').slice(0, 2).join(':') : '',
                endTime: current.endTime ? current.endTime.split(':').slice(0, 2).join(':') : '',
                location: current.location || '',
                notes: current.notes || '',
                clientDriveLink: current.clientDriveLink || '',
                finalDriveLink: current.finalDriveLink || '',
                shippingDetails: current.shippingDetails || '',
                address: current.address || '',
                durationSelection: (current as any).durationSelection || '',
                unitPrice: (current as any).unitPrice,
                printingDetails: printingDetailsWithStatus,
                activeSubStatuses: current.activeSubStatuses || [],
                customSubStatuses: subStatuses,
                customCosts: (current.customCosts || []).map(c => ({ ...c, amount: c.amount.toString() })),
                printingCost: current.printingCost || 0,
            });
        } else {
            setFormData({ ...initialFormState, projectType: profile.projectTypes[0] || '' });
        }
        setIsFormModalOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormModalOpen(false);
        setFormData(initialFormState);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
            return;
        }

        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'status') {
                newState.activeSubStatuses = [];
                // When status changes, populate customSubStatuses from the new status template
                const statusConfig = profile.projectStatusConfig.find(s => s.name === value);
                newState.customSubStatuses = statusConfig?.subStatuses || [];
                if (value !== 'Dikirim') {
                    newState.shippingDetails = '';
                }
            }
            return newState;
        });
    };

    const handleSubStatusChange = (option: string, isChecked: boolean) => {
        setFormData(prev => {
            const currentSubStatuses = prev.activeSubStatuses || [];
            if (isChecked) {
                return { ...prev, activeSubStatuses: [...currentSubStatuses, option] };
            } else {
                return { ...prev, activeSubStatuses: currentSubStatuses.filter(s => s !== option) };
            }
        });
    };

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const clientId = e.target.value;
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setFormData(prev => ({
                ...prev,
                clientId: client.id,
                clientName: client.name,
                projectName: prev.projectName || `Acara ${client.name}`
            }));
        }
    };

    const handleTeamChange = (member: TeamMember) => {
        setFormData(prev => {
            const isSelected = prev.team.some(t => t.memberId === member.id);
            if (isSelected) {
                return {
                    ...prev,
                    team: prev.team.filter(t => t.memberId !== member.id)
                }
            } else {
                const newTeamMember: AssignedTeamMember = {
                    memberId: member.id,
                    name: member.name,
                    role: member.role,
                    fee: member.standardFee,
                    reward: 0,
                };
                return {
                    ...prev,
                    team: [...prev.team, newTeamMember]
                }
            }
        });
    };

    const handleTeamFeeChange = (memberId: string, newFee: number) => {
        setFormData(prev => ({
            ...prev,
            team: prev.team.map(t => t.memberId === memberId ? { ...t, fee: newFee } : t)
        }));
    };

    const handleTeamRewardChange = (memberId: string, newReward: number) => {
        setFormData(prev => ({
            ...prev,
            team: prev.team.map(t => t.memberId === memberId ? { ...t, reward: newReward } : t)
        }));
    };

    const handleTeamSubJobChange = (memberId: string, subJob: string) => {
        setFormData(prev => ({
            ...prev,
            team: prev.team.map(t => t.memberId === memberId ? { ...t, subJob: subJob } : t)
        }));
    };

    const handleTeamClientPortalLinkChange = (memberId: string, link: string) => {
        setFormData(prev => ({
            ...prev,
            team: prev.team.map((t: any) => t.memberId === memberId ? { ...t, clientPortalLink: link } : t)
        }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!ensureOnlineOrNotify(showNotification)) return;
        let projectData: Project;

        if (formMode === 'add') {
            // Persist new project to Supabase
            const sanitized = sanitizeProjectData({ ...initialFormState, ...formData });
            try {
                const created = await createProjectWithRelations({
                    projectName: sanitized.projectName,
                    clientName: sanitized.clientName,
                    clientId: sanitized.clientId,
                    projectType: sanitized.projectType,
                    packageName: sanitized.packageName,
                    date: sanitized.date,
                    location: sanitized.location,
                    status: sanitized.status,
                    progress: 0,
                    totalCost: 0,
                    amountPaid: 0,
                    paymentStatus: PaymentStatus.BELUM_BAYAR,
                    bookingStatus: sanitized.bookingStatus,
                    notes: sanitized.notes,
                    accommodation: sanitized.accommodation,
                    driveLink: sanitized.driveLink,
                    promoCodeId: sanitized.promoCodeId,
                    discountAmount: sanitized.discountAmount,
                    printingCost: sanitized.printingCost,
                    address: sanitized.address,
                    addOns: (sanitized.addOns || []).map((a: AddOn) => ({ id: a.id, name: a.name, price: a.price })),
                    // Persist explicit duration/unit price if provided
                    durationSelection: sanitized.durationSelection,
                    unitPrice: sanitized.unitPrice,
                    // relations
                    team: (sanitized.team || []).map((t: AssignedTeamMember) => ({
                        memberId: t.memberId,
                        name: t.name,
                        role: t.role,
                        fee: t.fee,
                        reward: t.reward,
                        subJob: t.subJob,
                    })),
                    activeSubStatuses: sanitized.activeSubStatuses,
                    customSubStatuses: sanitized.customSubStatuses,
                    // extras passed through by services.createProject (printingDetails/customCosts handled in update step below if needed)
                } as any);
                projectData = created;
            } catch (err) {
                console.warn('[Projects] Failed to create project in Supabase:', err);
                showNotification(!navigator.onLine ? 'Harus online untuk melakukan perubahan' : 'Gagal membuat acara. Coba lagi.');
                return;
            }
        } else { // edit mode
            const originalProject = projects.find(p => p.id === formData.id);
            if (!originalProject) return;

            const oldPrintingCost = originalProject.printingCost || 0;
            const oldCustomCostsTotal = (originalProject.customCosts || []).reduce((sum, c) => sum + c.amount, 0);

            const newPrintingCost = Number(formData.printingCost) || 0;
            const newCustomCosts = (formData.customCosts || [])
                .filter((c: any) => c.description && Number(c.amount) > 0)
                .map((c: any) => ({ ...c, id: c.id || `cc-${Date.now()}`, amount: Number(c.amount) }));
            const newCustomCostsTotal = newCustomCosts.reduce((sum, c) => sum + c.amount, 0);

            const costDifference = (newPrintingCost - oldPrintingCost) + (newCustomCostsTotal - oldCustomCostsTotal);

            const newTotalCost = originalProject.totalCost + costDifference;
            const newAmountPaid = originalProject.amountPaid;
            const newPaymentStatus = newAmountPaid >= newTotalCost ? PaymentStatus.LUNAS : (newAmountPaid > 0 ? PaymentStatus.DP_TERBAYAR : PaymentStatus.BELUM_BAYAR);

            projectData = {
                ...originalProject,
                ...formData,
                customCosts: newCustomCosts,
                printingCost: newPrintingCost,
                totalCost: newTotalCost,
                paymentStatus: newPaymentStatus,
            };
            // Persist to Supabase
            try {
                await updateProjectInDb(projectData.id, {
                    projectName: projectData.projectName,
                    clientName: projectData.clientName,
                    clientId: projectData.clientId,
                    projectType: projectData.projectType,
                    packageName: projectData.packageName,
                    date: projectData.date,
                    deadlineDate: projectData.deadlineDate as any,
                    location: projectData.location,
                    status: projectData.status,
                    progress: projectData.progress,
                    totalCost: projectData.totalCost,
                    amountPaid: projectData.amountPaid,
                    paymentStatus: projectData.paymentStatus,
                    notes: projectData.notes,
                    accommodation: projectData.accommodation,
                    driveLink: projectData.driveLink,
                    clientDriveLink: projectData.clientDriveLink as any,
                    finalDriveLink: projectData.finalDriveLink as any,
                    startTime: projectData.startTime as any,
                    endTime: projectData.endTime as any,
                    discountAmount: projectData.discountAmount,
                    printingDetails: projectData.printingDetails as any,
                    customCosts: projectData.customCosts as any,
                    printingCost: projectData.printingCost,
                    address: projectData.address as any,
                    transportPaid: projectData.transportPaid as any,
                    transportNote: projectData.transportNote as any,
                    printingCardId: projectData.printingCardId as any,
                    transportCardId: projectData.transportCardId as any,
                    completedDigitalItems: projectData.completedDigitalItems,
                    dpProofUrl: projectData.dpProofUrl,
                    shippingDetails: projectData.shippingDetails as any,
                    // Persist duration/unit if present
                    durationSelection: (projectData as any).durationSelection,
                    unitPrice: (projectData as any).unitPrice,
                    activeSubStatuses: projectData.activeSubStatuses as any,
                    customSubStatuses: projectData.customSubStatuses as any,
                    confirmedSubStatuses: projectData.confirmedSubStatuses as any,
                    clientSubStatusNotes: projectData.clientSubStatusNotes as any,
                    subStatusConfirmationSentAt: projectData.subStatusConfirmationSentAt as any,
                    invoiceSignature: projectData.invoiceSignature as any,
                } as any);

                // Persist team assignments to Supabase (delete+insert strategy)
                try {
                    await upsertAssignmentsForProject(projectData.id, (projectData.team || []).map((t: AssignedTeamMember) => ({
                        memberId: t.memberId,
                        name: t.name,
                        role: t.role,
                        fee: t.fee,
                        reward: t.reward,
                        subJob: t.subJob,
                    })));
                } catch (teamErr) {
                    console.warn('[Projects] Failed to persist team assignments:', teamErr);
                }
            } catch (err) {
                console.warn('[Projects] Failed to update project in Supabase:', err);
                showNotification(!navigator.onLine ? 'Harus online untuk melakukan perubahan' : 'Gagal menyimpan perubahan acara. Coba lagi.');
                return;
            }

            // Persist cost changes as transactions in Supabase
            const paymentCardId = cards.find(c => c.id !== 'CARD_CASH')?.id;
            if (paymentCardId) {
                const fieldsToProcess: ('printingCost')[] = [];
                if (originalProject.printingCost !== projectData.printingCost) fieldsToProcess.push('printingCost');

                for (const field of fieldsToProcess) {
                    const cost = projectData[field] || 0;
                    const oldCost = originalProject[field] || 0;
                    const costDiff = cost - oldCost;
                    const category = field === 'printingCost' ? 'Produksi Fisik' : 'Transportasi';
                    const description = `${category} - ${projectData.projectName}`;

                    // Try to find an existing cost transaction in local state for this project+category+description
                    const existingTx = transactions.find(t => t.projectId === projectData.id && t.category === category && t.description === description);

                    try {
                        if (existingTx) {
                            if (cost > 0) {
                                // Update existing transaction amount
                                const updated = await updateTransactionRow(existingTx.id, { amount: cost });
                                // Adjust card by the delta
                                if (costDiff !== 0) await updateCardBalance(paymentCardId, -Math.abs(costDiff) * Math.sign(costDiff));
                                // Update local cache
                                setTransactions(prev => prev.map(tx => tx.id === existingTx.id ? updated : tx).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                                setCards(prev => prev.map(c => c.id === paymentCardId ? { ...c, balance: c.balance - costDiff } : c));
                            } else {
                                // Remove transaction and refund card by oldCost
                                await deleteTransactionRow(existingTx.id);
                                await updateCardBalance(paymentCardId, Math.abs(oldCost));
                                setTransactions(prev => prev.filter(tx => tx.id !== existingTx.id));
                                setCards(prev => prev.map(c => c.id === paymentCardId ? { ...c, balance: c.balance + oldCost } : c));
                            }
                        } else if (cost > 0) {
                            // Create new transaction and decrease card by full cost
                            const created = await createTransaction({
                                date: new Date().toISOString().split('T')[0],
                                description,
                                amount: cost,
                                type: TransactionType.EXPENSE,
                                projectId: projectData.id,
                                category,
                                method: 'Sistem',
                                cardId: paymentCardId,
                            } as any);
                            await updateCardBalance(paymentCardId, -Math.abs(cost));
                            setTransactions(prev => [created, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                            setCards(prev => prev.map(c => c.id === paymentCardId ? { ...c, balance: c.balance - cost } : c));
                        }
                    } catch (e) {
                        console.warn('[Projects] Failed to persist cost transaction:', e);
                        // Non-fatal: continue with other fields
                    }
                }
            }
        }

        const allTeamMembersOnProject = projectData.team;
        const otherProjectPayments = teamProjectPayments.filter(p => p.projectId !== projectData.id);
        const newProjectPaymentEntries: TeamProjectPayment[] = allTeamMembersOnProject.map(teamMember => ({
            id: crypto.randomUUID(), // Use a valid UUID instead of TPP- prefix
            projectId: projectData.id,
            teamMemberName: teamMember.name,
            teamMemberId: teamMember.memberId,
            date: projectData.date,
            status: 'Unpaid',
            fee: teamMember.fee,
            reward: teamMember.reward || 0,
        }));

        // Persist team payments to Supabase so they survive reloads
        let persistedPayments = newProjectPaymentEntries;
        try {
            persistedPayments = await upsertTeamPaymentsForProject(projectData.id, newProjectPaymentEntries);
        } catch (e) {
            console.warn('[Projects] Failed to persist team payments:', e);
        }
        setTeamProjectPayments([...otherProjectPayments, ...persistedPayments]);

        if (formMode === 'add') {
            setProjects(prev => [projectData, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } else {
            setProjects(prev => prev.map(p => p.id === projectData.id ? projectData : p).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }

        handleCloseForm();
    };

    const handleProjectDelete = async (projectId: string) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus acara ini? Semua data terkait (termasuk tugas tim dan transaksi) akan dihapus.")) {
            if (!ensureOnlineOrNotify(showNotification)) return;
            try {
                await deleteProjectInDb(projectId);
            } catch (err) {
                console.warn('[Projects] Failed to delete project in Supabase:', err);
                showNotification(!navigator.onLine ? 'Harus online untuk melakukan perubahan' : 'Gagal menghapus acara di server. Coba lagi.');
                return;
            }
            setProjects(prev => prev.filter(p => p.id !== projectId));
            setTeamProjectPayments(prev => prev.filter(fp => fp.projectId !== projectId));
            setTransactions(prev => prev.filter(t => t.projectId !== projectId));
        }
    };

    const handleOpenBriefingModal = (project: Project) => {
        setSelectedProject(project);
        const date = new Date(project.date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const teamList = project.team.length > 0
            ? project.team.map(t => `- ${t.name}`).join('\n')
            : 'Tim belum ditugaskan.';

        const parts = [];
        parts.push(`${date}`);
        parts.push(`*${project.projectName}*`);
        parts.push(`\n*Tim Bertugas:*\n${teamList}`);

        if (project.startTime || project.endTime || project.location) parts.push('');

        if (project.startTime) parts.push(`*Waktu Mulai:* ${project.startTime}`);
        if (project.endTime) parts.push(`*Waktu Selesai:* ${project.endTime}`);
        if (project.location) parts.push(`*Lokasi :* ${project.location}`);

        if (project.notes) {
            parts.push('');
            parts.push(`*Catatan:*\n${project.notes}`);
        }

        if (project.location || project.driveLink) parts.push('');

        if (project.location) {
            const mapsQuery = encodeURIComponent(project.location);
            const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
            parts.push(`*Link Lokasi:*\n${mapsLink}`);
        }

        if (project.driveLink) {
            if (project.location) parts.push('');
            parts.push(`*Link Moodboard:*\n${project.driveLink}`);
        }

        if (profile.briefingTemplate) {
            parts.push('\n---\n');
            parts.push(profile.briefingTemplate);
        }

        const text = parts.join('\n').replace(/\n\n\n+/g, '\n\n').trim();

        setBriefingText(text);
        setWhatsappLink(`whatsapp://send?text=${encodeURIComponent(text)}`);

        const toGoogleCalendarFormat = (date: Date) => date.toISOString().replace(/-|:|\.\d{3}/g, '');
        const timeRegex = /(\d{2}:\d{2})/;
        const startTimeMatch = project.startTime?.match(timeRegex);
        const endTimeMatch = project.endTime?.match(timeRegex);

        let googleLink = '';
        let icsContent = '';

        if (startTimeMatch) {
            const projectDateOnly = project.date.split('T')[0];
            const startDate = new Date(`${projectDateOnly}T${startTimeMatch[1]}:00`);
            const isInternalEvent = profile.eventTypes.includes(project.projectType);
            const durationHours = isInternalEvent ? 2 : 8;

            const endDate = endTimeMatch
                ? new Date(`${projectDateOnly}T${endTimeMatch[1]}:00`)
                : new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

            const googleDates = `${toGoogleCalendarFormat(startDate)}/${toGoogleCalendarFormat(endDate)}`;

            const calendarDescription = `Briefing untuk ${project.projectName}:\n\n${text}`;

            googleLink = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(project.projectName)}&dates=${googleDates}&details=${encodeURIComponent(calendarDescription)}&location=${encodeURIComponent(project.location || '')}`;

            const icsDescription = calendarDescription.replace(/\n/g, '\\n');
            icsContent = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'BEGIN:VEVENT',
                `UID:${project.id}@venapictures.com`,
                `DTSTAMP:${toGoogleCalendarFormat(new Date())}`,
                `DTSTART:${toGoogleCalendarFormat(startDate)}`,
                `DTEND:${toGoogleCalendarFormat(endDate)}`,
                `SUMMARY:${project.projectName}`,
                `DESCRIPTION:${icsDescription}`,
                `LOCATION:${project.location || ''}`,
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\n');
        }

        setGoogleCalendarLink(googleLink);
        setIcsDataUri(icsContent ? `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}` : '');

        setIsBriefingModalOpen(true);
    };


    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, projectId: string) => {
        e.dataTransfer.setData("projectId", projectId);
        setDraggedProjectId(projectId);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
        e.preventDefault();
        const projectId = e.dataTransfer.getData("projectId");
        const projectToUpdate = projects.find(p => p.id === projectId);

        if (projectToUpdate && projectToUpdate.status !== newStatus) {
            const nextProgress = getProgressForStatus(newStatus, profile.projectStatusConfig);
            try {
                await updateProjectInDb(projectToUpdate.id, {
                    status: newStatus as any,
                    progress: nextProgress as any,
                    activeSubStatuses: [] as any,
                } as any);
                setProjects(prevProjects =>
                    prevProjects.map(p =>
                        p.id === projectId ? { ...p, status: newStatus, progress: nextProgress, activeSubStatuses: [] } : p
                    )
                );
                showNotification(`Status "${projectToUpdate.projectName}" diubah ke "${newStatus}"`);
            } catch (err) {
                console.warn('[Projects] Failed to persist status change to Supabase:', err);
                showNotification('Gagal memperbarui status acara di server. Coba lagi.');
            }
        }
        setDraggedProjectId(null);
    };
    const handleCustomSubStatusChange = (index: number, field: 'name' | 'note', value: string) => {
        setFormData(prev => {
            const newCustomSubStatuses = [...(prev.customSubStatuses || [])];
            const oldName = newCustomSubStatuses[index]?.name;
            newCustomSubStatuses[index] = { ...newCustomSubStatuses[index], [field]: value };

            if (field === 'name' && oldName && (prev.activeSubStatuses || []).includes(oldName)) {
                const newActiveSubStatuses = (prev.activeSubStatuses || []).map(name => name === oldName ? value : name);
                return { ...prev, customSubStatuses: newCustomSubStatuses, activeSubStatuses: newActiveSubStatuses };
            }

            return { ...prev, customSubStatuses: newCustomSubStatuses };
        });
    };

    const addCustomSubStatus = () => {
        setFormData(prev => ({
            ...prev,
            customSubStatuses: [...(prev.customSubStatuses || []), { name: '', note: '' }]
        }));
    };

    const removeCustomSubStatus = (index: number) => {
        setFormData(prev => {
            const customSubStatuses = prev.customSubStatuses || [];
            const subStatusToRemove = customSubStatuses[index];
            const newCustomSubStatuses = customSubStatuses.filter((_, i) => i !== index);

            let newActiveSubStatuses = prev.activeSubStatuses || [];
            if (subStatusToRemove) {
                newActiveSubStatuses = newActiveSubStatuses.filter(name => name !== subStatusToRemove.name);
            }

            return {
                ...prev,
                customSubStatuses: newCustomSubStatuses,
                activeSubStatuses: newActiveSubStatuses
            };
        });
    };

    const handlePayForPrintingItem = async (projectId: string, printingItemId: string, sourceCardId: string, sourcePocketId?: string) => {
        const project = projects.find(p => p.id === projectId) || (selectedProject && selectedProject.id === projectId ? selectedProject : null);
        // Resolve current list of printing items: prefer project, fallback to the open form
        const formIsForThisProject = !!(formData?.id && formData.id === projectId);
        const currentItems: PrintingItem[] = (project?.printingDetails && project.printingDetails.length > 0)
            ? (project.printingDetails as PrintingItem[])
            : (formIsForThisProject && Array.isArray(formData.printingDetails) ? (formData.printingDetails as PrintingItem[]) : []);

        const printingItem = currentItems.find(item => item.id === printingItemId);

        // Determine payment source: pocket or card
        const isFromPocket = !!sourcePocketId;
        const sourcePocket = isFromPocket ? pockets.find(p => p.id === sourcePocketId) : null;
        const sourceCard = !isFromPocket ? cards.find(c => c.id === sourceCardId) : null;

        if (!printingItem || (!sourcePocket && !sourceCard)) {
            showNotification("Error: Data tidak lengkap untuk memproses pembayaran.");
            return;
        }

        // Check balance
        if (isFromPocket && sourcePocket) {
            if (sourcePocket.amount < printingItem.cost) {
                showNotification(`Error: Saldo di kantong ${sourcePocket.name} tidak mencukupi.`);
                return;
            }
        } else if (sourceCard) {
            if (sourceCard.balance < printingItem.cost) {
                showNotification(`Error: Saldo di ${sourceCard.bankName} tidak mencukupi.`);
                return;
            }
        }

        try {
            // 1) Create expense transaction in DB
            const created = await createTransaction({
                date: new Date().toISOString().split('T')[0],
                description: `Biaya Produksi Fisik: ${printingItem.customName || printingItem.type} - Acara ${project?.projectName || (formIsForThisProject ? formData.projectName : 'Acara')}`,
                amount: printingItem.cost,
                type: TransactionType.EXPENSE,
                projectId: projectId,
                category: 'Produksi Fisik',
                method: 'Sistem',
                cardId: isFromPocket ? undefined : sourceCardId,
                pocketId: isFromPocket ? sourcePocketId : undefined,
                printingItemId: printingItemId,
            } as any);

            // 2) Decrease balance in DB (card or pocket)
            if (isFromPocket && sourcePocketId) {
                const { updatePocket } = await import('../services/pockets');
                await updatePocket(sourcePocketId, { amount: sourcePocket!.amount - printingItem.cost });
            } else if (sourceCardId) {
                await updateCardBalance(sourceCardId, -Math.abs(printingItem.cost));
            }

            // 3) Persist project printingDetails paymentStatus change
            const updatedPrintingDetails = (currentItems || []).map(item =>
                item.id === printingItemId ? { ...item, paymentStatus: 'Paid' as 'Paid' } : item
            );
            await updateProjectInDb(projectId, { printingDetails: updatedPrintingDetails } as any);

            // 4) Optimistically update local UI state
            setTransactions(prev => [created, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

            if (isFromPocket && sourcePocketId) {
                setPockets(prev => prev.map(p => p.id === sourcePocketId ? { ...p, amount: p.amount - printingItem.cost } : p));
            } else if (sourceCardId) {
                setCards(prev => prev.map(c => c.id === sourceCardId ? { ...c, balance: c.balance - printingItem.cost } : c));
            }

            if (project) {
                setProjects(prevProjects => prevProjects.map(p => {
                    if (p.id === projectId) {
                        return { ...p, printingDetails: updatedPrintingDetails } as Project;
                    }
                    return p;
                }));
            }
            setFormData(prev => {
                const updatedPrintingDetailsForm = (prev.printingDetails || []).map((item: PrintingItem) =>
                    item.id === printingItemId ? { ...item, paymentStatus: 'Paid' as 'Paid' } : item
                );
                return { ...prev, printingDetails: updatedPrintingDetailsForm };
            });

            const sourceName = isFromPocket ? sourcePocket!.name : sourceCard!.bankName;
            showNotification(`Pembayaran untuk "${printingItem.customName || printingItem.type}" berhasil dari ${sourceName}.`);
        } catch (err) {
            console.warn('[Projects] Failed to process printing payment:', err);
            showNotification('Gagal memproses pembayaran produksi fisik di server. Coba lagi.');
        }
    };

    // UI/UX Improvement Handlers
    const handleQuickStatusChange = async (
        projectId: string,
        newStatus: string,
        notifyClient: boolean
    ) => {
        try {
            const project = projects.find(p => p.id === projectId);
            if (!project) return;

            const nextProgress = getProgressForStatus(newStatus, profile.projectStatusConfig);
            const updated = {
                ...project,
                status: newStatus,
                progress: nextProgress,
                activeSubStatuses: [],
            } as Project;
            await updateProjectInDb(projectId, {
                status: newStatus,
                progress: nextProgress,
                activeSubStatuses: [],
            } as any);

            setProjects(prev => prev.map(p => p.id === projectId ? updated : p));

            if (notifyClient) {
                // TODO: Implement client notification
                console.log('Notifying client about status change:', newStatus);
            }

            showNotification(`Status berhasil diubah ke "${newStatus}"`);
        } catch (error) {
            console.error('Quick status change error:', error);
            showNotification('Gagal mengubah status');
        }
    };

    const handleSendMessage = (project: Project) => {
        const client = clients.find(c => c.id === project.clientId);
        if (!client) return;

        const phone = client.whatsapp || client.phone;
        if (phone) {
            const message = `Halo ${client.name}, terkait acara ${project.projectName}...`;
            window.open(generateWhatsAppLink(phone, message), '_blank');
        } else {
            showNotification('Nomor telepon pengantin tidak tersedia');
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Acara Wedding" subtitle="Lacak semua acara dari awal hingga selesai.">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary">Pelajari Halaman Ini</button>
                    <button onClick={() => handleOpenForm('add')} className="button-primary inline-flex items-center gap-2">
                        <PlusIcon className="w-5 h-5" />
                        Tambah Acara
                    </button>
                </div>
            </PageHeader>

            <div className="space-y-6">
                <ProjectAnalytics
                    projects={projects}
                    projectStatusConfig={profile.projectStatusConfig}
                    totals={totals}
                    onStatCardClick={setActiveStatModal}
                />

                <div className="bg-brand-surface p-3 md:p-4 rounded-xl shadow-lg border border-brand-border flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4">
                    <div className="input-group flex-grow !mt-0 w-full md:w-auto">
                        <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2 md:p-2.5 text-sm" placeholder=" " />
                        <label className="input-label text-sm">Cari acara atau pengantin...</label>
                    </div>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <CalendarIcon className="w-4 h-4 text-brand-text-secondary flex-shrink-0" />
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2 md:p-2.5 text-sm w-full md:w-40" title="Dari tanggal" />
                        </div>
                        <span className="text-brand-text-secondary text-sm hidden md:inline">–</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2 md:p-2.5 text-sm w-full md:w-40" title="Sampai tanggal" />
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2 md:p-2.5 text-sm w-full md:w-48">
                            <option value="all">Semua Status</option>
                            {profile.projectStatusConfig.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                        <div className="p-0.5 md:p-1 bg-brand-bg rounded-lg flex items-center h-fit w-full md:w-auto">
                            <button onClick={() => setViewMode('list')} className={`flex-1 md:flex-none flex justify-center p-1.5 md:p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-brand-surface shadow-sm text-brand-text-light' : 'text-brand-text-secondary'}`}><ListIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                            <button onClick={() => setViewMode('kanban')} className={`flex-1 md:flex-none flex justify-center p-1.5 md:p-2 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-brand-surface shadow-sm text-brand-text-light' : 'text-brand-text-secondary'}`}><LayoutGridIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                        </div>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                        <div className="p-3 md:p-4 border-b border-brand-border">
                            <button onClick={() => setActiveSectionOpen(p => !p)} className="w-full flex justify-between items-center">
                                <h3 className="text-sm md:text-base font-semibold text-brand-text-light">Acara Aktif ({activeProjects.length})</h3>
                                {activeSectionOpen ? <ArrowUpIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary" /> : <ArrowDownIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary" />}
                            </button>
                        </div>
                        {activeSectionOpen && <ProjectListView projects={activeProjects} handleOpenDetailModal={handleOpenDetailModal} handleOpenForm={handleOpenForm} handleProjectDelete={handleProjectDelete} config={profile.projectStatusConfig} clients={clients} handleQuickStatusChange={handleQuickStatusChange} handleSendMessage={handleSendMessage} hasMore={hasMore} isLoadingMore={isLoadingMore} onLoadMore={loadMoreProjects} />}
                        <div className="p-3 md:p-4 border-t border-brand-border">
                            <button onClick={() => setCompletedSectionOpen(p => !p)} className="w-full flex justify-between items-center">
                                <h3 className="text-sm md:text-base font-semibold text-brand-text-light">Acara Selesai & Dibatalkan ({completedAndCancelledProjects.length})</h3>
                                {completedSectionOpen ? <ArrowUpIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary" /> : <ArrowDownIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary" />}
                            </button>
                        </div>
                        {completedSectionOpen && <ProjectListView projects={completedAndCancelledProjects} handleOpenDetailModal={handleOpenDetailModal} handleOpenForm={handleOpenForm} handleProjectDelete={handleProjectDelete} config={profile.projectStatusConfig} clients={clients} handleQuickStatusChange={handleQuickStatusChange} handleSendMessage={handleSendMessage} hasMore={hasMore} isLoadingMore={isLoadingMore} onLoadMore={loadMoreProjects} />}
                    </div>
                ) : (
                    <ProjectKanbanView projects={filteredProjects} handleOpenDetailModal={handleOpenDetailModal} draggedProjectId={draggedProjectId} handleDragStart={handleDragStart} handleDragOver={handleDragOver} handleDrop={handleDrop} config={profile.projectStatusConfig} />
                )}
            </div>

            <ProjectForm
                isOpen={isFormModalOpen}
                onClose={handleCloseForm}
                mode={formMode}
                formData={formData}
                onFormChange={handleFormChange}
                onSubStatusChange={handleSubStatusChange}
                onClientChange={handleClientChange}
                onTeamChange={handleTeamChange}
                onTeamFeeChange={handleTeamFeeChange}
                onTeamRewardChange={handleTeamRewardChange}
                onTeamSubJobChange={handleTeamSubJobChange}
                onTeamClientPortalLinkChange={handleTeamClientPortalLinkChange}
                onCustomSubStatusChange={handleCustomSubStatusChange}
                onAddCustomSubStatus={addCustomSubStatus}
                onRemoveCustomSubStatus={removeCustomSubStatus}
                onSubmit={handleFormSubmit}
                clients={clients}
                teamMembers={teamMembers}
                profile={profile}
                teamByCategory={teamByCategory}
                showNotification={showNotification}
                setFormData={setFormData}
            />

            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Detail Acara: ${selectedProject?.projectName}`} size="3xl">
                <ProjectDetailModal
                    selectedProject={selectedProject}
                    setSelectedProject={setSelectedProject}
                    teamMembers={teamMembers}
                    clients={clients}
                    profile={profile}
                    showNotification={showNotification}
                    setProjects={setProjects}
                    onClose={() => setIsDetailModalOpen(false)}
                    handleOpenForm={handleOpenForm}
                    handleProjectDelete={handleProjectDelete}
                    handleOpenBriefingModal={handleOpenBriefingModal}
                    packages={packages}
                    transactions={transactions}
                    teamProjectPayments={teamProjectPayments}
                    cards={cards}
                />
            </Modal>

            <Modal isOpen={isBriefingModalOpen} onClose={() => setIsBriefingModalOpen(false)} title="Bagikan Briefing Acara" size="2xl">
                {selectedProject && (
                    <div className="space-y-4">
                        <textarea value={briefingText} readOnly rows={15} className="input-field w-full text-sm"></textarea>
                        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-brand-border">
                            {icsDataUri && <a href={icsDataUri} download={`${selectedProject.projectName}.ics`} className="button-secondary text-sm">Download .ICS</a>}
                            {googleCalendarLink && <a href={googleCalendarLink} target="_blank" rel="noopener noreferrer" className="button-secondary text-sm">Tambah ke Google Calendar</a>}
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="button-primary inline-flex items-center gap-2">
                                <SendIcon className="w-4 h-4" /> Bagikan ke WhatsApp
                            </a>
                        </div>
                    </div>
                )}
            </Modal>

            {/* StatCard Detail Modals - Fokus detil pekerjaan */}
            <StatCardModal
                isOpen={activeStatModal === 'count'}
                onClose={() => setActiveStatModal(null)}
                icon={<FolderKanbanIcon className="w-6 h-6" />}
                title="Acara Aktif"
                value={String(statsForModal.activeCount)}
                subtitle="Acara yang sedang berjalan"
                colorVariant="blue"
                description={`Jumlah acara yang sedang aktif.\n\nTotal: ${statsForModal.activeCount} acara`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Daftar Acara Aktif</h4>
                    {allActiveProjectsForStats.slice(0, 10).map(project => (
                        <div key={project.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <p className="font-semibold text-brand-text-light text-sm">{project.projectName}</p>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent">{project.status}</span>
                            </div>
                            <p className="text-xs text-brand-text-secondary">{clients.find(c => c.id === project.clientId)?.name}</p>
                        </div>
                    ))}
                    {allActiveProjectsForStats.length > 10 && (
                        <p className="text-xs text-brand-text-secondary text-center pt-2">Dan {allActiveProjectsForStats.length - 10} acara lainnya...</p>
                    )}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'deadline'}
                onClose={() => setActiveStatModal(null)}
                icon={<ClockIcon className="w-6 h-6" />}
                title="Deadline Dekat"
                value={String(statsForModal.deadlineSoonProjects.length)}
                subtitle="Acara jatuh tempo 7 hari ke depan"
                colorVariant="orange"
                description={`Acara dengan deadline dalam 7 hari ke depan: ${statsForModal.deadlineSoonProjects.length} acara`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Acara Mendekati Deadline</h4>
                    {statsForModal.deadlineSoonProjects.length > 0 ? statsForModal.deadlineSoonProjects.map(project => (
                        <div key={project.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <p className="font-semibold text-brand-text-light text-sm">{project.projectName}</p>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500">
                                    {new Date(project.deadlineDate || project.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>
                            <p className="text-xs text-brand-text-secondary">{clients.find(c => c.id === project.clientId)?.name}</p>
                        </div>
                    )) : (
                        <p className="text-sm text-brand-text-secondary py-4 text-center">Tidak ada acara dengan deadline dalam 7 hari ke depan</p>
                    )}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'status_dist'}
                onClose={() => setActiveStatModal(null)}
                icon={<CheckSquareIcon className="w-6 h-6" />}
                title="Status Terbanyak"
                value={statsForModal.topStatus}
                subtitle="Status acara paling banyak saat ini"
                colorVariant="purple"
                description={`Status paling banyak: ${statsForModal.topStatus}`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Acara dengan Status: {statsForModal.topStatus}</h4>
                    {allActiveProjectsForStats.filter(p => p.status === statsForModal.topStatus).slice(0, 10).map(project => (
                        <div key={project.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                            <p className="font-semibold text-brand-text-light text-sm">{project.projectName}</p>
                            <p className="text-xs text-brand-text-secondary">{clients.find(c => c.id === project.clientId)?.name}</p>
                        </div>
                    ))}
                    {allActiveProjectsForStats.filter(p => p.status === statsForModal.topStatus).length > 10 && (
                        <p className="text-xs text-brand-text-secondary text-center pt-2">Dan {allActiveProjectsForStats.filter(p => p.status === statsForModal.topStatus).length - 10} acara lainnya...</p>
                    )}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'top_type'}
                onClose={() => setActiveStatModal(null)}
                icon={<FolderKanbanIcon className="w-6 h-6" />}
                title="Jenis Acara Teratas"
                value={statsForModal.topProjectType}
                subtitle="Jenis paling banyak dikerjakan"
                colorVariant="purple"
                description={`Jenis acara yang paling sering Anda kerjakan.\n\nJenis Teratas: ${statsForModal.topProjectType}\n\nInformasi ini membantu Anda memahami spesialisasi bisnis dan fokus pemasaran.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Distribusi Jenis Acara</h4>
                    {Object.entries(
                        projects.reduce((acc, p) => {
                            acc[p.projectType] = (acc[p.projectType] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>)
                    ).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                        <div key={type} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                            <p className="font-semibold text-brand-text-light text-sm">{type}</p>
                            <span className="text-sm text-brand-accent font-semibold">{count} acara</span>
                        </div>
                    ))}
                </div>
            </StatCardModal>

            {/* UI/UX Improvement: Quick Status Modal */}
            <QuickStatusModal
                isOpen={quickStatusModalOpen}
                onClose={() => {
                    setQuickStatusModalOpen(false);
                    setSelectedProjectForStatus(null);
                }}
                project={selectedProjectForStatus}
                statusConfig={profile.projectStatusConfig}
                onStatusChange={handleQuickStatusChange}
                showNotification={showNotification}
            />
        </div>
    );
};

export default Projects;