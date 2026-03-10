import React, { useState, useMemo, useEffect } from 'react';
import { Client, Project, PaymentStatus, Package, AddOn, TransactionType, Profile, Transaction, ClientStatus, Card, FinancialPocket, ViewType, NavigationAction, ClientFeedback, SatisfactionLevel, PromoCode, ClientType, Notification } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import StatCard from './StatCard';
import StatCardModal from './StatCardModal';
import SignaturePad from './SignaturePad';
import DonutChart from './DonutChart';
import QrCodeDisplay from './QrCodeDisplay';
import RupiahInput from './RupiahInput';
import { EyeIcon, PencilIcon, Trash2Icon, FileTextIcon, PlusIcon, CreditCardIcon, Share2Icon, HistoryIcon, DollarSignIcon, FolderKanbanIcon, UsersIcon, TrendingUpIcon, AlertCircleIcon, LightbulbIcon, MessageSquareIcon, PhoneIncomingIcon, MapPinIcon, QrCodeIcon, StarIcon, TrendingDownIcon, ArrowDownIcon, ArrowUpIcon, DownloadIcon, WhatsappIcon } from '../constants';
import { cleanPhoneNumber } from '../constants';
import { createClient as createClientRow, updateClient as updateClientRow, deleteClient as deleteClientRow } from '../services/clients';
import { createProject as createProjectRow, updateProject as updateProjectRow, deleteProject as deleteProjectRow } from '../services/projects';
import { createTransaction as createTransactionRow, updateCardBalance } from '../services/transactions';
import { findCardIdByMeta } from '../services/cards';
import InvoiceDocument from './InvoiceDocument';
import { generateWhatsAppLink, cleanPhoneNumber as whatsappCleanPhone } from '../utils/whatsapp';

// @ts-ignore
import html2pdf from 'html2pdf.js';

const formatCurrency = (amount: number) => {
    // Ensure proper Indonesian currency formatting with correct decimal separator
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

const normalizeTerminology = (text: string): string => {
    if (!text) return text;
    return text
        .replace(/Proyek/g, 'Acara')
        .replace(/DP Proyek/g, 'DP Acara')
        .replace(/Pelunasan Proyek/g, 'Pelunasan Acara')
        .replace(/Pembayaran Proyek/g, 'Pembayaran Acara');
}

const getPaymentStatusClass = (status: PaymentStatus | null) => {
    if (!status) return 'bg-gray-500/20 text-gray-400';
    switch (status) {
        case PaymentStatus.LUNAS: return 'bg-green-500/20 text-green-400';
        case PaymentStatus.DP_TERBAYAR: return 'bg-blue-500/20 text-blue-400';
        case PaymentStatus.BELUM_BAYAR: return 'bg-yellow-500/20 text-yellow-400';
        default: return 'bg-gray-500/20 text-gray-400';
    }
};

const ensureOnlineOrNotify = (showNotification: (message: string) => void): boolean => {
    if (!navigator.onLine) {
        showNotification('Harus online untuk melakukan perubahan');
        return false;
    }
    return true;
};

const initialFormState = {
    // Client fields
    clientId: '',
    clientName: '',
    email: '',
    phone: '',
    whatsapp: '',
    instagram: '',
    clientType: ClientType.DIRECT,
    // Project fields
    projectId: '', // Keep track of which project is being edited
    projectName: '',
    projectType: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    packageId: '',
    selectedAddOnIds: [] as string[],
    // duration and unit price for packages with durationOptions
    durationSelection: '',
    unitPrice: undefined as number | undefined,
    dp: '',
    dpDestinationCardId: '',
    notes: '',
    accommodation: '',
    driveLink: '',
    promoCodeId: '',
    address: '',
};

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


interface BillingChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    projects: Project[];
    userProfile: Profile;
    showNotification: (message: string) => void;
}

const BillingChatModal: React.FC<BillingChatModalProps> = ({ isOpen, onClose, client, projects, userProfile, showNotification }) => {
    const [message, setMessage] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('friendly_reminder');

    const BILLING_CHAT_TEMPLATES = [
        {
            id: 'friendly_reminder',
            title: 'Pengingat Ramah',
            template: 'Halo {clientName},\n\nSemoga sehat selalu. Kami ingin mengingatkan perihal sisa pembayaran untuk acara Anda.\n\nBerikut rinciannya:\n{projectDetails}\n\nTotal Sisa Tagihan: *{totalDue}*\n\nAnda dapat melihat rincian invoice dan riwayat pembayaran melalui Portal Pengantin Anda di sini:\n{portalLink}\n\nPembayaran dapat dilakukan ke rekening berikut:\n{bankAccount}\n\nMohon konfirmasinya jika pembayaran telah dilakukan. Terima kasih!\n\nSalam,\nTim {companyName}'
        },
        {
            id: 'due_date_reminder',
            title: 'Pengingat Jatuh Tempo',
            template: 'Yth. Bapak/Ibu {clientName},\n\nMenurut catatan kami, sisa pembayaran acara Anda akan jatuh tempo. Berikut adalah rincian tagihan Anda:\n\n{projectDetails}\n\nTotal Sisa Tagihan: *{totalDue}*\n\nUntuk melihat detail invoice, silakan akses Portal Pengantin Anda di tautan berikut:\n{portalLink}\n\nKami mohon kesediaan Anda untuk menyelesaikan pembayaran sebelum tanggal jatuh tempo untuk menghindari kendala. Pembayaran dapat ditransfer ke:\n{bankAccount}\n\nTerima kasih atas kerja samanya.\n\nHormat kami,\nTim {companyName}'
        }
    ];

    useEffect(() => {
        if (!client) return;

        const projectsWithBalance = projects.filter(p => p.clientId === client.id && (p.totalCost - p.amountPaid) > 0);
        if (projectsWithBalance.length === 0) return;

        const totalDue = projectsWithBalance.reduce((sum, p) => sum + (p.totalCost - p.amountPaid), 0);

        const projectDetails = projectsWithBalance.map(p =>
            `- Acara: *${p.projectName}*\n  Sisa Tagihan: ${formatCurrency(p.totalCost - p.amountPaid)}`
        ).join('\n');

        const path = window.location.pathname.replace(/index\.html$/, '');
        const portalLink = `${window.location.origin}${path}#/portal/${client.portalAccessId}`;

        const template = BILLING_CHAT_TEMPLATES.find(t => t.id === selectedTemplateId)?.template || BILLING_CHAT_TEMPLATES[0].template;

        const processedMessage = template
            .replace('{clientName}', client.name)
            .replace('{projectDetails}', projectDetails)
            .replace('{totalDue}', formatCurrency(totalDue))
            .replace('{portalLink}', portalLink)
            .replace('{bankAccount}', userProfile.bankAccount || 'N/A')
            .replace(/{companyName}/g, userProfile.companyName || 'Tim Kami');

        setMessage(processedMessage);

    }, [client, projects, userProfile, selectedTemplateId]);

    const handleShareToWhatsApp = () => {
        if (!client || (!client.phone && !client.whatsapp)) {
            showNotification('Nomor telepon pengantin tidak tersedia.');
            return;
        }
        if (!message.trim()) {
            showNotification('Pesan tidak boleh kosong.');
            return;
        }
        const phoneNumber = cleanPhoneNumber(client.whatsapp || client.phone);
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    if (!isOpen || !client) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Kirim Tagihan ke ${client.name}`} size="2xl">
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-semibold text-brand-text-secondary">Gunakan Template Pesan:</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {BILLING_CHAT_TEMPLATES.map(template => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => setSelectedTemplateId(template.id)}
                                className={`button-secondary !text-xs !px-3 !py-1.5 ${selectedTemplateId === template.id ? '!bg-brand-accent !text-white !border-brand-accent' : ''}`}
                            >
                                {template.title}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="input-group">
                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={12} className="input-field"></textarea>
                    <label className="input-label">Isi Pesan</label>
                </div>
                <div className="flex justify-end items-center pt-4 border-t border-brand-border">
                    <button onClick={handleShareToWhatsApp} className="button-primary inline-flex items-center gap-2">
                        <WhatsappIcon className="w-5 h-5" /> Kirim via WhatsApp
                    </button>
                </div>
            </div>
        </Modal>
    );
};


interface ClientFormProps {
    formData: typeof initialFormState;
    setFormData: React.Dispatch<React.SetStateAction<typeof initialFormState>>;
    handleFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleFormSubmit: (e: React.FormEvent) => void;
    handleCloseModal: () => void;
    packages: Package[];
    addOns: AddOn[];
    userProfile: Profile;
    modalMode: 'add' | 'edit';
    cards: Card[];
    promoCodes: PromoCode[];
}

const ClientForm: React.FC<ClientFormProps> = ({ formData, setFormData, handleFormChange, handleFormSubmit, handleCloseModal, packages, addOns, userProfile, modalMode, cards, promoCodes }) => {

    const priceCalculations = useMemo(() => {
        const selectedPackage = packages.find(p => p.id === formData.packageId);
        // Prefer explicit unitPrice stored in form (selected duration), fallback to package.price
        const packagePrice = (formData.unitPrice && Number(formData.unitPrice) > 0) ? Number(formData.unitPrice) : (selectedPackage?.price || 0);

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
        <form onSubmit={handleFormSubmit} className="form-compact form-compact--ios-scale">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-2">
                {/* Left Column: Client & Project Info */}
                <div className="space-y-5">
                    <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2">Informasi Pengantin</h4>
                    <div className="space-y-2">
                        <label htmlFor="clientName" className="block text-xs text-brand-text-secondary">Nama Pengantin</label>
                        <input type="text" id="clientName" name="clientName" value={formData.clientName} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Masukkan nama pengantin" required />
                        <p className="text-xs text-brand-text-secondary">Nama lengkap pengantin atau pasangan</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="clientType" className="block text-xs text-brand-text-secondary">Jenis Pengantin</label>
                        <select id="clientType" name="clientType" value={formData.clientType} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                            {Object.values(ClientType).map(ct => <option key={ct} value={ct}>{ct}</option>)}
                        </select>
                        <p className="text-xs text-brand-text-secondary">Kategori jenis pengantin (Direct/Vendor/Referral)</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="phone" className="block text-xs text-brand-text-secondary">Nomor Telepon</label>
                        <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="08123456789" required />
                        <p className="text-xs text-brand-text-secondary">Nomor telepon utama yang bisa dihubungi</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="whatsapp" className="block text-xs text-brand-text-secondary">No. WhatsApp (Opsional)</label>
                        <input type="tel" id="whatsapp" name="whatsapp" value={formData.whatsapp || ''} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="08123456789" />
                        <p className="text-xs text-brand-text-secondary">Nomor WhatsApp jika berbeda dengan nomor telepon</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-xs text-brand-text-secondary">Email</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="email@example.com" required />
                        <p className="text-xs text-brand-text-secondary">Alamat email untuk komunikasi dan invoice</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="instagram" className="block text-xs text-brand-text-secondary">Instagram (Opsional)</label>
                        <input type="text" id="instagram" name="instagram" value={formData.instagram} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="@username" />
                        <p className="text-xs text-brand-text-secondary">Username Instagram pengantin (tanpa @)</p>
                    </div>

                    <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-brand-border pb-2 pt-4">Informasi Acara</h4>
                    <div className="space-y-2">
                        <label htmlFor="projectName" className="block text-xs text-brand-text-secondary">Nama Acara</label>
                        <input type="text" id="projectName" name="projectName" value={formData.projectName} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Masukkan nama acara" required />
                        <p className="text-xs text-brand-text-secondary">Nama acara (contoh: Wedding John & Jane)</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="projectType" className="block text-xs text-brand-text-secondary">Jenis Acara</label>
                            <select id="projectType" name="projectType" value={formData.projectType} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" required>
                                <option value="" disabled>Pilih Jenis...</option>
                                {userProfile.projectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                            </select>
                            <p className="text-xs text-brand-text-secondary">Kategori jenis acara</p>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="date" className="block text-xs text-brand-text-secondary">Tanggal Acara</label>
                            <input type="date" id="date" name="date" value={formData.date} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                            <p className="text-xs text-brand-text-secondary">Tanggal pelaksanaan acara</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="location" className="block text-xs text-brand-text-secondary">Lokasi (Kota)</label>
                        <input type="text" id="location" name="location" value={formData.location} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Kota Contoh: Jakarta" />
                        <p className="text-xs text-brand-text-secondary">Kota tempat acara berlangsung</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="address" className="block text-xs text-brand-text-secondary">Alamat Lengkap / Gedung</label>
                        <textarea id="address" name="address" value={formData.address} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="Contoh: Gedung Mulia, Jl. Gatot Subroto No. 1" rows={3}></textarea>
                        <p className="text-xs text-brand-text-secondary">Alamat spesifik venue acara</p>
                    </div>
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
                    {/* Duration selector when package has durationOptions */}
                    {(() => {
                        const pkg = packages.find(p => p.id === formData.packageId);
                        if (pkg && Array.isArray(pkg.durationOptions) && pkg.durationOptions.length > 0) {
                            return (
                                <div className="input-group">
                                    <select id="durationSelection" name="durationSelection" value={formData.durationSelection || ''} onChange={handleFormChange} className="input-field">
                                        <option value="">Pilih Durasi...</option>
                                        {pkg.durationOptions.map((opt, idx) => <option key={idx} value={opt.label}>{opt.label} — {formatCurrency(opt.price)}</option>)}
                                    </select>
                                    <label htmlFor="durationSelection" className="input-label">Durasi</label>
                                    {formData.unitPrice && <p className="text-right text-xs text-brand-text-secondary mt-1">Harga Terpilih: {formatCurrency(Number(formData.unitPrice))}</p>}
                                </div>
                            );
                        }
                        return null;
                    })()}

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

            <div className="flex justify-end items-center gap-3 pt-8 mt-8 border-t border-brand-border">
                <button type="button" onClick={handleCloseModal} className="button-secondary">Batal</button>
                <button type="submit" className="button-primary">{modalMode === 'add' ? 'Simpan Pengantin & Acara' : 'Update Pengantin & Acara'}</button>
            </div>
        </form>
    );
};


interface ClientDetailModalProps {
    client: Client | null;
    projects: Project[];
    transactions: Transaction[];
    packages: Package[];
    onClose: () => void;
    onEditClient: (client: Client) => void;
    onDeleteClient: (clientId: string) => void;
    onViewReceipt: (transaction: Transaction) => void;
    onViewInvoice: (project: Project) => void;
    handleNavigation: (view: ViewType, action?: NavigationAction) => void;
    onRecordPayment: (projectId: string, amount: number, destinationCardId: string) => void;
    cards: Card[];
    onSharePortal: (client: Client) => void;
    onDeleteProject: (projectId: string) => void;
}

const ClientDetailModal: React.FC<ClientDetailModalProps> = ({ client, projects, transactions, packages, onClose, onEditClient, onDeleteClient, onViewReceipt, onViewInvoice, handleNavigation, onRecordPayment, cards, onSharePortal, onDeleteProject }) => {
    const [activeTab, setActiveTab] = useState('info');
    const [newPayments, setNewPayments] = useState<{ [key: string]: { amount: string, destinationCardId: string } }>({});
    const [newCharge, setNewCharge] = useState<{ [key: string]: { name: string, amount: string } }>({});
    // Local override agar UI langsung update setelah biaya tambahan disimpan ke DB
    const [projectOverrides, setProjectOverrides] = useState<{ [projectId: string]: Partial<Project> }>({});

    if (!client) return null;

    const handleNewPaymentChange = (projectId: string, field: 'amount' | 'destinationCardId', value: string) => {
        const currentProjectPayment = newPayments[projectId] || { amount: '', destinationCardId: '' };
        setNewPayments(prev => ({
            ...prev,
            [projectId]: {
                ...currentProjectPayment,
                [field]: value,
            }
        }));
    };

    const handleNewPaymentSubmit = (projectId: string) => {
        const paymentData = newPayments[projectId];
        const project = clientProjects.find(p => p.id === projectId);
        if (paymentData && Number(paymentData.amount) > 0 && paymentData.destinationCardId && project) {
            const amount = Number(paymentData.amount);
            if (amount > (project.totalCost - project.amountPaid)) {
                alert('Jumlah pembayaran melebihi sisa tagihan.');
                return;
            }
            onRecordPayment(projectId, amount, paymentData.destinationCardId);
            setNewPayments(prev => ({ ...prev, [projectId]: { amount: '', destinationCardId: '' } }));
        } else {
            alert('Harap isi jumlah dan tujuan pembayaran dengan benar.');
        }
    };

    const handleNewChargeChange = (projectId: string, field: 'name' | 'amount', value: string) => {
        const currentCharge = newCharge[projectId] || { name: '', amount: '' };
        setNewCharge(prev => ({
            ...prev,
            [projectId]: {
                ...currentCharge,
                [field]: value,
            }
        }));
    };

    const handleNewChargeSubmit = async (projectId: string) => {
        const chargeData = newCharge[projectId];
        const project = clientProjects.find(p => p.id === projectId);
        if (chargeData && chargeData.name.trim() && Number(chargeData.amount) > 0 && project) {
            const amount = Number(chargeData.amount);

            // Simpan ke customCosts (JSONB) agar persisten di database
            const newCustomCost = {
                id: `custom-${Date.now()}`,
                description: chargeData.name.trim(),
                amount: amount
            };

            const existingCustomCosts = project.customCosts || [];
            const updatedCustomCosts = [...existingCustomCosts, newCustomCost];
            const newTotalCost = project.totalCost + amount;
            const remaining = newTotalCost - project.amountPaid;
            const newPaymentStatus = remaining <= 0 ? PaymentStatus.LUNAS : (project.amountPaid > 0 ? PaymentStatus.DP_TERBAYAR : PaymentStatus.BELUM_BAYAR);

            try {
                await updateProjectRow(projectId, {
                    customCosts: updatedCustomCosts,
                    totalCost: newTotalCost,
                    paymentStatus: newPaymentStatus
                });
                // Update local override agar UI langsung refresh
                setProjectOverrides(prev => ({
                    ...prev,
                    [projectId]: {
                        ...(prev[projectId] || {}),
                        customCosts: updatedCustomCosts,
                        totalCost: newTotalCost,
                        paymentStatus: newPaymentStatus
                    }
                }));
                setNewCharge(prev => ({ ...prev, [projectId]: { name: '', amount: '' } }));
                alert('Biaya tambahan berhasil ditambahkan.');
            } catch (err) {
                console.error('Gagal menambahkan biaya tambahan:', err);
                alert('Gagal menambahkan biaya tambahan.');
            }
        } else {
            alert('Harap isi nama dan jumlah biaya dengan benar.');
        }
    };


    // Merge props projects dengan local overrides agar UI langsung refresh setelah update
    const clientProjects = projects
        .filter(p => p.clientId === client.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(p => projectOverrides[p.id] ? { ...p, ...projectOverrides[p.id] } : p);
    const clientTransactions = transactions.filter(t => clientProjects.some(p => p.id === t.projectId)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalProjects = clientProjects.length;
    const totalProjectValue = clientProjects.reduce((sum, p) => sum + p.totalCost, 0);
    const totalPaid = clientProjects.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalDue = totalProjectValue - totalPaid;

    const InfoStatCard: React.FC<{ icon: React.ReactNode, title: string, value: string }> = ({ icon, title, value }) => (
        <div className="bg-brand-bg p-3 md:p-4 rounded-xl flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-4 border border-brand-border shadow-sm">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center bg-brand-surface flex-shrink-0">
                {icon}
            </div>
            <div className="text-center md:text-left">
                <p className="text-[10px] md:text-sm text-brand-text-secondary">{title}</p>
                <p className="text-sm md:text-lg font-bold text-brand-text-light truncate">{value}</p>
            </div>
        </div>
    );

    const DetailRow: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-1 sm:gap-4 border-b border-brand-border">
            <dt className="text-sm text-brand-text-secondary">{label}</dt>
            <dd className="text-sm text-brand-text-light font-semibold">{children}</dd>
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Desktop Tab Navigation - Top */}
            <div className="hidden md:block border-b border-brand-border">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    <button onClick={() => setActiveTab('info')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'info' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><UsersIcon className="w-5 h-5" /> Informasi Pengantin</button>
                    <button onClick={() => setActiveTab('payments')} className={`shrink-0 inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'payments' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-brand-text-secondary hover:text-brand-text-light'}`}><HistoryIcon className="w-5 h-5" /> Riwayat Pembayaran</button>
                </nav>
            </div>

            {/* Mobile Tab Navigation - Top Pills */}
            <div className="md:hidden mb-3">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${activeTab === 'info'
                            ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30'
                            : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                            }`}
                    >
                        <UsersIcon className="w-4 h-4" />
                        <span>Info Pengantin</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${activeTab === 'payments'
                            ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/30'
                            : 'bg-brand-surface text-brand-text-secondary border border-brand-border active:scale-95'
                            }`}
                    >
                        <HistoryIcon className="w-4 h-4" />
                        <span>Pembayaran</span>
                    </button>
                </div>
            </div>

            <div className="pt-0 md:pt-5 max-h-[65vh] md:max-h-[65vh] overflow-y-auto pr-2 pb-4">
                {activeTab === 'info' && (
                    <div className="space-y-6 md:space-y-8 tab-content-mobile">
                        {/* Mobile: Card-based info display */}
                        <div className="md:hidden bg-brand-surface rounded-2xl p-4 border border-brand-border shadow-sm">
                            <div className="space-y-3">
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">Nama Lengkap</p>
                                    <p className="text-sm font-semibold text-brand-text-light">{client.name}</p>
                                </div>
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">Jenis Pengantin</p>
                                    <p className="text-sm font-semibold text-brand-text-light">{client.clientType}</p>
                                </div>
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">Email</p>
                                    <p className="text-sm font-semibold text-brand-text-light break-all">{client.email}</p>
                                </div>
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">Telepon</p>
                                    <a href={`https://wa.me/${cleanPhoneNumber(client.whatsapp || client.phone)}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-400 hover:underline active:text-blue-300">{client.whatsapp || client.phone}</a>
                                </div>
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">No. WhatsApp</p>
                                    <a href={`https://wa.me/${cleanPhoneNumber(client.whatsapp || client.phone)}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-400 hover:underline active:text-blue-300">{client.whatsapp || client.phone}</a>
                                </div>
                                <div className="pb-2 border-b border-brand-border/50">
                                    <p className="text-xs text-brand-text-secondary mb-1">Instagram</p>
                                    <p className="text-sm font-semibold text-brand-text-light">{client.instagram || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-brand-text-secondary mb-1">Alamat Lengkap</p>
                                    <p className="text-sm font-semibold text-brand-text-light">{client.address || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-brand-text-secondary mb-1">Pengantin Sejak</p>
                                    <p className="text-sm font-semibold text-brand-text-light">{new Date(client.since).toLocaleDateString('id-ID')}</p>
                                </div>
                            </div>
                            <button onClick={() => onSharePortal(client)} className="mt-4 w-full button-primary inline-flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"><Share2Icon className="w-4 h-4" /> Bagikan Portal Pengantin</button>
                        </div>

                        {/* Desktop: Table-based info display */}
                        <div className="hidden md:block">
                            <dl>
                                <DetailRow label="Nama Lengkap">{client.name}</DetailRow>
                                <DetailRow label="Jenis Pengantin">{client.clientType}</DetailRow>
                                <DetailRow label="Email">{client.email}</DetailRow>
                                <DetailRow label="Telepon"><a href={`https://wa.me/${cleanPhoneNumber(client.whatsapp || client.phone)}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{client.whatsapp || client.phone}</a></DetailRow>
                                <DetailRow label="No. WhatsApp"><a href={`https://wa.me/${cleanPhoneNumber(client.whatsapp || client.phone)}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{client.whatsapp || client.phone}</a></DetailRow>
                                <DetailRow label="Instagram">{client.instagram || '-'}</DetailRow>
                                <DetailRow label="Alamat Lengkap">{client.address || '-'}</DetailRow>
                                <DetailRow label="Pengantin Sejak">{new Date(client.since).toLocaleDateString('id-ID')}</DetailRow>
                            </dl>
                            <button onClick={() => onSharePortal(client)} className="mt-5 button-secondary inline-flex items-center gap-2 text-sm"><Share2Icon className="w-4 h-4" /> Bagikan Portal Pengantin</button>
                        </div>

                        <div>
                            <h4 className="text-sm md:text-base font-semibold text-brand-text-light mb-1">Ringkasan Keuangan Pengantin</h4>
                            <p className="text-xs text-brand-text-secondary mb-3 md:mb-4">Total paket, pembayaran, dan sisa tagihan pengantin ini</p>
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <InfoStatCard icon={<FolderKanbanIcon className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />} title="Jumlah Acara" value={totalProjects.toString()} />
                                <InfoStatCard icon={<DollarSignIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />} title="Total Paket" value={formatCurrency(totalProjectValue)} />
                                <InfoStatCard icon={<TrendingUpIcon className="w-5 h-5 md:w-6 md:h-6 text-green-400" />} title="Total Telah Dibayar" value={formatCurrency(totalPaid)} />
                                <InfoStatCard icon={<TrendingDownIcon className="w-5 h-5 md:w-6 md:h-6 text-red-400" />} title="Total Sisa Tagihan" value={formatCurrency(totalDue)} />
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'payments' && (
                    <div className="space-y-6 md:space-y-8 tab-content-mobile">
                        {clientProjects.map(p => {
                            const transactionsForProject = clientTransactions.filter(t => t.projectId === p.id);
                            const remainingBalance = p.totalCost - p.amountPaid;
                            const displayProjectName = (p.projectName || '').replace(/^Acara\s+/i, '').trim();
                            const pkg = packages.find(pkg => pkg.id === p.packageId) || null;
                            const selectedAddOns = (p.addOns || []).filter(a => a && (a.name || a.id));

                            // Payment Status Badge Logic
                            const getStatusBadge = (status: PaymentStatus | null) => {
                                switch (status) {
                                    case PaymentStatus.LUNAS:
                                        return <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20 uppercase tracking-wider">Lunas</span>;
                                    case PaymentStatus.DP_TERBAYAR:
                                        return <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 uppercase tracking-wider">DP Terbayar</span>;
                                    case PaymentStatus.BELUM_BAYAR:
                                    default:
                                        return <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20 uppercase tracking-wider">Belum Bayar</span>;
                                }
                            };

                            return (
                                <div key={p.id} className="mb-8">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                                        <div>
                                            <h4 className="text-sm md:text-base font-bold text-brand-text-light">{displayProjectName || p.projectName}</h4>
                                            <p className="text-[11px] text-brand-text-secondary">ID: #PRJ-{p.id.slice(-6).toUpperCase()} • {new Date(p.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                        {getStatusBadge(p.paymentStatus)}
                                    </div>

                                    <div className="bg-brand-surface rounded-2xl border border-brand-border shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-brand-accent/30 group">
                                        <div className="p-5 md:p-6 space-y-6">
                                            {/* Top Info Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Paket Layanan</p>
                                                    <p className="text-sm font-semibold text-brand-text-light">{p.packageName || pkg?.name || '-'}</p>
                                                    {((p as any).durationSelection || '').trim() && (
                                                        <p className="text-[11px] text-brand-accent font-medium italic">{(p as any).durationSelection}</p>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Lokasi Acara</p>
                                                    <p className="text-sm font-semibold text-brand-text-light">{p.location || '-'}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary">Alamat / Gedung</p>
                                                    <p className="text-sm font-semibold text-brand-text-light line-clamp-2" title={p.address}>{p.address || '-'}</p>
                                                </div>
                                            </div>

                                            {/* Items & Costs Breakdown */}
                                            <div className="bg-brand-bg/50 rounded-xl p-4 border border-brand-border/50">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-xs pb-2 border-b border-brand-border/30">
                                                        <span className="text-brand-text-secondary">Paket Utama</span>
                                                        <span className="font-bold text-brand-text-primary text-sm">{formatCurrency(p.totalCost - (p.customCosts?.reduce((sum, c) => sum + c.amount, 0) || 0) - (selectedAddOns.reduce((sum, a) => sum + (Number(a.price) || 0), 0)) - (Number(p.transportCost) || 0))}</span>
                                                    </div>

                                                    {selectedAddOns.length > 0 && (
                                                        <div className="space-y-2">
                                                            {selectedAddOns.map((a, idx) => (
                                                                <div key={a.id || a.name || idx} className="flex justify-between items-center text-xs">
                                                                    <span className="text-brand-text-secondary">+ {a.name} (Add-on)</span>
                                                                    <span className="font-semibold text-brand-text-primary">{formatCurrency(Number(a.price || 0))}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {p.transportCost && Number(p.transportCost) > 0 && (
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-brand-text-secondary">+ Biaya Transport</span>
                                                            <span className="font-semibold text-brand-text-primary">{formatCurrency(Number(p.transportCost))}</span>
                                                        </div>
                                                    )}

                                                    {p.customCosts && p.customCosts.length > 0 && (
                                                        <div className="space-y-2 pt-1">
                                                            {p.customCosts.map((c) => (
                                                                <div key={c.id} className="flex justify-between items-center text-xs">
                                                                    <span className="text-orange-400 font-medium">+ {c.description}</span>
                                                                    <span className="font-bold text-orange-400">{formatCurrency(c.amount)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Financial Footer */}
                                            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 pt-4 border-t border-brand-border/50">
                                                <div className="flex gap-4 md:gap-8 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                                                    <div className="flex-shrink-0">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-secondary mb-1">Total Tagihan</p>
                                                        <p className="text-lg font-black text-brand-text-light tracking-tight">{formatCurrency(p.totalCost)}</p>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1">Terbayar</p>
                                                        <p className="text-lg font-black text-green-400 tracking-tight">{formatCurrency(p.amountPaid)}</p>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Sisa Tagihan</p>
                                                        <p className="text-lg font-black text-red-500 tracking-tight">{formatCurrency(remainingBalance)}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 w-full md:w-auto">
                                                    {p.dpProofUrl && (
                                                        <a href={p.dpProofUrl} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none button-secondary !py-2 !px-4 text-xs inline-flex items-center justify-center gap-2 transition-all hover:bg-brand-surface group-hover:border-brand-accent/50">
                                                            <CreditCardIcon className="w-4 h-4 text-brand-accent" /> Bukti DP
                                                        </a>
                                                    )}
                                                    <button onClick={() => onViewInvoice(p)} className="flex-1 md:flex-none button-primary !bg-gradient-to-r from-brand-accent to-blue-600 !py-2 !px-4 text-xs inline-flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/20 hover:scale-105 active:scale-95 transition-all">
                                                        <FileTextIcon className="w-4 h-4" /> Invoice PDF
                                                    </button>
                                                    <button onClick={() => onDeleteProject(p.id)} className="p-2.5 rounded-xl border border-brand-border text-brand-text-secondary hover:text-red-400 hover:border-red-400/50 hover:bg-red-400/5 transition-all active:scale-95" title="Hapus Acara">
                                                        <Trash2Icon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <h4 className="text-sm md:text-base font-semibold text-brand-text-light mt-4 mb-1">Detail Transaksi Pembayaran</h4>
                                    <p className="text-xs text-brand-text-secondary mb-2">Riwayat semua pembayaran yang telah dilakukan untuk acara ini</p>
                                    {/* Mobile cards */}
                                    <div className="md:hidden space-y-2">
                                        {transactionsForProject.length > 0 ? transactionsForProject.map(t => {
                                            const isTransport =
                                                (t.category && t.category.toLowerCase().includes('transport')) ||
                                                (t.description && t.description.toLowerCase().includes('transport'));
                                            return (
                                                <div key={t.id} className="rounded-xl bg-brand-surface border border-brand-border p-3 shadow-sm flex items-start justify-between active:scale-[0.98] transition-transform">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <p className="text-sm font-medium text-brand-text-light">{normalizeTerminology(t.description)}</p>
                                                            {isTransport && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">🚗 TRANSPORT</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-brand-text-secondary">{new Date(t.date).toLocaleDateString('id-ID')}</p>
                                                        <p className="text-[10px] text-brand-text-secondary mt-0.5">{normalizeTerminology(t.category || 'Tidak ada kategori')}</p>
                                                    </div>
                                                    <div className="text-right ml-3">
                                                        <p className={`text-sm font-bold mb-1.5 ${t.type === TransactionType.INCOME ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(t.amount)}</p>
                                                        <button onClick={() => onViewReceipt(t)} className="button-secondary !text-[10px] !px-2 !py-1 active:scale-95 transition-transform">Bukti</button>
                                                    </div>
                                                </div>
                                            )
                                        }) : (
                                            <div className="text-center p-8 bg-brand-surface rounded-xl border border-brand-border">
                                                <p className="text-sm text-brand-text-secondary">Belum ada pembayaran untuk acara ini.</p>
                                            </div>
                                        )}
                                    </div>
                                    {/* Desktop table */}
                                    <div className="hidden md:block border border-brand-border rounded-lg overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-brand-bg"><tr className="bg-brand-bg"><th className="p-3 text-left font-medium text-brand-text-secondary">Tanggal</th><th className="p-3 text-left font-medium text-brand-text-secondary">Deskripsi</th><th className="p-3 text-left font-medium text-brand-text-secondary">Kategori</th><th className="p-3 text-right font-medium text-brand-text-secondary">Jumlah</th><th className="p-3 text-center font-medium text-brand-text-secondary">Aksi</th></tr></thead>
                                            <tbody>
                                                {transactionsForProject.length > 0 ? transactionsForProject.map(t => {
                                                    const isTransport =
                                                        (t.category && t.category.toLowerCase().includes('transport')) ||
                                                        (t.description && t.description.toLowerCase().includes('transport'));
                                                    return (
                                                        <tr key={t.id} className="border-t border-brand-border hover:bg-brand-bg/50 transition-colors">
                                                            <td className="p-3 text-brand-text-secondary">{new Date(t.date).toLocaleDateString('id-ID')}</td>
                                                            <td className="p-3">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-brand-text-light">{normalizeTerminology(t.description)}</span>
                                                                    {isTransport && (
                                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 whitespace-nowrap">🚗 TRANSPORT</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-3 text-brand-text-secondary text-xs">{normalizeTerminology(t.category || '-')}</td>
                                                            <td className={`p-3 text-right font-semibold ${t.type === TransactionType.INCOME ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(t.amount)}</td>
                                                            <td className="p-3 text-center"><button onClick={() => onViewReceipt(t)} className="p-1 text-brand-text-secondary hover:text-brand-accent transition-colors"><FileTextIcon className="w-5 h-5" /></button></td>
                                                        </tr>
                                                    )
                                                }) : (
                                                    <tr><td colSpan={5} className="text-center p-4 text-brand-text-secondary">Belum ada pembayaran untuk acara ini.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {remainingBalance > 0 && (
                                        <>
                                            <h4 className="text-sm md:text-base font-semibold text-brand-text-light mt-5 mb-3">Catat Pembayaran Baru</h4>
                                            {/* Mobile: Stacked card layout */}
                                            <div className="md:hidden bg-brand-surface rounded-2xl p-4 border border-brand-border shadow-sm">
                                                <div className="space-y-4">
                                                    <div className="input-group !mt-0">
                                                        <RupiahInput id={`amount-mobile-${p.id}`} value={newPayments[p.id]?.amount || ''} onChange={(raw) => handleNewPaymentChange(p.id, 'amount', raw)} max={remainingBalance} className="input-field" placeholder=" " />
                                                        <label htmlFor={`amount-mobile-${p.id}`} className="input-label text-xs">Jumlah (Maks: {formatCurrency(remainingBalance)})</label>
                                                    </div>
                                                    <div className="input-group !mt-0">
                                                        <select id={`dest-mobile-${p.id}`} value={newPayments[p.id]?.destinationCardId || ''} onChange={(e) => handleNewPaymentChange(p.id, 'destinationCardId', e.target.value)} className="input-field"><option value="">Pilih Tujuan...</option>{cards.map(c => <option key={c.id} value={c.id}>{c.bankName} {c.lastFourDigits !== 'CASH' ? `**** ${c.lastFourDigits}` : '(Tunai)'}</option>)}</select>
                                                        <label htmlFor={`dest-mobile-${p.id}`} className="input-label text-xs">Tujuan Pembayaran</label>
                                                    </div>
                                                    <button onClick={() => handleNewPaymentSubmit(p.id)} className="button-primary w-full active:scale-95 transition-transform">CATAT PEMBAYARAN</button>
                                                </div>
                                            </div>
                                            {/* Desktop: Original layout */}
                                            <div className="hidden md:block p-4 bg-brand-bg rounded-lg">
                                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                                    <div className="input-group flex-grow w-full !mt-0">
                                                        <RupiahInput id={`amount-${p.id}`} value={newPayments[p.id]?.amount || ''} onChange={(raw) => handleNewPaymentChange(p.id, 'amount', raw)} max={remainingBalance} className="input-field" placeholder=" " />
                                                        <label htmlFor={`amount-${p.id}`} className="input-label">Jumlah Pembayaran (Maks: {formatCurrency(remainingBalance)})</label>
                                                    </div>
                                                    <div className="input-group w-full sm:w-64 !mt-0">
                                                        <select id={`dest-${p.id}`} value={newPayments[p.id]?.destinationCardId || ''} onChange={(e) => handleNewPaymentChange(p.id, 'destinationCardId', e.target.value)} className="input-field"><option value="">Pilih Tujuan...</option>{cards.map(c => <option key={c.id} value={c.id}>{c.bankName} {c.lastFourDigits !== 'CASH' ? `**** ${c.lastFourDigits}` : '(Tunai)'}</option>)}</select>
                                                        <label htmlFor={`dest-${p.id}`} className="input-label">Tujuan Pembayaran</label>
                                                    </div>
                                                    <button onClick={() => handleNewPaymentSubmit(p.id)} className="button-primary h-fit w-full sm:w-auto flex-shrink-0">CATAT</button>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <h4 className="text-sm md:text-base font-semibold text-brand-text-light mt-6 mb-3">Tambah Biaya Tambahan (Addons/Overtime)</h4>
                                    <p className="text-xs text-brand-text-secondary mb-2">Tambahkan biaya tambahan jika ada permintaan dari pengantin (addons, overtime, dll)</p>
                                    <div className="bg-brand-surface rounded-2xl p-4 border border-brand-border shadow-sm mb-4">
                                        <div className="flex flex-col sm:flex-row items-center gap-4">
                                            <div className="input-group flex-grow w-full !mt-0">
                                                <input type="text" id={`charge-name-${p.id}`} value={newCharge[p.id]?.name || ''} onChange={(e) => handleNewChargeChange(p.id, 'name', e.target.value)} className="input-field" placeholder=" " />
                                                <label htmlFor={`charge-name-${p.id}`} className="input-label">Nama Biaya (misal: Overtime)</label>
                                            </div>
                                            <div className="input-group w-full sm:w-64 !mt-0">
                                                <RupiahInput id={`charge-amount-${p.id}`} value={newCharge[p.id]?.amount || ''} onChange={(raw) => handleNewChargeChange(p.id, 'amount', raw)} className="input-field" placeholder=" " />
                                                <label htmlFor={`charge-amount-${p.id}`} className="input-label">Jumlah Biaya</label>
                                            </div>
                                            <button onClick={() => handleNewChargeSubmit(p.id)} className="button-secondary h-fit w-full sm:w-auto flex-shrink-0 !border-brand-accent !text-brand-accent hover:!bg-brand-accent/10">TAMBAH</button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};


interface ClientsProps {
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    packages: Package[];
    addOns: AddOn[];
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    userProfile: Profile;
    showNotification: (message: string) => void;
    initialAction: NavigationAction | null;
    setInitialAction: (action: NavigationAction | null) => void;
    cards: Card[];
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    pockets: FinancialPocket[];
    setPockets: React.Dispatch<React.SetStateAction<FinancialPocket[]>>;
    handleNavigation: (view: ViewType, action: NavigationAction) => void;
    clientFeedback: ClientFeedback[];
    promoCodes: PromoCode[];
    setPromoCodes: React.Dispatch<React.SetStateAction<PromoCode[]>>;
    onSignInvoice: (projectId: string, signatureDataUrl: string) => void;
    onSignTransaction: (transactionId: string, signatureDataUrl: string) => void;
    onRecordPayment: (projectId: string, amount: number, destinationCardId: string) => Promise<void>;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
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

const NewClientsChart: React.FC<{ data: { name: string; count: number }[] }> = ({ data }) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const hasData = data.some(d => d.count > 0);

    if (!hasData) {
        return (
            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg h-full border border-brand-border">
                <h3 className="font-bold text-lg text-gradient mb-6">Akuisisi Pengantin Baru ({new Date().getFullYear()})</h3>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-brand-bg border-2 border-dashed border-brand-border flex items-center justify-center mb-3">
                        <svg className="w-10 h-10 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-brand-text-light mb-1">Belum Ada Pengantin Baru</p>
                    <p className="text-xs text-brand-text-secondary">Data pengantin baru akan muncul di sini</p>
                </div>
            </div>
        );
    }

    // Generate gradient colors for each bar
    const getBarColor = (index: number) => {
        const colors = [
            { from: 'from-blue-500', to: 'to-cyan-400', solid: 'bg-blue-500', glow: 'shadow-blue-500/50' },
            { from: 'from-purple-500', to: 'to-pink-400', solid: 'bg-purple-500', glow: 'shadow-purple-500/50' },
            { from: 'from-green-500', to: 'to-emerald-400', solid: 'bg-green-500', glow: 'shadow-green-500/50' },
            { from: 'from-orange-500', to: 'to-amber-400', solid: 'bg-orange-500', glow: 'shadow-orange-500/50' },
            { from: 'from-pink-500', to: 'to-rose-400', solid: 'bg-pink-500', glow: 'shadow-pink-500/50' },
            { from: 'from-indigo-500', to: 'to-blue-400', solid: 'bg-indigo-500', glow: 'shadow-indigo-500/50' },
            { from: 'from-teal-500', to: 'to-cyan-400', solid: 'bg-teal-500', glow: 'shadow-teal-500/50' },
            { from: 'from-red-500', to: 'to-orange-400', solid: 'bg-red-500', glow: 'shadow-red-500/50' },
            { from: 'from-violet-500', to: 'to-purple-400', solid: 'bg-violet-500', glow: 'shadow-violet-500/50' },
            { from: 'from-cyan-500', to: 'to-blue-400', solid: 'bg-cyan-500', glow: 'shadow-cyan-500/50' },
            { from: 'from-amber-500', to: 'to-yellow-400', solid: 'bg-amber-500', glow: 'shadow-amber-500/50' },
            { from: 'from-emerald-500', to: 'to-green-400', solid: 'bg-emerald-500', glow: 'shadow-emerald-500/50' },
        ];
        return colors[index % colors.length];
    };

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg h-full border border-brand-border">
            <h3 className="font-bold text-lg text-gradient mb-2">Akuisisi Pengantin Baru ({new Date().getFullYear()})</h3>
            <p className="text-xs text-brand-text-secondary mb-6">Jumlah pengantin baru per bulan</p>
            <div className="h-52 flex justify-between items-end gap-2 relative bg-gradient-to-t from-brand-bg/50 to-transparent rounded-xl p-4">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="border-t border-brand-border/20"></div>
                    ))}
                </div>

                {data.map((item, index) => {
                    const height = Math.max((item.count / maxCount) * 100, 5);
                    const isHovered = hoveredIndex === index;
                    const barColor = getBarColor(index);

                    return (
                        <div
                            key={item.name}
                            className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer z-10"
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {/* Tooltip */}
                            {isHovered && (
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-gradient-to-br from-brand-surface to-brand-bg border-2 border-brand-accent/40 text-white font-semibold py-2.5 px-4 rounded-xl shadow-2xl text-xs whitespace-nowrap z-20 backdrop-blur-sm">
                                    <p className="text-brand-accent font-bold mb-1">{item.name}</p>
                                    <p className="text-brand-text-light flex items-center gap-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <span className="font-bold text-lg">{item.count}</span>
                                        <span>Pengantin</span>
                                    </p>
                                </div>
                            )}

                            {/* Count label on top of bar */}
                            {item.count > 0 && (
                                <div className={`absolute -top-6 text-xs font-bold py-1 px-2 rounded-md transition-all duration-300 ${isHovered
                                    ? 'opacity-100 scale-110 text-brand-accent'
                                    : 'opacity-70 text-brand-text-secondary'
                                    }`}>
                                    {item.count}
                                </div>
                            )}

                            {/* Bar with gradient */}
                            <div
                                className={`w-full rounded-t-xl transition-all duration-300 bg-gradient-to-t ${barColor.from} ${barColor.to} relative overflow-hidden ${isHovered
                                    ? `shadow-2xl ${barColor.glow} scale-x-110 scale-y-105`
                                    : 'shadow-lg hover:scale-105'
                                    }`}
                                style={{ height: `${height}%` }}
                            >
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                {/* Animated pulse when hovered */}
                                {isHovered && (
                                    <div className="absolute inset-0 animate-pulse bg-white/10"></div>
                                )}
                            </div>

                            {/* Month label */}
                            <span className={`text-[10px] mt-2.5 font-medium transition-all duration-300 ${isHovered
                                ? 'text-brand-accent font-bold scale-110'
                                : 'text-brand-text-secondary'
                                }`}>
                                {item.name}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Summary info */}
            <div className="mt-4 pt-4 border-t border-brand-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-brand-text-secondary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>Total: <span className="font-bold text-brand-text-light">{data.reduce((sum, d) => sum + d.count, 0)} Pengantin</span></span>
                </div>
                <div className="text-brand-text-secondary">
                    Rata-rata: <span className="font-bold text-brand-text-light">{(data.reduce((sum, d) => sum + d.count, 0) / data.length).toFixed(1)} / bulan</span>
                </div>
            </div>
        </div>
    );
};

const Clients: React.FC<ClientsProps> = ({ clients, setClients, projects, setProjects, packages, addOns, transactions, setTransactions, userProfile, showNotification, initialAction, setInitialAction, cards, setCards, pockets, setPockets, handleNavigation, clientFeedback, promoCodes, setPromoCodes, onSignInvoice, onSignTransaction, addNotification, totals }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState(initialFormState);

    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [clientForDetail, setClientForDetail] = useState<Client | null>(null);
    const [billingChatModal, setBillingChatModal] = useState<Client | null>(null);

    const [documentToView, setDocumentToView] = useState<{ type: 'invoice', project: Project } | { type: 'receipt', transaction: Transaction } | null>(null);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [qrModalContent, setQrModalContent] = useState<{ title: string; url: string } | null>(null);

    // New state for filters and UI
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('Semua Status');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeSectionOpen, setActiveSectionOpen] = useState(true);
    const [inactiveSectionOpen, setInactiveSectionOpen] = useState(true);
    const [isBookingFormShareModalOpen, setIsBookingFormShareModalOpen] = useState(false);
    const [activeStatModal, setActiveStatModal] = useState<'active' | 'location' | 'receivables' | 'total' | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    useEffect(() => {
        if (initialAction && initialAction.type === 'VIEW_CLIENT_DETAILS' && initialAction.id) {
            const clientToView = clients.find(c => c.id === initialAction.id);
            if (clientToView) {
                setClientForDetail(clientToView);
                setIsDetailModalOpen(true);
            }
            setInitialAction(null); // Reset action after handling
        }
    }, [initialAction, clients, setInitialAction]);

    const bookingFormUrl = useMemo(() => {
        const path = window.location.pathname.replace(/index\.html$/, '');
        return `${window.location.origin}${path}#/public-booking`;
    }, []);


    const handleOpenQrModal = (client: Client) => {
        const path = window.location.pathname.replace(/index\.html$/, '');
        const url = `${window.location.origin}${path}#/portal/${client.portalAccessId}`;
        setQrModalContent({ title: `Portal QR Code untuk ${client.name}`, url });
    };

    const copyBookingLinkToClipboard = () => {
        navigator.clipboard.writeText(bookingFormUrl).then(() => {
            showNotification('Tautan formulir booking berhasil disalin!');
            setIsBookingFormShareModalOpen(false);
        });
    };

    const downloadBookingQrCode = () => {
        const canvas = document.querySelector('#clients-booking-form-qrcode canvas') as HTMLCanvasElement;
        if (canvas) {
            const link = document.createElement('a');
            link.download = 'form-booking-qr.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    const handleOpenModal = (mode: 'add' | 'edit', client?: Client, project?: Project) => {
        setModalMode(mode);
        if (mode === 'edit' && client) {
            setSelectedClient(client);
            if (project) {
                setSelectedProject(project);
                setFormData({
                    clientId: client.id,
                    clientName: client.name,
                    email: client.email,
                    phone: client.phone,
                    whatsapp: client.whatsapp || '',
                    instagram: client.instagram || '',
                    clientType: client.clientType,
                    projectId: project.id,
                    projectName: project.projectName,
                    projectType: project.projectType,
                    location: project.location,
                    date: project.date,
                    packageId: project.packageId,
                    selectedAddOnIds: project.addOns.map(a => a.id),
                    durationSelection: (project as any).durationSelection || '',
                    unitPrice: (project as any).unitPrice,
                    address: project.address || client.address || '',
                    dp: '', // Not editing DP here, handle in payment
                    dpDestinationCardId: '',
                    notes: project.notes || '',
                    accommodation: project.accommodation || '',
                    driveLink: project.driveLink || '',
                    promoCodeId: project.promoCodeId || '',
                });
            } else {
                // Edit client only (no project yet)
                setSelectedProject(null);
                setFormData({
                    ...initialFormState,
                    clientId: client.id,
                    clientName: client.name,
                    email: client.email,
                    phone: client.phone,
                    whatsapp: client.whatsapp || '',
                    instagram: client.instagram || '',
                    clientType: client.clientType,
                    address: client.address || '',
                    projectType: userProfile.projectTypes[0] || ''
                });
            }
        } else if (mode === 'add' && client) { // Adding new project for existing client
            setSelectedClient(client);
            setFormData({ ...initialFormState, clientId: client.id, clientName: client.name, email: client.email, phone: client.phone, whatsapp: client.whatsapp || '', instagram: client.instagram || '', clientType: client.clientType, address: client.address || '' });
        } else { // Adding new client
            setSelectedClient(null);
            setSelectedProject(null);
            setFormData({ ...initialFormState, projectType: userProfile.projectTypes[0] || '' });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setDocumentToView(null);
        setIsSignatureModalOpen(false);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { id, checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, selectedAddOnIds: checked ? [...prev.selectedAddOnIds, id] : prev.selectedAddOnIds.filter(addOnId => addOnId !== id) }));
        } else {
            setFormData(prev => {
                // If package changed, attempt to apply default duration option
                if (name === 'packageId') {
                    const pkg = packages.find(p => p.id === value);
                    if (pkg && Array.isArray(pkg.durationOptions) && pkg.durationOptions.length > 0) {
                        const defaultOpt = pkg.durationOptions.find(o => o.default) || pkg.durationOptions[0];
                        return { ...prev, [name]: value, durationSelection: defaultOpt.label, unitPrice: Number(defaultOpt.price) };
                    }
                    // no durationOptions
                    return { ...prev, [name]: value, durationSelection: '', unitPrice: pkg ? pkg.price : undefined };
                }

                // If durationSelection changed, compute unitPrice from selected package
                if (name === 'durationSelection') {
                    const pkg = packages.find(p => p.id === prev.packageId);
                    if (pkg && Array.isArray(pkg.durationOptions)) {
                        const opt = pkg.durationOptions.find(o => o.label === value);
                        if (opt) return { ...prev, durationSelection: value, unitPrice: Number(opt.price) };
                    }
                    return { ...prev, durationSelection: value };
                }

                return { ...prev, [name]: value };
            });
        }
    };

    const allClientData = useMemo(() => {
        return clients.map(client => {
            const clientProjects = projects.filter(p => p.clientId === client.id);
            const totalValue = clientProjects.reduce((sum, p) => sum + p.totalCost, 0);
            const totalPaid = clientProjects.reduce((sum, p) => sum + p.amountPaid, 0);

            const mostRecentProject = clientProjects.length > 0
                ? [...clientProjects].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                : null;

            return {
                ...client,
                projects: clientProjects,
                totalAcaraValue: totalValue,
                balanceDue: totalValue - totalPaid,
                paketTerbaru: mostRecentProject ? `${mostRecentProject.packageName}${mostRecentProject.addOns.length > 0 ? ` + ${mostRecentProject.addOns.length} Add-on` : ''}` : 'Belum ada acara',
                overallPaymentStatus: mostRecentProject ? mostRecentProject.paymentStatus : null,
                mostRecentProject: mostRecentProject,
            };
        });
    }, [clients, projects]);

    const clientsWithDues = useMemo(() => {
        return allClientData
            .filter(client => client.balanceDue > 0)
            .sort((a, b) => b.balanceDue - a.balanceDue);
    }, [allClientData]);

    const clientStats = useMemo(() => {
        const locationCounts = projects.reduce((acc, p) => {
            if (p.location) {
                const mainLocation = p.location.split(',')[0].trim();
                acc[mainLocation] = (acc[mainLocation] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const mostFrequentLocation = Object.keys(locationCounts).length > 0
            ? Object.keys(locationCounts).reduce((a, b) => locationCounts[a] > locationCounts[b] ? a : b)
            : 'N/A';

        const totalReceivables = allClientData.reduce((sum, c) => sum + c.balanceDue, 0);

        return {
            activeClients: totals.activeClients,
            mostFrequentLocation,
            totalReceivables: formatCurrency(totalReceivables),
            totalClients: totals.clients
        };
    }, [clients, projects, allClientData, totals]);

    const filteredClientData = useMemo(() => {
        return allClientData.filter(client => {
            const searchMatch = searchTerm === '' ||
                client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (client.address && client.address.toLowerCase().includes(searchTerm.toLowerCase()));

            const statusMatch = statusFilter === 'Semua Status' || client.overallPaymentStatus === statusFilter;

            const from = dateFrom ? new Date(dateFrom) : null;
            const to = dateTo ? new Date(dateTo) : null;
            if (from) from.setHours(0, 0, 0, 0);
            if (to) to.setHours(23, 59, 59, 999);
            const dateMatch = (!from && !to) || client.projects.some(p => {
                const projectDate = new Date(p.date);
                return (!from || projectDate >= from) && (!to || projectDate <= to);
            });

            return searchMatch && statusMatch && dateMatch;
        });
    }, [allClientData, searchTerm, statusFilter, dateFrom, dateTo]);

    const clientStatusDonutData = useMemo(() => {
        const statusCounts = clients.reduce((acc, client) => {
            acc[client.status] = (acc[client.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const statusColors: { [key in ClientStatus]?: string } = {
            [ClientStatus.ACTIVE]: '#10b981',
            [ClientStatus.INACTIVE]: '#64748b',
            [ClientStatus.LEAD]: '#3b82f6',
            [ClientStatus.LOST]: '#ef4444',
        };

        return Object.entries(statusCounts).map(([label, value]) => ({
            label,
            value,
            color: statusColors[label as ClientStatus] || '#9ca3af'
        }));
    }, [clients]);

    const newClientsChartData = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        const data = months.map(month => ({ name: month, count: 0 }));

        clients.forEach(c => {
            const joinDate = new Date(c.since);
            if (joinDate.getFullYear() === currentYear) {
                const monthIndex = joinDate.getMonth();
                data[monthIndex].count += 1;
            }
        });
        return data;
    }, [clients]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!ensureOnlineOrNotify(showNotification)) return;

        const selectedPackage = packages.find(p => p.id === formData.packageId);
        if (!selectedPackage) {
            alert('Harap pilih paket layanan.');
            return;
        }

        const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
        // Use unitPrice chosen in form (duration-based) when provided, otherwise fallback to package price
        const packagePriceChosen = formData.unitPrice !== undefined && !isNaN(Number(formData.unitPrice)) ? Number(formData.unitPrice) : (selectedPackage.price || 0);
        const totalBeforeDiscount = packagePriceChosen + selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
        let finalDiscountAmount = 0;
        const promoCode = promoCodes.find(p => p.id === formData.promoCodeId);
        if (promoCode) {
            if (promoCode.discountType === 'percentage') {
                finalDiscountAmount = (totalBeforeDiscount * promoCode.discountValue) / 100;
            } else {
                finalDiscountAmount = promoCode.discountValue;
            }
        }
        const totalProject = totalBeforeDiscount - finalDiscountAmount;

        if (modalMode === 'add') {
            let clientId = selectedClient?.id;
            if (!selectedClient) { // New client
                try {
                    const created = await createClientRow({
                        name: formData.clientName,
                        email: formData.email,
                        phone: formData.phone,
                        whatsapp: formData.whatsapp || formData.phone,
                        instagram: formData.instagram || undefined,
                        clientType: formData.clientType,
                        since: new Date().toISOString().split('T')[0],
                        status: ClientStatus.ACTIVE,
                        lastContact: new Date().toISOString(),
                        portalAccessId: crypto.randomUUID(),
                        address: formData.address || undefined,
                    } as Omit<Client, 'id'>);
                    clientId = created.id;
                    setClients(prev => [created, ...prev]);
                } catch (err) {
                    showNotification(!navigator.onLine ? 'Harus online untuk melakukan perubahan' : 'Gagal menyimpan pengantin ke database. Coba lagi.');
                    return;
                }
            }

            const dpAmount = Number(formData.dp) || 0;
            const remainingPayment = totalProject - dpAmount;

            // Create project in Supabase
            try {
                const createdProject = await createProjectRow({
                    projectName: formData.projectName,
                    clientName: formData.clientName,
                    clientId: clientId!,
                    projectType: formData.projectType,
                    packageName: selectedPackage.name,
                    date: formData.date,
                    location: formData.location,
                    status: 'Dikonfirmasi',
                    totalCost: totalProject,
                    amountPaid: dpAmount,
                    paymentStatus: dpAmount > 0 ? (remainingPayment <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR) : PaymentStatus.BELUM_BAYAR,
                    // persist chosen duration and unit price if present
                    durationSelection: formData.durationSelection || undefined,
                    unitPrice: formData.unitPrice !== undefined ? Number(formData.unitPrice) : undefined,
                    notes: formData.notes || undefined,
                    accommodation: formData.accommodation || undefined,
                    driveLink: formData.driveLink || undefined,
                    promoCodeId: formData.promoCodeId || undefined,
                    discountAmount: finalDiscountAmount > 0 ? finalDiscountAmount : undefined,
                    address: formData.address || undefined,
                    printingCost: undefined,
                    transportCost: undefined,
                    completedDigitalItems: [],
                    addOns: selectedAddOns.map(a => ({ id: a.id, name: a.name, price: a.price })),
                });
                // enrich with addOns in local state
                const mergedProject: Project = { ...createdProject, addOns: selectedAddOns };
                setProjects(prev => [mergedProject, ...prev]);

                // Create DP transaction (persist to Supabase) if any
                if (mergedProject.amountPaid > 0) {
                    // Resolve Supabase card UUID from local selection
                    const selectedCard = cards.find(c => c.id === formData.dpDestinationCardId);
                    const supaCardId = selectedCard
                        ? await findCardIdByMeta(selectedCard.bankName, selectedCard.lastFourDigits)
                        : null;
                    try {
                        const createdTx = await createTransactionRow({
                            date: new Date().toISOString().split('T')[0],
                            description: `DP Acara ${mergedProject.projectName}`,
                            amount: mergedProject.amountPaid,
                            type: TransactionType.INCOME,
                            projectId: mergedProject.id,
                            category: 'DP Acara',
                            method: 'Transfer Bank',
                            cardId: supaCardId || undefined,
                        } as Omit<Transaction, 'id' | 'vendorSignature'>);
                        setTransactions(prev => [...prev, createdTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                        if (supaCardId) {
                            if (formData.dpDestinationCardId) {
                                setCards(prev => prev.map(c => c.id === formData.dpDestinationCardId ? { ...c, balance: c.balance + mergedProject.amountPaid } : c));
                            }
                        }
                    } catch (err) {
                        console.warn('[Supabase] Gagal mencatat transaksi DP, gunakan fallback lokal.', err);
                        const newTransaction: Transaction = {
                            id: `TRN-DP-${mergedProject.id}`,
                            date: new Date().toISOString().split('T')[0],
                            description: `DP Acara ${mergedProject.projectName}`,
                            amount: mergedProject.amountPaid,
                            type: TransactionType.INCOME,
                            projectId: mergedProject.id,
                            category: 'DP Acara',
                            method: 'Transfer Bank',
                            cardId: formData.dpDestinationCardId,
                        };
                        setTransactions(prev => [...prev, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                        setCards(prev => prev.map(c => c.id === formData.dpDestinationCardId ? { ...c, balance: c.balance + mergedProject.amountPaid } : c));
                    }
                }
            } catch (err) {
                showNotification(!navigator.onLine ? 'Harus online untuk melakukan perubahan' : 'Gagal membuat acara di database. Coba lagi.');
                return;
            }

            // promo usage increment remains local for now
            if (promoCode) {
                setPromoCodes(prev => prev.map(p => p.id === promoCode.id ? { ...p, usageCount: p.usageCount + 1 } : p));
            }
            showNotification(`Pengantin ${formData.clientName} dan acara baru berhasil ditambahkan.`);
            // Close modal and reset form after successful save
            handleCloseModal();
            setFormData(initialFormState);
            setSelectedClient(null);
            setSelectedProject(null);
        } else if (modalMode === 'edit') {
            if (!selectedClient || !selectedProject) {
                alert('Data pengantin/acara tidak ditemukan untuk mode edit.');
                return;
            }

            // Update Client first (if any changes)
            try {
                const updatedClient = await updateClientRow(selectedClient.id, {
                    name: formData.clientName,
                    email: formData.email,
                    phone: formData.phone,
                    whatsapp: formData.whatsapp || undefined,
                    instagram: formData.instagram || undefined,
                    clientType: formData.clientType,
                    lastContact: new Date().toISOString(),
                    address: formData.address || undefined,
                });
                setClients(prev => prev.map(c => (c.id === updatedClient.id ? updatedClient : c)));
            } catch (err) {
                console.warn('Gagal update data pengantin:', err);
                showNotification(!navigator.onLine ? 'Harus online untuk melakukan perubahan' : 'Gagal mengupdate data pengantin. Coba lagi.');
                return;
            }

            // Recalculate project totals and update project
            const selectedPackage = packages.find(p => p.id === formData.packageId);
            if (!selectedPackage) {
                alert('Harap pilih paket layanan.');
                return;
            }
            const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
            const packagePriceChosen = formData.unitPrice !== undefined && !isNaN(Number(formData.unitPrice)) ? Number(formData.unitPrice) : (selectedPackage.price || 0);
            const totalBeforeDiscount = packagePriceChosen + selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
            let finalDiscountAmount = 0;
            const promoCode = promoCodes.find(p => p.id === formData.promoCodeId);
            if (promoCode) {
                if (promoCode.discountType === 'percentage') {
                    finalDiscountAmount = (totalBeforeDiscount * promoCode.discountValue) / 100;
                } else {
                    finalDiscountAmount = promoCode.discountValue;
                }
            }
            const totalProject = totalBeforeDiscount - finalDiscountAmount;

            const newAmountPaid = selectedProject.amountPaid; // DP tidak diedit di form ini
            let newPaymentStatus: PaymentStatus = PaymentStatus.BELUM_BAYAR;
            if (newAmountPaid <= 0) newPaymentStatus = PaymentStatus.BELUM_BAYAR;
            else if (newAmountPaid >= totalProject) newPaymentStatus = PaymentStatus.LUNAS;
            else newPaymentStatus = PaymentStatus.DP_TERBAYAR;

            try {
                const updatedProject = await updateProjectRow(selectedProject.id, {
                    projectName: formData.projectName,
                    clientName: formData.clientName,
                    clientId: selectedClient.id,
                    projectType: formData.projectType,
                    packageName: selectedPackage.name,
                    date: formData.date,
                    location: formData.location,
                    status: selectedProject.status,
                    totalCost: totalProject,
                    amountPaid: newAmountPaid,
                    paymentStatus: newPaymentStatus,
                    // persist chosen duration/unit when editing
                    durationSelection: formData.durationSelection || undefined,
                    unitPrice: formData.unitPrice !== undefined ? Number(formData.unitPrice) : undefined,
                    notes: formData.notes || undefined,
                    accommodation: formData.accommodation || undefined,
                    driveLink: formData.driveLink || undefined,
                    promoCodeId: formData.promoCodeId || undefined,
                    discountAmount: finalDiscountAmount > 0 ? finalDiscountAmount : undefined,
                    address: formData.address || undefined,
                    addOns: selectedAddOns.map(a => ({ id: a.id, name: a.name, price: a.price })),
                });

                // merge addOns into local state copy
                const merged: Project = { ...updatedProject, addOns: selectedAddOns } as Project;
                setProjects(prev => prev.map(p => (p.id === merged.id ? merged : p)));
            } catch (err) {
                console.warn('Gagal update acara:', err);
                showNotification(!navigator.onLine ? 'Harus online untuk melakukan perubahan' : 'Gagal mengupdate acara. Coba lagi.');
                return;
            }

            showNotification(`Data pengantin dan acara berhasil diperbarui.`);
            // Close and reset
            handleCloseModal();
            setFormData(initialFormState);
            setSelectedClient(null);
            setSelectedProject(null);
        }
    };

    const handleDownloadClients = () => {
        const headers = ['Nama', 'Email', 'Telepon', 'Status', 'Total Paket', 'Sisa Tagihan', 'Paket Terbaru'];
        const data = filteredClientData.map(client => [
            `"${client.name.replace(/"/g, '""')}"`,
            client.email,
            client.phone,
            client.status,
            client.totalAcaraValue,
            client.balanceDue,
            client.paketTerbaru
        ]);
        downloadCSV(headers, data, `data-pengantin-${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleDeleteClient = async (clientId: string) => {
        if (!window.confirm('Menghapus pengantin akan menghapus semua acara dan transaksi terkait. Apakah Anda yakin?')) return;

        if (!ensureOnlineOrNotify(showNotification)) return;
        try {
            await deleteClientRow(clientId);
            setClients(prev => prev.filter(c => c.id !== clientId));
            const projectsToDelete = projects.filter(p => p.clientId === clientId).map(p => p.id);
            setProjects(prev => prev.filter(p => p.clientId !== clientId));
            setTransactions(prev => prev.filter(t => !projectsToDelete.includes(t.projectId || '')));
            setIsDetailModalOpen(false);
            showNotification('Pengantin berhasil dihapus.');
        } catch (err) {
            showNotification(!navigator.onLine ? 'Harus online untuk melakukan perubahan' : 'Gagal menghapus pengantin di database. Coba lagi.');
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!window.confirm('Hapus acara ini? Semua transaksi terkait akan tetap ada, tetapi tidak lagi terhubung ke acara. Lanjutkan?')) return;

        if (!ensureOnlineOrNotify(showNotification)) return;
        const success = await deleteProjectRow(projectId);
        if (success) {
            setProjects(prev => prev.filter(p => p.id !== projectId));
            showNotification('Acara berhasil dihapus.');
        } else {
            showNotification(!navigator.onLine ? 'Harus online untuk melakukan perubahan' : 'Gagal menghapus acara di database. Coba lagi.');
        }
    };

    // --- Record payment handler (persist to Supabase, then sync local state) ---
    const handleRecordPayment = async (projectId: string, amount: number, destinationCardId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        if (!ensureOnlineOrNotify(showNotification)) return;

        try {
            const selectedCard = cards.find(c => c.id === destinationCardId);
            const supaCardId = selectedCard ? await findCardIdByMeta(selectedCard.bankName, selectedCard.lastFourDigits) : null;
            const createdTx = await createTransactionRow({
                date: new Date().toISOString().split('T')[0],
                description: `Pembayaran Acara ${project.projectName}`,
                amount,
                type: TransactionType.INCOME,
                projectId: project.id,
                category: 'Pelunasan Acara',
                method: 'Transfer Bank',
                cardId: supaCardId || undefined,
            } as Omit<Transaction, 'id' | 'vendorSignature'>);
            setTransactions(prev => [...prev, createdTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            if (destinationCardId) {
                setCards(prev => prev.map(c => c.id === destinationCardId ? { ...c, balance: c.balance + amount } : c));
            }
        } catch (err) {
            console.warn('[Supabase] Gagal mencatat pembayaran, gunakan fallback lokal.', err);
            const newTransaction: Transaction = {
                id: `TRN-PAY-${project.id}-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                description: `Pembayaran Acara ${project.projectName}`,
                amount,
                type: TransactionType.INCOME,
                projectId: project.id,
                category: 'Pelunasan Acara',
                method: 'Transfer Bank',
                cardId: destinationCardId,
            };
            setTransactions(prev => [...prev, newTransaction].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setCards(prev => prev.map(c => c.id === destinationCardId ? { ...c, balance: c.balance + amount } : c));
        }

        // Persist updated amountPaid and paymentStatus to Supabase, then sync local state
        try {
            const currentProject = projects.find(p => p.id === project.id);
            if (currentProject) {
                const newAmountPaid = currentProject.amountPaid + amount;
                const remaining = currentProject.totalCost - newAmountPaid;
                const updated = await updateProjectRow(project.id, {
                    amountPaid: newAmountPaid,
                    paymentStatus: remaining <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR,
                });
                setProjects(prev => prev.map(p => (p.id === updated.id ? { ...p, amountPaid: updated.amountPaid, paymentStatus: updated.paymentStatus } : p)));
            }
        } catch (err) {
            // Fallback: update local state to keep UI responsive even if persistence fails
            setProjects(prev => prev.map(p => {
                if (p.id === project.id) {
                    const newAmountPaid = p.amountPaid + amount;
                    const remaining = p.totalCost - newAmountPaid;
                    return {
                        ...p,
                        amountPaid: newAmountPaid,
                        paymentStatus: remaining <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR
                    };
                }
                return p;
            }));
        }

        showNotification('Pembayaran berhasil dicatat.');
        addNotification({
            title: 'Pembayaran Diterima',
            message: `Pembayaran sebesar ${formatCurrency(amount)} untuk acara "${project.projectName}" telah diterima.`,
            icon: 'payment',
            link: {
                view: ViewType.CLIENTS,
                action: { type: 'VIEW_CLIENT_DETAILS', id: project.clientId }
            }
        });
    };

    const handleSaveSignature = (signatureDataUrl: string) => {
        if (documentToView?.type === 'invoice' && documentToView.project) {
            onSignInvoice(documentToView.project.id, signatureDataUrl);
        } else if (documentToView?.type === 'receipt' && documentToView.transaction) {
            onSignTransaction(documentToView.transaction.id, signatureDataUrl);
        }
        setIsSignatureModalOpen(false);
    };

    const handleShareDocumentWA = () => {
        if (!documentToView || !clientForDetail) return;

        let text = '';
        const phone = clientForDetail.whatsapp || clientForDetail.phone;

        if (documentToView.type === 'invoice') {
            const proj = documentToView.project;
            text = `Halo ${clientForDetail.name}, berikut tagihan untuk acara ${proj.projectName}.\n\nTotal Biaya: ${formatCurrency(proj.totalCost)}\nSudah Dibayar: ${formatCurrency(proj.amountPaid)}\nSisa Tagihan: ${formatCurrency(proj.totalCost - proj.amountPaid)}\n\nTerima kasih.`;
        } else if (documentToView.type === 'receipt') {
            const tx = documentToView.transaction;
            const isExpense = tx.type === TransactionType.EXPENSE;
            if (isExpense) {
                text = `Tanda Terima Pengeleluaran:\nPembayaran fee sebesar ${formatCurrency(tx.amount)} untuk ${tx.description} telah berhasil dicatat.`;
            } else {
                const projName = tx.projectId ? projects.find(p => p.id === tx.projectId)?.projectName || '' : '';
                text = `Tanda Terima:\nTerima kasih ${clientForDetail.name}, pembayaran sebesar ${formatCurrency(tx.amount)} untuk acara ${projName} telah kami terima.`;
            }
        }

        window.open(generateWhatsAppLink(phone, text), '_blank');
    };

    const handleDownloadPDF = () => {
        if (!documentToView) return;

        const elementId = documentToView.type === 'invoice' ? 'invoice-document' : 'receipt-document';
        const element = document.getElementById(elementId);

        if (!element) {
            showNotification('Gagal menemukan elemen dokumen untuk diunduh.');
            return;
        }

        const opt = {
            margin: 10,
            filename: documentToView.type === 'invoice'
                ? `Invoice-${documentToView.project.projectName.replace(/\s+/g, '_')}.pdf`
                : `Tanda_Terima-${documentToView.transaction.id.slice(0, 8)}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                windowWidth: 1200,
                onclone: (clonedDoc: any) => {
                    const el = clonedDoc.getElementById(elementId);
                    if (el) el.classList.add('force-desktop');
                }
            },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        html2pdf().from(element).set(opt).save();
    };

    const renderDocumentBody = () => {
        if (!documentToView || !clientForDetail) return null;
        const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

        if (documentToView.type === 'invoice') {
            return (
                <InvoiceDocument
                    id="invoice-document"
                    project={documentToView.project}
                    profile={userProfile}
                    packages={packages}
                    client={clientForDetail}
                />
            );
        } else if (documentToView.type === 'receipt') {
            const transaction = documentToView.transaction;
            const project = transaction.projectId ? projects.find(p => p.id === transaction.projectId) : null;
            const isExpense = transaction.type === TransactionType.EXPENSE;
            const documentTitle = isExpense ? 'Bukti Pengeluaran' : 'Tanda Terima';
            const statusText = isExpense ? 'Telah Dibayarkan Secara Sah' : 'Telah Diterima Secara Sah';
            const statusColor = isExpense ? 'text-blue-600' : 'text-green-600';

            let targetName = clientForDetail.name;
            if (isExpense) {
                if (transaction.category === 'Gaji Freelancer') {
                    const match = transaction.description?.match(/Gaji Vendor - (.+?) \(/);
                    if (match && match[1]) {
                        targetName = match[1];
                    } else {
                        targetName = 'Vendor / Tim';
                    }
                } else {
                    targetName = 'Pihak Lain';
                }
            }

            return (
                <div id="receipt-document" className="p-4 sm:p-8 bg-white border border-slate-200 shadow-xl mx-auto max-w-2xl font-sans text-slate-900 print:shadow-none print:border-none print:bg-white print:max-w-none">
                    <div className="flex justify-between items-start mb-10 pb-6 border-b-2 border-brand-accent print:mb-6 print:pb-4">
                        <div>
                            {userProfile.logoBase64 ? (
                                <img src={userProfile.logoBase64} alt="Company Logo" className="h-16 object-contain mb-3" />
                            ) : (
                                <h2 className="text-xl font-bold text-brand-accent mb-1">{userProfile.companyName}</h2>
                            )}
                            <p className="text-[11px] text-slate-500">{userProfile.address}</p>
                        </div>
                        <div className="text-right">
                            <h1 className="text-2xl font-black text-slate-400 uppercase tracking-widest leading-none">{documentTitle}</h1>
                            <p className="text-xs font-mono text-slate-500 mt-2">#{transaction.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-lg mb-8 border border-slate-100 print:bg-white print:border-slate-200">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status Pembayaran</p>
                        <p className={`text-xs font-bold ${statusColor} uppercase mb-3`}>{statusText}</p>
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(transaction.amount)}</p>
                        <p className="text-xs text-slate-500 mt-2">Tanggal: <span className="font-bold text-slate-700">{formatDate(transaction.date)}</span></p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 mb-10">
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                                <span className="text-slate-500">{isExpense ? 'Dibayarkan Kepada' : 'Diterima Dari'}</span>
                                <span className="font-bold text-slate-800">{targetName}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                                <span className="text-slate-500">Metode Pembayaran</span>
                                <span className="font-bold text-slate-800">{transaction.method}</span>
                            </div>
                            <div className="py-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tujuan Pembayaran</p>
                                <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded">{transaction.description}</p>
                            </div>
                            {project && (
                                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-[12px] text-blue-700">
                                    <p className="font-bold mb-1">Status Acara: {project.projectName}</p>
                                    <div className="flex justify-between">
                                        <span>Total Tagihan: {formatCurrency(project.totalCost)}</span>
                                        <span className="font-bold">Sisa: {formatCurrency(project.totalCost - project.amountPaid)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between items-end pt-8 border-t border-slate-100">
                        <div className="text-[10px] text-slate-400 italic">
                            Dicetak otomatis oleh {userProfile.companyName}
                        </div>
                        <div className="text-center w-48 shrink-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Penerima,</p>
                            <div className="h-20 flex items-center justify-center mb-2">
                                {transaction.vendorSignature ? (
                                    <img src={transaction.vendorSignature} alt="Tanda Tangan" className="max-h-full object-contain" />
                                ) : (
                                    <div className="h-px w-24 bg-slate-200 mx-auto mt-10" />
                                )}
                            </div>
                            <p className="text-sm font-bold text-slate-800 underline underline-offset-4 decoration-slate-300">({userProfile.authorizedSigner || userProfile.companyName})</p>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Data Pengantin" subtitle="Kelola semua pengantin, acara, dan pembayaran mereka.">
                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2 sm:gap-3 mt-4 sm:mt-0">
                    <button onClick={() => setIsInfoModalOpen(true)} className="button-secondary justify-center text-xs sm:text-sm py-2">Pelajari Halaman Ini</button>
                    <button onClick={() => setIsBookingFormShareModalOpen(true)} className="button-secondary inline-flex items-center justify-center gap-2 text-xs sm:text-sm py-2">
                        <Share2Icon className="w-4 h-4" /> Bagikan Form Booking
                    </button>
                    <button onClick={() => handleOpenModal('add')} className="button-primary inline-flex items-center justify-center gap-2 text-xs sm:text-sm py-2">
                        <PlusIcon className="w-5 h-5" /> Tambah Pengantin & Acara
                    </button>
                </div>
            </PageHeader>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="transition-transform duration-200 hover:scale-105">
                    <StatCard
                        icon={<UsersIcon className="w-6 h-6" />}
                        title="Total Pengantin"
                        value={clientStats.totalClients.toString()}
                        subtitle="Semua pengantin terdaftar"
                        colorVariant="blue"
                        description={`Total pengantin yang terdaftar dalam sistem Anda.\n\nTotal: ${clientStats.totalClients} pengantin\n\nPengantin adalah aset berharga bisnis Anda. Jaga hubungan baik untuk repeat business dan referral.`}
                        onClick={() => setActiveStatModal('total')}
                    />
                </div>
                <div className="transition-transform duration-200 hover:scale-105">
                    <StatCard
                        icon={<TrendingUpIcon className="w-6 h-6" />}
                        title="Pengantin Aktif"
                        value={clientStats.activeClients.toString()}
                        subtitle="Pengantin dengan acara berjalan"
                        colorVariant="green"
                        description={`Pengantin yang memiliki acara aktif saat ini.\n\nAktif: ${clientStats.activeClients} pengantin\n\nFokus pada pengantin aktif untuk memastikan kepuasan dan penyelesaian acara tepat waktu.`}
                        onClick={() => setActiveStatModal('active')}
                    />
                </div>
                <div className="transition-transform duration-200 hover:scale-105">
                    <StatCard
                        icon={<AlertCircleIcon className="w-6 h-6" />}
                        title="Total Piutang"
                        value={clientStats.totalReceivables}
                        subtitle="Tagihan belum terbayar"
                        colorVariant="orange"
                        description={`Total piutang dari semua pengantin yang belum dibayar.\n\nPiutang: ${clientStats.totalReceivables}\n\nSegera tagih untuk menjaga cash flow bisnis Anda.`}
                        onClick={() => setActiveStatModal('receivables')}
                    />
                </div>
                <div className="transition-transform duration-200 hover:scale-105">
                    <StatCard
                        icon={<MapPinIcon className="w-6 h-6" />}
                        title="Lokasi Teratas"
                        value={clientStats.mostFrequentLocation}
                        description={`Lokasi yang paling sering dipilih oleh pengantin Anda.\n\nTeratas: ${clientStats.mostFrequentLocation}\n\nInformasi ini membantu Anda memahami area market utama.`}
                        onClick={() => setActiveStatModal('location')}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                <div className="lg:col-span-2 bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                    <h3 className="font-bold text-lg text-gradient mb-4">Distribusi Status Pengantin</h3>
                    <DonutChart data={clientStatusDonutData} />
                </div>
                <div className="lg:col-span-3">
                    <NewClientsChart data={newClientsChartData} />
                </div>
            </div>

            <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                <div className="p-4 border-b border-brand-border">
                    <h3 className="font-semibold text-brand-text-light">Rekap Pengantin Belum Lunas ({clientsWithDues.length})</h3>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden p-4 space-y-3">
                    {clientsWithDues.map(client => (
                        <div key={client.id} className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-brand-text-light leading-tight">{client.name}</p>
                                    <p className="text-[11px] text-brand-text-secondary">{client.email}</p>
                                </div>
                                <button
                                    onClick={() => setBillingChatModal(client)}
                                    className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white !text-xs !px-3 !py-2 rounded-lg transition-colors"
                                >
                                    <WhatsappIcon className="w-4 h-4" />
                                    Tagih
                                </button>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-brand-text-secondary">Total Nilai</span>
                                <span className="text-right">{formatCurrency(client.totalAcaraValue)}</span>
                                <span className="text-brand-text-secondary">Sisa Tagihan</span>
                                <span className="text-right font-bold text-brand-danger">{formatCurrency(client.balanceDue)}</span>
                                <span className="text-brand-text-secondary">Acara Terbaru</span>
                                <span className="text-right">{client.mostRecentProject?.projectName || '-'}</span>
                            </div>
                        </div>
                    ))}
                    {clientsWithDues.length === 0 && (
                        <p className="text-center py-8 text-brand-text-secondary">Luar biasa! Semua pengantin sudah lunas.</p>
                    )}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="px-6 py-4 font-medium tracking-wider">Pengantin</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right">Total Paket</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-right">Sisa Tagihan</th>
                                <th className="px-6 py-4 font-medium tracking-wider">Acara Terbaru</th>
                                <th className="px-6 py-4 font-medium tracking-wider text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {clientsWithDues.map(client => (
                                <tr key={client.id} className="hover:bg-brand-bg transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-brand-text-light">{client.name}</p>
                                        <p className="text-xs text-brand-text-secondary">{client.email}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(client.totalAcaraValue)}</td>
                                    <td className="px-6 py-4 text-right font-bold text-brand-danger">{formatCurrency(client.balanceDue)}</td>
                                    <td className="px-6 py-4">{client.mostRecentProject?.projectName || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => setBillingChatModal(client)}
                                            className="p-2 text-green-500 hover:text-green-600 rounded-full hover:bg-green-500/10"
                                            title="Tagih via WhatsApp"
                                        >
                                            <WhatsappIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {clientsWithDues.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-brand-text-secondary">
                                        Luar biasa! Semua pengantin sudah lunas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-brand-surface p-4 rounded-xl shadow-lg border border-brand-border flex flex-col md:flex-row justify-between items-center gap-4 mobile-filter-section">
                <div className="input-group flex-grow !mt-0 w-full md:w-auto">
                    <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5" placeholder=" " />
                    <label className="input-label">Cari pengantin (nama, email, telepon)...</label>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto search-filter-row">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full">
                        <option value="Semua Status">Semua Status</option>
                        {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={handleDownloadClients} className="button-secondary p-2.5 flex-shrink-0" title="Unduh data pengantin"><DownloadIcon className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                <div className="p-3 md:p-4 border-b border-brand-border">
                    <button onClick={() => setActiveSectionOpen(p => !p)} className="w-full flex justify-between items-center">
                        <h3 className="text-sm md:text-base font-semibold text-brand-text-light">Pengantin Aktif ({filteredClientData.filter(c => c.status === ClientStatus.ACTIVE).length})</h3>
                        {activeSectionOpen ? <ArrowUpIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary" /> : <ArrowDownIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary" />}
                    </button>
                </div>
                {activeSectionOpen && (
                    <>
                        {/* Mobile cards for Active Clients */}
                        <div className="md:hidden p-3 space-y-2">
                            {filteredClientData.filter(c => c.status === ClientStatus.ACTIVE).map(client => (
                                <div key={client.id} className="rounded-xl bg-white/5 border border-brand-border p-3 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-brand-text-light leading-tight truncate">{client.name}</p>
                                            <p className="text-[10px] text-brand-text-secondary mt-0.5 truncate">{client.email}</p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {client.overallPaymentStatus && (
                                                <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded-full ${getPaymentStatusClass(client.overallPaymentStatus)}`}>{client.overallPaymentStatus}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-xs">
                                        <span className="text-brand-text-secondary text-[10px]">Total Nilai</span>
                                        <span className="text-right font-semibold text-xs">{formatCurrency(client.totalAcaraValue)}</span>
                                        <span className="text-brand-text-secondary text-[10px]">Sisa Tagihan</span>
                                        <span className="text-right font-bold text-xs text-brand-danger">{formatCurrency(client.balanceDue)}</span>
                                        <span className="text-brand-text-secondary text-[10px]">Acara Terbaru</span>
                                        <span className="text-right text-xs truncate">{client.mostRecentProject?.projectName || '-'}</span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-brand-border/50 flex justify-end gap-1.5">
                                        <button onClick={() => { setClientForDetail(client); setIsDetailModalOpen(true); }} className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors" title="Detail"><EyeIcon className="w-3 h-3 text-white" /></button>
                                        <button onClick={() => handleOpenModal('edit', client, client.mostRecentProject || undefined)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors" title="Edit"><PencilIcon className="w-3 h-3 text-white" /></button>
                                        <button onClick={() => handleDeleteClient(client.id)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 transition-colors" title="Hapus"><Trash2Icon className="w-3 h-3 text-white" /></button>
                                        <button onClick={() => handleOpenModal('add', client)} className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors" title="Tambah"><PlusIcon className="w-3 h-3 text-white" /></button>
                                    </div>
                                </div>
                            ))}
                            {filteredClientData.filter(c => c.status === ClientStatus.ACTIVE).length === 0 && (
                                <p className="text-center py-8 text-xs text-brand-text-secondary">Tidak ada pengantin aktif.</p>
                            )}
                        </div>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-brand-text-secondary uppercase">
                                    <tr>
                                        <th className="px-6 py-4 font-medium tracking-wider">Pengantin</th>
                                        <th className="px-6 py-4 font-medium tracking-wider">Total Paket</th>
                                        <th className="px-6 py-4 font-medium tracking-wider">Sisa Tagihan</th>
                                        <th className="px-6 py-4 font-medium tracking-wider">Acara Terbaru</th>
                                        <th className="px-6 py-4 font-medium tracking-wider text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-border">
                                    {filteredClientData.filter(c => c.status === ClientStatus.ACTIVE).map(client => (
                                        <tr key={client.id} className="hover:bg-brand-bg transition-colors">
                                            <td className="px-6 py-4"><p className="font-semibold text-brand-text-light">{client.name}</p><p className="text-xs text-brand-text-secondary">{client.email}</p></td>
                                            <td className="px-6 py-4 font-semibold">{formatCurrency(client.totalAcaraValue)}</td>
                                            <td className="px-6 py-4 font-semibold text-red-400">{formatCurrency(client.balanceDue)}</td>
                                            <td className="px-6 py-4"><p>{client.mostRecentProject?.projectName || '-'}</p>{client.overallPaymentStatus && <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusClass(client.overallPaymentStatus)}`}>{client.overallPaymentStatus}</span>}</td>
                                            <td className="px-6 py-4"><div className="flex items-center justify-center space-x-1"><button onClick={() => { setClientForDetail(client); setIsDetailModalOpen(true); }} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors" title="Detail Pengantin"><EyeIcon className="w-5 h-5 text-white" /></button><button onClick={() => handleOpenModal('edit', client, client.mostRecentProject || undefined)} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors" title="Edit Pengantin"><PencilIcon className="w-5 h-5 text-white" /></button><button onClick={() => handleDeleteClient(client.id)} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-red-600 hover:bg-red-700 transition-colors" title="Hapus Pengantin"><Trash2Icon className="w-5 h-5 text-white" /></button><button onClick={() => handleOpenModal('add', client)} className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors" title="Tambah Acara Baru"><PlusIcon className="w-5 h-5 text-white" /></button></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                <div className="p-3 md:p-4 border-t border-brand-border">
                    <button onClick={() => setInactiveSectionOpen(p => !p)} className="w-full flex justify-between items-center">
                        <h3 className="text-sm md:text-base font-semibold text-brand-text-light">Pengantin Tidak Aktif / Prospek Hilang ({filteredClientData.filter(c => c.status !== ClientStatus.ACTIVE).length})</h3>
                        {inactiveSectionOpen ? <ArrowUpIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary" /> : <ArrowDownIcon className="w-4 h-4 md:w-5 md:h-5 text-brand-text-secondary" />}
                    </button>
                </div>
                {inactiveSectionOpen && (
                    <>
                        {/* Mobile cards for Inactive Clients */}
                        <div className="md:hidden p-3 space-y-2">
                            {filteredClientData.filter(c => c.status !== ClientStatus.ACTIVE).map(client => (
                                <div key={client.id} className="rounded-xl bg-white/5 border border-brand-border p-3 shadow-sm opacity-70 hover:opacity-90 transition-all">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-brand-text-light leading-tight truncate">{client.name}</p>
                                            <p className="text-[10px] text-brand-text-secondary mt-0.5 truncate">{client.email}</p>
                                        </div>
                                        <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-gray-700 text-gray-300 flex-shrink-0">{client.status}</span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-y-1.5 text-xs">
                                        <span className="text-brand-text-secondary text-[10px]">Kontak Terakhir</span>
                                        <span className="text-right text-xs">{new Date(client.lastContact).toLocaleDateString('id-ID')}</span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-brand-border/50 flex justify-end gap-1.5">
                                        <button onClick={() => { setClientForDetail(client); setIsDetailModalOpen(true); }} className="button-secondary !text-[10px] !px-2 !py-1.5" title="Detail"><EyeIcon className="w-3 h-3" /></button>
                                        <button onClick={() => handleOpenModal('edit', client, client.mostRecentProject || undefined)} className="button-secondary !text-[10px] !px-2 !py-1.5" title="Edit"><PencilIcon className="w-3 h-3" /></button>
                                        <button onClick={() => handleDeleteClient(client.id)} className="button-secondary !text-[10px] !px-2 !py-1.5 !text-brand-danger !border-brand-danger hover:!bg-brand-danger/10" title="Hapus"><Trash2Icon className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            ))}
                            {filteredClientData.filter(c => c.status !== ClientStatus.ACTIVE).length === 0 && (
                                <p className="text-center py-6 text-sm text-brand-text-secondary">Tidak ada pengantin tidak aktif.</p>
                            )}
                        </div>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-brand-text-secondary uppercase"><tr><th className="px-6 py-4 font-medium tracking-wider">Pengantin</th><th className="px-6 py-4 font-medium tracking-wider">Status</th><th className="px-6 py-4 font-medium tracking-wider">Kontak Terakhir</th><th className="px-6 py-4 font-medium tracking-wider text-center">Aksi</th></tr></thead>
                                <tbody className="divide-y divide-brand-border">
                                    {filteredClientData.filter(c => c.status !== ClientStatus.ACTIVE).map(client => (
                                        <tr key={client.id} className="hover:bg-brand-bg transition-colors opacity-70">
                                            <td className="px-6 py-4"><p className="font-semibold text-brand-text-light">{client.name}</p><p className="text-xs text-brand-text-secondary">{client.email}</p></td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">{client.status}</span></td>
                                            <td className="px-6 py-4">{new Date(client.lastContact).toLocaleDateString('id-ID')}</td>
                                            <td className="px-6 py-4"><div className="flex items-center justify-center space-x-1"><button onClick={() => { setClientForDetail(client); setIsDetailModalOpen(true); }} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Detail Pengantin"><EyeIcon className="w-5 h-5" /></button><button onClick={() => handleOpenModal('edit', client, client.mostRecentProject || undefined)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit Pengantin"><PencilIcon className="w-5 h-5" /></button><button onClick={() => handleDeleteClient(client.id)} className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-full" title="Hapus Pengantin"><Trash2Icon className="w-5 h-5" /></button></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={modalMode === 'add' ? (selectedClient ? 'Tambah Acara Baru' : 'Tambah Pengantin & Acara Baru') : 'Edit Pengantin & Acara'} size="4xl">
                <ClientForm formData={formData} setFormData={setFormData} handleFormChange={handleFormChange} handleFormSubmit={handleFormSubmit} handleCloseModal={handleCloseModal} packages={packages} addOns={addOns} userProfile={userProfile} modalMode={modalMode} cards={cards} promoCodes={promoCodes} />
            </Modal>

            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Detail Pengantin: ${clientForDetail?.name}`} size="4xl">
                <ClientDetailModal client={clientForDetail} projects={projects} transactions={transactions} packages={packages} onClose={() => setIsDetailModalOpen(false)} onEditClient={(client) => handleOpenModal('edit', client, projects.find(p => p.clientId === client.id))} onDeleteClient={handleDeleteClient} onViewReceipt={(tx) => setDocumentToView({ type: 'receipt', transaction: tx })} onViewInvoice={(proj) => setDocumentToView({ type: 'invoice', project: proj })} handleNavigation={handleNavigation} onRecordPayment={handleRecordPayment} cards={cards} onSharePortal={handleOpenQrModal} onDeleteProject={handleDeleteProject} />
            </Modal>


            <Modal isOpen={!!documentToView} onClose={() => setDocumentToView(null)} title={documentToView ? (documentToView.type === 'invoice' ? 'Invoice' : 'Tanda Terima') : ''} size="3xl">
                <div id="invoice" className="printable-area overflow-y-auto">{renderDocumentBody()}</div>
                <div className="mt-6 flex justify-end items-center non-printable space-x-3 border-t border-brand-border pt-4 px-2">
                    {documentToView && (
                        (documentToView.type === 'invoice'
                            ? !documentToView.project?.invoiceSignature
                            : !documentToView.transaction?.vendorSignature
                        )
                    ) && (
                            <button type="button" onClick={() => {
                                if (userProfile?.signatureBase64) {
                                    handleSaveSignature(userProfile.signatureBase64);
                                } else {
                                    setIsSignatureModalOpen(true);
                                }
                            }} className="button-secondary p-2.5">Tanda Tangani</button>
                        )}
                    <button
                        onClick={handleDownloadPDF}
                        className="button-secondary inline-flex items-center gap-2 p-2.5"
                        title="Unduh sebagai PDF"
                    >
                        <DownloadIcon className="w-5 h-5 text-brand-accent" />
                        <span className="hidden sm:inline">Unduh PDF</span>
                    </button>
                    <button
                        onClick={handleShareDocumentWA}
                        className="button-primary inline-flex items-center gap-2 p-2.5 !bg-green-500 hover:!bg-green-600"
                        title="Kirim via WhatsApp"
                    >
                        <WhatsappIcon className="w-5 h-5 text-white" />
                        <span className="hidden sm:inline">Kirim ke WA</span>
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isBookingFormShareModalOpen} onClose={() => setIsBookingFormShareModalOpen(false)} title="Bagikan Formulir Booking Publik" size="sm">
                <div className="text-center p-4">
                    <QrCodeDisplay value={bookingFormUrl} size={200} wrapperId="clients-booking-form-qrcode" />
                    <p className="text-xs text-brand-text-secondary mt-4 break-all">{bookingFormUrl}</p>
                    <div className="flex items-center gap-2 mt-6">
                        <button onClick={copyBookingLinkToClipboard} className="button-secondary w-full">Salin Tautan</button>
                        <button onClick={downloadBookingQrCode} className="button-primary w-full">Unduh QR</button>
                    </div>
                </div>
            </Modal>
            {qrModalContent && (
                <Modal isOpen={!!qrModalContent} onClose={() => setQrModalContent(null)} title={qrModalContent.title} size="sm">
                    <div className="text-center p-4">
                        <QrCodeDisplay value={qrModalContent.url} size={200} wrapperId="client-portal-qrcode" />
                        <p className="text-xs text-brand-text-secondary mt-4 break-all">{qrModalContent.url}</p>
                        <div className="flex items-center gap-2 mt-6">
                            <button onClick={() => { navigator.clipboard.writeText(qrModalContent.url); showNotification('Tautan berhasil disalin!'); }} className="button-secondary w-full">Salin Tautan</button>
                            <button onClick={() => {
                                const canvas = document.querySelector('#client-portal-qrcode canvas') as HTMLCanvasElement;
                                if (canvas) {
                                    const link = document.createElement('a');
                                    link.download = 'portal-qr-code.png';
                                    link.href = canvas.toDataURL();
                                    link.click();
                                }
                            }} className="button-primary w-full">Unduh QR</button>
                        </div>
                    </div>
                </Modal>
            )}
            <Modal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} title="Bubuhkan Tanda Tangan Anda">
                <SignaturePad onClose={() => setIsSignatureModalOpen(false)} onSave={handleSaveSignature} />
            </Modal>
            {billingChatModal && (
                <BillingChatModal
                    isOpen={!!billingChatModal}
                    onClose={() => setBillingChatModal(null)}
                    client={billingChatModal}
                    projects={projects}
                    userProfile={userProfile}
                    showNotification={showNotification}
                />
            )}

            {/* StatCard Detail Modals */}
            <StatCardModal
                isOpen={activeStatModal === 'total'}
                onClose={() => setActiveStatModal(null)}
                icon={<UsersIcon className="w-6 h-6" />}
                title="Total Pengantin"
                value={clientStats.totalClients.toString()}
                subtitle="Semua pengantin terdaftar"
                colorVariant="blue"
                description={`Total pengantin yang terdaftar dalam sistem Anda.\n\nTotal: ${clientStats.totalClients} pengantin\n\nPengantin adalah aset berharga bisnis Anda. Jaga hubungan baik untuk repeat business dan referral.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Daftar Pengantin</h4>
                    {clients.slice(0, 10).map(client => {
                        const clientProjects = projects.filter(p => p.clientId === client.id);
                        return (
                            <div key={client.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold text-brand-text-light text-sm">{client.name}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${client.status === ClientStatus.ACTIVE ? 'bg-green-500/20 text-green-500' :
                                        client.status === ClientStatus.INACTIVE ? 'bg-gray-500/20 text-gray-500' :
                                            'bg-blue-500/20 text-blue-500'
                                        }`}>{client.status}</span>
                                </div>
                                <p className="text-xs text-brand-text-secondary">{client.email}</p>
                                <p className="text-xs text-brand-text-secondary mt-1">{clientProjects.length} acara</p>
                            </div>
                        );
                    })}
                    {clients.length > 10 && (
                        <p className="text-xs text-brand-text-secondary text-center pt-2">Dan {clients.length - 10} pengantin lainnya...</p>
                    )}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'active'}
                onClose={() => setActiveStatModal(null)}
                icon={<TrendingUpIcon className="w-6 h-6" />}
                title="Pengantin Aktif"
                value={clientStats.activeClients.toString()}
                subtitle="Pengantin dengan acara berjalan"
                colorVariant="green"
                description={`Pengantin yang memiliki acara aktif saat ini.\n\nAktif: ${clientStats.activeClients} pengantin\n\nFokus pada pengantin aktif untuk memastikan kepuasan dan penyelesaian acara tepat waktu.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Pengantin dengan Acara Aktif</h4>
                    {clients.filter(c => projects.some(p => p.clientId === c.id && p.status !== 'Selesai' && p.status !== 'Dibatalkan')).map(client => {
                        const activeProjects = projects.filter(p => p.clientId === client.id && p.status !== 'Selesai' && p.status !== 'Dibatalkan');
                        return (
                            <div key={client.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                                <p className="font-semibold text-brand-text-light text-sm">{client.name}</p>
                                <p className="text-xs text-brand-text-secondary mt-1">{activeProjects.length} acara aktif</p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {activeProjects.slice(0, 3).map(p => (
                                        <span key={p.id} className="text-xs px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent">
                                            {p.projectName}
                                        </span>
                                    ))}
                                    {activeProjects.length > 3 && (
                                        <span className="text-xs text-brand-text-secondary">+{activeProjects.length - 3} lagi</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'receivables'}
                onClose={() => setActiveStatModal(null)}
                icon={<AlertCircleIcon className="w-6 h-6" />}
                title="Total Piutang"
                value={clientStats.totalReceivables}
                subtitle="Tagihan belum terbayar"
                colorVariant="orange"
                description={`Total piutang dari semua pengantin yang belum dibayar.\n\nPiutang: ${clientStats.totalReceivables}\n\nSegera tagih untuk menjaga cash flow bisnis Anda.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Pengantin dengan Piutang</h4>
                    {clients.map(client => {
                        const clientProjects = projects.filter(p => p.clientId === client.id);
                        const totalReceivable = clientProjects.reduce((sum, p) => sum + (p.totalCost - p.amountPaid), 0);
                        if (totalReceivable <= 0) return null;
                        return (
                            <div key={client.id} className="p-3 bg-brand-bg rounded-lg hover:bg-brand-input transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="font-semibold text-brand-text-light text-sm">{client.name}</p>
                                    <span className="text-sm text-orange-500 font-semibold">{formatCurrency(totalReceivable)}</span>
                                </div>
                                <p className="text-xs text-brand-text-secondary">{clientProjects.filter(p => (p.totalCost - p.amountPaid) > 0).length} acara dengan piutang</p>
                            </div>
                        );
                    }).filter(Boolean)}
                </div>
            </StatCardModal>

            <StatCardModal
                isOpen={activeStatModal === 'location'}
                onClose={() => setActiveStatModal(null)}
                icon={<MapPinIcon className="w-6 h-6" />}
                title="Lokasi Teratas"
                value={clientStats.mostFrequentLocation}
                subtitle="Lokasi paling sering dipilih"
                colorVariant="purple"
                description={`Lokasi yang paling sering dipilih oleh pengantin Anda.\n\nTeratas: ${clientStats.mostFrequentLocation}\n\nInformasi ini membantu Anda memahami area market utama.`}
            >
                <div className="space-y-3">
                    <h4 className="font-semibold text-brand-text-light border-b border-brand-border pb-2">Distribusi Lokasi Pengantin</h4>
                    {Object.entries(
                        clients.reduce((acc, c) => {
                            // Get location from client's projects
                            const clientProjects = projects.filter(p => p.clientId === c.id);
                            const loc = clientProjects.length > 0 && clientProjects[0].location ? clientProjects[0].location : 'Tidak Diketahui';
                            acc[loc] = (acc[loc] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>)
                    ).sort(([, a], [, b]) => b - a).map(([location, count]) => (
                        <div key={location} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                            <p className="font-semibold text-brand-text-light text-sm">{location}</p>
                            <span className="text-sm text-brand-accent font-semibold">{count} pengantin</span>
                        </div>
                    ))}
                </div>
            </StatCardModal>
        </div>
    );
};

export default Clients;