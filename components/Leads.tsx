import React, { useState, useMemo, useEffect } from 'react';

// Helper function to escape special regex characters
const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};
import { Lead, LeadStatus, Client, ClientStatus, Project, Package, AddOn, Transaction, TransactionType, PaymentStatus, Profile, Card, FinancialPocket, ContactChannel, PromoCode, ClientType, ViewType, NavigationAction, Gallery } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import RupiahInput from './RupiahInput';
import { PlusIcon, PencilIcon, Trash2Icon, Share2Icon, DownloadIcon, SendIcon, UsersIcon, TargetIcon, TrendingUpIcon, CalendarIcon, MapPinIcon, QrCodeIcon, MessageSquareIcon, CameraIcon, FileTextIcon, PhoneIncomingIcon, LightbulbIcon, ChevronRightIcon, CheckCircleIcon, EyeIcon, LinkIcon } from '../constants';
import StatCard from './StatCard';
import DonutChart from './DonutChart';
import { cleanPhoneNumber } from '../constants';
import { listLeads as _listLeads, createLead as createLeadRow, updateLead as updateLeadRow, deleteLead as deleteLeadRow } from '../services/leads';
import { createClient as createClientRow } from '../services/clients';
import { createProject as createProjectRow } from '../services/projects';
import { createTransaction as createTransactionRow, updateCardBalance } from '../services/transactions';
import { findCardIdByMeta } from '../services/cards';
import { upsertProfile } from '../services/profile';
import { listGalleries } from '../services/galleries';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const getContactChannelIcon = (channel: ContactChannel) => {
    const iconProps = { className: "w-4 h-4" };
    switch (channel) {
        case ContactChannel.WHATSAPP: return <MessageSquareIcon {...iconProps} />;
        case ContactChannel.INSTAGRAM: return <CameraIcon {...iconProps} />;
        case ContactChannel.WEBSITE: return <FileTextIcon {...iconProps} />;
        case ContactChannel.PHONE: return <PhoneIncomingIcon {...iconProps} />;
        case ContactChannel.REFERRAL: return <Share2Icon {...iconProps} />;
        case ContactChannel.SUGGESTION_FORM: return <MessageSquareIcon {...iconProps} />;
        default: return <LightbulbIcon {...iconProps} />;
    }
};

const getDaysSince = (dateString: string) => {
    const leadDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - leadDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Hari ini';
    if (diffDays === 2) return 'Kemarin';
    return `${diffDays} hari lalu`;
};

const sourceColors: { [key in ContactChannel]?: string } = {
    [ContactChannel.INSTAGRAM]: '#c13584', [ContactChannel.WHATSAPP]: '#25D366',
    [ContactChannel.WEBSITE]: '#3b82f6', [ContactChannel.REFERRAL]: '#f59e0b',
    [ContactChannel.PHONE]: '#8b5cf6', [ContactChannel.SUGGESTION_FORM]: '#14b8a6',
    [ContactChannel.OTHER]: '#64748b'
};

const statusConfig: Record<LeadStatus, { color: string, title: string }> = {
    [LeadStatus.DISCUSSION]: { color: '#3b82f6', title: 'Sedang Diskusi' },
    [LeadStatus.FOLLOW_UP]: { color: '#8b5cf6', title: 'Menunggu Follow Up' },
    [LeadStatus.CONVERTED]: { color: '#10b981', title: 'Dikonversi' },
    [LeadStatus.REJECTED]: { color: '#ef4444', title: 'Ditolak' }
};

// --- Form Components ---

interface LeadFormProps {
    formData: any;
    handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleSubmit: (e: React.FormEvent) => void;
    handleCloseModal: () => void;
    modalMode: 'add' | 'edit';
}

const LeadForm: React.FC<LeadFormProps> = ({ formData, handleFormChange, handleSubmit, handleCloseModal, modalMode }) => {
    return (
        <form onSubmit={handleSubmit} className="space-y-4 form-compact form-compact--ios-scale">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                    <LightbulbIcon className="w-4 h-4" />
                    Informasi Prospek
                </h4>
                <p className="text-xs text-brand-text-secondary">
                    Catat informasi prospek baru yang menghubungi Anda. Data ini akan membantu Anda melacak dan mengelola calon pengantin.
                </p>
            </div>

            <div>
                <h5 className="text-sm font-semibold text-brand-text-light mb-3">Data Prospek</h5>
                <div className="input-group">
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleFormChange} className="input-field" placeholder=" " required />
                    <label htmlFor="name" className="input-label">Nama Prospek</label>
                    <p className="text-xs text-brand-text-secondary mt-1">Nama lengkap calon pengantin</p>
                </div>
            </div>

            <div>
                <h5 className="text-sm font-semibold text-brand-text-light mb-3">Sumber & Lokasi</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="input-group">
                        <select id="contactChannel" name="contactChannel" value={formData.contactChannel} onChange={handleFormChange} className="input-field">
                            {Object.values(ContactChannel).map(channel => <option key={channel} value={channel}>{channel}</option>)}
                        </select>
                        <label htmlFor="contactChannel" className="input-label">Sumber Prospek</label>
                        <p className="text-xs text-brand-text-secondary mt-1">Dari mana prospek menghubungi?</p>
                    </div>
                    <div className="input-group">
                        <input type="text" id="location" name="location" value={formData.location} onChange={handleFormChange} className="input-field" placeholder=" " />
                        <label htmlFor="location" className="input-label">Lokasi (Kota)</label>
                        <p className="text-xs text-brand-text-secondary mt-1">Kota domisili prospek</p>
                    </div>
                </div>
            </div>

            <div>
                <h5 className="text-sm font-semibold text-brand-text-light mb-3">Alamat Lengkap</h5>
                <div className="input-group">
                    <textarea id="address" name="address" value={formData.address} onChange={handleFormChange} className="input-field" placeholder=" " rows={3}></textarea>
                    <label htmlFor="address" className="input-label">Alamat Lengkap / Gedung</label>
                    <p className="text-xs text-brand-text-secondary mt-1">Alamat spesifik untuk acara</p>
                </div>
            </div>

            <div>
                <h5 className="text-sm font-semibold text-brand-text-light mb-3">Kontak</h5>
                <div className="input-group">
                    <input type="tel" id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleFormChange} className="input-field" placeholder=" " />
                    <label htmlFor="whatsapp" className="input-label">No. WhatsApp</label>
                    <p className="text-xs text-brand-text-secondary mt-1">Nomor WhatsApp aktif untuk komunikasi</p>
                </div>
            </div>

            <div>
                <h5 className="text-sm font-semibold text-brand-text-light mb-3">Catatan Tambahan</h5>
                <div className="input-group">
                    <textarea id="notes" name="notes" value={formData.notes} onChange={handleFormChange} className="input-field" placeholder=" " rows={4}></textarea>
                    <label htmlFor="notes" className="input-label">Catatan</label>
                    <p className="text-xs text-brand-text-secondary mt-1">Catat kebutuhan, preferensi, atau informasi penting lainnya</p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-brand-border sticky bottom-0 bg-brand-surface">
                <button type="button" onClick={handleCloseModal} className="button-secondary w-full sm:w-auto">Batal</button>
                <button type="submit" className="button-primary w-full sm:w-auto">{modalMode === 'add' ? 'Simpan Prospek' : 'Update Prospek'}</button>
            </div>
        </form>
    );
};

interface ConvertLeadFormProps {
    formData: any;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleSubmit: (e: React.FormEvent) => void;
    handleCloseModal: () => void;
    packages: Package[];
    addOns: AddOn[];
    userProfile: Profile;
    cards: Card[];
    promoCodes: PromoCode[];
}

const ConvertLeadForm: React.FC<ConvertLeadFormProps> = ({ formData, setFormData, handleFormChange, handleSubmit, handleCloseModal, packages, addOns, userProfile, cards, promoCodes }) => {
    const priceCalculations = useMemo(() => {
        const selectedPackage = packages.find(p => p.id === formData.packageId);
        const packagePrice = selectedPackage?.price || 0;

        const addOnsPrice = addOns
            .filter(addon => formData.selectedAddOnIds.includes(addon.id))
            .reduce((sum, addon) => sum + addon.price, 0);

        let totalProjectBeforeDiscount = packagePrice + addOnsPrice;
        let discountAmount = 0;
        let discountApplied = 'N/A';
        const promoCode = promoCodes.find(p => p.id === formData.promoCodeId);

        if (promoCode) {
            if (promoCode.discountType === 'percentage') {
                discountAmount = (totalProjectBeforeDiscount * promoCode.discountValue) / 100;
                discountApplied = `${promoCode.discountValue}%`;
            } else { // fixed
                discountAmount = promoCode.discountValue;
                discountApplied = formatCurrency(promoCode.discountValue);
            }
        }

        const totalProject = totalProjectBeforeDiscount - discountAmount;
        const remainingPayment = totalProject - Number(formData.dp);

        return { packagePrice, addOnsPrice, totalProject, remainingPayment, discountAmount, discountApplied };
    }, [formData.packageId, formData.selectedAddOnIds, formData.dp, formData.promoCodeId, packages, addOns, promoCodes]);

    return (
        <form onSubmit={handleSubmit} className="form-compact form-compact--ios-scale">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                {/* Left Column: Client & Project Info */}
                <div className="space-y-4">
                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2">Informasi Pengantin</h4>
                    <div className="input-group"><input type="text" id="clientName" name="clientName" value={formData.clientName} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="clientName" className="input-label">Nama Pengantin</label></div>
                    <div className="input-group">
                        <select id="clientType" name="clientType" value={formData.clientType} onChange={handleFormChange} className="input-field" required>
                            {Object.values(ClientType).map(ct => <option key={ct} value={ct}>{ct}</option>)}
                        </select>
                        <label htmlFor="clientType" className="input-label">Jenis Pengantin</label>
                    </div>
                    <div className="input-group"><input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="phone" className="input-label">Nomor Telepon</label></div>
                    <div className="input-group"><input type="tel" id="whatsapp" name="whatsapp" value={formData.whatsapp || ''} onChange={handleFormChange} className="input-field" placeholder=" " /><label htmlFor="whatsapp" className="input-label">No. WhatsApp</label></div>
                    <div className="input-group"><input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="email" className="input-label">Email</label></div>
                    <div className="input-group"><input type="text" id="instagram" name="instagram" value={formData.instagram} onChange={handleFormChange} className="input-field" placeholder=" " /><label htmlFor="instagram" className="input-label">Instagram (@username)</label></div>

                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 pt-4">Informasi Acara</h4>
                    <div className="input-group"><input type="text" id="projectName" name="projectName" value={formData.projectName} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="projectName" className="input-label">Nama Acara</label></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="input-group"><select id="projectType" name="projectType" value={formData.projectType} onChange={handleFormChange} className="input-field" required><option value="" disabled>Pilih Jenis...</option>{userProfile.projectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}</select><label htmlFor="projectType" className="input-label">Jenis Acara</label></div>
                        <div className="input-group"><input type="date" id="date" name="date" value={formData.date} onChange={handleFormChange} className="input-field" placeholder=" " /><label htmlFor="date" className="input-label">Tanggal Acara</label></div>
                    </div>
                    <div className="input-group"><input type="text" id="location" name="location" value={formData.location} onChange={handleFormChange} className="input-field" placeholder=" " /><label htmlFor="location" className="input-label">Lokasi (Kota)</label></div>
                    <div className="input-group"><textarea id="address" name="address" value={formData.address} onChange={handleFormChange} className="input-field" placeholder=" " rows={2}></textarea><label htmlFor="address" className="input-label">Alamat Lengkap</label></div>
                </div>

                {/* Right Column: Financial & Other Info */}
                <div className="space-y-4">
                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2">Detail Paket & Pembayaran</h4>
                    <div className="input-group">
                        <select id="packageId" name="packageId" value={formData.packageId} onChange={handleFormChange} className="input-field" required>
                            <option value="">Pilih paket...</option>
                            {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <label htmlFor="packageId" className="input-label">Paket</label>
                        <p className="text-right text-xs text-brand-text-secondary mt-1">Harga Paket: {formatCurrency(priceCalculations.packagePrice)}</p>
                    </div>

                    <div className="input-group">
                        <label className="input-label !static !-top-4 !text-brand-accent">Add-On</label>
                        <div className="p-3 border border-brand-border bg-brand-bg rounded-lg max-h-32 overflow-y-auto space-y-2 mt-2">
                            {addOns.map(addon => (
                                <label key={addon.id} className="flex items-center justify-between p-2 rounded-md hover:bg-brand-input cursor-pointer">
                                    <span className="text-sm text-brand-text-primary">{addon.name}</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm text-brand-text-secondary">{formatCurrency(addon.price)}</span>
                                        <input type="checkbox" id={addon.id} name="addOns" checked={formData.selectedAddOnIds.includes(addon.id)} onChange={handleFormChange} className="h-4 w-4 rounded flex-shrink-0 text-blue-600 focus:ring-blue-500 transition-colors" />
                                    </div>
                                </label>
                            ))}
                        </div>
                        <p className="text-right text-xs text-brand-text-secondary mt-1">Total Harga Add-On: {formatCurrency(priceCalculations.addOnsPrice)}</p>
                    </div>

                    <div className="input-group">
                        <select id="promoCodeId" name="promoCodeId" value={formData.promoCodeId} onChange={handleFormChange} className="input-field">
                            <option value="">Tanpa Kode Promo</option>
                            {promoCodes.filter(p => p.isActive).map(p => (
                                <option key={p.id} value={p.id}>{p.code} - ({p.discountType === 'percentage' ? `${p.discountValue}%` : formatCurrency(p.discountValue)})</option>
                            ))}
                        </select>
                        <label htmlFor="promoCodeId" className="input-label">Kode Promo</label>
                        {formData.promoCodeId && <p className="text-right text-xs text-brand-success mt-1">Diskon Diterapkan: {priceCalculations.discountApplied}</p>}
                    </div>

                    <div className="p-4 bg-brand-bg rounded-lg space-y-3">
                        <div className="flex justify-between items-center font-bold text-lg"><span className="text-brand-text-secondary">Total Acara</span><span className="text-brand-text-light">{formatCurrency(priceCalculations.totalProject)}</span></div>
                        <div className="input-group !mt-2">
                            <RupiahInput
                                id="dp"
                                name="dp"
                                value={String(formData.dp ?? '')}
                                onChange={(raw) => setFormData((prev: any) => ({ ...prev, dp: raw }))}
                                className="input-field text-right"
                                placeholder=" "
                            />
                            <label htmlFor="dp" className="input-label">Uang DP</label>
                        </div>
                        {Number(formData.dp) > 0 && (
                            <div className="input-group !mt-2">
                                <select name="dpDestinationCardId" value={formData.dpDestinationCardId} onChange={handleFormChange} className="input-field" required>
                                    <option value="">Setor DP ke...</option>
                                    {cards.map(c => <option key={c.id} value={c.id}>{c.bankName} {c.lastFourDigits !== 'CASH' ? `**** ${c.lastFourDigits}` : '(Tunai)'}</option>)}
                                </select>
                                <label htmlFor="dpDestinationCardId" className="input-label">Kartu Tujuan</label>
                            </div>
                        )}
                        <hr className="border-brand-border" />
                        <div className="flex justify-between items-center font-bold text-lg"><span className="text-brand-text-secondary">Sisa Pembayaran</span><span className="text-blue-500">{formatCurrency(priceCalculations.remainingPayment)}</span></div>
                    </div>

                    <h4 className="text-base font-semibold text-gradient border-b border-brand-border pb-2 pt-4">Lainnya (Opsional)</h4>
                    <div className="input-group"><textarea id="notes" name="notes" value={formData.notes} onChange={handleFormChange} className="input-field" placeholder=" "></textarea><label htmlFor="notes" className="input-label">Catatan Tambahan</label></div>
                </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-8 mt-8 border-t border-brand-border sticky bottom-0 bg-brand-surface">
                <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                <button type="submit" className="button-primary">Konversi Prospek</button>
            </div>
        </form>
    );
};


// --- SUB-COMPONENTS ---

const LeadsAnalytics: React.FC<{ leads: Lead[]; totals: LeadsProps['totals']; onStatCardClick: (stat: string) => void }> = ({ leads, totals, onStatCardClick }) => {
    // Build region-only distribution across all leads
    const regionDonutData = useMemo(() => {
        const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f43f5e', '#a855f7', '#14b8a6'];
        const distribution = leads.reduce((acc, l) => {
            const key = ((l.location || '').trim()) || 'Tidak Diketahui';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(distribution)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .map(([label, value], idx) => ({ label, value, color: palette[idx % palette.length] }));
    }, [leads]);

    // Overall status counts from DB totals
    const overallCounts = useMemo(() => ({
        discussion: totals.discussionLeads,
        followUp: totals.followUpLeads,
        converted: leads.filter(l => l.status === LeadStatus.CONVERTED).length, // These are harder to get from global totals without more fields
        rejected: leads.filter(l => l.status === LeadStatus.REJECTED).length,
    }), [leads, totals]);

    return (
        <div className="space-y-6 mb-6">
            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                <div className="flex items-center justify-between mb-4 gap-3">
                    <h4 className="text-lg font-bold text-gradient">Distribusi Prospek per Wilayah</h4>
                </div>
                <DonutChart data={regionDonutData} />
                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-brand-border bg-brand-bg/60">
                        <span className="inline-flex items-center gap-1.5 text-xs text-brand-text-secondary"><EyeIcon className="w-4 h-4" /> {statusConfig[LeadStatus.DISCUSSION].title}</span>
                        <span className="text-sm font-semibold" style={{ color: statusConfig[LeadStatus.DISCUSSION].color }}>{overallCounts.discussion}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-brand-border bg-brand-bg/60">
                        <span className="inline-flex items-center gap-1.5 text-xs text-brand-text-secondary"><ChevronRightIcon className="w-4 h-4" /> {statusConfig[LeadStatus.FOLLOW_UP].title}</span>
                        <span className="text-sm font-semibold" style={{ color: statusConfig[LeadStatus.FOLLOW_UP].color }}>{overallCounts.followUp}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-brand-border bg-brand-bg/60">
                        <span className="inline-flex items-center gap-1.5 text-xs text-brand-text-secondary"><CheckCircleIcon className="w-4 h-4" /> {statusConfig[LeadStatus.CONVERTED].title}</span>
                        <span className="text-sm font-semibold" style={{ color: statusConfig[LeadStatus.CONVERTED].color }}>{overallCounts.converted}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-brand-border bg-brand-bg/60">
                        <span className="inline-flex items-center gap-1.5 text-xs text-brand-text-secondary"><Trash2Icon className="w-4 h-6" /> {statusConfig[LeadStatus.REJECTED].title}</span>
                        <span className="text-sm font-semibold" style={{ color: statusConfig[LeadStatus.REJECTED].color }}>{overallCounts.rejected}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LeadCard: React.FC<{
    lead: Lead;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, leadId: string) => void;
    onClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onNextStatus: () => void;
    onShare: (type: 'package' | 'booking') => void;
}> = ({ lead, onDragStart, onClick, onEdit, onDelete, onNextStatus, onShare }) => {
    const isHot = useMemo(() => new Date(lead.date) > new Date(Date.now() - 24 * 60 * 60 * 1000), [lead.date]);
    const needsFollowUp = useMemo(() => lead.status === LeadStatus.DISCUSSION && new Date(lead.date) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), [lead.date, lead.status]);
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    const renderActions = () => {
        if (lead.status === LeadStatus.DISCUSSION) {
            return (
                <div className="flex items-center gap-1.5 md:gap-2 leads-card-actions">
                    <button onClick={(e) => { e.stopPropagation(); onShare('package'); }} className="button-secondary !p-2 md:!p-2.5" title="Bagikan Paket"><Share2Icon className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onNextStatus(); }} className="button-primary !text-xs !px-3 md:!px-4 !py-2 md:!py-2.5 inline-flex items-center gap-1">Follow Up <ChevronRightIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                </div>
            );
        }
        if (lead.status === LeadStatus.FOLLOW_UP) {
            return (
                <div className="flex items-center gap-1.5 md:gap-2 leads-card-actions">
                    <button onClick={(e) => { e.stopPropagation(); onShare('booking'); }} className="button-secondary !p-2 md:!p-2.5" title="Kirim Form Booking"><SendIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onNextStatus(); }} className="button-primary !text-xs !px-3 md:!px-4 !py-2 md:!py-2.5 inline-flex items-center gap-1">Konversi <CheckCircleIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
                </div>
            );
        }
        return null;
    };

    return (
        <div
            draggable
            onDragStart={e => onDragStart(e, lead.id)}
            onClick={onClick}
            className="p-3 md:p-4 bg-brand-surface rounded-xl cursor-grab border-l-4 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] leads-card"
            style={{ borderLeftColor: statusConfig[lead.status].color }}
        >
            <div className="flex justify-between items-start gap-2 leads-card-header">
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm md:text-base text-brand-text-light truncate">{lead.name}</p>
                    {lead.location && (
                        <p className="text-xs text-brand-text-secondary mt-0.5 flex items-center gap-1 truncate">
                            <MapPinIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{lead.location}</span>
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isHot && <span className="text-base md:text-lg" title="Prospek baru (24 jam terakhir)">🔥</span>}
                    {needsFollowUp && <span className="text-base md:text-lg" title="Perlu Follow Up">⏰</span>}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="button-secondary !p-2 md:!p-2.5"
                        title="Edit"
                    >
                        <PencilIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="button-secondary !p-2 md:!p-2.5"
                        title="Hapus"
                    >
                        <Trash2Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                </div>
            </div>
            {lead.notes && (
                <p className="text-xs text-brand-text-primary mt-2 pt-2 border-t border-brand-border/50 line-clamp-2">
                    {lead.notes}
                </p>
            )}
            <div className="flex justify-between items-center mt-2 md:mt-3 text-xs text-brand-text-secondary">
                <span className="flex items-center gap-1.5">
                    {getContactChannelIcon(lead.contactChannel)}
                    <span className="hidden sm:inline">{getDaysSince(lead.date)}</span>
                    <span className="sm:hidden">{getDaysSince(lead.date).replace(' lalu', '')}</span>
                </span>
            </div>
            <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-brand-border/50 flex justify-end leads-card-actions">
                {renderActions()}
            </div>
        </div>
    );
};

// --- Main Component ---

interface LeadsProps {
    leads: Lead[];
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    packages: Package[];
    addOns: AddOn[];
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    userProfile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
    showNotification: (message: string) => void;
    handleNavigation: (view: ViewType, action?: NavigationAction) => void;
    cards: Card[];
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    pockets: FinancialPocket[];
    setPockets: React.Dispatch<React.SetStateAction<FinancialPocket[]>>;
    promoCodes: PromoCode[];
    setPromoCodes: React.Dispatch<React.SetStateAction<PromoCode[]>>;
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

export const Leads: React.FC<LeadsProps> = ({
    leads, setLeads, clients, setClients, projects, setProjects, packages, addOns, transactions, setTransactions, userProfile, setProfile, showNotification, handleNavigation, cards, setCards, pockets, setPockets, promoCodes, setPromoCodes, totals
}) => {
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'convert'>('add');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [formData, setFormData] = useState<any>({});
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [activeStatModal, setActiveStatModal] = useState<string | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [hiddenColumns, setHiddenColumns] = useState<Set<LeadStatus>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState<ContactChannel | 'all'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [shareModalState, setShareModalState] = useState<{ type: 'package' | 'booking', lead: Lead } | null>(null);

    const publicLeadFormUrl = useMemo(() => `${window.location.origin}${window.location.pathname}#/public-lead-form/VEN001`, []);
    const publicBookingFormUrl = useMemo(() => `${window.location.origin}${window.location.pathname}#/public-booking/VEN001`, []);
    const publicPackagesUrl = useMemo(() => `${window.location.origin}${window.location.pathname}#/public-packages/VEN001`, []);

    useEffect(() => {
        if (isShareModalOpen && typeof (window as any).QRCode !== 'undefined') {
            const qrCodeContainer = document.getElementById('lead-form-qrcode');
            if (qrCodeContainer) {
                qrCodeContainer.innerHTML = '';
                new (window as any).QRCode(qrCodeContainer, {
                    text: publicLeadFormUrl, width: 200, height: 200, colorDark: "#020617", colorLight: "#ffffff", correctLevel: 2
                });
            }
        }
    }, [isShareModalOpen, publicLeadFormUrl]);

    const handleStatCardClick = (stat: string) => setActiveStatModal(stat);
    const toggleHiddenColumns = () => {
        setHiddenColumns(prev => {
            const newHidden = new Set(prev);
            const completedStatuses: LeadStatus[] = [LeadStatus.CONVERTED, LeadStatus.REJECTED];
            if (newHidden.has(LeadStatus.CONVERTED)) {
                completedStatuses.forEach(s => newHidden.delete(s));
            } else {
                completedStatuses.forEach(s => newHidden.add(s));
            }
            return newHidden;
        });
    };

    const filteredLeads = useMemo(() => leads.filter(lead => {
        const searchMatch = searchTerm === '' || lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || (lead.notes && lead.notes.toLowerCase().includes(searchTerm.toLowerCase()));
        const sourceMatch = sourceFilter === 'all' || lead.contactChannel === sourceFilter;
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from) from.setHours(0, 0, 0, 0);
        if (to) to.setHours(23, 59, 59, 999);
        const leadDate = new Date(lead.date);
        const dateMatch = (!from || leadDate >= from) && (!to || leadDate <= to);
        return searchMatch && sourceMatch && dateMatch;
    }), [leads, searchTerm, sourceFilter, dateFrom, dateTo]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, leadId: string) => {
        e.dataTransfer.setData("leadId", leadId);
        setDraggedLeadId(leadId);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: LeadStatus) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData("leadId");
        const leadToUpdate = leads.find(l => l.id === leadId);

        if (leadToUpdate && leadToUpdate.status !== newStatus) {
            if (newStatus === LeadStatus.CONVERTED) {
                handleOpenModal('convert', leadToUpdate);
            } else {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, date: new Date().toISOString() } : l));
                // persist status change
                void updateLeadRow(leadId, { status: newStatus, date: new Date().toISOString().split('T')[0] }).catch(err => console.warn('[Supabase] update lead status failed', err));
            }
        }
        setDraggedLeadId(null);
    };

    const handleNextStatus = (leadId: string, currentStatus: LeadStatus) => {
        let newStatus: LeadStatus | null = null;
        if (currentStatus === LeadStatus.DISCUSSION) newStatus = LeadStatus.FOLLOW_UP;
        if (currentStatus === LeadStatus.FOLLOW_UP) newStatus = LeadStatus.CONVERTED;

        if (newStatus) {
            const lead = leads.find(l => l.id === leadId);
            if (!lead) return;
            if (newStatus === LeadStatus.CONVERTED) {
                handleOpenModal('convert', lead);
            } else {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus, date: new Date().toISOString() } : l));
                void updateLeadRow(leadId, { status: newStatus, date: new Date().toISOString().split('T')[0] }).catch(err => console.warn('[Supabase] update lead status failed', err));
                showNotification(`Prospek "${lead.name}" dipindahkan ke "${newStatus}".`);
            }
        }
    };

    const handleOpenModal = (mode: 'add' | 'edit' | 'convert', lead?: Lead) => {
        setModalMode(mode);
        setSelectedLead(lead || null);
        if (mode === 'edit' && lead) {
            setFormData(lead);
        } else if (mode === 'convert' && lead) {
            setFormData({
                clientName: lead.name, email: '', phone: '', whatsapp: lead.whatsapp || '', instagram: '', clientType: ClientType.DIRECT,
                projectName: `${lead.name}`, projectType: userProfile.projectTypes[0] || '',
                location: lead.location, address: lead.address || '', date: new Date().toISOString().split('T')[0], packageId: '', selectedAddOnIds: [], dp: '', dpDestinationCardId: '', notes: lead.notes || '', promoCodeId: ''
            });
        } else {
            setFormData({ name: '', contactChannel: ContactChannel.OTHER, location: '', address: '', whatsapp: '', notes: '', date: new Date().toISOString(), status: LeadStatus.DISCUSSION });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { id, checked } = e.target as HTMLInputElement;
            setFormData((prev: any) => ({ ...prev, selectedAddOnIds: checked ? [...prev.selectedAddOnIds, id] : prev.selectedAddOnIds.filter((addOnId: string) => addOnId !== id) }));
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (modalMode === 'add' || modalMode === 'edit') {
            try {
                if (modalMode === 'add') {
                    const created = await createLeadRow({
                        name: formData.name,
                        contactChannel: formData.contactChannel,
                        location: formData.location || '',
                        status: formData.status || LeadStatus.DISCUSSION,
                        date: new Date().toISOString().split('T')[0],
                        notes: formData.notes || undefined,
                        whatsapp: formData.whatsapp || undefined,
                        address: formData.address || undefined,
                    } as Omit<Lead, 'id'>);
                    setLeads(prev => [created, ...prev]);
                    showNotification('Prospek baru berhasil ditambahkan.');
                } else if (selectedLead) {
                    const updated = await updateLeadRow(selectedLead.id, {
                        name: formData.name,
                        contactChannel: formData.contactChannel,
                        location: formData.location || '',
                        status: formData.status,
                        notes: formData.notes || undefined,
                        whatsapp: formData.whatsapp || undefined,
                        address: formData.address || undefined,
                    });
                    setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
                    showNotification('Prospek berhasil diperbarui.');
                }
            } catch (err) {
                alert('Gagal menyimpan prospek ke database. Coba lagi.');
                return;
            }
        } else if (modalMode === 'convert' && selectedLead) {
            const selectedPackage = packages.find(p => p.id === formData.packageId);
            if (!selectedPackage) { alert('Harap pilih paket.'); return; }
            const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
            // Prefer explicit unitPrice chosen in the form (duration-based), fallback to package.default price
            const packagePrice = formData.unitPrice !== undefined && !isNaN(Number(formData.unitPrice)) ? Number(formData.unitPrice) : (selectedPackage.price || 0);
            const totalBeforeDiscount = packagePrice + selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
            let finalDiscountAmount = 0;
            const promoCode = promoCodes.find(p => p.id === formData.promoCodeId);
            if (promoCode) {
                if (promoCode.discountType === 'percentage') { finalDiscountAmount = (totalBeforeDiscount * promoCode.discountValue) / 100; }
                else { finalDiscountAmount = promoCode.discountValue; }
            }
            const totalProject = totalBeforeDiscount - finalDiscountAmount;
            const dpAmount = Number(formData.dp) || 0;
            try {
                // Step 1: Update the lead's status to CONVERTED
                await updateLeadRow(selectedLead.id, { status: LeadStatus.CONVERTED });

                // Step 2: Create the new client, project, and transaction records
                const createdClient = await createClientRow({
                    name: formData.clientName,
                    email: formData.email,
                    phone: formData.phone,
                    whatsapp: formData.whatsapp || undefined,
                    instagram: '',
                    clientType: ClientType.DIRECT,
                    since: new Date().toISOString().split('T')[0],
                    status: ClientStatus.ACTIVE,
                    lastContact: new Date().toISOString(),
                    portalAccessId: crypto.randomUUID(),
                    address: formData.address || undefined,
                } as Omit<Client, 'id'>);
                setClients(prev => [createdClient, ...prev]);

                // Create project in Supabase
                const createdProject = await createProjectRow({
                    projectName: `${formData.clientName}`,
                    clientName: formData.clientName,
                    clientId: createdClient.id,
                    projectType: formData.projectType,
                    packageName: selectedPackage.name,
                    date: formData.date,
                    location: formData.location,
                    address: formData.address,
                    status: 'Dikonfirmasi',
                    totalCost: totalProject,
                    amountPaid: dpAmount,
                    paymentStatus: dpAmount >= totalProject ? PaymentStatus.LUNAS : (dpAmount > 0 ? PaymentStatus.DP_TERBAYAR : PaymentStatus.BELUM_BAYAR),
                    durationSelection: formData.durationSelection || undefined,
                    unitPrice: formData.unitPrice !== undefined ? Number(formData.unitPrice) : undefined,
                    notes: formData.notes || undefined,
                    promoCodeId: formData.promoCodeId || undefined,
                    discountAmount: finalDiscountAmount > 0 ? finalDiscountAmount : undefined,
                    addOns: selectedAddOns.map(a => ({ id: a.id, name: a.name, price: a.price })),
                    accommodation: undefined,
                    driveLink: undefined,
                    printingCost: undefined,
                    transportCost: undefined,
                    completedDigitalItems: [],
                });
                const mergedProject: Project = { ...createdProject, addOns: selectedAddOns };
                setProjects(prev => [mergedProject, ...prev]);

                // DP transaction persist
                if (dpAmount > 0) {
                    const selectedCard = cards.find(c => c.id === formData.dpDestinationCardId);
                    const supaCardId = selectedCard ? await findCardIdByMeta(selectedCard.bankName, selectedCard.lastFourDigits) : null;
                    try {
                        const createdTx = await createTransactionRow({
                            date: new Date().toISOString().split('T')[0],
                            description: `DP Acara ${mergedProject.projectName}`,
                            amount: dpAmount,
                            type: TransactionType.INCOME,
                            projectId: mergedProject.id,
                            category: 'DP Acara',
                            method: 'Transfer Bank',
                            cardId: supaCardId || undefined,
                        } as Omit<Transaction, 'id' | 'vendorSignature'>);
                        setTransactions(prev => [...prev, createdTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                        if (supaCardId) {
                            setCards(prev => prev.map(c => c.id === formData.dpDestinationCardId ? { ...c, balance: c.balance + dpAmount } : c));
                        }
                    } catch (err) {
                        console.warn('[Supabase] DP convert lead transaction failed, fallback local.', err);
                        const fallbackTx: Transaction = {
                            id: `TRN-DP-${mergedProject.id}`,
                            date: new Date().toISOString().split('T')[0],
                            description: `DP Acara ${mergedProject.projectName}`,
                            amount: dpAmount,
                            type: TransactionType.INCOME,
                            projectId: mergedProject.id,
                            category: 'DP Acara',
                            method: 'Transfer Bank',
                            cardId: formData.dpDestinationCardId,
                        };
                        setTransactions(prev => [...prev, fallbackTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                        setCards(prev => prev.map(c => c.id === formData.dpDestinationCardId ? { ...c, balance: c.balance + dpAmount } : c));
                    }
                }
                if (promoCode) { setPromoCodes(prev => prev.map(p => p.id === promoCode.id ? { ...p, usageCount: p.usageCount + 1 } : p)); }
                setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: LeadStatus.CONVERTED, notes: `Dikonversi menjadi Pengantin ID: ${createdClient.id}` } : l));
                showNotification(`Prospek ${selectedLead.name} berhasil dikonversi menjadi pengantin!`);
            } catch (err) {
                alert('Gagal mengkonversi prospek. Coba lagi.');
                return;
            }
        }
        handleCloseModal();
    };

    const handleDeleteLead = async (leadId: string) => {
        if (!window.confirm('Hapus prospek ini?')) return;
        try {
            await deleteLeadRow(leadId);
            setLeads(prev => prev.filter(l => l.id !== leadId));
            showNotification('Prospek berhasil dihapus.');
        } catch (err) {
            alert('Gagal menghapus prospek di database. Coba lagi.');
        }
    };

    const leadColumns = useMemo(() => {
        const columns: Record<LeadStatus, Lead[]> = {
            [LeadStatus.DISCUSSION]: [], [LeadStatus.FOLLOW_UP]: [], [LeadStatus.CONVERTED]: [], [LeadStatus.REJECTED]: [],
        };
        filteredLeads.forEach(lead => { columns[lead.status]?.push(lead); });
        return columns;
    }, [filteredLeads]);

    const visibleLeadColumns = useMemo(() => Object.entries(leadColumns).filter(([status]) => !hiddenColumns.has(status as LeadStatus)), [leadColumns, hiddenColumns]);

    const modalData = useMemo<{ title: string; items: Lead[]; groupedItems: Record<string, Lead[]> | null }>(() => {
        if (!activeStatModal) return { title: '', items: [], groupedItems: null };
        switch (activeStatModal) {
            case 'active': return { title: 'Daftar Prospek Aktif', items: leads.filter(l => l.status === LeadStatus.DISCUSSION || l.status === LeadStatus.FOLLOW_UP), groupedItems: null };
            case 'new': const now = new Date(); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); return { title: 'Daftar Prospek Baru Bulan Ini', items: leads.filter(l => new Date(l.date) >= startOfMonth), groupedItems: null };
            case 'source': const leadsBySource = leads.reduce((acc, lead) => { const source = lead.contactChannel; if (!acc[source]) acc[source] = []; acc[source].push(lead); return acc; }, {} as Record<string, Lead[]>); return { title: 'Rincian Prospek Berdasarkan Sumber', items: [], groupedItems: leadsBySource };
            case 'location': const leadsByLocation = leads.reduce((acc, lead) => { const location = lead.location.trim() || 'Tidak Diketahui'; if (!acc[location]) acc[location] = []; acc[location].push(lead); return acc; }, {} as Record<string, Lead[]>); return { title: 'Rincian Prospek Berdasarkan Lokasi', items: [], groupedItems: leadsByLocation };
            default: return { title: '', items: [], groupedItems: null };
        }
    }, [activeStatModal, leads]);

    const isEmpty = leads.length === 0;

    return (
        <div className="space-y-6">
            {isEmpty ? (
                <div className="text-center py-20">
                    <LightbulbIcon className="mx-auto h-16 w-16 text-brand-accent" />
                    <h2 className="mt-4 text-2xl font-bold text-brand-text-light">Selamat Datang di Halaman Prospek!</h2>
                    <p className="mt-2 text-brand-text-secondary max-w-lg mx-auto">Halaman ini adalah tempat Anda mengelola semua calon pengantin (prospek) sebelum mereka resmi menjadi acara.</p>
                    <button onClick={() => handleOpenModal('add')} className="mt-8 button-primary inline-flex items-center gap-2"><PlusIcon className="w-5 h-5" />Tambah Prospek Pertama Anda</button>
                </div>
            ) : (
                <>
                    <PageHeader title="Calon Pengantin 💍" subtitle="Kelola calon pengantin Anda dari kontak pertama hingga menjadi acara." icon={<LightbulbIcon className="w-6 h-6" />}> <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary">Pelajari Halaman Ini</button></PageHeader>

                    <LeadsAnalytics leads={leads} totals={totals} onStatCardClick={handleStatCardClick} />
                    <div className="bg-brand-surface p-4 rounded-xl shadow-lg border border-brand-border flex flex-col md:flex-row justify-between items-center gap-4 leads-filter-section">
                        <div className="input-group flex-grow !mt-0 w-full md:w-auto"><input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5" placeholder=" " /><label className="input-label">Cari prospek...</label></div>
                        <div className="flex items-center gap-4 w-full md:w-auto leads-filter-row">
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" />
                            <span className="text-brand-text-secondary flex-shrink-0">-</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" />
                            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as any)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full leads-source-filter">
                                <option value="all">Semua Sumber</option>
                                {Object.values(ContactChannel).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <div className="flex items-center gap-2 w-full leads-filter-buttons">
                                <button onClick={toggleHiddenColumns} className="button-secondary text-sm px-3 py-2.5 inline-flex items-center gap-2 flex-shrink-0" title={hiddenColumns.has(LeadStatus.CONVERTED) ? 'Tampilkan Kolom Selesai' : 'Sembunyikan Kolom Selesai'}>
                                    <EyeIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => setIsShareModalOpen(true)} className="button-secondary p-2.5" title="Bagikan Form Prospek">
                                    <Share2Icon className="w-5 h-5" />
                                </button>
                                <button onClick={() => handleOpenModal('add')} className="button-primary p-2.5" title="Tambah Prospek Manual">
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Mobile grouped list */}
                    <div className="md:hidden space-y-3 -mx-4 px-4">
                        {visibleLeadColumns.map(([status, leadItems]) => {
                            const statusInfo = statusConfig[status as LeadStatus];
                            return (
                                <div key={status} className="bg-brand-bg rounded-2xl border border-brand-border overflow-hidden">
                                    <div className="p-3 text-sm md:text-base font-semibold text-brand-text-light border-b flex justify-between items-center" style={{ borderColor: statusInfo.color, borderBottomWidth: 2 }}>
                                        <span className="truncate">{statusInfo.title}</span>
                                    </div>
                                    <div className="p-2 space-y-2">
                                        {leadItems.map(lead => (
                                            <LeadCard
                                                key={lead.id}
                                                lead={lead}
                                                onDragStart={() => { }}
                                                onClick={() => handleOpenModal('edit', lead)}
                                                onEdit={() => handleOpenModal('edit', lead)}
                                                onDelete={() => {
                                                    const ok = window.confirm(`Hapus prospek "${lead.name}"?`);
                                                    if (!ok) return;
                                                    setLeads(prev => prev.filter(l => l.id !== lead.id));
                                                    void deleteLeadRow(lead.id).catch(err => {
                                                        console.warn('[Supabase] delete lead failed', err);
                                                        showNotification('Gagal menghapus prospek. Silakan coba lagi.');
                                                    });
                                                }}
                                                onNextStatus={() => handleNextStatus(lead.id, lead.status)}
                                                onShare={(type) => setShareModalState({ type, lead })}
                                            />
                                        ))}
                                        {leadItems.length === 0 && (
                                            <p className="text-center py-6 text-xs md:text-sm text-brand-text-secondary">Tidak ada prospek.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Desktop kanban columns */}
                    <div className="hidden md:flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
                        {visibleLeadColumns.map(([status, leadItems]) => {
                            const statusInfo = statusConfig[status as LeadStatus];
                            return (
                                <div key={status} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, status as LeadStatus)} className="w-80 flex-shrink-0 bg-brand-bg rounded-2xl border border-brand-border flex flex-col leads-column-container">
                                    <div className="p-4 font-semibold text-brand-text-light border-b-2 flex justify-between items-center sticky top-0 bg-brand-bg/80 backdrop-blur-sm rounded-t-2xl z-10 leads-column-header" style={{ borderColor: statusInfo.color }}>
                                        <span>{statusInfo.title}</span>
                                    </div>
                                    <div className="p-3 space-y-3 h-auto pr-1">{leadItems.map(lead => <LeadCard key={lead.id} lead={lead} onDragStart={handleDragStart} onClick={() => handleOpenModal('edit', lead)} onEdit={() => handleOpenModal('edit', lead)} onDelete={() => {
                                        const ok = window.confirm(`Hapus prospek "${lead.name}"?`);
                                        if (!ok) return;
                                        setLeads(prev => prev.filter(l => l.id !== lead.id));
                                        void deleteLeadRow(lead.id).catch(err => {
                                            console.warn('[Supabase] delete lead failed', err);
                                            showNotification('Gagal menghapus prospek. Silakan coba lagi.');
                                        });
                                    }} onNextStatus={() => handleNextStatus(lead.id, lead.status)} onShare={(type) => setShareModalState({ type, lead })} />)}</div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? 'Tambah Prospek Baru' : modalMode === 'edit' ? 'Edit Prospek' : 'Konversi Prospek Menjadi Pengantin'} size={modalMode === 'convert' ? '4xl' : 'lg'}>
                {modalMode === 'convert' ? (
                    <ConvertLeadForm
                        formData={formData}
                        setFormData={setFormData}
                        handleFormChange={handleFormChange}
                        handleSubmit={handleSubmit}
                        handleCloseModal={handleCloseModal}
                        packages={packages}
                        addOns={addOns}
                        userProfile={userProfile}
                        cards={cards}
                        promoCodes={promoCodes}
                    />
                ) : (
                    <LeadForm
                        formData={formData}
                        handleFormChange={handleFormChange}
                        handleSubmit={handleSubmit}
                        handleCloseModal={handleCloseModal}
                        modalMode={modalMode}
                    />
                )}
            </Modal>

            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Bagikan Formulir Prospek Publik" size="sm">
                <div className="text-center p-4">
                    <div id="lead-form-qrcode" className="p-4 bg-white rounded-lg inline-block mx-auto"></div>
                    <p className="text-xs text-brand-text-secondary mt-4 break-all">{publicLeadFormUrl}</p>
                    <div className="flex items-center gap-2 mt-6">
                        <button onClick={() => { navigator.clipboard.writeText(publicLeadFormUrl); showNotification('Tautan berhasil disalin!'); }} className="button-secondary w-full">Salin Tautan</button>
                        <a href={`https://wa.me/?text=Silakan%20isi%20formulir%20berikut%20untuk%20memulai%3A%20${encodeURIComponent(publicLeadFormUrl)}`} target="_blank" rel="noopener noreferrer" className="button-primary w-full">Bagikan ke WA</a>
                    </div>
                </div>
            </Modal>

            {shareModalState && <ShareMessageModal type={shareModalState.type} lead={shareModalState.lead} userProfile={userProfile} publicBookingFormUrl={publicBookingFormUrl} publicPackagesUrl={publicPackagesUrl} onClose={() => setShareModalState(null)} showNotification={showNotification} setProfile={setProfile} />}

            <Modal isOpen={!!activeStatModal} onClose={() => setActiveStatModal(null)} title={modalData.title} size="2xl"><div className="max-h-[60vh] overflow-y-auto pr-2">{modalData.items.length > 0 ? (<div className="space-y-3">{modalData.items.map(lead => (<div key={lead.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center"><div><p className="font-semibold text-brand-text-light">{lead.name}</p><p className="text-sm text-brand-text-secondary">{lead.location} - {lead.contactChannel}</p></div><span className="text-xs text-brand-text-secondary">{new Date(lead.date).toLocaleDateString('id-ID')}</span></div>))}</div>) : modalData.groupedItems ? (<div className="space-y-4">{Object.entries(modalData.groupedItems).map(([group, items]) => (<div key={group}><h4 className="font-semibold text-gradient border-b border-brand-border pb-2 mb-2">{group} ({(items as Lead[]).length})</h4><div className="space-y-2">{(items as Lead[]).map(lead => (<div key={lead.id} className="p-2 bg-brand-bg rounded-md"><p className="font-medium text-sm text-brand-text-light">{lead.name}</p></div>))}</div></div>))}</div>) : <p className="text-center text-brand-text-secondary py-8">Tidak ada data untuk ditampilkan.</p>}</div></Modal>
        </div>
    );
}

// --- Share Modal Component (Internal to Leads) ---
interface ShareMessageModalProps {
    type: 'package' | 'booking';
    lead: Lead;
    userProfile: Profile;
    publicPackagesUrl: string;
    publicBookingFormUrl: string;
    onClose: () => void;
    showNotification: (message: string) => void;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}

const ShareMessageModal: React.FC<ShareMessageModalProps> = ({ type, lead, userProfile, publicPackagesUrl, publicBookingFormUrl, onClose, showNotification, setProfile }) => {
    const [message, setMessage] = useState('');
    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [selectedGalleryId, setSelectedGalleryId] = useState<string>('');

    useEffect(() => {
        let template = '';
        if (type === 'package') {
            template = (userProfile.packageShareTemplate || '').replace('{leadName}', lead.name).replace('{companyName}', userProfile.companyName).replace('{packageLink}', publicPackagesUrl);
        } else {
            const bookingUrlWithId = `${publicBookingFormUrl}?leadId=${lead.id}`;
            template = (userProfile.bookingFormTemplate || '').replace('{leadName}', lead.name).replace('{companyName}', userProfile.companyName).replace('{bookingFormLink}', bookingUrlWithId);
        }
        setMessage(template);
    }, [type, lead, userProfile, publicPackagesUrl, publicBookingFormUrl]);

    // Load public galleries for quick share
    useEffect(() => {
        (async () => {
            try {
                const all = await listGalleries();
                const publicOnes = (all || []).filter(g => g.is_public && g.public_id);
                setGalleries(publicOnes);
                if (publicOnes.length > 0) setSelectedGalleryId(publicOnes[0].id);
            } catch (e) {
                // Non-blocking; ignore error in share modal
                console.warn('Failed to load galleries for share modal', e);
            }
        })();
    }, []);

    const selectedGallery = useMemo(() => galleries.find(g => g.id === selectedGalleryId) || null, [galleries, selectedGalleryId]);
    const selectedGalleryLink = useMemo(() => selectedGallery ? `${window.location.origin}/#/gallery/${selectedGallery.public_id}` : '', [selectedGallery]);

    const handleShareToWhatsApp = () => {
        if (!lead.whatsapp) { showNotification('Nomor WhatsApp untuk prospek ini tidak tersedia.'); return; }
        const whatsappUrl = `https://wa.me/${cleanPhoneNumber(lead.whatsapp)}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleSaveTemplate = async () => {
        let rawTemplate = message;
        try {
            if (type === 'package') {
                rawTemplate = message
                    .replace(new RegExp(escapeRegExp(lead.name), 'g'), '{leadName}')
                    .replace(new RegExp(escapeRegExp(userProfile.companyName), 'g'), '{companyName}')
                    .replace(new RegExp(escapeRegExp(publicPackagesUrl), 'g'), '{packageLink}');
                setProfile(prev => ({ ...prev, packageShareTemplate: rawTemplate }));
                await upsertProfile({ id: userProfile.id, packageShareTemplate: rawTemplate });
            } else {
                const bookingUrlWithId = `${publicBookingFormUrl}?leadId=${lead.id}`;
                rawTemplate = message
                    .replace(new RegExp(escapeRegExp(lead.name), 'g'), '{leadName}')
                    .replace(new RegExp(escapeRegExp(userProfile.companyName), 'g'), '{companyName}')
                    .replace(new RegExp(escapeRegExp(bookingUrlWithId), 'g'), '{bookingFormLink}');
                setProfile(prev => ({ ...prev, bookingFormTemplate: rawTemplate }));
                await upsertProfile({ id: userProfile.id, bookingFormTemplate: rawTemplate });
            }
            showNotification('Template berhasil disimpan!');
        } catch (err) {
            console.warn('[Supabase] upsert profile template failed', err);
            showNotification('Gagal menyimpan template. Coba lagi.');
        }
    };

    const title = type === 'package' ? `Bagikan Paket ke ${lead.name}` : `Kirim Form Booking ke ${lead.name}`;

    return (
        <Modal isOpen={true} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="input-group">
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={10} className="input-field w-full" placeholder=" "></textarea>
                    <label className="input-label">Pesan WhatsApp</label>
                </div>
                {galleries.length > 0 && (
                    <div className="p-3 bg-brand-bg rounded-lg border border-brand-border space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-brand-text-light inline-flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Link Galeri</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                            <select value={selectedGalleryId} onChange={(e) => setSelectedGalleryId(e.target.value)} className="input-field md:col-span-2">
                                {galleries.map(g => (<option key={g.id} value={g.id}>{g.title} • {g.region}</option>))}
                            </select>
                            <div className="flex gap-2 w-full">
                                <button type="button" onClick={() => { if (selectedGalleryLink) { navigator.clipboard.writeText(selectedGalleryLink); showNotification('Link galeri disalin'); } }} className="button-secondary flex-1">Salin Link</button>
                                <button type="button" onClick={() => { if (selectedGalleryLink) setMessage(prev => (prev ? prev + `\n${selectedGalleryLink}` : selectedGalleryLink)); }} className="button-primary flex-1">Masukkan</button>
                            </div>
                        </div>
                        {selectedGalleryLink && (<p className="text-xs text-brand-text-secondary break-all">{selectedGalleryLink}</p>)}
                    </div>
                )}
                <div className="flex flex-col md:flex-row md:justify-between gap-2 pt-4 border-t border-brand-border sticky bottom-0 bg-brand-surface">
                    <button onClick={handleSaveTemplate} className="button-secondary w-full md:w-auto">Simpan Template Ini</button>
                    <button onClick={handleShareToWhatsApp} className="button-primary inline-flex items-center gap-2 w-full md:w-auto"><Share2Icon className="w-4 h-4" /> Bagikan ke WhatsApp</button>
                </div>
            </div>
        </Modal>
    );
};

export default Leads;
