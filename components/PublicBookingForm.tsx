import React, { useState, useMemo, useRef, useEffect } from 'react';
import { REGIONS } from '../types';
import { Client, Project, Package, AddOn, Transaction, Profile, Card, FinancialPocket, ClientStatus, PaymentStatus, TransactionType, PromoCode, Lead, LeadStatus, ContactChannel, ClientType, PublicBookingFormProps, BookingStatus, ViewType } from '../types';
import Modal from './Modal';
import { MessageSquareIcon } from '../constants';
import { createClient } from '../services/clients';
import { createProject } from '../services/projects';
import { createLead as createLeadRow, updateLead as updateLeadRow } from '../services/leads';
import { uploadDpProof } from '../services/storage';
import { createTransaction } from '../services/transactions';
import RupiahInput from './RupiahInput';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}
const titleCase = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());

const initialFormState = {
    clientName: '',
    email: '',
    phone: '',
    instagram: '',
    projectType: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    packageId: '',
    selectedAddOnIds: [] as string[],
    promoCode: '',
    dp: '',
    dpPaymentRef: '', // Client adds this for reference
    transportCost: '',
    durationSelection: '' as string,
    unitPrice: undefined as number | undefined,
    address: '',
};

const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});


const PublicBookingForm: React.FC<PublicBookingFormProps> = ({
    setClients, setProjects, packages, addOns, setTransactions, userProfile, cards, setCards, pockets, setPockets, promoCodes, setPromoCodes, showNotification, leads, setLeads, addNotification
}) => {
    const [formData, setFormData] = useState({ ...initialFormState, projectType: userProfile.projectTypes[0] || '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [promoFeedback, setPromoFeedback] = useState({ type: '', message: '' });
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);
    const [leadId, setLeadId] = useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [isLeadDataLoaded, setIsLeadDataLoaded] = useState(false);
    const [isPackagesLoading, setIsPackagesLoading] = useState(true);

    // CSRF Protection: Honeypot field (invisible to humans, visible to bots)
    const [honeypot, setHoneypot] = useState('');

    // Rate limiting: Prevent rapid submissions
    const [lastSubmitTime, setLastSubmitTime] = useState(0);
    const SUBMIT_COOLDOWN = 5000; // 5 seconds

    // Regions discovery for landing gate (must be outside conditional to respect hooks rules)
    const existingRegions = useMemo(() => {
        const set = new Set<string>();
        for (const p of packages) {
            if (p.region && String(p.region).trim() !== '') set.add(String(p.region));
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [packages]);
    const unionRegions = useMemo(() => {
        const baseVals = REGIONS.map(r => r.value);
        const extra = existingRegions.filter(er => !baseVals.includes(er));
        return [
            ...REGIONS.map(r => ({ value: r.value, label: r.label })),
            ...extra.map(er => ({ value: er, label: titleCase(er) })),
        ];
    }, [existingRegions]);

    // Filter Packages by selectedRegion (strict)
    const filteredPackages = useMemo(() => {
        if (!selectedRegion) {
            if (import.meta.env.DEV) {
                console.log('No region selected, returning empty packages');
            }
            return [] as Package[];
        }
        const filtered = packages.filter(p => {
            const pkgRegion = p.region ? String(p.region).toLowerCase() : '';
            return pkgRegion === selectedRegion.toLowerCase();
        });
        if (import.meta.env.DEV) {
            console.log(`Filtered ${filtered.length} packages for region:`, selectedRegion);
        }
        return filtered;
    }, [packages, selectedRegion]);

    // When filteredPackages changes (data loads after region set), reset packageId if current
    // selection is no longer valid, and mark loading as done once packages arrive
    useEffect(() => {
        if (selectedRegion) {
            setIsPackagesLoading(false);
            setFormData(prev => {
                if (prev.packageId && !filteredPackages.find(p => p.id === prev.packageId)) {
                    return { ...prev, packageId: '', durationSelection: '', unitPrice: undefined };
                }
                return prev;
            });
        }
    }, [filteredPackages, selectedRegion]);

    // Filter Add-Ons by selectedRegion (strict)
    const filteredAddOns = useMemo(() => {
        if (!selectedRegion) return [] as AddOn[];
        return addOns.filter(a => {
            const addonRegion = a.region ? String(a.region).toLowerCase() : '';
            return addonRegion === selectedRegion.toLowerCase();
        });
    }, [addOns, selectedRegion]);

    // Parse region from URL only once on mount
    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('?')) {
            const urlParams = new URLSearchParams(hash.substring(hash.indexOf('?')));
            const regionParam = urlParams.get('region');
            if (regionParam) {
                const normalizedRegion = regionParam.toLowerCase();
                setSelectedRegion(normalizedRegion);
                if (import.meta.env.DEV) {
                    console.log('Region selected from URL:', normalizedRegion);
                }
            }
        }
    }, []);

    // Handle lead ID separately when leads data is available (only once)
    useEffect(() => {
        if (isLeadDataLoaded || leads.length === 0) return;

        const hash = window.location.hash;
        if (hash.includes('?')) {
            const urlParams = new URLSearchParams(hash.substring(hash.indexOf('?')));
            const id = urlParams.get('leadId');
            if (id) {
                setLeadId(id);
                const lead = leads.find(l => l.id === id);
                if (lead) {
                    setFormData(prev => ({
                        ...prev,
                        clientName: lead.name,
                        phone: lead.whatsapp || '',
                        location: lead.location,
                    }));
                    setIsLeadDataLoaded(true);
                }
            }
        }
    }, [leads, isLeadDataLoaded]);

    const template = userProfile.publicPageConfig?.template || 'classic';

    const formattedTerms = useMemo(() => {
        if (!userProfile.termsAndConditions) return null;
        return userProfile.termsAndConditions.split('\n').map((line, index) => {
            if (line.trim() === '') return <div key={index} className="h-4"></div>;
            const emojiRegex = /^(📜|📅|💰|📦|⏱|➕)\s/;
            if (emojiRegex.test(line)) {
                return <h3 key={index} className="text-lg font-semibold text-gradient mt-4 mb-2">{line}</h3>;
            }
            if (line.trim().startsWith('- ')) {
                return <p key={index} className="ml-4 text-brand-text-primary">{line.trim().substring(2)}</p>;
            }
            return <p key={index} className="text-brand-text-primary">{line}</p>;
        });
    }, [userProfile.termsAndConditions]);


    const { totalBeforeDiscount, discountAmount, totalProject, discountText } = useMemo(() => {
        const selectedPackage = filteredPackages.find(p => p.id === formData.packageId);
        let packagePrice = selectedPackage?.price || 0;
        const opts = selectedPackage?.durationOptions;
        if (opts && opts.length > 0) {
            const selected = opts.find(o => o.label === formData.durationSelection) || opts.find(o => o.default) || opts[0];
            packagePrice = selected?.price ?? (selectedPackage?.price || 0);
        }
        const addOnsPrice = filteredAddOns
            .filter(addon => formData.selectedAddOnIds.includes(addon.id))
            .reduce((sum, addon) => sum + addon.price, 0);

        const transportFee = Number(formData.transportCost) || 0;
        const totalBeforeDiscount = packagePrice + addOnsPrice;
        let discountAmount = 0;
        let discountText = '';

        const enteredPromoCode = formData.promoCode.toUpperCase().trim();
        if (enteredPromoCode) {
            const promoCode = promoCodes.find(p => p.code === enteredPromoCode && p.isActive);
            if (promoCode) {
                const isExpired = promoCode.expiryDate && new Date(promoCode.expiryDate) < new Date();
                const isMaxedOut = promoCode.maxUsage != null && promoCode.usageCount >= promoCode.maxUsage;

                if (!isExpired && !isMaxedOut) {
                    if (promoCode.discountType === 'percentage') {
                        discountAmount = (totalBeforeDiscount * promoCode.discountValue) / 100;
                        discountText = `${promoCode.discountValue}%`;
                    } else {
                        discountAmount = promoCode.discountValue;
                        discountText = formatCurrency(promoCode.discountValue);
                    }
                    setPromoFeedback({ type: 'success', message: `Kode promo diterapkan! Diskon ${discountText}.` });
                } else {
                    setPromoFeedback({ type: 'error', message: 'Kode promo tidak valid atau sudah habis.' });
                }
            } else {
                setPromoFeedback({ type: 'error', message: 'Kode promo tidak ditemukan.' });
            }
        } else {
            setPromoFeedback({ type: '', message: '' });
        }

        const totalProject = totalBeforeDiscount - discountAmount + transportFee;
        return { totalBeforeDiscount, discountAmount, totalProject, discountText };
    }, [formData.packageId, formData.selectedAddOnIds, formData.promoCode, formData.transportCost, formData.durationSelection, filteredPackages, filteredAddOns, promoCodes]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { id, checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, selectedAddOnIds: checked ? [...prev.selectedAddOnIds, id] : prev.selectedAddOnIds.filter(addOnId => addOnId !== id) }));
        } else {
            // If packageId changed, set unitPrice from package price or first duration option
            if (name === 'packageId') {
                const pkg = filteredPackages.find(p => p.id === value);
                if (pkg) {
                    const opts = pkg.durationOptions;
                    if (opts && opts.length > 0) {
                        const defaultOpt = opts.find(o => o.default) || opts[0];
                        setFormData(prev => ({
                            ...prev,
                            packageId: value,
                            durationSelection: defaultOpt.label,
                            unitPrice: Number(defaultOpt.price)
                        }));
                        return;
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            packageId: value,
                            unitPrice: Number(pkg.price)
                        }));
                        return;
                    }
                }
            }
            // If durationSelection changed, compute unitPrice from selected package's durationOptions
            if (name === 'durationSelection') {
                const pkg = filteredPackages.find(p => p.id === formData.packageId);
                const opts = pkg?.durationOptions;
                if (opts && opts.length > 0) {
                    const opt = opts.find(o => o.label === value) || opts.find(o => o.default) || opts[0];
                    if (opt) {
                        setFormData(prev => ({ ...prev, durationSelection: value, unitPrice: Number(opt.price) }));
                        return;
                    }
                }
            }
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                showNotification('Ukuran file tidak boleh melebihi 10MB.');
                e.target.value = ''; // Reset file input
                return;
            }
            setPaymentProof(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // CSRF Protection: Check honeypot
        if (honeypot !== '') {
            console.warn('[Security] Bot detected - honeypot triggered');
            return; // Silent fail for bots
        }

        // Rate limiting: Check cooldown
        const now = Date.now();
        if (now - lastSubmitTime < SUBMIT_COOLDOWN) {
            showNotification('Mohon tunggu beberapa detik sebelum mengirim lagi');
            return;
        }

        setLastSubmitTime(now);
        setIsSubmitting(true);
        try {

            const dpAmount = Number(formData.dp) || 0;
            const selectedPackage = filteredPackages.find(p => p.id === formData.packageId);
            if (!selectedPackage) {
                alert('Silakan pilih paket.');
                setIsSubmitting(false);
                return;
            }

            const destinationCard = cards.find(c => c.id !== 'CARD_CASH') || cards[0];
            if (!destinationCard) {
                alert('Sistem pembayaran tidak dikonfigurasi. Hubungi vendor.');
                setIsSubmitting(false);
                return;
            }

            let promoCodeAppliedId: string | undefined;
            if (discountAmount > 0 && formData.promoCode) {
                const promoCode = promoCodes.find(p => p.code === formData.promoCode.toUpperCase().trim());
                if (promoCode) promoCodeAppliedId = promoCode.id;
            }

            let dpProofUrl = '';
            if (paymentProof) {
                try {
                    // Upload ke Supabase Storage dan pakai URL-nya
                    dpProofUrl = await uploadDpProof(paymentProof);
                } catch (error) {
                    console.error("Error uploading DP proof:", error);
                    showNotification("Gagal mengunggah bukti transfer. Silakan coba lagi.");
                    setIsSubmitting(false);
                    return;
                }
            }

            const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
            const remainingPayment = totalProject - dpAmount;
            const transportFee = Number(formData.transportCost) || 0;

            // Create client in Supabase
            const createdClient = await createClient({
                name: formData.clientName,
                email: formData.email,
                phone: formData.phone,
                instagram: formData.instagram || undefined,
                since: new Date().toISOString().split('T')[0],
                status: ClientStatus.ACTIVE,
                clientType: ClientType.DIRECT,
                lastContact: new Date().toISOString(),
                portalAccessId: crypto.randomUUID(),
                address: formData.address || undefined,
            });

            // Create project in Supabase
            const createdProject = await createProject({
                projectName: `${formData.clientName} (${selectedPackage.name})`,
                clientName: createdClient.name,
                clientId: createdClient.id,
                projectType: formData.projectType,
                packageName: selectedPackage.name,
                date: formData.date,
                location: formData.location,
                status: 'Dikonfirmasi',
                bookingStatus: BookingStatus.BARU,
                totalCost: totalProject,
                amountPaid: dpAmount,
                paymentStatus: dpAmount > 0 ? (remainingPayment <= 0 ? PaymentStatus.LUNAS : PaymentStatus.DP_TERBAYAR) : PaymentStatus.BELUM_BAYAR,
                notes: `Referensi Pembayaran DP: ${formData.dpPaymentRef}${formData.durationSelection ? ` | Durasi dipilih: ${formData.durationSelection}` : ''}`,
                durationSelection: formData.durationSelection || undefined,
                unitPrice: formData.unitPrice !== undefined ? Number(formData.unitPrice) : undefined,
                promoCodeId: promoCodeAppliedId,
                discountAmount: discountAmount > 0 ? discountAmount : undefined,
                transportCost: transportFee > 0 ? transportFee : undefined,
                completedDigitalItems: [],
                dpProofUrl: dpProofUrl || undefined,
                address: formData.address || undefined,
                addOns: selectedAddOns.map(a => ({ id: a.id, name: a.name, price: a.price })),
            });

            if (leadId) {
                try {
                    const leadNote = `Dikonversi dari formulir booking. Pengantin ID: ${createdClient.id}`;
                    const updatedLead = await updateLeadRow(leadId, { status: LeadStatus.CONVERTED, notes: leadNote });
                    setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
                } catch (error) {
                    console.error('[Lead] Failed to update lead status:', error);
                }
            } else {
                try {
                    const createdLead = await createLeadRow({
                        name: createdClient.name,
                        contactChannel: ContactChannel.WEBSITE,
                        location: createdProject.location,
                        status: LeadStatus.CONVERTED,
                        date: new Date().toISOString(),
                        notes: `Dikonversi otomatis dari booking publik. Acara: ${createdProject.projectName}. Pengantin ID: ${createdClient.id}`,
                        whatsapp: createdClient.phone,
                    } as any);
                    setLeads(prev => [createdLead, ...prev]);
                } catch (error) {
                    console.error('[Lead] Failed to create lead:', error);
                }
            }

            setClients(prev => [createdClient, ...prev]);
            // Tandai sebagai booking baru agar muncul di halaman Booking
            const createdProjectWithBooking: Project = { ...createdProject, bookingStatus: BookingStatus.BARU } as Project;
            setProjects(prev => [createdProjectWithBooking, ...prev]);

            if (promoCodeAppliedId) {
                setPromoCodes(prev => prev.map(p => p.id === promoCodeAppliedId ? { ...p, usageCount: p.usageCount + 1 } : p));
            }

            if (dpAmount > 0) {
                const today = new Date().toISOString().split('T')[0];
                try {
                    const createdTx = await createTransaction({
                        date: today,
                        description: `DP Acara ${createdProject.projectName}`,
                        amount: dpAmount,
                        type: TransactionType.INCOME,
                        projectId: createdProject.id,
                        category: 'DP Acara',
                        method: 'Transfer Bank',
                        cardId: destinationCard.id,
                    } as any);
                    setTransactions(prev => [createdTx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setCards(prev => prev.map(c => c.id === destinationCard.id ? { ...c, balance: c.balance + dpAmount } : c));
                } catch (err) {
                    console.error('Gagal mencatat transaksi DP ke Supabase:', err);
                    // Tetap update lokal agar UI tidak macet
                    const localTx: Transaction = {
                        id: `TRN-DP-${createdProject.id}`,
                        date: today,
                        description: `DP Acara ${createdProject.projectName}`,
                        amount: dpAmount,
                        type: TransactionType.INCOME,
                        projectId: createdProject.id,
                        category: 'DP Acara',
                        method: 'Transfer Bank',
                        cardId: destinationCard.id,
                    };
                    setTransactions(prev => [localTx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                    setCards(prev => prev.map(c => c.id === destinationCard.id ? { ...c, balance: c.balance + dpAmount } : c));
                }
            }

            setIsSubmitting(false);
            setIsSubmitted(true);

            addNotification({
                title: 'Booking Baru Diterima!',
                message: `Booking dari ${createdClient.name} untuk acara "${createdProjectWithBooking.projectName}" menunggu konfirmasi Anda.`,
                icon: 'lead',
                link: { view: ViewType.BOOKING }
            });
        } catch (err: any) {
            console.error('Error submitting public booking form:', err);
            showNotification && showNotification(typeof err === 'string' ? err : (err?.message || 'Terjadi kesalahan saat mengirim formulir. Silakan coba lagi.'));
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex items-center justify-center min-h-screen p-3 md:p-4">
                <div className="w-full max-w-2xl p-6 md:p-8 text-center bg-public-surface rounded-2xl shadow-lg border border-public-border">
                    <h1 className="text-xl md:text-2xl font-bold text-gradient">Terima Kasih!</h1>
                    <p className="mt-4 text-sm md:text-base text-public-text-primary">Formulir pemesanan Anda telah berhasil kami terima. Tim kami akan segera menghubungi Anda untuk konfirmasi lebih lanjut.</p>
                </div>
            </div>
        );
    }
    // Region gate: do not show all regions. Ask user to choose a region link first.
    if (!selectedRegion) {
        const base = `${window.location.origin}${window.location.pathname}#/public-booking`;
        return (
            <div className="flex items-center justify-center min-h-screen p-3 md:p-4">
                <div className="w-full max-w-lg p-6 md:p-8 text-center bg-public-surface rounded-2xl shadow-lg border border-public-border">
                    <h4 className="text-xl font-bold text-gradient mb-6">Informasi Pengantin & Acara</h4>
                    <p className="mt-3 text-public-text-secondary text-xs md:text-sm">Untuk meminimalisir kesalahan, silakan pilih wilayah terlebih dahulu.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                        {unionRegions.map(r => (
                            <a key={r.value} className="button-primary text-center" href={`${base}?region=${r.value}`}>{r.label}</a>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const suggestedDp = totalProject * 0.3;

    return (
        <div className={`public-page-body template-wrapper template-${template} min-h-screen p-3 md:p-4 sm:p-6 lg:p-8 flex items-center justify-center`}>
            <style>{`
                .template-wrapper { background-color: var(--public-bg); color: var(--public-text-primary); }
                .template-classic .form-container { max-width: 64rem; width: 100%; margin: auto; }
                .template-modern .form-container { max-width: 72rem; width: 100%; margin: auto; display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; align-items: start; }
                .template-gallery .form-container { max-width: 56rem; width: 100%; margin: auto; }
                @media (max-width: 768px) { .template-modern .form-container { grid-template-columns: 1fr; } }
            `}</style>
            <div ref={formRef} className="form-container">
                {template === 'modern' && (
                    <div className="p-4 sm:p-6 md:p-8 bg-public-surface rounded-2xl border border-public-border hidden md:block">
                        {userProfile.logoBase64 ? <img src={userProfile.logoBase64} alt="logo" className="h-12 mb-4" /> : <h2 className="text-2xl font-bold text-gradient">{userProfile.companyName}</h2>}
                        <p className="text-public-text-secondary text-sm mt-4">{userProfile.bio}</p>
                    </div>
                )}
                <div className="bg-public-surface p-3 md:p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg border border-public-border">
                    <div className="text-center mb-6 md:mb-8">
                        <h1 className="text-2xl md:text-3xl font-bold text-gradient">{userProfile.companyName}</h1>
                        <p className="text-xs md:text-sm text-public-text-secondary mt-2">Formulir Pemesanan Layanan</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {/* Honeypot field - invisible to humans, visible to bots */}
                        <input
                            type="text"
                            name="website"
                            value={honeypot}
                            onChange={(e) => setHoneypot(e.target.value)}
                            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-2">
                            <div className="space-y-5">
                                <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-public-border pb-2">Informasi Pengantin & Acara</h4>
                                <div className="space-y-2">
                                    <label htmlFor="clientName" className="block text-xs text-public-text-secondary">Nama Lengkap</label>
                                    <input type="text" id="clientName" name="clientName" value={formData.clientName} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all" placeholder="Masukkan nama lengkap" required />
                                    <p className="text-xs text-public-text-secondary">Nama lengkap Anda atau pasangan</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="phone" className="block text-xs text-public-text-secondary">Nomor Telepon (WhatsApp)</label>
                                    <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all" placeholder="08123456789" required />
                                    <p className="text-xs text-public-text-secondary">Nomor aktif yang bisa dihubungi</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="email" className="block text-xs text-public-text-secondary">Email</label>
                                    <input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all" placeholder="email@example.com" required />
                                    <p className="text-xs text-public-text-secondary">Email untuk konfirmasi dan komunikasi</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="instagram" className="block text-xs text-public-text-secondary">Instagram (Opsional)</label>
                                    <input type="text" id="instagram" name="instagram" value={formData.instagram} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all" placeholder="@username" />
                                    <p className="text-xs text-public-text-secondary">Username Instagram Anda</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="projectType" className="block text-xs text-public-text-secondary">Jenis Acara</label>
                                        <select id="projectType" name="projectType" value={formData.projectType} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all" required>
                                            <option value="" disabled>Pilih Jenis...</option>
                                            {userProfile.projectTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                                        </select>
                                        <p className="text-xs text-public-text-secondary">Pilih jenis acara</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="date" className="block text-xs text-public-text-secondary">Tanggal Acara</label>
                                        <input type="date" id="date" name="date" value={formData.date} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all" />
                                        <p className="text-xs text-public-text-secondary">Kapan acara berlangsung?</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="location" className="block text-xs text-public-text-secondary">Lokasi (Kota)</label>
                                    <input type="text" id="location" name="location" value={formData.location} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all" placeholder="Contoh: Jakarta" />
                                    <p className="text-xs text-public-text-secondary">Kota tempat acara berlangsung</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="address" className="block text-xs text-public-text-secondary">Alamat Lengkap / Gedung</label>
                                    <textarea id="address" name="address" value={(formData as any).address || ''} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all" placeholder="Contoh: Gedung Mulia, Jl. Gatot Subroto No. 1" rows={3}></textarea>
                                    <p className="text-xs text-public-text-secondary">Alamat spesifik venue acara</p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <h4 className="text-sm md:text-base font-semibold text-gradient border-b border-public-border pb-2">Detail Paket & Pembayaran</h4>
                                <div className="space-y-2">
                                    <label htmlFor="packageId" className="block text-xs text-public-text-secondary">Paket</label>
                                    <select
                                        id="packageId"
                                        name="packageId"
                                        value={formData.packageId}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const pkg = filteredPackages.find(p => p.id === val);
                                            const defaultOpt = pkg?.durationOptions && pkg.durationOptions.length > 0 ? (pkg.durationOptions.find(o => o.default) || pkg.durationOptions[0]) : undefined;
                                            setFormData(prev => ({ ...prev, packageId: val, durationSelection: defaultOpt?.label || '', unitPrice: defaultOpt ? Number(defaultOpt.price) : (pkg ? pkg.price : undefined) }));
                                        }}
                                        className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all"
                                        required
                                    >
                                        <option value="">{isPackagesLoading ? 'Memuat paket...' : filteredPackages.length === 0 ? 'Tidak ada paket tersedia untuk wilayah ini' : 'Pilih paket...'}</option>
                                        {(() => {
                                            // Use filteredPackages which are already filtered by selectedRegion
                                            const grouped: Record<string, typeof filteredPackages> = {} as any;
                                            for (const p of filteredPackages) {
                                                const cat = p.category || 'Lainnya';
                                                if (!grouped[cat]) grouped[cat] = [] as any;
                                                grouped[cat].push(p);
                                            }
                                            return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, list]) => (
                                                <optgroup key={cat} label={cat}>
                                                    {(list as typeof filteredPackages).map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ));
                                        })()}
                                    </select>
                                    <p className="text-xs text-public-text-secondary">Pilih paket layanan yang sesuai dengan kebutuhan Anda</p>
                                </div>
                                {(() => {
                                    const pkg = filteredPackages.find(p => p.id === formData.packageId);
                                    if (!pkg) return null;
                                    const hasDurationOpts = pkg.durationOptions && pkg.durationOptions.length > 0;
                                    const selectedOpt = hasDurationOpts
                                        ? (pkg.durationOptions!.find(o => o.label === formData.durationSelection) || pkg.durationOptions!.find(o => o.default) || pkg.durationOptions![0])
                                        : null;
                                    const photographers = selectedOpt?.photographers || pkg.photographers;
                                    const videographers = selectedOpt?.videographers || pkg.videographers;
                                    const processingTime = selectedOpt?.processingTime || pkg.processingTime;
                                    const digitalItems = (selectedOpt?.digitalItems?.filter(Boolean).length ? selectedOpt.digitalItems : pkg.digitalItems)?.filter(Boolean) || [];
                                    const physicalItems = (selectedOpt?.physicalItems?.filter(p => p?.name).length ? selectedOpt.physicalItems : pkg.physicalItems)?.filter(p => p?.name) || [];
                                    const hasAnyDetail = photographers || videographers || processingTime || digitalItems.length > 0 || physicalItems.length > 0;
                                    return (
                                        <div className="mt-3 p-3 border border-blue-200 bg-blue-50/10 rounded-xl space-y-2">
                                            <p className="text-xs font-semibold text-blue-600">
                                                Detail Paket: {pkg.name}
                                                {selectedOpt && hasDurationOpts && <span className="font-normal text-blue-500"> — {selectedOpt.label}</span>}
                                            </p>
                                            {hasAnyDetail ? (
                                                <ul className="text-xs text-public-text-secondary space-y-1">
                                                    {photographers && <li>• {photographers}</li>}
                                                    {videographers && <li>• {videographers}</li>}
                                                    {processingTime && <li>• Waktu pengerjaan: {processingTime}</li>}
                                                    {digitalItems.map((item, i) => <li key={i}>• {item}</li>)}
                                                    {physicalItems.map((item, i) => <li key={i}>• {item.name}</li>)}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-public-text-secondary italic">Klik opsi Jam Kerja di bawah untuk melihat detail.</p>
                                            )}
                                        </div>
                                    );
                                })()}
                                {(() => {
                                    const pkg = filteredPackages.find(p => p.id === formData.packageId); if (!pkg?.durationOptions || pkg.durationOptions.length === 0) return null; return (
                                        <div className="mt-2">
                                            <label className="text-xs font-semibold text-blue-600">Jam Kerja</label>
                                            <p className="text-xs text-public-text-secondary mt-1 mb-2">Pilih durasi jam kerja sesuai kebutuhan acara Anda. Detail paket akan berubah sesuai pilihan.</p>
                                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {pkg.durationOptions.map(opt => (
                                                    <label key={opt.label} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.durationSelection === opt.label
                                                        ? 'border-blue-500 bg-blue-50/10 shadow-md'
                                                        : 'border-public-border hover:border-blue-300 hover:bg-blue-50/5'
                                                        }`}>
                                                        <span className="text-sm font-medium">{opt.label}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-semibold text-blue-600">{formatCurrency(opt.price)}</span>
                                                            <input type="radio" name="durationSelection" value={opt.label} checked={formData.durationSelection === opt.label} onChange={handleFormChange} className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 focus:ring-blue-500 flex-shrink-0" />
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="space-y-2">
                                    <label className="block text-xs font-semibold text-blue-600">Add-On Lainnya (Opsional)</label>
                                    <p className="text-xs text-public-text-secondary">Pilih layanan tambahan yang Anda butuhkan</p>
                                    <div className="p-3 border-2 border-blue-200 bg-blue-50/5 rounded-xl space-y-2 mt-2">{filteredAddOns.length > 0 ? filteredAddOns.map(addon => (<label key={addon.id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${formData.selectedAddOnIds.includes(addon.id)
                                        ? 'bg-blue-100/20 border border-blue-400'
                                        : 'hover:bg-blue-50/10 border border-transparent'
                                        }`}><span className="text-sm text-public-text-primary font-medium">{addon.name}</span><div className="flex items-center gap-2"><span className="text-sm font-semibold text-blue-600">{formatCurrency(addon.price)}</span><input type="checkbox" id={addon.id} name="addOns" checked={formData.selectedAddOnIds.includes(addon.id)} onChange={handleFormChange} className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0" /></div></label>)) : <p className="text-xs text-public-text-secondary">Tidak ada add-on untuk wilayah ini.</p>}</div></div>

                                <div className="space-y-2">
                                    <label htmlFor="promoCode" className="block text-xs text-public-text-secondary">Kode Promo (Opsional)</label>
                                    <input type="text" id="promoCode" name="promoCode" value={formData.promoCode} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all" placeholder="Masukkan kode promo" />
                                    {!promoFeedback.message && <p className="text-xs text-public-text-secondary">Masukkan kode promo jika Anda memilikinya</p>}
                                    {promoFeedback.message && <p className={`text-xs ${promoFeedback.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{promoFeedback.message}</p>}
                                </div>

                                <div className="p-3 md:p-4 bg-public-bg rounded-lg space-y-2 md:space-y-3">
                                    {discountAmount > 0 && (
                                        <>
                                            <div className="flex justify-between items-center text-sm"><span className="text-public-text-secondary">Subtotal</span><span className="text-public-text-primary">{formatCurrency(totalBeforeDiscount)}</span></div>
                                            <div className="flex justify-between items-center text-sm"><span className="text-public-text-secondary">Diskon ({discountText})</span><span className="text-green-500">-{formatCurrency(discountAmount)}</span></div>
                                        </>
                                    )}
                                    <div className="flex justify-between items-center font-bold text-lg"><span className="text-public-text-secondary">Total Biaya</span><span className="text-public-text-primary">{formatCurrency(totalProject)}</span></div>
                                    <hr className="border-public-border" />
                                    <p className="text-sm text-public-text-secondary">Silakan transfer Uang Muka (DP) ke rekening berikut:</p>
                                    <p className="font-semibold text-public-text-primary text-center py-2 bg-public-surface rounded-md border border-public-border">{userProfile.bankAccount}</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="dp" className="block text-xs text-public-text-secondary">Jumlah DP Ditransfer</label>
                                            <RupiahInput
                                                id="dp"
                                                name="dp"
                                                value={String(formData.dp ?? '')}
                                                onChange={(raw) => setFormData(prev => ({ ...prev, dp: raw }))}
                                                className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all text-right"
                                                placeholder="0"
                                            />
                                            <p className="text-xs text-public-text-secondary text-right">Saran DP (30%): {formatCurrency(suggestedDp)}</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="dpPaymentRef" className="block text-xs text-public-text-secondary">No. Ref / 4 Digit Rek</label>
                                            <input type="text" name="dpPaymentRef" id="dpPaymentRef" value={formData.dpPaymentRef} onChange={handleFormChange} className="w-full px-4 py-3 rounded-xl border border-public-border bg-white/5 text-public-text-primary focus:outline-none focus:ring-2 focus:ring-public-accent focus:border-transparent transition-all" placeholder="1234" />
                                            <p className="text-xs text-public-text-secondary">Nomor referensi atau 4 digit terakhir rekening pengirim</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 !mt-4">
                                        <label htmlFor="dpPaymentProof" className="block text-xs font-semibold text-blue-600">Bukti Transfer DP (Opsional)</label>
                                        <div className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/5 px-6 py-10 hover:border-blue-400 hover:bg-blue-50/10 transition-all">
                                            <div className="text-center">
                                                <UploadIcon className="mx-auto h-12 w-12 text-blue-500" />
                                                <div className="mt-4 flex text-sm leading-6 text-public-text-secondary">
                                                    <label htmlFor="dpPaymentProof" className="relative cursor-pointer rounded-md px-2 py-1 font-semibold text-blue-600 hover:text-blue-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
                                                        <span>Unggah file</span>
                                                        <input id="dpPaymentProof" name="dpPaymentProof" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg, application/pdf" />
                                                    </label>
                                                    <p className="pl-1">atau seret dan lepas</p>
                                                </div>
                                                <p className="text-xs leading-5 text-blue-600/70">PNG, JPG, PDF hingga 10MB</p>
                                            </div>
                                        </div>
                                        {paymentProof && (
                                            <div className="mt-2 text-sm text-blue-700 bg-blue-100/20 border border-blue-300 p-3 rounded-lg">
                                                ✓ File terpilih: <span className="font-semibold">{paymentProof.name}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button type="submit" disabled={isSubmitting} className="w-full px-6 py-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl">{isSubmitting ? 'Mengirim...' : 'Kirim Formulir Pemesanan'}</button>
                        </div>
                    </form>
                    <div className="mt-6 flex justify-center items-center gap-4">
                        <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-xs font-semibold text-public-accent hover:underline">
                            Lihat Syarat & Ketentuan Umum
                        </button>
                    </div>
                </div>
            </div>
            <Modal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} title="Syarat & Ketentuan Umum">
                <div className="max-h-[70vh] overflow-y-auto pr-4">
                    {formattedTerms ? (
                        <div>{formattedTerms}</div>
                    ) : (
                        <p className="text-brand-text-secondary text-center py-8">Syarat dan ketentuan belum diatur oleh vendor.</p>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default PublicBookingForm;