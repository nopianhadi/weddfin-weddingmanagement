import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, AddOn, Profile, Client, Project, Transaction, Lead, Notification, Card, ClientStatus, PaymentStatus, TransactionType, LeadStatus, ContactChannel, ClientType, BookingStatus, ViewType, PromoCode } from '../types';
import Modal from './Modal';
import { CheckIcon, CameraIcon, WhatsappIcon, cleanPhoneNumber } from '../constants';
import { listPackages } from '../services/packages';
import { listAddOns } from '../services/addOns';
import { getProfile } from '../services/profile';
import { createClient } from '../services/clients';
import { createProject } from '../services/projects';
import { createLead as createLeadRow } from '../services/leads';
import { uploadDpProof } from '../services/storage';
import { createTransaction } from '../services/transactions';
import RupiahInput from './RupiahInput';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);

interface PublicPackagesProps {
    userProfile: Profile;
    showNotification: (message: string) => void;
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    setCards: React.Dispatch<React.SetStateAction<Card[]>>;
    setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
    cards: Card[];
    projects: Project[];
    promoCodes: PromoCode[];
    setPromoCodes: React.Dispatch<React.SetStateAction<PromoCode[]>>;
}


const AddOnItem: React.FC<{ addOn: AddOn }> = ({ addOn }) => {
    return (
        <div className="border-b border-brand-border last:border-b-0 p-4 flex justify-between items-center">
            <p className="font-semibold text-brand-text-light">{addOn.name}</p>
            <p className="text-sm font-bold text-brand-accent">{formatCurrency(addOn.price)}</p>
        </div>
    );
};

const initialForm = {
    clientName: '', email: '', phone: '', instagram: '', date: new Date().toISOString().split('T')[0], location: '', transportCost: '', selectedAddOnIds: [] as string[], promoCode: '', dp: '', dpPaymentRef: '', durationSelection: '' as string, unitPrice: undefined as number | undefined
};



const PublicPackages: React.FC<PublicPackagesProps> = ({ userProfile: initialUserProfile, showNotification, setClients, setProjects, setTransactions, setCards, setLeads, addNotification, cards, projects, promoCodes, setPromoCodes }) => {
    const [packages, setPackages] = useState<Package[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);
    const [userProfile, setUserProfile] = useState<Profile>(initialUserProfile);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

    const { publicPageConfig } = userProfile;

    // Update userProfile when initialUserProfile changes
    useEffect(() => {
        if (initialUserProfile) {
            setUserProfile(initialUserProfile);
        }
    }, [initialUserProfile]);

    // Load data from Supabase
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);

                // Load packages
                const packagesData = await listPackages();
                setPackages(packagesData);

                // Load add-ons
                const addOnsData = await listAddOns();
                setAddOns(addOnsData);

                // Load profile if not provided
                if (!initialUserProfile) {
                    const profileData = await getProfile();
                    if (profileData) {
                        setUserProfile(profileData);
                    }
                }

                setError(null);
            } catch (err) {
                console.error('Error loading data:', err);
                setError('Gagal memuat data. Silakan coba lagi nanti.');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);
    const template = publicPageConfig?.template ?? 'modern';
    const visiblePackages = useMemo(() => {
        if (!selectedRegion) return packages;
        return packages.filter(p => (p.region ? p.region === selectedRegion : false));
    }, [packages, selectedRegion]);

    const [bookingModal, setBookingModal] = useState<{ isOpen: boolean; pkg: Package | null }>({ isOpen: false, pkg: null });
    const [formData, setFormData] = useState(initialForm);
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [promoFeedback, setPromoFeedback] = useState({ type: '', message: '' });
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);

    // Note: We avoid early returns before all hooks to keep hook order stable across renders.

    // Group packages by category
    const packagesByCategory = useMemo(() => {
        const grouped: Record<string, Package[]> = {};

        if (!Array.isArray(packages)) {
            console.error('Packages is not an array:', packages);
            return {};
        }

        for (const pkg of packages) {
            if (!pkg) continue;

            const category = pkg.category || 'Lainnya';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(pkg);
        }

        const orderedGrouped: Record<string, Package[]> = {};

        if (userProfile?.packageCategories?.length) {
            userProfile.packageCategories.forEach((category: string) => {
                if (grouped[category]) {
                    orderedGrouped[category] = grouped[category];
                    delete grouped[category];
                }
            });
        }

        // Add remaining categories
        Object.keys(grouped).forEach(category => {
            orderedGrouped[category] = grouped[category];
        });

        return orderedGrouped;
    }, [packages, userProfile?.packageCategories]);

    const mostPopularPackageId = useMemo(() => {
        if (projects.length === 0) return null;
        const packageCounts = projects.reduce((acc, p) => {
            if (p.packageId) {
                acc[p.packageId] = (acc[p.packageId] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        if (Object.keys(packageCounts).length === 0) return null;

        return Object.keys(packageCounts).sort((a, b) => packageCounts[b] - packageCounts[a])[0];
    }, [projects]);


    const categoryDescriptions: Record<string, string> = {
        'Pernikahan': "Layanan profesional untuk mendukung kelancaran hari bahagia Anda. Yuk konsultasikan kebutuhan Anda sekarang.",
        'Lamaran / Engagement': "Momen spesial komitmen Anda akan kami layani dengan sepenuh hati.",
        'Ulang Tahun': "Rayakan pertambahan usia dengan layanan terbaik yang menyenangkan.",
        'Corporate / Event': "Dukungan profesional untuk kesuksesan acara perusahaan dan gathering Anda.",
        'Wisuda': "Rayakan pencapaian akademik Anda dengan layanan spesial dari kami.",
        'Keluarga': "Menciptakan momen berharga dan layanan terbaik untuk kebahagiaan keluarga Anda."
    };

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

    const whatsappUrl = useMemo(() => {
        if (!bookingModal.pkg || !isSubmitted) return '';
        const message = `Halo, saya ${formData.clientName}, baru saja melakukan booking untuk paket "${bookingModal.pkg.name}". Mohon untuk diproses. Terima kasih.`;
        return `https://wa.me/${cleanPhoneNumber(userProfile.phone)}?text=${encodeURIComponent(message)}`;
    }, [isSubmitted, formData.clientName, bookingModal.pkg, userProfile.phone]);

    const { totalBeforeDiscount, discountAmount, totalProject, discountText } = useMemo(() => {
        if (!bookingModal.pkg) return { totalBeforeDiscount: 0, discountAmount: 0, totalProject: 0, discountText: '' };
        // Determine package price based on selected duration option (flexible labels)
        let packagePrice = bookingModal.pkg.price;
        const opts = bookingModal.pkg.durationOptions;
        if (opts && opts.length > 0) {
            const selected = opts.find(o => o.label === formData.durationSelection) || opts.find(o => o.default) || opts[0];
            packagePrice = selected?.price ?? bookingModal.pkg.price;
        }
        const addOnsPrice = addOns
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
    }, [formData.selectedAddOnIds, formData.promoCode, formData.transportCost, formData.durationSelection, bookingModal.pkg, addOns, promoCodes]);

    const handleOpenBookingModal = (pkg: Package) => {
        setBookingModal({ isOpen: true, pkg });
        setIsSubmitted(false);
        // Set default duration selection if durationOptions exist
        const defaultOpt = (pkg.durationOptions && pkg.durationOptions.length > 0)
            ? (pkg.durationOptions.find(o => o.default) || pkg.durationOptions[0])
            : undefined;
        setFormData({ ...initialForm, durationSelection: defaultOpt?.label || '', unitPrice: defaultOpt ? Number(defaultOpt.price) : pkg.price });
        setPaymentProof(null);
        setPromoFeedback({ type: '', message: '' });
    };

    const handleCloseBookingModal = () => {
        setBookingModal({ isOpen: false, pkg: null });
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { id, checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, selectedAddOnIds: checked ? [...prev.selectedAddOnIds, id] : prev.selectedAddOnIds.filter(addOnId => addOnId !== id) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                alert('Ukuran file tidak boleh melebihi 10MB.');
                e.target.value = '';
                return;
            }
            setPaymentProof(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bookingModal.pkg) return;
        setIsSubmitting(true);

        const dpAmount = Number(formData.dp) || 0;
        const destinationCard = cards.find(c => c.id !== 'CARD_CASH') || cards[0];
        if (dpAmount > 0 && !destinationCard) {
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
                // Upload ke Supabase Storage, gunakan URL publik
                dpProofUrl = await uploadDpProof(paymentProof);
            } catch (error) {
                console.error('Error uploading DP proof:', error);
                alert('Gagal mengunggah bukti transfer. Silakan coba lagi.');
                setIsSubmitting(false);
                return;
            }
        }

        const selectedAddOns = addOns.filter(addon => formData.selectedAddOnIds.includes(addon.id));
        const remainingPayment = totalProject - dpAmount;
        const transportFee = Number(formData.transportCost) || 0;

        // Persist to Supabase
        const createdClient = await createClient({
            name: formData.clientName,
            email: formData.email,
            phone: formData.phone,
            whatsapp: formData.phone || undefined,
            instagram: formData.instagram || undefined,
            since: new Date().toISOString().split('T')[0],
            status: ClientStatus.ACTIVE,
            clientType: ClientType.DIRECT,
            lastContact: new Date().toISOString(),
            portalAccessId: crypto.randomUUID(),
        });

        const createdProject = await createProject({
            projectName: `${formData.clientName} (${bookingModal.pkg.name})`,
            clientName: createdClient.name,
            clientId: createdClient.id,
            projectType: bookingModal.pkg.category,
            packageName: bookingModal.pkg.name,
            date: formData.date,
            location: formData.location || 'Akan dikonfirmasi',
            status: 'Dikonfirmasi',
            bookingStatus: BookingStatus.BARU,
            totalCost: totalProject,
            amountPaid: dpAmount,
            paymentStatus: dpAmount >= totalProject ? PaymentStatus.LUNAS : (dpAmount > 0 ? PaymentStatus.DP_TERBAYAR : PaymentStatus.BELUM_BAYAR),
            notes: `Booking dari halaman paket. Ref: ${formData.dpPaymentRef}${formData.durationSelection ? ` | Durasi dipilih: ${formData.durationSelection}` : ''}`,
            durationSelection: formData.durationSelection || undefined,
            unitPrice: formData.unitPrice !== undefined ? Number(formData.unitPrice) : undefined,
            promoCodeId: promoCodeAppliedId,
            discountAmount: discountAmount > 0 ? discountAmount : undefined,
            transportCost: transportFee > 0 ? transportFee : undefined,
            completedDigitalItems: [],
            dpProofUrl: dpProofUrl || undefined,
            addOns: selectedAddOns.map(a => ({ id: a.id, name: a.name, price: a.price })),
        });

        const createdLead = await createLeadRow({
            name: createdClient.name,
            contactChannel: ContactChannel.WEBSITE,
            location: createdProject.location,
            status: LeadStatus.CONVERTED,
            date: new Date().toISOString(),
            notes: `Dikonversi dari halaman paket. Acara: ${createdProject.projectName}. Pengantin ID: ${createdClient.id}`,
            whatsapp: createdClient.phone,
        } as any);

        setClients(prev => [createdClient, ...prev]);
        // Pastikan muncul di halaman Booking
        const createdProjectWithBooking: Project = { ...createdProject, bookingStatus: BookingStatus.BARU } as Project;
        setProjects(prev => [createdProjectWithBooking, ...prev]);
        setLeads(prev => [createdLead, ...prev]);

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
                // fallback: tetap update lokal
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

        addNotification({
            title: 'Booking Baru Diterima!',
            message: `Booking dari ${createdClient.name} untuk paket "${bookingModal.pkg.name}" menunggu konfirmasi.`,
            icon: 'lead',
            link: { view: ViewType.BOOKING }
        });

        setIsSubmitting(false);
        setIsSubmitted(true);
    };

    const suggestedDp = totalProject * 0.3;

    return (
        isLoading ? (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent mx-auto mb-4"></div>
                    <p className="text-brand-text-secondary">Memuat data paket...</p>
                </div>
            </div>
        ) : error ? (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center p-6 max-w-md mx-auto bg-brand-surface rounded-lg shadow-md">
                    <div className="text-red-500 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-brand-text-light mb-2">Terjadi Kesalahan</h3>
                    <p className="text-brand-text-secondary mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-brand-accent text-white rounded-lg hover:bg-brand-accent-hover transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        ) : (
            <div className={`template-wrapper template-${template} min-h-screen`}>
                <style>{`
                .template-wrapper { background-color: var(--public-bg); color: var(--public-text-primary); }
            `}</style>
                <div className="w-full max-w-7xl mx-auto py-12 px-4">
                    <header className="text-center mb-12 md:mb-16 widget-animate">
                        {userProfile.logoBase64 ? (
                            <img src={userProfile.logoBase64} alt="Company Logo" className="h-16 md:h-20 mx-auto mb-4 object-contain" />
                        ) : (
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gradient">{userProfile.companyName}</h1>
                        )}
                        {publicPageConfig?.title && (
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-brand-text-light mt-4">{publicPageConfig.title}</h2>
                        )}
                        {publicPageConfig?.introduction && (
                            <p className="text-base md:text-lg text-brand-text-secondary mt-4 max-w-3xl mx-auto">{publicPageConfig.introduction}</p>
                        )}
                    </header>

                    {publicPageConfig?.galleryImages && publicPageConfig.galleryImages.length > 0 && (
                        <section className="mb-8 md:mb-10 widget-animate -mx-4" style={{ animationDelay: '100ms' }}>
                            <div className="text-center mb-4">
                                <h3 className="text-2xl font-bold text-brand-text-light">Pricelist</h3>
                                <p className="text-sm text-brand-text-secondary mt-1">Pricelist Vena Pictures</p>
                            </div>
                            <div className="space-y-2 sm:space-y-3">
                                {publicPageConfig?.galleryImages?.map((imgSrc, index) => (
                                    <div key={index} className="group">
                                        <img
                                            src={imgSrc}
                                            alt={`Gallery image ${index + 1}`}
                                            loading="lazy"
                                            className="w-full h-auto object-cover rounded-none shadow-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="mb-12 md:mb-16 grid md:grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 widget-animate" style={{ animationDelay: '200ms' }}>
                        <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border p-3 md:p-4 sm:p-6">
                            <button onClick={() => setIsWorkflowOpen(!isWorkflowOpen)} className="w-full flex justify-between items-center text-left">
                                <h3 className="text-xl md:text-2xl font-bold text-gradient">Wedding Workflow</h3>
                                <ChevronDownIcon className={`w-6 h-6 transition-transform text-brand-text-secondary ${isWorkflowOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`transition-all duration-500 ease-in-out grid ${isWorkflowOpen ? 'grid-rows-[1fr] mt-4 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-brand-text-light">Wedding Timeline</h4>
                                            <ul className="mt-2 space-y-1 text-sm text-brand-text-secondary list-disc list-inside">
                                                <li>Konsep Acara / Awal → H-90</li>
                                                <li>Pemilihan Vendor / Detail → H-60</li>
                                                <li>Persiapan Final (Technical Meeting) → H-14</li>
                                                <li>Pelaksanaan Acara → Hari H</li>
                                                <li>Penyelesaian / Review Akhir → H+7</li>
                                                <li>Serah Terima Dokumentasi / Laporan → H+30</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-brand-text-light">Event / Acara Kecil Timeline</h4>
                                            <ul className="mt-2 space-y-1 text-sm text-brand-text-secondary list-disc list-inside">
                                                <li>Konsep / Kesepakatan Awal → H-30</li>
                                                <li>Persiapan Final → H-7</li>
                                                <li>Pelaksanaan Acara → Hari H</li>
                                                <li>Penyelesaian Layanan / Laporan → H+14</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border p-3 md:p-4 sm:p-6">
                            <button onClick={() => setIsTermsOpen(!isTermsOpen)} className="w-full flex justify-between items-center text-left">
                                <h3 className="text-xl md:text-2xl font-bold text-gradient">Syarat & Ketentuan</h3>
                                <ChevronDownIcon className={`w-6 h-6 transition-transform text-brand-text-secondary ${isTermsOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`transition-all duration-500 ease-in-out grid ${isTermsOpen ? 'grid-rows-[1fr] mt-4 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className="max-h-80 overflow-y-auto pr-4 text-sm space-y-2">
                                        {formattedTerms ? (
                                            <div>{formattedTerms}</div>
                                        ) : (
                                            <p className="text-brand-text-secondary text-center py-8">Syarat dan ketentuan belum diatur oleh vendor.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="grid lg:grid-cols-3 gap-6 md:gap-8 items-start">
                        <section className="lg:col-span-2 space-y-12 md:space-y-16">
                            {Object.entries(packagesByCategory as Record<string, Package[]>).map(([category, pkgs]) => (
                                <div key={category}>
                                    <div className="mb-6 md:mb-8">
                                        <h3 className="text-2xl md:text-3xl font-bold text-brand-text-light">{category}</h3>
                                        <div className="text-brand-text-secondary mt-2 max-w-2xl"
                                            dangerouslySetInnerHTML={{
                                                __html: categoryDescriptions[category] || `Berbagai pilihan paket untuk kebutuhan ${category.toLowerCase()} Anda.`
                                            }} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                                        {pkgs.map((pkg, index) => (
                                            <div key={pkg.id} className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl widget-animate" style={{ animationDelay: `${200 + index * 100}ms` }}>
                                                {pkg.id === mostPopularPackageId && (
                                                    <div className="absolute -top-3 right-3 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">Paling Populer</div>
                                                )}
                                                {pkg.coverImage ? (
                                                    <div className="w-full h-48 overflow-hidden">
                                                        <img
                                                            src={pkg.coverImage}
                                                            alt={pkg.name}
                                                            loading="lazy"
                                                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                                            onError={(e) => {
                                                                // If image fails to load, show the camera icon
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                                const parent = target.parentElement;
                                                                if (parent) {
                                                                    parent.innerHTML = `
                                                                    <div class="w-full h-48 bg-brand-bg flex items-center justify-center">
                                                                        <svg class="w-12 h-12 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                                        </svg>
                                                                    </div>`;
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-48 bg-brand-bg flex items-center justify-center">
                                                        <svg className="w-12 h-12 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="p-3 md:p-4 sm:p-6 flex flex-col flex-grow">
                                                    <h4 className="text-base md:text-lg lg:text-xl font-bold text-gradient">{pkg.name}</h4>
                                                    <p className="text-xl md:text-2xl lg:text-3xl font-bold text-brand-text-light my-2 md:my-3">{formatCurrency(pkg.price)}</p>
                                                    <div className="space-y-1 text-xs md:text-sm text-brand-text-secondary flex-grow">
                                                        {/* Team lines separated */}
                                                        {pkg.photographers && (
                                                            <p className="leading-snug">{pkg.photographers}</p>
                                                        )}
                                                        {pkg.videographers && (
                                                            <p className="leading-snug">{pkg.videographers}</p>
                                                        )}
                                                        {pkg.digitalItems.length > 0 && pkg.digitalItems.map((item, i) => (
                                                            <p key={`d-${i}`} className="leading-snug">{item}</p>
                                                        ))}
                                                        {pkg.physicalItems.length > 0 && pkg.physicalItems.map((item, i) => (
                                                            <p key={`p-${i}`} className="leading-snug">{item.name}</p>
                                                        ))}
                                                    </div>
                                                    <div className="mt-6 pt-4 border-t border-brand-border">
                                                        <button onClick={() => handleOpenBookingModal(pkg)} className="button-primary w-full text-center">Booking Paket Ini</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </section>

                        {addOns.length > 0 && (
                            <aside className="lg:col-span-1 lg:sticky lg:top-8 widget-animate" style={{ animationDelay: '500ms' }}>
                                <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                                    <h3 className="text-lg md:text-xl font-bold text-brand-text-light p-4 md:p-6">Tambahan Opsional</h3>
                                    <div className="border-t border-brand-border">
                                        {addOns.map(addOn => (
                                            <AddOnItem key={addOn.id} addOn={addOn} />
                                        ))}
                                    </div>
                                </div>
                            </aside>
                        )}
                    </div>

                    {userProfile?.phone && (
                        <section className="py-16 mt-16 border-t border-brand-border widget-animate" style={{ animationDelay: '550ms' }}>
                            <div className="max-w-2xl mx-auto text-center">
                                <h3 className="text-2xl font-bold text-gradient mb-2">Butuh Bantuan?</h3>
                                <p className="text-brand-text-secondary mb-6">
                                    Jika ada pertanyaan atau butuh bantuan dalam pengisian formulir, jangan ragu untuk menghubungi admin kami melalui WhatsApp.
                                </p>
                                <a
                                    href={`https://wa.me/${cleanPhoneNumber(userProfile.phone)}?text=${encodeURIComponent('Halo Admin, saya butuh bantuan.')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="button-secondary inline-flex items-center gap-2"
                                >
                                    <WhatsappIcon className="w-5 h-5" />
                                    Hubungi Admin ({userProfile.phone})
                                </a>
                            </div>
                        </section>
                    )}

                    <section className="py-12 bg-gray-50">
                        <div className="max-w-4xl mx-auto px-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-lg font-bold text-brand-text-light mb-4">Social Media</h3>
                                    <div className="flex space-x-4 mb-6">
                                        <a href="#" className="text-gray-600 hover:text-brand-accent transition-colors">
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                                            </svg>
                                        </a>
                                        <a href="#" className="text-gray-600 hover:text-brand-accent transition-colors">
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                                            </svg>
                                        </a>
                                        <a href="#" className="text-gray-600 hover:text-brand-accent transition-colors">
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                                            </svg>
                                        </a>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-start">
                                            <svg className="w-5 h-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            <a href={`mailto:${userProfile.email}`} className="text-gray-700 hover:text-brand-accent transition-colors">{userProfile.email}</a>
                                        </div>
                                        <div className="flex items-start">
                                            <svg className="w-5 h-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <a href={`tel:${userProfile.phone}`} className="text-gray-700 hover:text-brand-accent transition-colors">{userProfile.phone}</a>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-brand-text-light mb-4">Alamat</h3>
                                    <div className="space-y-4">
                                        <div className="flex">
                                            <svg className="w-5 h-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <div>
                                                <p className="font-medium text-gray-800">Alamat Utama</p>
                                                <p className="text-gray-700 whitespace-pre-line">{userProfile.address || 'Alamat belum diatur'}</p>
                                                {userProfile.phone && (
                                                    <a href={`tel:${userProfile.phone}`} className="text-gray-700 hover:text-brand-accent transition-colors block mt-1">
                                                        <span className="font-medium">Telp:</span> {userProfile.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex">
                                            <svg className="w-5 h-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <div>
                                                <p className="font-medium text-gray-800">Kontak Tambahan</p>
                                                {userProfile.website && (
                                                    <a href={userProfile.website.startsWith('http') ? userProfile.website : `https://${userProfile.website}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-gray-700 hover:text-brand-accent transition-colors block">
                                                        {userProfile.website}
                                                    </a>
                                                )}
                                                {userProfile.phone && (
                                                    <a href={`tel:${userProfile.phone}`}
                                                        className="text-gray-700 hover:text-brand-accent transition-colors block">
                                                        {userProfile.phone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <footer className="text-center py-8 border-t border-brand-border">
                        <p className="text-xs text-brand-text-secondary">&copy; {new Date().getFullYear()} {userProfile.companyName}.</p>
                    </footer>
                </div>

                <Modal isOpen={bookingModal.isOpen} onClose={handleCloseBookingModal} title={`Booking: ${bookingModal.pkg?.name}`} size="4xl">
                    {isSubmitted ? (
                        <div className="text-center p-8">
                            <h3 className="text-2xl font-bold text-gradient">Terima Kasih!</h3>
                            <p className="mt-4 text-public-text-primary">Formulir booking Anda telah kami terima. Tim kami akan segera menghubungi Anda untuk konfirmasi.</p>
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-6 button-primary w-full max-w-xs mx-auto"
                            >
                                Konfirmasi ke Admin via WhatsApp
                            </a>
                            <button onClick={handleCloseBookingModal} className="mt-4 button-secondary w-full max-w-xs mx-auto">Tutup</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4 form-compact form-compact--ios-scale">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-2">
                                <div className="space-y-4">
                                    <h4 className="text-base font-semibold text-gradient border-b border-public-border pb-2">Informasi Anda & Acara</h4>
                                    <div className="input-group"><input type="text" id="clientName" name="clientName" value={formData.clientName} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="clientName" className="input-label">Nama Lengkap</label></div>
                                    <div className="input-group"><input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="email" className="input-label">Email</label></div>
                                    <div className="input-group"><input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleFormChange} className="input-field" placeholder=" " required /><label htmlFor="phone" className="input-label">Nomor WhatsApp</label></div>
                                    <div className="input-group"><input type="text" id="instagram" name="instagram" value={formData.instagram} onChange={handleFormChange} className="input-field" placeholder=" " /><label htmlFor="instagram" className="input-label">Instagram</label></div>
                                    <div className="input-group"><input type="date" id="date" name="date" value={formData.date} onChange={handleFormChange} className="input-field" placeholder=" " /><label htmlFor="date" className="input-label">Tanggal Acara</label></div>
                                    <div className="input-group"><input type="text" id="location" name="location" value={formData.location} onChange={handleFormChange} className="input-field" placeholder=" " /><label htmlFor="location" className="input-label">Alamat Acara</label></div>
                                    <h4 className="text-base font-semibold text-gradient border-b border-public-border pb-2 pt-4">Paket & Pembayaran</h4>
                                    <div className="p-4 bg-public-bg rounded-lg space-y-3">
                                        {bookingModal.pkg && (() => {
                                            const pkg = bookingModal.pkg;
                                            const hasDurationOpts = pkg.durationOptions && pkg.durationOptions.length > 0;
                                            const selectedOpt = hasDurationOpts
                                                ? (pkg.durationOptions!.find(o => o.label === formData.durationSelection) || pkg.durationOptions!.find(o => o.default) || pkg.durationOptions![0])
                                                : null;
                                            const photographers = selectedOpt?.photographers || pkg.photographers;
                                            const videographers = selectedOpt?.videographers || pkg.videographers;
                                            const processingTime = selectedOpt?.processingTime || pkg.processingTime;
                                            const digitalItems = (selectedOpt?.digitalItems?.filter(Boolean).length ? selectedOpt.digitalItems : pkg.digitalItems)?.filter(Boolean) || [];
                                            const physicalItems = (selectedOpt?.physicalItems?.filter((p: { name?: string }) => p?.name).length ? selectedOpt.physicalItems : pkg.physicalItems)?.filter((p: { name?: string }) => p?.name) || [];
                                            const hasAnyDetail = photographers || videographers || processingTime || digitalItems.length > 0 || physicalItems.length > 0;
                                            return (
                                                <div className="mb-3 p-3 border border-public-border bg-public-surface rounded-lg space-y-2">
                                                    <p className="text-xs font-semibold text-public-accent">
                                                        Detail Paket: {pkg.name}
                                                        {selectedOpt && hasDurationOpts && <span className="font-normal text-public-text-secondary"> — {selectedOpt.label}</span>}
                                                    </p>
                                                    {hasAnyDetail ? (
                                                        <ul className="text-xs text-public-text-secondary space-y-1">
                                                            {photographers && <li>• {photographers}</li>}
                                                            {videographers && <li>• {videographers}</li>}
                                                            {processingTime && <li>• Waktu pengerjaan: {processingTime}</li>}
                                                            {digitalItems.map((item: string, i: number) => <li key={i}>• {item}</li>)}
                                                            {physicalItems.map((item: { name: string }, i: number) => <li key={i}>• {item.name}</li>)}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-xs text-public-text-secondary italic">Pilih opsi Jam Kerja untuk melihat detail.</p>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-public-text-secondary">Paket: {bookingModal.pkg?.name}</span>
                                            <span className="text-public-text-primary font-semibold">
                                                {(() => {
                                                    if (!bookingModal.pkg) return formatCurrency(0);
                                                    const opts = bookingModal.pkg.durationOptions;
                                                    if (!opts || opts.length === 0) return formatCurrency(bookingModal.pkg.price);
                                                    const selected = opts.find(o => o.label === formData.durationSelection) || opts.find(o => o.default) || opts[0];
                                                    return formatCurrency(selected?.price ?? bookingModal.pkg.price);
                                                })()}
                                            </span>
                                        </div>
                                        {bookingModal.pkg?.durationOptions && bookingModal.pkg.durationOptions.length > 0 && (
                                            <div className="mt-2">
                                                <label className="text-xs font-semibold text-public-accent">Jam Kerja</label>
                                                <p className="text-xs text-public-text-secondary mt-1 mb-2">Pilih durasi. Detail paket akan berubah sesuai pilihan.</p>
                                                <div className="mt-2 grid grid-cols-2 gap-2">
                                                    {bookingModal.pkg.durationOptions.map(opt => (
                                                        <label key={opt.label} className="flex items-center justify-between p-2 rounded-md border border-public-border cursor-pointer hover:bg-public-surface">
                                                            <span className="text-sm">{opt.label}</span>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm text-public-text-secondary">{formatCurrency(opt.price)}</span>
                                                                <input type="radio" name="durationSelection" value={opt.label} checked={formData.durationSelection === opt.label} onChange={handleFormChange} />
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {formData.selectedAddOnIds.length > 0 && addOns.filter(a => formData.selectedAddOnIds.includes(a.id)).map(a => (
                                            <div key={a.id} className="flex justify-between items-center text-sm"><span className="text-public-text-secondary pl-4">Add-on: {a.name}</span><span className="text-public-text-primary font-semibold">{formatCurrency(a.price)}</span></div>
                                        ))}
                                        {Number(formData.transportCost) > 0 && <div className="flex justify-between items-center text-sm"><span className="text-public-text-secondary">Fee Transport</span><span className="text-public-text-primary font-semibold">{formatCurrency(Number(formData.transportCost) || 0)}</span></div>}
                                        {discountAmount > 0 && <div className="flex justify-between items-center text-sm"><span className="text-public-text-secondary">Diskon ({discountText})</span><span className="text-green-500 font-semibold">-{formatCurrency(discountAmount)}</span></div>}
                                        <div className="flex justify-between items-center font-bold text-lg pt-2 border-t border-public-border"><span className="text-public-text-secondary">Total Biaya</span><span className="text-public-text-primary">{formatCurrency(totalProject)}</span></div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-base font-semibold text-gradient border-b border-public-border pb-2">Tambahan</h4>
                                    <div className="input-group"><label className="input-label !static !-top-4 text-public-accent">Add-On Lainnya (Opsional)</label><div className="p-3 border border-public-border bg-public-bg rounded-lg space-y-2 mt-2">{addOns.map(addon => (<label key={addon.id} className="flex items-center justify-between p-1.5 rounded-md hover:bg-public-surface cursor-pointer"><span className="text-sm text-public-text-primary">{addon.name}</span><div className="flex items-center gap-2"><span className="text-sm text-public-text-secondary">{formatCurrency(addon.price)}</span><input type="checkbox" id={addon.id} name="addOns" checked={formData.selectedAddOnIds.includes(addon.id)} onChange={handleFormChange} className="h-4 w-4 rounded flex-shrink-0 text-brand-accent focus:ring-brand-accent transition" /></div></label>))}</div></div>
                                    <div className="input-group">
                                        <input type="text" id="promoCode" name="promoCode" value={formData.promoCode} onChange={handleFormChange} className="input-field" placeholder=" " />
                                        <label htmlFor="promoCode" className="input-label">Kode Promo (Opsional)</label>
                                        {promoFeedback.message && <p className={`text-xs mt-1 ${promoFeedback.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{promoFeedback.message}</p>}
                                    </div>
                                    <div className="input-group">
                                        <RupiahInput
                                            id="transportCost"
                                            name="transportCost"
                                            value={String(formData.transportCost ?? '')}
                                            onChange={(raw) => setFormData(prev => ({ ...prev, transportCost: raw }))}
                                            className="input-field"
                                            placeholder=" "
                                        />
                                        <label htmlFor="transportCost" className="input-label">Fee Transport (Opsional)</label>
                                    </div>
                                    <div className="p-4 bg-public-bg rounded-lg">
                                        <p className="text-sm text-public-text-secondary">Silakan transfer Uang Muka (DP) ke rekening:</p>
                                        <p className="font-semibold text-public-text-primary text-center py-2 bg-public-surface rounded-md border border-public-border mt-2">{userProfile.bankAccount}</p>
                                        <div className="grid grid-cols-2 gap-4 mt-3">
                                            <div className="input-group !mt-0">
                                                <RupiahInput
                                                    id="dp"
                                                    name="dp"
                                                    value={String(formData.dp ?? '')}
                                                    onChange={(raw) => setFormData(prev => ({ ...prev, dp: raw }))}
                                                    className="input-field text-right"
                                                    placeholder=" "
                                                />
                                                <label htmlFor="dp" className="input-label">Jumlah DP</label>
                                                <p className="text-xs text-public-text-secondary mt-1 text-right">Saran DP (30%): {formatCurrency(suggestedDp)}</p>
                                            </div>
                                            <div className="input-group !mt-0"><input type="text" name="dpPaymentRef" id="dpPaymentRef" value={formData.dpPaymentRef} onChange={handleFormChange} className="input-field" placeholder=" " /><label htmlFor="dpPaymentRef" className="input-label">No. Ref / 4 Digit Rek</label></div>
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label htmlFor="dpPaymentProof" className="input-label !static !-top-4 text-public-accent">Unggah Bukti Transfer DP</label>
                                        <div className="mt-2 flex justify-center rounded-lg border border-dashed border-public-border px-6 py-10">
                                            <div className="text-center">
                                                <UploadIcon className="mx-auto h-12 w-12 text-public-text-secondary" />
                                                <div className="mt-4 flex text-sm leading-6 text-public-text-secondary">
                                                    <label htmlFor="dpPaymentProof" className="relative cursor-pointer rounded-md bg-public-surface font-semibold text-public-accent focus-within:outline-none hover:text-public-accent-hover">
                                                        <span>Unggah file</span>
                                                        <input id="dpPaymentProof" name="dpPaymentProof" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/jpg, application/pdf" />
                                                    </label>
                                                    <p className="pl-1">atau seret dan lepas</p>
                                                </div>
                                                <p className="text-xs leading-5 text-public-text-secondary">PNG, JPG, PDF hingga 10MB</p>
                                            </div>
                                        </div>
                                        {paymentProof && <div className="mt-2 text-sm text-public-text-primary bg-public-bg p-2 rounded-md">File terpilih: <span className="font-semibold">{paymentProof.name}</span></div>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-public-border">
                                <button type="button" onClick={handleCloseBookingModal} className="button-secondary">Batal</button>
                                <button type="submit" disabled={isSubmitting} className="button-primary">{isSubmitting ? 'Mengirim...' : 'Kirim Booking'}</button>
                            </div>
                            <div className="mt-6 flex justify-center items-center gap-4">
                                <button type="button" onClick={() => setIsTermsModalOpen(true)} className="text-xs font-semibold text-public-accent hover:underline">
                                    Lihat Syarat & Ketentuan Umum
                                </button>
                            </div>
                        </form>
                    )}
                </Modal>
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
        )
    );
};

export default PublicPackages;
