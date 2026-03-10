import React, { useState, useMemo, useEffect } from 'react';
import { TeamMember, TeamProjectPayment, Profile, Transaction, TransactionType, TeamPaymentRecord, Project, RewardLedgerEntry, Card, FinancialPocket, PocketType, PerformanceNoteType, PerformanceNote, NavigationAction, CardType } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import FreelancerProjects from './FreelancerProjects';
import StatCard from './StatCard';
import RupiahInput from './RupiahInput';
import SignaturePad from './SignaturePad';
import PrintButton from './PrintButton';
import QrCodeDisplay from './QrCodeDisplay';
import { PlusIcon, PencilIcon, Trash2Icon, EyeIcon, PrinterIcon, CreditCardIcon, FileTextIcon, HistoryIcon, Share2Icon, PiggyBankIcon, LightbulbIcon, StarIcon, UsersIcon, AlertCircleIcon, UserCheckIcon, MessageSquareIcon, DownloadIcon, QrCodeIcon, CalendarIcon, DollarSignIcon } from '../constants';
import { createTeamMember as createTeamMemberRow, updateTeamMember as updateTeamMemberRow, deleteTeamMember as deleteTeamMemberRow } from '../services/teamMembers';
import { markTeamPaymentStatus, listAllTeamPayments, updateTeamPaymentFee } from '../services/teamProjectPayments';
import { createTransaction as createTransactionApi, updateCardBalance as updateCardBalanceApi, listTransactions as listTransactionsApi } from '../services/transactions';
import { createTeamPaymentRecord } from '../services/teamPaymentRecords';
import { createRewardLedgerEntry } from '../services/rewardLedger';
import { updatePocket as updatePocketRow } from '../services/pockets';

// @ts-ignore
import html2pdf from 'html2pdf.js';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const getStatusClass = (status: 'Paid' | 'Unpaid') => {
    return status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400';
};

const emptyMember: Omit<TeamMember, 'id' | 'rewardBalance' | 'rating' | 'performanceNotes' | 'portalAccessId'> = { name: '', role: '', email: '', phone: '', standardFee: 0, noRek: '', category: 'Tim' };

const downloadCSV = (headers: string[], data: (string | number)[][], filename: string) => {
    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            row.map(field => {
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(',')
        )
    ];

    const csvString = csvRows.join('\n');
    // Add UTF-8 BOM so Excel (Windows) recognizes encoding
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


// --- NEWLY ADDED HELPER COMPONENTS ---

const StarRating: React.FC<{ rating: number; onSetRating?: (rating: number) => void }> = ({ rating, onSetRating }) => (
    <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
            <button
                key={star}
                type="button"
                onClick={onSetRating ? () => onSetRating(star) : undefined}
                className={`p-1 ${onSetRating ? 'cursor-pointer' : ''}`}
                disabled={!onSetRating}
                aria-label={`Set rating to ${star}`}
            >
                <StarIcon className={`w-5 h-5 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
            </button>
        ))}
    </div>
);

const getNoteTypeClass = (type: PerformanceNoteType) => {
    switch (type) {
        case PerformanceNoteType.PRAISE: return 'bg-green-500/20 text-green-400';
        case PerformanceNoteType.CONCERN: return 'bg-yellow-500/20 text-yellow-400';
        case PerformanceNoteType.LATE_DEADLINE: return 'bg-red-500/20 text-red-400';
        case PerformanceNoteType.GENERAL:
        default: return 'bg-gray-500/20 text-gray-400';
    }
}

interface PerformanceTabProps {
    member: TeamMember;
    onSetRating: (rating: number) => void;
    newNote: string;
    setNewNote: (note: string) => void;
    newNoteType: PerformanceNoteType;
    setNewNoteType: (type: PerformanceNoteType) => void;
    onAddNote: () => void;
    onDeleteNote: (noteId: string) => void;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({
    member, onSetRating, newNote, setNewNote, newNoteType, setNewNoteType, onAddNote, onDeleteNote
}) => (
    <div>
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-lg mb-6 transition-all">
            <h4 className="text-base font-semibold text-brand-text-light mb-2">Peringkat Kinerja Keseluruhan</h4>
            <p className="text-sm text-brand-text-secondary mb-3">Beri peringkat pada freelancer ini berdasarkan kinerja mereka secara umum.</p>
            <div className="flex justify-center">
                <StarRating rating={member.rating} onSetRating={onSetRating} />
            </div>
        </div>

        <div className="mb-6">
            <h4 className="text-base font-semibold text-brand-text-light mb-3">Tambah Catatan Kinerja Baru</h4>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-lg space-y-4">
                <div className="input-group">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="input-field"
                        rows={3}
                        placeholder=" "
                        id="newPerformanceNote"
                    />
                    <label htmlFor="newPerformanceNote" className="input-label">Tulis catatan...</label>
                </div>
                <div className="flex justify-between items-center">
                    <div className="input-group !mb-0 flex-grow">
                        <select
                            id="newNoteType"
                            value={newNoteType}
                            onChange={(e) => setNewNoteType(e.target.value as PerformanceNoteType)}
                            className="input-field"
                        >
                            {Object.values(PerformanceNoteType).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <label htmlFor="newNoteType" className="input-label">Jenis Catatan</label>
                    </div>
                    <button onClick={onAddNote} className="button-primary ml-4">Tambah Catatan</button>
                </div>
            </div>
        </div>

        <div>
            <h4 className="text-base font-semibold text-brand-text-light mb-3">Riwayat Catatan Kinerja</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto">
                {member.performanceNotes.length > 0 ? member.performanceNotes.map(note => (
                    <div key={note.id} className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-sm flex justify-between items-start transition-all hover:bg-white/10">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getNoteTypeClass(note.type)}`}>{note.type}</span>
                                <span className="text-xs text-brand-text-secondary">{new Date(note.date).toLocaleDateString('id-ID')}</span>
                            </div>
                            <p className="text-sm text-brand-text-primary">{note.note}</p>
                        </div>
                        <button onClick={() => onDeleteNote(note.id)} className="p-1.5 text-brand-text-secondary hover:text-red-400">
                            <Trash2Icon className="w-4 h-4" />
                        </button>
                    </div>
                )) : (
                    <p className="text-center text-sm text-brand-text-secondary py-8">Belum ada catatan kinerja.</p>
                )}
            </div>
        </div>
    </div>
);


// --- Detail Modal Sub-components (Moved outside main component) ---

const RewardSavingsTab: React.FC<{
    member: TeamMember,
    suggestions: { id: string, icon: React.ReactNode, title: string, text: string }[],
    rewardLedger: RewardLedgerEntry[],
    onWithdraw: () => void
}> = ({ member, suggestions, rewardLedger, onWithdraw }) => {
    const currentBalance = useMemo(() => rewardLedger.reduce((s, e) => s + (e.amount || 0), 0), [rewardLedger]);
    return (
        <div>
            <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-brand-accent text-white shadow-2xl w-full max-w-sm border border-white/20 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-50"></div>
                    <div className="relative z-10">
                        <p className="text-sm uppercase tracking-wider opacity-90 font-medium">Saldo Hadiah Saat Ini</p>
                        <p className="text-5xl font-extrabold mt-3 tracking-tight drop-shadow-md">{formatCurrency(currentBalance)}</p>
                    </div>
                </div>
                <p className="text-sm text-brand-text-secondary mt-6 max-w-md">Saldo ini terakumulasi dari hadiah yang Anda berikan pada setiap acara yang telah lunas. Anda dapat mencairkan seluruh saldo ini untuk freelancer.</p>
                <button onClick={onWithdraw} disabled={currentBalance <= 0} className="mt-6 button-primary">
                    Tarik Seluruh Saldo Hadiah
                </button>
            </div>

            <div className="my-8 px-1">
                <h4 className="text-lg font-semibold text-gradient mb-4 text-center">Saran Strategis</h4>
                {suggestions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suggestions.map(s => (
                            <div key={s.id} className="bg-white/5 backdrop-blur-md p-5 rounded-2xl shadow-lg hover:shadow-xl hover:border-brand-accent/30 transition-all flex items-start gap-4 border border-white/10 group">
                                <div className="flex-shrink-0 mt-1 text-blue-400">{s.icon}</div>
                                <div>
                                    <p className="font-semibold text-brand-text-light">{s.title}</p>
                                    <p className="text-sm text-brand-text-secondary">{s.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-brand-text-secondary text-sm">Tidak ada saran khusus saat ini.</p>
                )}
            </div>

            <div className="mt-4 px-1">
                <h4 className="text-lg font-semibold text-gradient mb-4">Riwayat Saldo Hadiah</h4>
                {rewardLedger.length > 0 ? (
                    <div className="border border-white/10 bg-white/5 backdrop-blur-md shadow-lg rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-brand-surface/50 border-b border-white/10 backdrop-blur-md">
                                <tr>
                                    <th className="p-3 text-left font-medium text-brand-text-secondary tracking-wider">Tanggal</th>
                                    <th className="p-3 text-left font-medium text-brand-text-secondary tracking-wider">Deskripsi</th>
                                    <th className="p-3 text-right font-medium text-brand-text-secondary tracking-wider">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {rewardLedger.map(entry => (
                                    <tr key={entry.id}>
                                        <td className="p-3 whitespace-nowrap text-brand-text-primary">{new Date(entry.date).toLocaleDateString('id-ID')}</td>
                                        <td className="p-3 text-brand-text-light">{entry.description}</td>
                                        <td className={`p-3 text-right font-semibold whitespace-nowrap ${entry.amount >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>
                                            {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-brand-text-secondary py-8">Belum ada riwayat hadiah untuk freelancer ini.</p>
                )}
            </div>
        </div>
    );
};

interface CreatePaymentTabProps {
    member: TeamMember;
    paymentDetails: { projects: TeamProjectPayment[]; total: number };
    paymentAmount: number | '';
    setPaymentAmount: React.Dispatch<React.SetStateAction<number | ''>>;
    isInstallment: boolean;
    setIsInstallment: React.Dispatch<React.SetStateAction<boolean>>;
    onPay: () => void;
    onSetTab: (tab: 'projects') => void;
    renderPaymentDetailsContent: () => React.ReactNode;
    cards: Card[];
    monthlyBudgetPocket: FinancialPocket | undefined;
    paymentSourceId: string;
    setPaymentSourceId: (id: string) => void;
    onSign: () => void;
}

const CreatePaymentTab: React.FC<CreatePaymentTabProps> = ({
    member, paymentDetails, paymentAmount, setPaymentAmount, isInstallment, setIsInstallment, onPay, onSetTab, renderPaymentDetailsContent, cards,
    monthlyBudgetPocket, paymentSourceId, setPaymentSourceId, onSign
}) => {

    const handlePayClick = () => {
        onPay();
    }

    return (
        <div>
            {renderPaymentDetailsContent()}

            <div className="mt-6 pt-6 border-t border-brand-border non-printable space-y-4 bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/10">
                <div className="flex justify-between items-center mb-2">
                    <h5 className="font-semibold text-gradient text-base">Buat Pembayaran</h5>
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <span className="text-xs font-medium text-brand-text-secondary group-hover:text-brand-accent transition-colors">Bayar Bertahap?</span>
                        <div className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={isInstallment} onChange={e => setIsInstallment(e.target.checked)} />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
                        </div>
                    </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="input-group">
                        <input
                            type="number"
                            id="paymentAmount"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            className="input-field"
                            placeholder=" "
                            max={paymentDetails.total}
                        />
                        <label htmlFor="paymentAmount" className="input-label">Jumlah Bayar (Total: {formatCurrency(paymentDetails.total)})</label>
                    </div>
                    <div className="input-group">
                        <select
                            id="paymentSource"
                            className="input-field"
                            value={paymentSourceId}
                            onChange={e => setPaymentSourceId(e.target.value)}
                        >
                            <option value="" disabled>Pilih Sumber Pembayaran...</option>
                            {monthlyBudgetPocket && (
                                <option value={`pocket-${monthlyBudgetPocket.id}`}>
                                    {monthlyBudgetPocket.name} (Sisa: {formatCurrency(monthlyBudgetPocket.amount)})
                                </option>
                            )}
                            {cards.map(card => (
                                <option key={card.id} value={`card-${card.id}`}>
                                    {card.bankName} {card.lastFourDigits !== 'CASH' ? `**** ${card.lastFourDigits}` : ''} (Saldo: {formatCurrency(card.balance)})
                                </option>
                            ))}
                        </select>
                        <label htmlFor="paymentSource" className="input-label">Sumber Dana</label>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onSign} className="button-secondary text-sm inline-flex items-center gap-2">
                            <PencilIcon className="w-4 h-4" />
                            Tanda Tangani Slip
                        </button>
                        <button type="button" onClick={() => window.print()} className="button-secondary text-sm inline-flex items-center gap-2">
                            <PrinterIcon className="w-4 h-4" /> Cetak
                        </button>
                    </div>
                    <button type="button" onClick={handlePayClick} className="button-primary w-full sm:w-auto">
                        Bayar Sekarang & Buat Catatan
                    </button>
                </div>
            </div>
        </div>
    );
};

interface FreelancersProps {
    teamMembers: TeamMember[];
    setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
    teamProjectPayments: TeamProjectPayment[];
    setTeamProjectPayments: React.Dispatch<React.SetStateAction<TeamProjectPayment[]>>;
    teamPaymentRecords: TeamPaymentRecord[];
    setTeamPaymentRecords: React.Dispatch<React.SetStateAction<TeamPaymentRecord[]>>;
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    userProfile: Profile;
    showNotification: (message: string) => void;
    initialAction: NavigationAction | null;
    setInitialAction: (action: NavigationAction | null) => void;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    rewardLedgerEntries: RewardLedgerEntry[];
    setRewardLedgerEntries: React.Dispatch<React.SetStateAction<RewardLedgerEntry[]>>;
    pockets: FinancialPocket[];
    setPockets: React.Dispatch<React.SetStateAction<FinancialPocket[]>>;
    cards: Card[];
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    onSignPaymentRecord: (recordId: string, signatureDataUrl: string) => void;
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

export const Freelancers: React.FC<FreelancersProps> = ({
    teamMembers, setTeamMembers, teamProjectPayments, setTeamProjectPayments, teamPaymentRecords, setTeamPaymentRecords,
    transactions, setTransactions, userProfile, showNotification, initialAction, setInitialAction, projects, setProjects,
    rewardLedgerEntries, setRewardLedgerEntries, pockets, setPockets, cards, setCards, onSignPaymentRecord, totals
}) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
    const [isInstallment, setIsInstallment] = useState(false);

    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
    const [formData, setFormData] = useState<Omit<TeamMember, 'id' | 'rewardBalance' | 'rating' | 'performanceNotes' | 'portalAccessId'>>(emptyMember);

    const [detailTab, setDetailTab] = useState<'projects' | 'payments' | 'performance' | 'rewards' | 'create-payment'>('projects');
    const [projectsToPay, setProjectsToPay] = useState<string[]>([]);
    const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
    const [paymentSourceId, setPaymentSourceId] = useState('');
    const [activeStatModal, setActiveStatModal] = useState<'total' | 'unpaid' | 'topRated' | 'rewards' | null>(null);
    const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
    const [paymentSlipToView, setPaymentSlipToView] = useState<TeamPaymentRecord | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // New states for performance management
    const [newNote, setNewNote] = useState('');
    const [newNoteType, setNewNoteType] = useState<PerformanceNoteType>(PerformanceNoteType.GENERAL);
    const [qrModalContent, setQrModalContent] = useState<{ title: string; url: string } | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<'All' | 'Tim' | 'Vendor'>('All');

    // Compute live reward totals per member from ledger to display in list
    const rewardTotalsByMember = useMemo(() => {
        const map: Record<string, number> = {};
        for (const e of rewardLedgerEntries) {
            if (!e.teamMemberId) continue;
            map[e.teamMemberId] = (map[e.teamMemberId] || 0) + (e.amount || 0);
        }
        return map;
    }, [rewardLedgerEntries]);

    const projectsInDateRange = useMemo(() => {
        if (!dateFrom && !dateTo) return projects;
        return projects.filter(p => {
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
    }, [projects, dateFrom, dateTo]);

    const teamProjectPaymentsInDateRange = useMemo(() => {
        if (!dateFrom && !dateTo) return teamProjectPayments;
        const projectIdsInRange = new Set(projectsInDateRange.map(p => p.id));
        return teamProjectPayments.filter(p => projectIdsInRange.has(p.projectId));
    }, [teamProjectPayments, projectsInDateRange, dateFrom, dateTo]);

    useEffect(() => {
        if (initialAction && initialAction.type === 'VIEW_FREELANCER_DETAILS' && initialAction.id) {
            const memberToView = teamMembers.find(m => m.id === initialAction.id);
            if (memberToView) {
                handleViewDetails(memberToView);
            }
            setInitialAction(null);
        }
    }, [initialAction, teamMembers, setInitialAction]);

    // Keep selectedMember up-to-date when teamMembers changes (e.g., rewardBalance recomputed in App)
    useEffect(() => {
        if (!selectedMember) return;
        const latest = teamMembers.find(m => m.id === selectedMember.id);
        if (latest && (
            latest.rewardBalance !== selectedMember.rewardBalance ||
            latest.name !== selectedMember.name ||
            latest.role !== selectedMember.role ||
            latest.rating !== selectedMember.rating
        )) {
            setSelectedMember(latest);
        }
    }, [teamMembers, selectedMember]);

    const handleOpenQrModal = async (member: TeamMember) => {
        try {
            let accessId = member.portalAccessId;
            if (!accessId) {
                accessId = crypto.randomUUID();
                // Persist to DB
                try {
                    const updated = await updateTeamMemberRow(member.id, { portalAccessId: accessId } as Partial<TeamMember>);
                    // Update local state to reflect new accessId
                    setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, portalAccessId: updated.portalAccessId || accessId! } : m));
                } catch (e) {
                    // Fallback update local only
                    setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, portalAccessId: accessId! } : m));
                }
            }
            const path = window.location.pathname.replace(/index\.html$/, '');
            const url = `${window.location.origin}${path}#/freelancer-portal/${accessId}`;
            setQrModalContent({ title: `Portal Tautan untuk ${member.name}`, url });
        } catch { }
    };

    const teamStats = useMemo(() => {
        const totalUnpaid = teamProjectPaymentsInDateRange.filter(p => p.status === 'Unpaid').reduce((sum, p) => sum + p.fee, 0);
        const topRated = [...teamMembers].sort((a, b) => b.rating - a.rating)[0];
        const avgRating = teamMembers.length > 0 ? teamMembers.reduce((sum, m) => sum + m.rating, 0) / teamMembers.length : 0;
        const totalPayout = teamPaymentRecords.reduce((sum, r) => sum + r.totalAmount, 0);
        const totalProjectsHandled = teamProjectPayments.filter(p => p.status === 'Paid').length;

        return {
            totalMembers: totals.teamMembers,
            totalUnpaid: formatCurrency(totalUnpaid),
            topRatedName: topRated ? topRated.name : 'N/A',
            topRatedRating: topRated ? topRated.rating.toFixed(1) : 'N/A',
            avgRating: avgRating.toFixed(1),
            totalPayout: formatCurrency(totalPayout),
            totalProjectsHandled,
        }
    }, [teamMembers, teamProjectPaymentsInDateRange, totals.teamMembers, teamPaymentRecords, teamProjectPayments]);

    const handleOpenForm = (mode: 'add' | 'edit', member?: TeamMember) => {
        setFormMode(mode);
        if (mode === 'edit' && member) {
            setSelectedMember(member);
            // Pastikan nilai terdefinisi agar input menjadi controlled
            setFormData({
                name: member.name || '',
                role: member.role || '',
                email: member.email || '',
                phone: member.phone || '',
                standardFee: typeof member.standardFee === 'number' ? member.standardFee : 0,
                noRek: member.noRek || '',
                category: member.category || 'Tim'
            });
        } else {
            setSelectedMember(null);
            setFormData(emptyMember);
        }
        setIsFormOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'standardFee' ? Number(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formMode === 'add') {
                const payload: Omit<TeamMember, 'id'> = {
                    ...formData,
                    rewardBalance: 0,
                    rating: 0,
                    performanceNotes: [],
                    portalAccessId: crypto.randomUUID(),
                } as any;
                const created = await createTeamMemberRow(payload);
                setTeamMembers(prev => [...prev, created]);
                showNotification(`Freelancer ${created.name} berhasil ditambahkan.`);
            } else if (selectedMember) {
                try {
                    const updated = await updateTeamMemberRow(selectedMember.id, formData as Partial<TeamMember>);
                    setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? updated : m));
                    // Cascade name change to other data structures
                    if (formData.name !== selectedMember.name) {
                        setProjects(prevProjects => prevProjects.map(proj => ({
                            ...proj,
                            team: proj.team.map(t => t.memberId === selectedMember.id ? { ...t, name: formData.name } : t)
                        })));
                        setTeamProjectPayments(prevPayments => prevPayments.map(p => p.teamMemberId === selectedMember.id ? { ...p, teamMemberName: formData.name } : p));
                    }
                    showNotification(`Data ${updated.name} berhasil diperbarui.`);
                } catch (err: any) {
                    console.warn('[Supabase][teamMembers.update] gagal, fallback create. Detail:', err);
                    const payload: Omit<TeamMember, 'id'> = {
                        ...selectedMember,
                        ...formData,
                    } as any;
                    const created = await createTeamMemberRow(payload);
                    setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? created : m));
                    showNotification(`Freelancer baru ${created.name} berhasil dibuat (fallback).`);
                }
            }
            setIsFormOpen(false);
        } catch (err: any) {
            console.error('[Supabase][teamMembers.save] error:', err);
            alert(`Gagal menyimpan data freelancer. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleDelete = async (memberId: string) => {
        if (teamProjectPayments.some(p => p.teamMemberId === memberId && p.status === 'Unpaid')) {
            alert("Freelancer ini memiliki pembayaran yang belum lunas dan tidak dapat dihapus.");
            return;
        }
        if (!window.confirm("Apakah Anda yakin ingin menghapus freelancer ini? Semua data terkait (acara, pembayaran, riwayat hadiah) juga akan dihapus.")) return;
        try {
            await deleteTeamMemberRow(memberId);
            // Remove from projects
            setProjects(prevProjects => prevProjects.map(p => ({
                ...p,
                team: p.team.filter(t => t.memberId !== memberId)
            })));
            // Remove related data
            setTeamProjectPayments(prevPayments => prevPayments.filter(p => p.teamMemberId !== memberId));
            setTeamPaymentRecords(prevRecords => prevRecords.filter(r => r.teamMemberId !== memberId));
            setRewardLedgerEntries(prevLedger => prevLedger.filter(l => l.teamMemberId !== memberId));
            setTeamMembers(prev => prev.filter(m => m.id !== memberId));
            showNotification('Freelancer dan semua data terkait berhasil dihapus.');
        } catch (err: any) {
            console.error('[Supabase][teamMembers.delete] error:', err);
            alert(`Gagal menghapus freelancer di database. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleViewDetails = (member: TeamMember) => {
        setSelectedMember(member);
        setDetailTab('projects');
        setIsDetailOpen(true);
    };

    const handleCreatePayment = () => {
        if (!selectedMember || projectsToPay.length === 0) return;
        const totalToPay = selectedMemberUnpaidProjects
            .filter(p => projectsToPay.includes(p.id))
            .reduce((sum, p) => sum + p.fee, 0);
        setPaymentAmount(totalToPay);

        const budgetPocket = pockets.find(p => p.type === PocketType.EXPENSE);
        if (budgetPocket && budgetPocket.amount >= totalToPay) {
            setPaymentSourceId(`pocket-${budgetPocket.id}`);
        } else {
            setPaymentSourceId('');
        }

        setDetailTab('create-payment');
    };

    const handlePay = async () => {
        if (!selectedMember || !paymentAmount || paymentAmount <= 0 || !paymentSourceId) {
            alert('Harap isi jumlah dan pilih sumber dana.');
            return;
        }

        const actualPaidAmount = Number(paymentAmount);
        const totalDue = selectedMemberUnpaidProjects
            .filter(p => projectsToPay.includes(p.id))
            .reduce((sum, p) => sum + p.fee, 0);

        if (actualPaidAmount > totalDue) {
            alert(`Jumlah bayar (${formatCurrency(actualPaidAmount)}) melebihi total tagihan (${formatCurrency(totalDue)}).`);
            return;
        }

        const newTransaction: Transaction = {
            id: `TRN-PAY-FR-${crypto.randomUUID()}`,
            date: new Date().toISOString().split('T')[0],
            description: `Pembayaran Gaji Freelancer: ${selectedMember.name} (${projectsToPay.length} acara)`,
            amount: paymentAmount,
            type: TransactionType.EXPENSE,
            category: 'Gaji Freelancer',
            method: 'Transfer Bank',
        };

        if (paymentSourceId.startsWith('card-')) {
            const cardId = paymentSourceId.replace('card-', '');
            const card = cards.find(c => c.id === cardId);
            if (!card || card.balance < paymentAmount) {
                alert(`Saldo di kartu ${card?.bankName} tidak mencukupi.`); return;
            }
            newTransaction.cardId = cardId;
            newTransaction.method = card.cardType === CardType.TUNAI ? 'Tunai' : 'Kartu';
            setCards(prev => prev.map(c => c.id === cardId ? { ...c, balance: c.balance - paymentAmount } : c));
            // Persist card balance change
            try { await updateCardBalanceApi(cardId, -paymentAmount); } catch (e) { console.warn('[Supabase] updateCardBalance failed:', e); }
        } else { // pocket
            const pocketId = paymentSourceId.replace('pocket-', '');
            const pocket = pockets.find(p => p.id === pocketId);
            if (!pocket || pocket.amount < paymentAmount) {
                alert(`Saldo di kantong ${pocket?.name} tidak mencukupi.`); return;
            }

            if (pocket.sourceCardId) {
                const sourceCard = cards.find(c => c.id === pocket.sourceCardId);
                if (!sourceCard || sourceCard.balance < paymentAmount) {
                    alert(`Saldo di kartu sumber (${sourceCard?.bankName}) yang terhubung ke kantong ini tidak mencukupi.`);
                    return;
                }
                setCards(prev => prev.map(c => c.id === pocket.sourceCardId ? { ...c, balance: c.balance - paymentAmount } : c));
                // Persist source card balance change
                try { await updateCardBalanceApi(sourceCard.id, -paymentAmount); } catch (e) { console.warn('[Supabase] updateCardBalance failed:', e); }
            }

            newTransaction.pocketId = pocketId;
            newTransaction.cardId = pocket.sourceCardId;
            newTransaction.method = 'Sistem';
            setPockets(prev => prev.map(p => p.id === pocketId ? { ...p, amount: p.amount - paymentAmount } : p));
        }

        const newRecordPayload = {
            recordNumber: `PAY-FR-${selectedMember.id.slice(-4)}-${Date.now()}`,
            teamMemberId: selectedMember.id,
            date: new Date().toISOString().split('T')[0],
            projectPaymentIds: projectsToPay,
            totalAmount: paymentAmount
        } as Omit<TeamPaymentRecord, 'id'>;

        // Optimistically update UI
        setTeamProjectPayments(prev => prev.map(p => projectsToPay.includes(p.id) ? { ...p, status: 'Paid' } : p));

        // Persist finance transactions PER PROJECT so they appear in each project's P&L
        try {
            let remainingToDistribute = actualPaidAmount;
            const selectedPayments = [...teamProjectPayments.filter(p => projectsToPay.includes(p.id))].sort((a, b) => a.date.localeCompare(b.date));

            for (const pay of selectedPayments) {
                if (remainingToDistribute <= 0) break;

                const payForThisProject = Math.min(pay.fee, remainingToDistribute);
                const isFullyPaid = payForThisProject >= pay.fee;
                remainingToDistribute -= payForThisProject;

                const proj = projects.find(pr => pr.id === pay.projectId);
                const tx: Omit<Transaction, 'id' | 'vendorSignature'> = {
                    date: newTransaction.date,
                    description: `Gaji Vendor - ${selectedMember.name}${proj ? ` (${proj.projectName})` : ''}${!isFullyPaid ? ' (Cicilan)' : ''}`,
                    amount: payForThisProject,
                    type: TransactionType.EXPENSE,
                    projectId: pay.projectId,
                    category: 'Gaji Freelancer',
                    method: newTransaction.method,
                    pocketId: newTransaction.pocketId,
                    cardId: newTransaction.cardId,
                };
                await createTransactionApi(tx);

                // Update Project Payment Record
                if (isFullyPaid) {
                    await markTeamPaymentStatus(pay.id, 'Paid');
                } else {
                    await updateTeamPaymentFee(pay.id, pay.fee - payForThisProject, 'Unpaid');
                }
            }
            const freshTx = await listTransactionsApi();
            setTransactions(Array.isArray(freshTx) ? freshTx : []);
        } catch (e) {
            console.error('[Supabase] createTransaction (per-project) failed:', e);
        }
        try {
            // Persist: create payment record in DB
            const createdRecord = await createTeamPaymentRecord(newRecordPayload);
            setTeamPaymentRecords(prev => {
                const exists = prev.some(r => r.id === createdRecord.id);
                return exists ? prev.map(r => r.id === createdRecord.id ? createdRecord : r) : [...prev, createdRecord];
            });
            // Refresh payments from DB so statuses survive reload
            const freshPayments = await listAllTeamPayments();
            setTeamProjectPayments(Array.isArray(freshPayments) ? freshPayments : []);
        } catch (err) {
            console.error('[Supabase] Persist payment failed:', err);
        }

        // After marking payments as Paid, record rewards into reward ledger and update REWARD_POOL pocket
        try {
            const selectedPayments = teamProjectPayments.filter(p => projectsToPay.includes(p.id));
            const rewardEntries = selectedPayments
                .filter(p => (p.reward || 0) > 0)
                .map(p => ({
                    teamMemberId: p.teamMemberId,
                    date: newTransaction.date,
                    description: `Hadiah dari acara (${projects.find(pr => pr.id === p.projectId)?.projectName || 'Acara'})`,
                    amount: p.reward || 0,
                    projectId: p.projectId,
                }));

            if (rewardEntries.length > 0) {
                // Persist each reward entry into Supabase
                const createdEntries = [] as RewardLedgerEntry[];
                for (const entry of rewardEntries) {
                    try {
                        const created = await createRewardLedgerEntry(entry);
                        createdEntries.push(created);
                    } catch (e) {
                        console.warn('[Supabase] createRewardLedgerEntry failed for', entry, e);
                    }
                }
                // Optimistically update local state even if some failed
                if (createdEntries.length > 0) {
                    setRewardLedgerEntries(prev => [...createdEntries, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
                }

                // Increment Reward Pool pocket amount by total rewards
                const rewardTotal = rewardEntries.reduce((s, r) => s + (r.amount || 0), 0);
                const rewardPocket = pockets.find(p => p.type === PocketType.REWARD_POOL);
                if (rewardPocket && rewardTotal > 0) {
                    setPockets(prev => prev.map(p => p.id === rewardPocket.id ? { ...p, amount: (p.amount || 0) + rewardTotal } : p));
                }
            }
        } catch (e) {
            console.warn('[Rewards] Failed to record reward ledger entries on payment.', e);
        }

        showNotification(`Pembayaran untuk ${selectedMember.name} sebesar ${formatCurrency(paymentAmount)} berhasil dicatat.`);

        setProjectsToPay([]);
        setPaymentAmount('');
        setIsDetailOpen(false);
    };

    const handleWithdrawRewards = async () => {
        if (!selectedMember || selectedMember.rewardBalance <= 0) return;

        if (window.confirm(`Anda akan menarik saldo hadiah sebesar ${formatCurrency(selectedMember.rewardBalance)} untuk ${selectedMember.name}. Lanjutkan?`)) {
            const withdrawalAmount = selectedMember.rewardBalance;
            const sourceCard = cards.find(c => c.id !== 'CARD_CASH') || cards[0];
            if (!sourceCard || sourceCard.balance < withdrawalAmount) {
                alert(`Saldo di kartu sumber (${sourceCard.bankName}) tidak mencukupi untuk penarikan hadiah.`);
                return;
            }

            // 1. Create transaction for the withdrawal (persist to DB)
            const withdrawalDate = new Date().toISOString().split('T')[0];
            const txPayload = {
                date: withdrawalDate,
                description: `Penarikan saldo hadiah oleh ${selectedMember.name}`,
                amount: withdrawalAmount,
                type: TransactionType.EXPENSE,
                category: 'Penarikan Hadiah Freelancer',
                method: 'Transfer Bank',
                cardId: sourceCard.id,
            } as Omit<Transaction, 'id' | 'vendorSignature'>;
            try {
                await createTransactionApi(txPayload);
            } catch (e) {
                console.error('[Supabase] createTransaction (withdraw rewards) failed:', e);
            }

            // 2. Create a negative entry in the reward ledger (persist to DB)
            try {
                const createdLedger = await createRewardLedgerEntry({
                    teamMemberId: selectedMember.id,
                    date: withdrawalDate,
                    description: `Penarikan saldo hadiah oleh ${selectedMember.name}`,
                    amount: -withdrawalAmount,
                });
                // Optimistically update state
                setRewardLedgerEntries(prev => [createdLedger, ...prev].sort((a, b) => (b as RewardLedgerEntry).date.localeCompare((a as RewardLedgerEntry).date)));
            } catch (e) {
                console.error('[Supabase] createRewardLedgerEntry (withdraw) failed:', e);
            }

            // 3. Refresh transactions from DB so it survives reload
            try {
                const freshTx = await listTransactionsApi();
                setTransactions(Array.isArray(freshTx) ? freshTx : []);
            } catch (e) {
                console.warn('[Supabase] listTransactions after withdraw failed:', e);
            }

            // 4. Update local card balance and persist DB delta
            setCards(prev => prev.map(c => c.id === sourceCard.id ? { ...c, balance: c.balance - withdrawalAmount } : c));
            try { await updateCardBalanceApi(sourceCard.id, -withdrawalAmount); } catch (e) { console.warn('[Supabase] updateCardBalance failed:', e); }
            setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, rewardBalance: 0 } : m));

            const rewardPocket = pockets.find(p => p.type === PocketType.REWARD_POOL);
            if (rewardPocket) {
                setPockets(prev => prev.map(p => p.id === rewardPocket.id ? { ...p, amount: p.amount - withdrawalAmount } : p));
                // Persist pocket amount decrease to DB
                try { await updatePocketRow(rewardPocket.id, { amount: (rewardPocket.amount || 0) - withdrawalAmount }); } catch (e) { console.warn('[Supabase] updatePocket (REWARD_POOL) failed:', e); }
            }

            showNotification(`Penarikan hadiah untuk ${selectedMember.name} berhasil.`);
            setIsDetailOpen(false);
        }
    };

    const selectedMemberUnpaidProjects = useMemo(() => {
        if (!selectedMember) return [];
        return teamProjectPaymentsInDateRange.filter(p => p.teamMemberId === selectedMember.id && p.status === 'Unpaid');
    }, [teamProjectPaymentsInDateRange, selectedMember]);

    // Performance Tab Handlers
    const handleSetRating = async (rating: number) => {
        if (!selectedMember) return;
        try {
            const updated = await updateTeamMemberRow(selectedMember.id, { rating });
            setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? updated : m));
            setSelectedMember(updated);
        } catch (err: any) {
            console.error('[Supabase][teamMembers.rating] error:', err);
            alert(`Gagal menyimpan rating. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleAddNote = async () => {
        if (!selectedMember || !newNote.trim()) return;
        const note: PerformanceNote = {
            id: `PN-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            note: newNote,
            type: newNoteType
        };
        const updatedNotes = [...selectedMember.performanceNotes, note];
        try {
            const updated = await updateTeamMemberRow(selectedMember.id, { performanceNotes: updatedNotes });
            setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? updated : m));
            setSelectedMember(updated);
            setNewNote('');
            setNewNoteType(PerformanceNoteType.GENERAL);
        } catch (err: any) {
            console.error('[Supabase][teamMembers.addNote] error:', err);
            alert(`Gagal menambah catatan. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!selectedMember) return;
        const updatedNotes = selectedMember.performanceNotes.filter(n => n.id !== noteId);
        try {
            const updated = await updateTeamMemberRow(selectedMember.id, { performanceNotes: updatedNotes });
            setTeamMembers(prev => prev.map(m => m.id === selectedMember.id ? updated : m));
            setSelectedMember(updated);
        } catch (err: any) {
            console.error('[Supabase][teamMembers.deleteNote] error:', err);
            alert(`Gagal menghapus catatan. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const monthlyBudgetPocket = useMemo(() => pockets.find(p => p.type === PocketType.EXPENSE), [pockets]);

    // Ensure uniqueness and apply search/filter
    const uniqueTeamMembers = useMemo(() => {
        const seen = new Set<string>();
        return teamMembers.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);

            const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.role.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'All' || m.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [teamMembers, searchQuery, categoryFilter]);

    const uniqueTeamPaymentRecords = useMemo(() => {
        const seen = new Set<string>();
        return teamPaymentRecords.filter(r => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
        });
    }, [teamPaymentRecords]);

    const uniqueRewardLedgerEntries = useMemo(() => {
        const seen = new Set<string>();
        return rewardLedgerEntries.filter(e => {
            if (seen.has(e.id)) return false;
            seen.add(e.id);
            return true;
        });
    }, [rewardLedgerEntries]);

    const handleSaveSignature = (signatureDataUrl: string) => {
        if (paymentSlipToView) {
            onSignPaymentRecord(paymentSlipToView.id, signatureDataUrl);
            setPaymentSlipToView(prev => prev ? { ...prev, vendorSignature: signatureDataUrl } : null);
        }
        setIsSignatureModalOpen(false);
    };

    const renderPaymentSlipBody = (record: TeamPaymentRecord) => {
        const freelancer = teamMembers.find(m => m.id === record.teamMemberId);
        if (!freelancer) return null;
        const projectsBeingPaid = teamProjectPayments.filter(p => record.projectPaymentIds.includes(p.id));

        return (
            <div id={`payment-slip-content-${record.id}`} className="printable-content bg-white font-sans text-slate-900 printable-area avoid-break shadow-2xl border border-slate-200">
                {/* Accent Border Top */}
                <div className="h-2 bg-brand-accent w-full"></div>

                <div className="p-8 sm:p-12">
                    {/* Header Section */}
                    <header className="flex justify-between items-start mb-12 pb-8 border-b border-slate-100">
                        <div className="flex flex-col gap-4">
                            {userProfile.logoBase64 ? (
                                <img src={userProfile.logoBase64} alt="Company Logo" className="h-16 sm:h-20 object-contain self-start" />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-brand-accent flex items-center justify-center">
                                        <span className="text-white font-bold text-xl">{userProfile.companyName?.charAt(0) || 'V'}</span>
                                    </div>
                                    <h1 className="text-xl font-bold text-slate-800">{userProfile.companyName}</h1>
                                </div>
                            )}
                            <div className="text-[11px] leading-relaxed text-slate-500 max-w-[250px]">
                                <p className="font-bold text-slate-700">{userProfile.companyName}</p>
                                <p>{userProfile.address}</p>
                                <p>{userProfile.phone} • {userProfile.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h2 className="text-3xl font-black text-brand-accent tracking-tighter mb-2">SLIP GAJI</h2>
                            <div className="inline-block bg-slate-100 px-3 py-1 rounded-sm text-[12px] font-bold text-slate-600 mb-3">
                                #{record.recordNumber}
                            </div>
                            <div className="text-[11px] text-slate-500">
                                <p>Tanggal Bayar: <span className="font-bold text-slate-700">{formatDate(record.date)}</span></p>
                                <p className="mt-1">Metode: <span className="font-bold text-slate-700 uppercase">Transfer Bank</span></p>
                            </div>
                        </div>
                    </header>

                    {/* Recipient & Payer Info */}
                    <div className="grid grid-cols-2 gap-8 mb-12">
                        <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Penerima (Vendor/Tim)</h4>
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-slate-800">{freelancer.name}</p>
                                <div className="text-[12px] text-slate-600 space-y-0.5">
                                    <p className="font-medium text-brand-accent">{freelancer.role}</p>
                                    <p>No. Rek: <span className="font-bold">{freelancer.noRek || '-'}</span></p>
                                    <p className="text-[10px] italic">{freelancer.bankName || ''}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Sumber Dana</h4>
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-slate-800">{userProfile.companyName}</p>
                                <div className="text-[12px] text-slate-600 space-y-0.5">
                                    <p>Rekening Bisnis: <span className="font-bold">{userProfile.bankAccount || '-'}</span></p>
                                    <p className="text-[10px] italic">Verified Business Payment</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Items Table */}
                    <div className="mb-12">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Rincian Pekerjaan & Honor</h3>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 border-b-2 border-slate-200">
                                    <th className="px-5 py-4 text-[11px] font-black text-slate-600 uppercase tracking-widest w-[60%]">Deskripsi Acara / Tugas</th>
                                    <th className="px-5 py-4 text-[11px] font-black text-slate-600 uppercase tracking-widest text-center w-[15%]">Peran</th>
                                    <th className="px-5 py-4 text-[11px] font-black text-slate-600 uppercase tracking-widest text-right w-[25%]">Jumlah Fee</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {projectsBeingPaid.map(p => {
                                    const project = projects.find(proj => proj.id === p.projectId);
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-5">
                                                <p className="font-bold text-slate-800">{project?.projectName || 'Acara Selesai'}</p>
                                                <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span>
                                                    ID Sesi: {p.id.slice(-8).toUpperCase()} • Selesai: {formatDate(project?.date)}
                                                </p>
                                            </td>
                                            <td className="px-5 py-5 text-center">
                                                <span className="inline-block px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase">
                                                    {project?.team.find(t => t.memberId === freelancer.id)?.role || freelancer.role}
                                                </span>
                                            </td>
                                            <td className="px-5 py-5 text-right font-bold text-slate-800">{formatCurrency(p.fee)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50/50 border-t-2 border-slate-200">
                                    <td colSpan={2} className="px-5 py-5 text-right">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Honor Bersih</span>
                                    </td>
                                    <td className="px-5 py-5 text-right">
                                        <p className="text-2xl font-black text-brand-accent tracking-tighter">{formatCurrency(record.totalAmount)}</p>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="flex justify-between items-end pt-12 border-t border-slate-100">
                        <div className="flex-1 max-w-[350px]">
                            <div className="bg-brand-accent/5 border border-brand-accent/10 p-4 rounded-lg mb-4">
                                <p className="text-[10px] text-brand-accent font-bold mb-1 uppercase tracking-tight">Catatan Transaksi:</p>
                                <p className="text-[11px] text-slate-500 leading-relaxed italic">
                                    Pembayaran ini bersifat final untuk rincian pekerjaan yang tertera di atas. Jika terdapat ketidaksesuaian, silakan hubungi tim administrasi dalam 2x24 jam.
                                </p>
                            </div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
                                Dicetak Otomatis oleh Sistem {userProfile.companyName}
                            </p>
                        </div>

                        <div className="text-center min-w-[180px]">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Verifikator,</p>
                            <div className="h-20 flex items-center justify-center mb-1">
                                {record.vendorSignature ? (
                                    <img src={record.vendorSignature} alt="Tanda Tangan" className="max-h-full object-contain" />
                                ) : userProfile.signatureBase64 ? (
                                    <img src={userProfile.signatureBase64} alt="Tanda Tangan" className="max-h-full object-contain" />
                                ) : (
                                    <div className="h-px w-24 bg-slate-200 mx-auto mt-10" />
                                )}
                            </div>
                            <p className="text-sm font-bold text-slate-800 underline underline-offset-4 decoration-slate-300">
                                ({userProfile.authorizedSigner || userProfile.companyName})
                            </p>
                            <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-tighter">
                                {userProfile.companyName}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const handleDownloadPDF = () => {
        if (!paymentSlipToView) return;
        const element = document.getElementById(`payment-slip-content-${paymentSlipToView.id}`);
        if (!element) return;

        const opt = {
            margin: 10,
            filename: `Slip-Gaji-${paymentSlipToView.recordNumber}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4' as const, orientation: 'portrait' as const }
        };

        html2pdf().set(opt).from(element).save();
    };

    const handleDownloadFreelancers = () => {
        const headers = ['Nama', 'Role', 'Kategori', 'Email', 'Telepon', 'No. Rekening', 'Fee Belum Dibayar', 'Saldo Hadiah', 'Rating'];
        const data = teamMembers.map(member => {
            const unpaidFee = teamProjectPaymentsInDateRange
                .filter(p => p.teamMemberId === member.id && p.status === 'Unpaid')
                .reduce((sum, p) => sum + p.fee, 0);
            return [
                `"${member.name.replace(/"/g, '""')}"`,
                member.role,
                member.category || 'Tim',
                member.email,
                member.phone,
                member.noRek || '-',
                unpaidFee,
                member.rewardBalance,
                member.rating.toFixed(1)
            ];
        });
        downloadCSV(headers, data, `data-freelancer-${new Date().toISOString().split('T')[0]}.csv`);
    };

    const modalTitles: { [key: string]: string } = {
        total: 'Daftar Semua Freelancer',
        unpaid: 'Rincian Fee Belum Dibayar',
        topRated: 'Peringkat Freelancer',
        rewards: 'Riwayat Saldo Hadiah'
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Manajemen Freelancer" subtitle="Kelola semua data freelancer, acara, dan pembayaran." icon={<UsersIcon className="w-6 h-6" />}>
                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2 sm:gap-3 mt-4 sm:mt-0">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-hidden">
                        <CalendarIcon className="w-4 h-4 text-brand-text-secondary flex-shrink-0" />
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2 text-sm w-full sm:w-36" title="Dari tanggal" />
                    </div>
                    <span className="text-brand-text-secondary text-sm hidden sm:inline">–</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2 text-sm w-full sm:w-36" title="Sampai tanggal" />
                    <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-sm text-brand-text-secondary hover:text-brand-text-primary mt-1 sm:mt-0 w-full sm:w-auto text-center">Reset</button>
                    <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary justify-center text-xs sm:text-sm py-2">Pelajari Halaman Ini</button>
                    <button onClick={handleDownloadFreelancers} className="button-secondary inline-flex items-center justify-center gap-2 text-xs sm:text-sm py-2">
                        <DownloadIcon className="w-4 h-4" /> Unduh Data
                    </button>
                    <button onClick={() => handleOpenForm('add')} className="button-primary inline-flex items-center justify-center gap-2 text-xs sm:text-sm py-2">
                        <PlusIcon className="w-5 h-5" />
                        Tambah Tim / Vendor
                    </button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div onClick={() => setActiveStatModal('total')} className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '100ms' }}>
                    <StatCard icon={<UsersIcon className="w-6 h-6" />} title="Total Tim / Vendor" value={teamStats.totalMembers.toString()} subtitle="Vendor terdaftar" colorVariant="blue" />
                </div>
                <div onClick={() => setActiveStatModal('unpaid')} className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '200ms' }}>
                    <StatCard icon={<AlertCircleIcon className="w-6 h-6" />} title="Total Fee Belum Lunas" value={teamStats.totalUnpaid} subtitle="Tagihan vendor" colorVariant="pink" />
                </div>
                <div onClick={() => setActiveStatModal('topRated')} className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '300ms' }}>
                    <StatCard icon={<UserCheckIcon className="w-6 h-6" />} title="Top Vendor" value={teamStats.topRatedName} subtitle={`Rating: ${teamStats.topRatedRating}`} colorVariant="green" />
                </div>
                <div onClick={() => setActiveStatModal('rewards')} className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '400ms' }}>
                    <StatCard icon={<PiggyBankIcon className="w-6 h-6" />} title="Poin & Hadiah" value={formatCurrency(pockets.find(p => p.type === PocketType.REWARD_POOL)?.amount || 0)} subtitle="Reward tersedia" colorVariant="orange" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Widget 1: Komposisi */}
                <div className="bg-brand-surface/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/10 flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gradient mb-5 flex items-center gap-2">
                            <UsersIcon className="w-5 h-5 text-blue-400" /> Komposisi Tim
                        </h3>
                        <div className="space-y-4">
                            {(() => {
                                const timCount = teamMembers.filter(m => m.category !== 'Vendor').length;
                                const vendorCount = teamMembers.filter(m => m.category === 'Vendor').length;
                                const total = timCount + vendorCount || 1;
                                return (
                                    <>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-end">
                                                <span className="text-brand-text-secondary text-[10px] font-bold uppercase tracking-widest">Internal</span>
                                                <span className="text-lg font-black text-blue-400">{timCount}</span>
                                            </div>
                                            <div className="w-full bg-slate-900/50 h-2.5 rounded-full overflow-hidden border border-white/5">
                                                <div className="h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(timCount / total) * 100}%`, backgroundColor: '#3b82f6' }}></div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-end">
                                                <span className="text-brand-text-secondary text-[10px] font-bold uppercase tracking-widest">Vendor</span>
                                                <span className="text-lg font-black text-orange-400">{vendorCount}</span>
                                            </div>
                                            <div className="w-full bg-slate-900/50 h-2.5 rounded-full overflow-hidden border border-white/5">
                                                <div className="h-full rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: `${(vendorCount / total) * 100}%`, backgroundColor: '#f97316' }}></div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* Widget 2: Performa */}
                <div className="bg-brand-surface/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/10">
                    <h3 className="text-sm font-bold text-gradient mb-5 flex items-center gap-2">
                        <HistoryIcon className="w-5 h-5 text-brand-accent" /> Performa Tim
                    </h3>
                    <div className="space-y-3">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center group">
                            <div>
                                <p className="text-[9px] text-brand-text-secondary font-bold uppercase tracking-tighter">Total Payout</p>
                                <p className="text-lg font-black text-brand-text-light">{teamStats.totalPayout}</p>
                            </div>
                            <DollarSignIcon className="w-6 h-6 text-brand-text-secondary/20 group-hover:text-brand-accent/20" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <p className="text-[9px] text-brand-text-secondary font-bold uppercase tracking-tighter">Selesai</p>
                                <p className="text-lg font-black text-brand-text-light">{teamStats.totalProjectsHandled}</p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                <p className="text-[9px] text-brand-text-secondary font-bold uppercase tracking-tighter">Rating</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-lg font-black text-yellow-400">{teamStats.avgRating}</p>
                                    <StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Widget 3: Tren */}
                <div className="bg-brand-surface/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/10">
                    <div className="flex justify-between items-start mb-5">
                        <h3 className="text-sm font-bold text-gradient flex items-center gap-2">
                            <DollarSignIcon className="w-5 h-5" /> Tren
                        </h3>
                        <div className="text-right">
                            <p className="text-[9px] text-brand-text-secondary font-bold uppercase">6 Bulan</p>
                            <p className="text-sm font-black text-brand-accent">
                                {(() => {
                                    const now = new Date();
                                    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                                    const total = teamPaymentRecords
                                        .filter(r => new Date(r.date) >= sixMonthsAgo)
                                        .reduce((sum, r) => sum + r.totalAmount, 0);
                                    return formatCurrency(total);
                                })()}
                            </p>
                        </div>
                    </div>
                    <div className="h-24 flex items-end gap-2 px-1">
                        {(() => {
                            const now = new Date();
                            const months: { name: string; year: number; month: number; total: number }[] = [];
                            for (let i = 5; i >= 0; i--) {
                                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                months.push({
                                    name: d.toLocaleString('id-ID', { month: 'short' }),
                                    year: d.getFullYear(),
                                    month: d.getMonth(),
                                    total: 0
                                });
                            }
                            teamPaymentRecords.forEach(r => {
                                const rd = new Date(r.date);
                                const m = months.find(mo => mo.month === rd.getMonth() && mo.year === rd.getFullYear());
                                if (m) m.total += r.totalAmount;
                            });
                            const maxVal = Math.max(...months.map(m => m.total), 1);
                            return months.map((m, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-accent text-white text-[9px] py-1 px-2 rounded-lg shadow-2xl z-20 whitespace-nowrap font-bold">
                                        {formatCurrency(m.total)}
                                    </div>
                                    <div className="w-full rounded-t-lg transition-all duration-300"
                                        style={{
                                            height: `${(m.total / maxVal) * 100}%`,
                                            minHeight: '4px',
                                            background: m.total > 0 ? 'linear-gradient(to top, #6366f1, #818cf8)' : '#1e293b',
                                            boxShadow: m.total > 0 ? '0 0 10px rgba(99,102,241,0.3)' : 'none'
                                        }}>
                                    </div>
                                    <span className="text-[9px] font-bold text-brand-text-secondary mt-2">{m.name}</span>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>

            <div className="bg-brand-surface/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/10 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                    {(['All', 'Tim', 'Vendor'] as const).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${categoryFilter === cat ? 'bg-brand-accent text-white shadow-lg' : 'text-brand-text-secondary hover:text-brand-text-light hover:bg-white/5'}`}
                        >
                            {cat === 'All' ? 'Semua' : cat}
                        </button>
                    ))}
                </div>

                <div className="relative flex-grow max-w-md">
                    {/* Actually, let's just use a styled input */}
                    <input
                        type="text"
                        placeholder="Cari nama atau posisi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-brand-text-light focus:outline-none focus:border-brand-accent/50 transition-all pl-10"
                    />
                    <UsersIcon className="w-4 h-4 text-brand-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
            </div>

            <div className="bg-brand-surface/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/10 transition-all duration-300">
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                    {uniqueTeamMembers.map(member => {
                        const unpaidFee = teamProjectPaymentsInDateRange.filter(p => p.teamMemberId === member.id && p.status === 'Unpaid').reduce((sum, p) => sum + p.fee, 0);
                        const reward = rewardTotalsByMember[member.id] ?? member.rewardBalance ?? 0;
                        return (
                            <div key={member.id} className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-5 shadow-lg group hover:border-brand-accent/50 transition-all duration-300">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-brand-text-light leading-tight">{member.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-[11px] text-brand-text-secondary">{member.role}</p>
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${member.category === 'Vendor' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                {member.category || 'Tim'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right text-xs">
                                        <div className="inline-flex items-center gap-1 bg-brand-bg px-2 py-1 rounded-full"><StarIcon className="w-3.5 h-3.5 text-yellow-400 fill-current" />{member.rating.toFixed(1)}</div>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                                    <span className="text-brand-text-secondary">Fee Belum Dibayar</span>
                                    <span className="text-right font-semibold text-red-400">{formatCurrency(unpaidFee)}</span>
                                    <span className="text-brand-text-secondary">Saldo Hadiah</span>
                                    <span className="text-right font-semibold text-yellow-400">{formatCurrency(reward)}</span>
                                </div>
                                <div className="mt-3 flex justify-end gap-2">
                                    <button onClick={() => handleViewDetails(member)} className="button-secondary !text-xs !px-3 !py-2">Detail</button>
                                    <button onClick={() => handleOpenForm('edit', member)} className="button-secondary !text-xs !px-3 !py-2">Edit</button>
                                    <button onClick={() => handleDelete(member.id)} className="button-secondary !text-xs !px-3 !py-2">Hapus</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-brand-text-secondary uppercase"><tr><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Vendor / Tim</th><th className="px-4 py-3">Fee Belum Dibayar</th><th className="px-4 py-3">Saldo Hadiah</th><th className="px-4 py-3 text-center">Rating</th><th className="px-4 py-3 text-center">Aksi</th></tr></thead>
                        <tbody className="divide-y divide-brand-border">
                            {uniqueTeamMembers.map(member => {
                                const unpaidFee = teamProjectPaymentsInDateRange.filter(p => p.teamMemberId === member.id && p.status === 'Unpaid').reduce((sum, p) => sum + p.fee, 0);
                                return (
                                    <tr key={member.id} className="hover:bg-brand-surface/50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-brand-text-light">{member.name}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-brand-text-primary font-medium">{member.role}</span>
                                                <span className={`text-[10px] w-fit px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${member.category === 'Vendor' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                    {member.category || 'Tim'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-red-400">{formatCurrency(unpaidFee)}</td>
                                        <td className="px-4 py-3 font-semibold text-yellow-400">{formatCurrency(rewardTotalsByMember[member.id] ?? member.rewardBalance ?? 0)}</td>
                                        <td className="px-4 py-3"><div className="flex justify-center items-center gap-1"><StarIcon className="w-4 h-4 text-yellow-400 fill-current" />{member.rating.toFixed(1)}</div></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center space-x-1">
                                                <button onClick={() => handleViewDetails(member)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Detail"><EyeIcon className="w-5 h-5" /></button>
                                                <button onClick={() => handleOpenForm('edit', member)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit"><PencilIcon className="w-5 h-5" /></button>
                                                <button onClick={() => handleDelete(member.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Hapus"><Trash2Icon className="w-5 h-5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="Panduan Halaman Freelancer">
                <div className="space-y-4 text-sm text-brand-text-primary">
                    <p>Halaman ini adalah pusat untuk semua hal yang berkaitan dengan tim freelancer Anda.</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Tambah & Edit:</strong> Gunakan tombol di kanan atas untuk menambahkan freelancer baru atau klik ikon pensil di tabel untuk mengedit data yang ada.</li>
                        <li><strong>Lihat Detail (<EyeIcon className="w-4 h-4 inline-block" />):</strong> Buka panel detail untuk melihat semua acara yang dikerjakan, riwayat pembayaran, dan catatan kinerja.</li>
                        <li><strong>Kelola Pembayaran:</strong> Di panel detail, Anda dapat memilih acara yang belum dibayar, membuat slip pembayaran, dan mencatat transaksi pembayaran.</li>
                        <li><strong>Kinerja & Hadiah:</strong> Berikan peringkat, tambahkan catatan kinerja, dan kelola saldo hadiah untuk setiap freelancer di tab masing-masing pada panel detail.</li>
                        <li><strong>Bagikan Portal:</strong> Setiap freelancer memiliki portal pribadi. Bagikan tautan unik melalui panel detail agar mereka dapat melihat jadwal dan tugas revisi mereka.</li>
                    </ul>
                </div>
            </Modal>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={formMode === 'add' ? 'Tambah Freelancer' : 'Edit Freelancer'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                            <UsersIcon className="w-4 h-4" />
                            Informasi Freelancer
                        </h4>
                        <p className="text-xs text-brand-text-secondary">
                            Tambahkan data lengkap freelancer yang akan bekerja sama dengan Anda. Data ini akan digunakan untuk manajemen acara dan pembayaran.
                        </p>
                    </div>

                    <div>
                        <h5 className="text-sm font-semibold text-brand-text-light mb-3">Data Pribadi</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="input-group">
                                <input type="text" id="name" name="name" value={formData.name} onChange={handleFormChange} className="input-field" placeholder=" " required />
                                <label htmlFor="name" className="input-label">Nama Lengkap</label>
                                <p className="text-xs text-brand-text-secondary mt-1">Nama lengkap freelancer</p>
                            </div>
                            <div className="input-group">
                                <input type="text" id="role" name="role" value={formData.role} onChange={handleFormChange} className="input-field" placeholder=" " required />
                                <label htmlFor="role" className="input-label">Role/Posisi</label>
                                <p className="text-xs text-brand-text-secondary mt-1">Contoh: Make-Up Artist, Dekorator, Musisi</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h5 className="text-sm font-semibold text-brand-text-light mb-3">Kontak</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="input-group">
                                <input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className="input-field" placeholder=" " required />
                                <label htmlFor="email" className="input-label">Email</label>
                                <p className="text-xs text-brand-text-secondary mt-1">Email untuk komunikasi dan akses portal</p>
                            </div>
                            <div className="input-group">
                                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} className="input-field" placeholder=" " required />
                                <label htmlFor="phone" className="input-label">Nomor Telepon</label>
                                <p className="text-xs text-brand-text-secondary mt-1">Nomor WhatsApp/telepon aktif</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h5 className="text-sm font-semibold text-brand-text-light mb-3">Informasi Pembayaran</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="input-group">
                                <RupiahInput id="standardFee" value={formData.standardFee.toString()} onChange={(raw) => setFormData(prev => ({ ...prev, standardFee: Number(raw) }))} className="input-field" placeholder=" " required />
                                <label htmlFor="standardFee" className="input-label">Fee Standar (IDR)</label>
                                <p className="text-xs text-brand-text-secondary mt-1">Fee default per acara dalam Rupiah</p>
                            </div>
                            <div className="input-group">
                                <input type="text" id="noRek" name="noRek" value={formData.noRek} onChange={handleFormChange} className="input-field" placeholder=" " />
                                <label htmlFor="noRek" className="input-label">Nomor Rekening</label>
                                <p className="text-xs text-brand-text-secondary mt-1">Untuk transfer pembayaran (opsional)</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h5 className="text-sm font-semibold text-brand-text-light mb-3">Kategori</h5>
                        <div className="input-group">
                            <select
                                id="category"
                                name="category"
                                value={formData.category} // @ts-ignore
                                onChange={handleFormChange}
                                className="input-field"
                            >
                                <option value="Tim">Tim Internal</option>
                                <option value="Vendor">Vendor Eksternal</option>
                            </select>
                            <label htmlFor="category" className="input-label">Pilih Kategori</label>
                            <p className="text-xs text-brand-text-secondary mt-1">Pilih "Tim" untuk tim internal Anda, atau "Vendor" untuk pihak ketiga.</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-brand-border">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="button-secondary w-full sm:w-auto">Batal</button>
                        <button type="submit" className="button-primary w-full sm:w-auto">{formMode === 'add' ? 'Simpan' : 'Update'}</button>
                    </div>
                </form>
            </Modal>

            {selectedMember && <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Detail Tim / Vendor: ${selectedMember.name}`} size="4xl">
                <div className="flex flex-col h-full">
                    {/* Vendor Snapshot Cards (Suggested Feature) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 non-printable">
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
                            <p className="text-xs text-brand-text-secondary uppercase font-bold mb-1">Total Acara</p>
                            <p className="text-2xl font-bold text-gradient">
                                {teamProjectPayments.filter(p => p.teamMemberId === selectedMember.id && p.status === 'Paid').length}
                            </p>
                            <p className="text-[10px] text-brand-text-secondary mt-1">Selesai Dibayar</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
                            <p className="text-xs text-brand-text-secondary uppercase font-bold mb-1">Total Pendapatan</p>
                            <p className="text-2xl font-bold text-gradient">
                                {formatCurrency(teamProjectPayments.filter(p => p.teamMemberId === selectedMember.id && p.status === 'Paid').reduce((sum, p) => sum + p.fee, 0))}
                            </p>
                            <p className="text-[10px] text-brand-text-secondary mt-1">Lifetime Earnings</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
                            <p className="text-xs text-brand-text-secondary uppercase font-bold mb-1">Rating Performansi</p>
                            <div className="flex items-center gap-2">
                                <p className="text-2xl font-bold text-gradient">{selectedMember.rating.toFixed(1)}</p>
                                <StarIcon className="w-5 h-5 text-yellow-400 fill-current" />
                            </div>
                            <p className="text-[10px] text-brand-text-secondary mt-1">Berdasarkan feedback</p>
                        </div>
                    </div>

                    {/* Desktop Tab Navigation - Top */}
                    <div className="hidden md:block mb-6">
                        <nav className="flex space-x-2 overflow-x-auto p-1 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 w-fit">
                            <button onClick={() => setDetailTab('projects')} className={`shrink-0 inline-flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${detailTab === 'projects' || detailTab === 'create-payment' ? 'bg-brand-accent text-white shadow-md' : 'text-brand-text-secondary hover:text-brand-text-light hover:bg-white/5'}`}><FileTextIcon className="w-4 h-4" />Acara</button>
                            <button onClick={() => setDetailTab('payments')} className={`shrink-0 inline-flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${detailTab === 'payments' ? 'bg-brand-accent text-white shadow-md' : 'text-brand-text-secondary hover:text-brand-text-light hover:bg-white/5'}`}><HistoryIcon className="w-4 h-4" />Pembayaran</button>
                            <button onClick={() => setDetailTab('performance')} className={`shrink-0 inline-flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${detailTab === 'performance' ? 'bg-brand-accent text-white shadow-md' : 'text-brand-text-secondary hover:text-brand-text-light hover:bg-white/5'}`}><StarIcon className="w-4 h-4" />Kinerja</button>
                            <button onClick={() => setDetailTab('rewards')} className={`shrink-0 inline-flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 ${detailTab === 'rewards' ? 'bg-brand-accent text-white shadow-md' : 'text-brand-text-secondary hover:text-brand-text-light hover:bg-white/5'}`}><PiggyBankIcon className="w-4 h-4" />Hadiah</button>
                            <button onClick={() => handleOpenQrModal(selectedMember)} className={`shrink-0 inline-flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-all duration-300 text-brand-text-secondary hover:text-brand-text-light hover:bg-white/5`}><Share2Icon className="w-4 h-4" />Portal</button>
                        </nav>
                    </div>

                    {/* Mobile Tab Navigation - Top Pills */}
                    <div className="md:hidden mb-4">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide py-1">
                            <button
                                onClick={() => setDetailTab('projects')}
                                className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${detailTab === 'projects' || detailTab === 'create-payment'
                                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30 scale-105'
                                    : 'bg-white/5 backdrop-blur-md text-brand-text-secondary border border-white/10 hover:bg-white/10 active:scale-95'
                                    }`}
                            >
                                <FileTextIcon className="w-4 h-4" />
                                <span>Acara</span>
                            </button>
                            <button
                                onClick={() => setDetailTab('payments')}
                                className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${detailTab === 'payments'
                                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30 scale-105'
                                    : 'bg-white/5 backdrop-blur-md text-brand-text-secondary border border-white/10 hover:bg-white/10 active:scale-95'
                                    }`}
                            >
                                <HistoryIcon className="w-4 h-4" />
                                <span>Pembayaran</span>
                            </button>
                            <button
                                onClick={() => setDetailTab('performance')}
                                className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${detailTab === 'performance'
                                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30 scale-105'
                                    : 'bg-white/5 backdrop-blur-md text-brand-text-secondary border border-white/10 hover:bg-white/10 active:scale-95'
                                    }`}
                            >
                                <StarIcon className="w-4 h-4" />
                                <span>Kinerja</span>
                            </button>
                            <button
                                onClick={() => setDetailTab('rewards')}
                                className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 ${detailTab === 'rewards'
                                    ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30 scale-105'
                                    : 'bg-white/5 backdrop-blur-md text-brand-text-secondary border border-white/10 hover:bg-white/10 active:scale-95'
                                    }`}
                            >
                                <PiggyBankIcon className="w-4 h-4" />
                                <span>Hadiah</span>
                            </button>
                            <button
                                onClick={() => handleOpenQrModal(selectedMember)}
                                className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 bg-white/5 backdrop-blur-md text-brand-text-secondary border border-white/10 hover:bg-white/10 active:scale-95"
                            >
                                <Share2Icon className="w-4 h-4" />
                                <span>Portal</span>
                            </button>
                        </div>
                    </div>

                    <div className="pt-0 md:pt-5 max-h-[65vh] overflow-y-auto pr-2 pb-4">
                        {detailTab === 'projects' && <FreelancerProjects unpaidProjects={selectedMemberUnpaidProjects} projectsToPay={projectsToPay} onToggleProject={(id) => setProjectsToPay(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id])} onProceedToPayment={handleCreatePayment} projects={projectsInDateRange} />}
                        {detailTab === 'payments' && <div className="tab-content-mobile">
                            <h4 className="text-sm md:text-base font-semibold text-brand-text-light mb-4">Riwayat Pembayaran</h4>
                            {/* Mobile cards */}
                            <div className="md:hidden space-y-3">
                                {uniqueTeamPaymentRecords.filter(r => r.teamMemberId === selectedMember.id).map(record => (
                                    <div key={record.id} className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-brand-text-light">No: {record.recordNumber}</p>
                                                <p className="text-[11px] text-brand-text-secondary mt-0.5">{formatDate(record.date)}</p>
                                            </div>
                                            <p className="text-sm font-semibold text-brand-success">{formatCurrency(record.totalAmount)}</p>
                                        </div>
                                        {expandedRecordId === record.id && (
                                            <div className="mt-3 bg-brand-bg rounded-lg p-3">
                                                <p className="text-sm font-medium mb-2 text-brand-text-light">Acara yang dibayar:</p>
                                                <ul className="list-disc list-inside text-sm space-y-1 pl-4">
                                                    {record.projectPaymentIds.map(paymentId => {
                                                        const payment = teamProjectPayments.find(p => p.id === paymentId);
                                                        const project = projects.find(p => p.id === payment?.projectId);
                                                        return (
                                                            <li key={paymentId} className="text-brand-text-primary">{project?.projectName || 'Acara tidak ditemukan'} - <span className="font-semibold">{formatCurrency(payment?.fee || 0)}</span></li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        )}
                                        <div className="mt-3 flex justify-end gap-2">
                                            <button onClick={() => setExpandedRecordId(expandedRecordId === record.id ? null : record.id)} className="button-secondary !text-xs !px-3 !py-2">{expandedRecordId === record.id ? 'Tutup' : 'Rincian'}</button>
                                            <button onClick={() => setPaymentSlipToView(record)} className="button-secondary !text-xs !px-3 !py-2">Slip</button>
                                        </div>
                                    </div>
                                ))}
                                {uniqueTeamPaymentRecords.filter(r => r.teamMemberId === selectedMember.id).length === 0 && (
                                    <p className="text-center text-brand-text-secondary py-8">Tidak ada riwayat pembayaran untuk freelancer ini.</p>
                                )}
                            </div>
                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto border border-brand-border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-brand-bg text-xs text-brand-text-secondary uppercase">
                                        <tr>
                                            <th className="px-4 py-3 text-left">No. Pembayaran</th>
                                            <th className="px-4 py-3 text-left">Tanggal</th>
                                            <th className="px-4 py-3 text-right">Jumlah</th>
                                            <th className="px-4 py-3 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-border">
                                        {uniqueTeamPaymentRecords.filter(r => r.teamMemberId === selectedMember.id).map(record => (
                                            <React.Fragment key={record.id}>
                                                <tr>
                                                    <td className="px-4 py-3 font-mono text-brand-text-secondary">{record.recordNumber}</td>
                                                    <td className="px-4 py-3 text-brand-text-primary">{formatDate(record.date)}</td>
                                                    <td className="px-4 py-3 text-right font-semibold text-brand-success">{formatCurrency(record.totalAmount)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => setExpandedRecordId(expandedRecordId === record.id ? null : record.id)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title={expandedRecordId === record.id ? 'Tutup Rincian' : 'Lihat Rincian'}><EyeIcon className="w-5 h-5" /></button>
                                                            <button onClick={() => setPaymentSlipToView(record)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Lihat Slip Pembayaran"><FileTextIcon className="w-5 h-5" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedRecordId === record.id && (
                                                    <tr className="bg-brand-bg">
                                                        <td colSpan={4} className="p-4">
                                                            <p className="text-sm font-medium mb-2 text-brand-text-light">Acara yang dibayar:</p>
                                                            <ul className="list-disc list-inside text-sm space-y-1 pl-4">
                                                                {record.projectPaymentIds.map(paymentId => {
                                                                    const payment = teamProjectPayments.find(p => p.id === paymentId);
                                                                    const project = projects.find(p => p.id === payment?.projectId);
                                                                    return (
                                                                        <li key={paymentId} className="text-brand-text-primary">
                                                                            {project?.projectName || 'Acara tidak ditemukan'} - <span className="font-semibold">{formatCurrency(payment?.fee || 0)}</span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>}
                        {detailTab === 'performance' && <PerformanceTab member={selectedMember} onSetRating={handleSetRating} newNote={newNote} setNewNote={setNewNote} newNoteType={newNoteType} setNewNoteType={setNewNoteType} onAddNote={handleAddNote} onDeleteNote={handleDeleteNote} />}
                        {detailTab === 'rewards' && <RewardSavingsTab member={selectedMember} suggestions={[]} rewardLedger={rewardLedgerEntries.filter(rle => rle.teamMemberId === selectedMember.id)} onWithdraw={handleWithdrawRewards} />}
                        {detailTab === 'create-payment' && selectedMember && (
                            <CreatePaymentTab
                                member={selectedMember}
                                paymentDetails={{
                                    projects: selectedMemberUnpaidProjects.filter(p => projectsToPay.includes(p.id)),
                                    total: typeof paymentAmount === 'number' ? paymentAmount : 0
                                }}
                                paymentAmount={paymentAmount}
                                setPaymentAmount={setPaymentAmount}
                                isInstallment={isInstallment}
                                setIsInstallment={setIsInstallment}
                                onPay={handlePay}
                                onSetTab={() => setDetailTab('projects')}
                                renderPaymentDetailsContent={() => renderPaymentSlipBody({ id: `TEMP-${Date.now()}`, recordNumber: `PAY-FR-${selectedMember.id.slice(-4)}-${Date.now()}`, teamMemberId: selectedMember.id, date: new Date().toISOString(), projectPaymentIds: projectsToPay, totalAmount: typeof paymentAmount === 'number' ? paymentAmount : 0 })}
                                cards={cards}
                                monthlyBudgetPocket={monthlyBudgetPocket}
                                paymentSourceId={paymentSourceId}
                                setPaymentSourceId={setPaymentSourceId}
                                onSign={() => { setIsSignatureModalOpen(true); }}
                            />
                        )}
                    </div>
                </div>
            </Modal>}

            {paymentSlipToView && (
                <Modal isOpen={!!paymentSlipToView} onClose={() => setPaymentSlipToView(null)} title={`Slip Pembayaran: ${paymentSlipToView.recordNumber}`} size="3xl">
                    <div className="printable-area">
                        {renderPaymentSlipBody(paymentSlipToView)}
                    </div>
                    <div className="mt-6 text-right non-printable space-x-2">
                        <button type="button" onClick={() => {
                            setIsSignatureModalOpen(true);
                        }} className="button-secondary inline-flex items-center gap-2">
                            <PencilIcon className="w-4 h-4" />
                            {userProfile?.signatureBase64 ? 'Ganti TTD Manual' : 'Bubuhkan TTD'}
                        </button>
                        <button type="button" onClick={handleDownloadPDF} className="button-primary inline-flex items-center gap-2 px-6">
                            <DownloadIcon className="w-5 h-5" />
                            Unduh PDF
                        </button>
                    </div>
                </Modal>
            )}

            {isSignatureModalOpen && (
                <Modal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} title="Bubuhkan Tanda Tangan Anda">
                    <SignaturePad onClose={() => setIsSignatureModalOpen(false)} onSave={handleSaveSignature} />
                </Modal>
            )}

            <Modal isOpen={!!activeStatModal} onClose={() => setActiveStatModal(null)} title={activeStatModal ? modalTitles[activeStatModal] : ''} size="3xl">
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {activeStatModal === 'total' && (<div className="space-y-3">
                        {uniqueTeamMembers.map(member => (<div key={member.id} className="p-3 bg-brand-bg rounded-lg"><p className="font-semibold text-brand-text-light">{member.name}</p><p className="text-sm text-brand-text-secondary">{member.role}</p></div>))}
                    </div>)}
                    {activeStatModal === 'unpaid' && (<div className="space-y-3">
                        {teamProjectPaymentsInDateRange.filter(p => p.status === 'Unpaid').length > 0 ? teamProjectPaymentsInDateRange.filter(p => p.status === 'Unpaid').map(payment => (
                            <div key={payment.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center"><div><p className="font-semibold text-brand-text-light">{payment.teamMemberName}</p><p className="text-sm text-brand-text-secondary">Acara: {projects.find(proj => proj.id === payment.projectId)?.projectName || 'N/A'}</p></div><p className="font-semibold text-brand-danger">{formatCurrency(payment.fee)}</p></div>
                        )) : <p className="text-center py-8 text-brand-text-secondary">Tidak ada fee yang belum dibayar.</p>}
                    </div>)}
                    {activeStatModal === 'topRated' && (<div className="space-y-3">
                        {[...teamMembers].sort((a, b) => b.rating - a.rating).map(member => (<div key={member.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center"><div><p className="font-semibold text-brand-text-light">{member.name}</p><p className="text-sm text-brand-text-secondary">{member.role}</p></div><div className="flex items-center gap-1 font-semibold text-brand-text-light"><StarIcon className="w-4 h-4 text-yellow-400 fill-current" />{member.rating.toFixed(1)}</div></div>))}
                    </div>)}
                    {activeStatModal === 'rewards' && (<div className="overflow-x-auto">
                        <table className="w-full text-sm"><thead className="bg-brand-input"><tr><th className="p-3 text-left">Tanggal</th><th className="p-3 text-left">Freelancer</th><th className="p-3 text-left">Deskripsi</th><th className="p-3 text-right">Jumlah</th></tr></thead><tbody className="divide-y divide-brand-border">{uniqueRewardLedgerEntries.map(entry => (<tr key={entry.id}><td className="p-3 whitespace-nowrap">{formatDate(entry.date)}</td><td className="p-3 font-semibold">{teamMembers.find(tm => tm.id === entry.teamMemberId)?.name || 'N/A'}</td><td className="p-3">{entry.description}</td><td className={`p-3 text-right font-semibold ${entry.amount >= 0 ? 'text-brand-success' : 'text-brand-danger'}`}>{entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount)}</td></tr>))}</tbody></table>
                    </div>)}
                </div>
            </Modal>
            {qrModalContent && (
                <Modal isOpen={!!qrModalContent} onClose={() => setQrModalContent(null)} title={qrModalContent.title} size="sm">
                    <div className="text-center p-4">
                        <QrCodeDisplay value={qrModalContent.url} size={200} wrapperId="freelancer-portal-qrcode" />
                        <p className="text-xs text-brand-text-secondary mt-4 break-all">{qrModalContent.url}</p>
                        <div className="flex items-center gap-2 mt-6">
                            <button onClick={() => { navigator.clipboard.writeText(qrModalContent.url); showNotification('Tautan berhasil disalin!'); }} className="button-secondary w-full">Salin Tautan</button>
                            <button onClick={() => {
                                const canvas = document.querySelector('#freelancer-portal-qrcode canvas') as HTMLCanvasElement;
                                if (canvas) {
                                    const link = document.createElement('a');
                                    link.download = 'freelancer-portal-qr.png';
                                    link.href = canvas.toDataURL();
                                    link.click();
                                }
                            }} className="button-primary w-full">Unduh QR</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Freelancers;