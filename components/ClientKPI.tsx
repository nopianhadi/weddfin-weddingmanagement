import React, { useMemo, useState } from 'react';
import { Client, Lead, Project, ClientStatus, ContactChannel, ClientFeedback, SatisfactionLevel } from '../types';
import PageHeader from './PageHeader';
import Modal from './Modal';
import StatCard from './StatCard';
import DonutChart from './DonutChart';
import { UsersIcon, TargetIcon, TrendingUpIcon, DollarSignIcon, PlusIcon, Share2Icon, StarIcon, SmileIcon, ThumbsUpIcon, MehIcon, FrownIcon, LightbulbIcon } from '../constants';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const StarRatingDisplay: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
            <StarIcon key={star} className={`w-5 h-5 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
        ))}
    </div>
);

const emptyFeedbackForm = { clientName: '', rating: 5, feedback: '' };

interface ClientReportsProps {
    clients: Client[];
    leads: Lead[];
    projects: Project[];
    feedback: ClientFeedback[];
    setFeedback: React.Dispatch<React.SetStateAction<ClientFeedback[]>>;
    showNotification: (message: string) => void;
}

const ClientReports: React.FC<ClientReportsProps> = ({ clients, leads, projects, feedback, setFeedback, showNotification }) => {
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [manualFeedbackForm, setManualFeedbackForm] = useState(emptyFeedbackForm);
    const [activeStatModal, setActiveStatModal] = useState<'total' | 'active' | 'very-satisfied' | 'satisfied' | 'neutral' | 'unsatisfied' | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const filteredLeads = useMemo(() => {
        if (!dateFrom && !dateTo) return leads;
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from) from.setHours(0, 0, 0, 0);
        if (to) to.setHours(23, 59, 59, 999);
        return leads.filter(l => {
            const leadDate = new Date(l.date);
            return (!from || leadDate >= from) && (!to || leadDate <= to);
        });
    }, [leads, dateFrom, dateTo]);

    const filteredClients = useMemo(() => {
        if (!dateFrom && !dateTo) return clients;
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from) from.setHours(0, 0, 0, 0);
        if (to) to.setHours(23, 59, 59, 999);
        return clients.filter(c => {
            const clientDate = new Date(c.since);
            return (!from || clientDate >= from) && (!to || clientDate <= to);
        });
    }, [clients, dateFrom, dateTo]);

    const filteredProjects = useMemo(() => {
        if (!dateFrom && !dateTo) return projects;
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from) from.setHours(0, 0, 0, 0);
        if (to) to.setHours(23, 59, 59, 999);
        return projects.filter(p => {
            const projectDate = new Date(p.date);
            return (!from || projectDate >= from) && (!to || projectDate <= to);
        });
    }, [projects, dateFrom, dateTo]);

    const filteredFeedback = useMemo(() => {
        if (!dateFrom && !dateTo) return feedback;
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from) from.setHours(0, 0, 0, 0);
        if (to) to.setHours(23, 59, 59, 999);
        return feedback.filter(f => {
            const feedbackDate = new Date(f.date);
            return (!from || feedbackDate >= from) && (!to || feedbackDate <= to);
        });
    }, [feedback, dateFrom, dateTo]);


    const kpiData = useMemo(() => {
        const totalLeads = filteredLeads.length;
        const convertedLeads = filteredClients.length;
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

        const totalRevenue = filteredProjects.reduce((sum, p) => sum + p.totalCost, 0);
        const avgRevenuePerClient = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;

        const leadSourceDistribution = filteredLeads.reduce((acc, lead) => {
            acc[lead.contactChannel] = (acc[lead.contactChannel] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const sourceColors: { [key in ContactChannel]?: string } = {
            [ContactChannel.INSTAGRAM]: '#c13584',
            [ContactChannel.WHATSAPP]: '#25D366',
            [ContactChannel.WEBSITE]: '#3b82f6',
            [ContactChannel.REFERRAL]: '#f59e0b',
            [ContactChannel.PHONE]: '#8b5cf6',
            [ContactChannel.SUGGESTION_FORM]: '#14b8a6',
            [ContactChannel.OTHER]: '#64748b'
        };

        const leadSourceDonutData = Object.entries(leadSourceDistribution)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .map(([label, value]) => ({
                label,
                value,
                color: sourceColors[label as ContactChannel] || '#64748b',
            }));

        return {
            totalClients: filteredClients.length,
            activeClients: filteredClients.filter(c => c.status === ClientStatus.ACTIVE).length,
            conversionRate: conversionRate.toFixed(1) + '%',
            avgRevenuePerClient: formatCurrency(avgRevenuePerClient),
            leadSourceDonutData,
        };
    }, [filteredClients, filteredLeads, filteredProjects]);

    const feedbackBySatisfaction = useMemo(() => {
        return filteredFeedback.reduce((acc, item) => {
            if (!acc[item.satisfaction]) {
                acc[item.satisfaction] = [];
            }
            acc[item.satisfaction].push(item);
            return acc;
        }, {} as Record<SatisfactionLevel, ClientFeedback[]>);
    }, [filteredFeedback]);

    const satisfactionCounts = useMemo(() => ({
        [SatisfactionLevel.VERY_SATISFIED]: (feedbackBySatisfaction[SatisfactionLevel.VERY_SATISFIED] || []).length,
        [SatisfactionLevel.SATISFIED]: (feedbackBySatisfaction[SatisfactionLevel.SATISFIED] || []).length,
        [SatisfactionLevel.NEUTRAL]: (feedbackBySatisfaction[SatisfactionLevel.NEUTRAL] || []).length,
        [SatisfactionLevel.UNSATISFIED]: (feedbackBySatisfaction[SatisfactionLevel.UNSATISFIED] || []).length,
    }), [feedbackBySatisfaction]);

    const actionRecommendations = useMemo(() => {
        const recommendations = [];
        if (satisfactionCounts[SatisfactionLevel.UNSATISFIED] > 0) {
            recommendations.push({
                id: 'follow-up',
                icon: <FrownIcon className="w-6 h-6 text-red-400" />,
                title: "Tindak Lanjuti Testimoni Pengantin Negatif",
                text: `Ada ${satisfactionCounts[SatisfactionLevel.UNSATISFIED]} pengantin yang tidak puas. Segera hubungi mereka untuk memahami masalah dan menawarkan solusi.`
            });
        }
        if (satisfactionCounts[SatisfactionLevel.VERY_SATISFIED] > 2) {
            recommendations.push({
                id: 'testimonials',
                icon: <SmileIcon className="w-6 h-6 text-green-400" />,
                title: "Manfaatkan Testimoni Positif",
                text: "Anda memiliki banyak ulasan 'Sangat Puas'. Minta izin kepada pengantin tersebut untuk menjadikan masukan mereka sebagai testimoni di media sosial atau website Anda."
            });
        }
        if (satisfactionCounts[SatisfactionLevel.NEUTRAL] > 0) {
            recommendations.push({
                id: 'analyze',
                icon: <MehIcon className="w-6 h-6 text-yellow-400" />,
                title: "Analisis Testimoni Pengantin Netral",
                text: "Pelajari masukan dari pengantin yang merasa biasa saja untuk menemukan area-area kecil yang bisa ditingkatkan untuk pengalaman yang lebih baik."
            });
        }
        return recommendations;
    }, [satisfactionCounts]);

    const getSatisfactionClass = (satisfaction: SatisfactionLevel) => {
        switch (satisfaction) {
            case SatisfactionLevel.VERY_SATISFIED: return 'bg-green-500/20 text-green-400';
            case SatisfactionLevel.SATISFIED: return 'bg-sky-500/20 text-sky-400';
            case SatisfactionLevel.NEUTRAL: return 'bg-yellow-500/20 text-yellow-400';
            case SatisfactionLevel.UNSATISFIED: return 'bg-red-500/20 text-red-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    }

    const feedbackFormUrl = useMemo(() => {
        return `${window.location.origin}${window.location.pathname}#/feedback`;
    }, []);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(feedbackFormUrl).then(() => {
            showNotification('Tautan berhasil disalin!');
            setIsShareModalOpen(false);
        }, (err) => {
            console.error('Could not copy text: ', err);
            alert('Gagal menyalin tautan.');
        });
    };

    const handleManualFeedbackChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setManualFeedbackForm(prev => ({ ...prev, [name]: name === 'rating' ? Number(value) : value }));
    };

    const getSatisfactionFromRating = (rating: number): SatisfactionLevel => {
        if (rating >= 5) return SatisfactionLevel.VERY_SATISFIED;
        if (rating >= 4) return SatisfactionLevel.SATISFIED;
        if (rating >= 3) return SatisfactionLevel.NEUTRAL;
        return SatisfactionLevel.UNSATISFIED;
    };

    const handleManualFeedbackSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newFeedback: ClientFeedback = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            clientName: manualFeedbackForm.clientName,
            rating: manualFeedbackForm.rating,
            satisfaction: getSatisfactionFromRating(manualFeedbackForm.rating),
            feedback: manualFeedbackForm.feedback
        };
        setFeedback(prev => [newFeedback, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        setIsFeedbackModalOpen(false);
        setManualFeedbackForm(emptyFeedbackForm);
        showNotification('Masukan berhasil ditambahkan.');
    };

    const activeClientsList = useMemo(() => filteredClients.filter(c => c.status === ClientStatus.ACTIVE), [filteredClients]);

    const modalTitles: { [key: string]: string } = {
        total: 'Daftar Semua Pengantin',
        active: 'Daftar Pengantin Aktif',
        'very-satisfied': 'Masukan: Sangat Puas',
        'satisfied': 'Masukan: Puas',
        'neutral': 'Masukan: Biasa Saja',
        'unsatisfied': 'Masukan: Tidak Puas'
    };

    let modalContent;
    if (activeStatModal) {
        if (activeStatModal === 'total' || activeStatModal === 'active') {
            const clientList = activeStatModal === 'total' ? filteredClients : activeClientsList;
            modalContent = (
                <div className="space-y-3">
                    {clientList.length > 0 ? clientList.map(client => (
                        <div key={client.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-brand-text-light">{client.name}</p>
                                <p className="text-sm text-brand-text-secondary">{client.email}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${client.status === ClientStatus.ACTIVE ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                {client.status}
                            </span>
                        </div>
                    )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada pengantin dalam periode ini.</p>}
                </div>
            );
        } else {
            let satisfactionLevel: SatisfactionLevel | undefined;
            if (activeStatModal === 'very-satisfied') satisfactionLevel = SatisfactionLevel.VERY_SATISFIED;
            if (activeStatModal === 'satisfied') satisfactionLevel = SatisfactionLevel.SATISFIED;
            if (activeStatModal === 'neutral') satisfactionLevel = SatisfactionLevel.NEUTRAL;
            if (activeStatModal === 'unsatisfied') satisfactionLevel = SatisfactionLevel.UNSATISFIED;

            const feedbackList = satisfactionLevel ? (feedbackBySatisfaction[satisfactionLevel] || []) : [];
            modalContent = (
                <div className="space-y-3">
                    {feedbackList.length > 0 ? feedbackList.map(fb => (
                        <div key={fb.id} className="p-3 bg-brand-bg rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold text-brand-text-light">{fb.clientName}</p>
                                <StarRatingDisplay rating={fb.rating} />
                            </div>
                            <p className="text-sm text-brand-text-primary italic">"{fb.feedback}"</p>
                        </div>
                    )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada masukan dalam kategori ini.</p>}
                </div>
            );
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Testimoni"
                subtitle="Analisis terpusat untuk performa akuisisi dan retensi pengantin Anda."
            />

            <div className="bg-brand-surface p-4 rounded-xl shadow-lg border border-brand-border flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                <div className="text-sm font-semibold text-brand-text-secondary whitespace-nowrap">Filter Laporan Berdasarkan Tanggal</div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full"
                    />
                    <span className="text-brand-text-secondary">-</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full"
                    />
                    <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="button-secondary">Reset</button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '100ms' }} onClick={() => setActiveStatModal('total')}>
                    <StatCard icon={<UsersIcon className="w-6 h-6" />} title="Total Pengantin" value={kpiData.totalClients.toString()} iconBgColor="bg-blue-500/20" iconColor="text-blue-400" />
                </div>
                <div className="widget-animate cursor-pointer transition-transform duration-200 hover:scale-105" style={{ animationDelay: '200ms' }} onClick={() => setActiveStatModal('active')}>
                    <StatCard icon={<TrendingUpIcon className="w-6 h-6" />} title="Pengantin Aktif" value={kpiData.activeClients.toString()} iconBgColor="bg-green-500/20" iconColor="text-green-400" />
                </div>
                <div className="widget-animate" style={{ animationDelay: '300ms' }}>
                    <StatCard icon={<TargetIcon className="w-6 h-6" />} title="Tingkat Konversi Prospek" value={kpiData.conversionRate} iconBgColor="bg-yellow-500/20" iconColor="text-yellow-400" />
                </div>
                <div className="widget-animate" style={{ animationDelay: '400ms' }}>
                    <StatCard icon={<DollarSignIcon className="w-6 h-6" />} title="Rata-rata Nilai per Pengantin" value={kpiData.avgRevenuePerClient} iconBgColor="bg-indigo-500/20" iconColor="text-indigo-400" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 widget-animate" style={{ animationDelay: '500ms' }}>
                <div className="lg:col-span-2 bg-brand-surface p-4 md:p-6 rounded-2xl shadow-lg border border-brand-border">
                    <h4 className="text-base md:text-lg font-bold text-gradient mb-3 md:mb-4">Sumber Prospek</h4>
                    <DonutChart data={kpiData.leadSourceDonutData} />
                </div>
                <div className="lg:col-span-3 bg-brand-surface p-4 md:p-6 rounded-2xl shadow-lg border border-brand-border">
                    <h4 className="text-base md:text-lg font-bold text-gradient mb-3 md:mb-4">Daftar Pengantin Terbaru</h4>
                    {/* Mobile cards */}
                    <div className="md:hidden space-y-2 max-h-96 overflow-y-auto">
                        {filteredClients.slice(0, 10).map(client => {
                            const clientProjects = projects.filter(p => p.clientId === client.id);
                            const totalValue = clientProjects.reduce((sum, p) => sum + p.totalCost, 0);
                            return (
                                <div key={client.id} className="bg-brand-bg p-3 rounded-lg">
                                    <p className="font-semibold text-sm text-brand-text-light">{client.name}</p>
                                    <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
                                        <span className="text-brand-text-secondary">Bergabung</span>
                                        <span className="text-right text-brand-text-primary">{new Date(client.since).toLocaleDateString('id-ID')}</span>
                                        <span className="text-brand-text-secondary">Total Nilai</span>
                                        <span className="text-right font-semibold text-brand-text-primary">{formatCurrency(totalValue)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto max-h-96">
                        <table className="w-full text-sm">
                            <thead className="bg-brand-input">
                                <tr>
                                    <th className="p-3 text-left font-semibold text-brand-text-secondary">Pengantin</th>
                                    <th className="p-3 text-left font-semibold text-brand-text-secondary">Bergabung Sejak</th>
                                    <th className="p-3 text-left font-semibold text-brand-text-secondary">Total Paket</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-brand-border">
                                {filteredClients.slice(0, 10).map(client => {
                                    const clientProjects = projects.filter(p => p.clientId === client.id);
                                    const totalValue = clientProjects.reduce((sum, p) => sum + p.totalCost, 0);
                                    return (
                                        <tr key={client.id}>
                                            <td className="p-3 font-medium text-brand-text-primary">{client.name}</td>
                                            <td className="p-3 text-brand-text-secondary">{new Date(client.since).toLocaleDateString('id-ID')}</td>
                                            <td className="p-3 font-semibold text-brand-text-primary">{formatCurrency(totalValue)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-brand-surface p-4 md:p-6 rounded-2xl shadow-lg border border-brand-border widget-animate" style={{ animationDelay: '600ms' }}>
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                    <h4 className="text-base md:text-lg font-bold text-gradient">Analisis Kepuasan Pengantin</h4>
                    <div className="flex items-center gap-2 self-start md:self-center">
                        <button onClick={() => setIsShareModalOpen(true)} className="button-secondary inline-flex items-center gap-2">
                            <Share2Icon className="w-4 h-4" /> Bagikan Form
                        </button>
                        <button onClick={() => setIsFeedbackModalOpen(true)} className="button-primary inline-flex items-center gap-2">
                            <PlusIcon className="w-4 h-4" /> Tambah Masukan
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="cursor-pointer transition-transform duration-200 hover:scale-105" onClick={() => setActiveStatModal('very-satisfied')}>
                        <StatCard icon={<SmileIcon className="w-6 h-6" />} title="Sangat Puas" value={satisfactionCounts[SatisfactionLevel.VERY_SATISFIED].toString()} iconBgColor="bg-green-500/20" iconColor="text-green-400" />
                    </div>
                    <div className="cursor-pointer transition-transform duration-200 hover:scale-105" onClick={() => setActiveStatModal('satisfied')}>
                        <StatCard icon={<ThumbsUpIcon className="w-6 h-6" />} title="Puas" value={satisfactionCounts[SatisfactionLevel.SATISFIED].toString()} iconBgColor="bg-sky-500/20" iconColor="text-sky-400" />
                    </div>
                    <div className="cursor-pointer transition-transform duration-200 hover:scale-105" onClick={() => setActiveStatModal('neutral')}>
                        <StatCard icon={<MehIcon className="w-6 h-6" />} title="Biasa Saja" value={satisfactionCounts[SatisfactionLevel.NEUTRAL].toString()} iconBgColor="bg-yellow-500/20" iconColor="text-yellow-400" />
                    </div>
                    <div className="cursor-pointer transition-transform duration-200 hover:scale-105" onClick={() => setActiveStatModal('unsatisfied')}>
                        <StatCard icon={<FrownIcon className="w-6 h-6" />} title="Tidak Puas" value={satisfactionCounts[SatisfactionLevel.UNSATISFIED].toString()} iconBgColor="bg-red-500/20" iconColor="text-red-400" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-brand-border">
                    <div className="lg:col-span-2">
                        <h5 className="font-semibold text-sm md:text-base text-brand-text-light mb-3">Rekomendasi Aksi</h5>
                        <div className="space-y-2 md:space-y-3">
                            {actionRecommendations.length > 0 ? actionRecommendations.map(rec => (
                                <div key={rec.id} className="bg-brand-bg p-3 md:p-4 rounded-lg flex items-start gap-3 md:gap-4">
                                    <div className="flex-shrink-0 mt-1">{rec.icon}</div>
                                    <div>
                                        <p className="font-medium text-brand-text-light text-xs md:text-sm">{rec.title}</p>
                                        <p className="text-[10px] md:text-xs text-brand-text-secondary">{rec.text}</p>
                                    </div>
                                </div>
                            )) : <p className="text-xs md:text-sm text-center text-brand-text-secondary py-8">Tidak ada rekomendasi khusus saat ini.</p>}
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                        <h5 className="font-semibold text-sm md:text-base text-brand-text-light mb-3">Detail Masukan Terbaru</h5>
                        <div className="space-y-2 md:space-y-3 max-h-[400px] overflow-y-auto pr-2">
                            {filteredFeedback.map(item => (
                                <div key={item.id} className="bg-brand-bg p-3 md:p-4 rounded-lg">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm md:text-base text-brand-text-light truncate">{item.clientName}</p>
                                            <span className={`mt-1 inline-block px-2 py-0.5 text-[10px] md:text-xs font-medium rounded-full ${getSatisfactionClass(item.satisfaction)}`}>
                                                {item.satisfaction}
                                            </span>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <div className="flex items-center">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <StarIcon key={star} className={`w-3 md:w-4 h-3 md:h-4 ${star <= item.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs md:text-sm text-brand-text-primary mt-2 md:mt-3 pt-2 md:pt-3 border-t border-brand-border">"{item.feedback}"</p>
                                    <p className="text-right text-[10px] md:text-xs text-brand-text-secondary mt-2">{new Date(item.date).toLocaleDateString('id-ID')}</p>
                                </div>
                            ))}
                            {filteredFeedback.length === 0 && <p className="text-center text-xs md:text-sm text-brand-text-secondary py-10">Belum ada masukan dari pengantin pada periode ini.</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual Feedback Modal */}
            <Modal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} title="Tambah Masukan Pengantin Manual">
                <form onSubmit={handleManualFeedbackSubmit} className="space-y-4">
                    <div className="input-group">
                        <input type="text" id="clientName" name="clientName" value={manualFeedbackForm.clientName} onChange={handleManualFeedbackChange} className="input-field" placeholder=" " required />
                        <label htmlFor="clientName" className="input-label">Nama Pengantin</label>
                    </div>
                    <div>
                        <label className="text-sm text-brand-text-secondary">Rating</label>
                        <div className="flex items-center gap-2 mt-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <button key={star} type="button" onClick={() => setManualFeedbackForm(p => ({ ...p, rating: star }))} className={`p-2 rounded-full ${manualFeedbackForm.rating >= star ? 'bg-yellow-400/20' : 'bg-brand-input'}`}>
                                    <StarIcon className={`w-6 h-6 ${manualFeedbackForm.rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-500'}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="input-group">
                        <textarea id="feedback" name="feedback" value={manualFeedbackForm.feedback} onChange={handleManualFeedbackChange} className="input-field" placeholder=" " required rows={4}></textarea>
                        <label htmlFor="feedback" className="input-label">Saran / Masukan</label>
                    </div>
                    <div className="flex justify-end items-center gap-3 pt-4 border-t border-brand-border sticky bottom-0 bg-brand-surface">
                        <button type="button" onClick={() => setIsFeedbackModalOpen(false)} className="button-secondary">Batal</button>
                        <button type="submit" className="button-primary">Simpan Masukan</button>
                    </div>
                </form>
            </Modal>

            {/* Share Modal */}
            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Bagikan Formulir Masukan Pengantin" size="lg">
                <div>
                    <p className="text-sm text-brand-text-secondary mb-4">
                        Bagikan tautan ini kepada pengantin Anda setelah acara selesai. Mereka dapat memberikan peringkat dan masukan yang akan langsung tampil di dasbor ini.
                    </p>
                    <div className="input-group">
                        <input type="text" readOnly value={feedbackFormUrl} className="input-field !bg-brand-input" />
                        <label className="input-label">Tautan Formulir Masukan</label>
                    </div>
                    <div className="text-right mt-6">
                        <button onClick={copyToClipboard} className="button-primary">Salin Tautan</button>
                    </div>
                </div>
            </Modal>
            {/* Stat Details Modal */}
            <Modal isOpen={!!activeStatModal} onClose={() => setActiveStatModal(null)} title={activeStatModal ? modalTitles[activeStatModal] : ''} size="2xl">
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {modalContent}
                </div>
            </Modal>
        </div>
    );
};

export default ClientReports;