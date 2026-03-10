import React, { useState, useMemo, useEffect } from 'react';
import { Lead, Client, Project, Package, ViewType, NavigationAction, Profile, BookingStatus } from '../types';
import PageHeader from './PageHeader';
import StatCard from './StatCard';
import Modal from './Modal';
import DonutChart from './DonutChart';
import { UsersIcon, DollarSignIcon, PackageIcon, EyeIcon, MessageSquareIcon, CalendarIcon, CheckCircleIcon, CheckIcon, BanIcon, LayoutGridIcon, ListIcon, MessageCircleIcon, WhatsappIcon, PencilIcon, Trash2Icon } from '../constants';
import { cleanPhoneNumber, CHAT_TEMPLATES } from '../constants';
import { updateProject, deleteProject } from '../services/projects';
import { upsertProfile } from '../services/profile';
import { useChatTemplates } from '../hooks/useChatTemplates';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format to dd/mm/yyyy
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};


const bookingStatusConfig: Record<BookingStatus, { color: string; bgColor: string, icon: React.ReactNode }> = {
    [BookingStatus.BARU]: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: <MessageSquareIcon className="w-4 h-4" /> },
    [BookingStatus.TERKONFIRMASI]: { color: 'text-green-400', bgColor: 'bg-green-500/10', icon: <CheckCircleIcon className="w-4 h-4" /> },
    [BookingStatus.DITOLAK]: { color: 'text-red-400', bgColor: 'bg-red-500/10', icon: <BanIcon className="w-4 h-4" /> },
};

const BookingChart: React.FC<{ bookings: { lead: Lead; project: Project }[] }> = ({ bookings }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; data: { name: string; count: number; value: number } } | null>(null);

    const chartData = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        const data = months.map(month => ({ name: month, count: 0, value: 0 }));

        bookings.forEach(booking => {
            const bookingDate = new Date(booking.lead.date);
            if (bookingDate.getFullYear() === currentYear) {
                const monthIndex = bookingDate.getMonth();
                data[monthIndex].count += 1;
                data[monthIndex].value += booking.project.totalCost;
            }
        });
        return data;
    }, [bookings]);

    const maxCount = Math.max(...chartData.map(d => d.count), 1);
    const maxValue = Math.max(...chartData.map(d => d.value), 1);

    const hasData = chartData.some(d => d.count > 0 || d.value > 0);

    if (!hasData) {
        return (
            <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
                <h3 className="font-bold text-lg text-gradient mb-6">Grafik Booking Tahun Ini</h3>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-brand-bg border-2 border-dashed border-brand-border flex items-center justify-center mb-3">
                        <svg className="w-10 h-10 text-brand-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-brand-text-light mb-1">Belum Ada Booking Tahun Ini</p>
                    <p className="text-xs text-brand-text-secondary">Data booking akan muncul di sini</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border h-full">
            <h3 className="font-bold text-lg text-gradient mb-2">Grafik Booking Tahun Ini</h3>
            <p className="text-xs text-brand-text-secondary mb-6">Jumlah dan nilai booking per bulan</p>
            <div className="h-48 flex justify-between items-end gap-1.5 relative bg-brand-bg/30 rounded-lg p-3">
                {chartData.map((item, index) => {
                    const countHeight = Math.max((item.count / maxCount) * 100, 3);
                    const valueHeight = Math.max((item.value / maxValue) * 100, 3);
                    const isHovered = tooltip?.data.name === item.name;
                    return (
                        <div
                            key={item.name}
                            className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                            onMouseEnter={() => setTooltip({ x: (index / chartData.length) * 100, y: 0, data: item })}
                            onMouseLeave={() => setTooltip(null)}
                        >
                            <div className="flex-1 flex items-end w-full justify-center gap-0.5">
                                <div
                                    className={`w-1/2 rounded-t-md transition-all duration-300 ${isHovered ? 'bg-blue-500 shadow-lg' : 'bg-blue-500/40 hover:bg-blue-500/60'}`}
                                    style={{ height: `${countHeight}%` }}
                                ></div>
                                <div
                                    className={`w-1/2 rounded-t-md transition-all duration-300 ${isHovered ? 'bg-green-500 shadow-lg' : 'bg-green-500/40 hover:bg-green-500/60'}`}
                                    style={{ height: `${valueHeight}%` }}
                                ></div>
                            </div>
                            <span className={`text-[10px] mt-2 transition-colors ${isHovered ? 'text-brand-accent font-semibold' : 'text-brand-text-secondary'}`}>
                                {item.name}
                            </span>
                        </div>
                    );
                })}
                {tooltip && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-br from-brand-surface to-brand-bg border-2 border-brand-accent/30 p-3 rounded-xl shadow-2xl text-xs z-10 min-w-[160px]">
                        <p className="font-bold text-center border-b border-brand-accent/30 pb-1.5 mb-2 text-brand-accent">{tooltip.data.name}</p>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                                    <span className="text-brand-text-secondary">Jumlah</span>
                                </div>
                                <span className="font-semibold text-blue-400">{tooltip.data.count}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                                    <span className="text-brand-text-secondary">Nilai</span>
                                </div>
                                <span className="font-semibold text-green-400">{formatCurrency(tooltip.data.value)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex justify-center items-center gap-6 text-xs mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500/40 rounded-md"></div>
                    <span className="text-brand-text-secondary">Jumlah Booking</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500/40 rounded-md"></div>
                    <span className="text-brand-text-secondary">Nilai Booking</span>
                </div>
            </div>
        </div>
    );
};


interface WhatsappTemplateModalProps {
    project: Project;
    client: Client;
    onClose: () => void;
    showNotification: (message: string) => void;
    userProfile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
}

const WhatsappTemplateModal: React.FC<WhatsappTemplateModalProps> = ({ project, client, onClose, showNotification, userProfile, setProfile }) => {
    const { templates, processTemplate: processTemplateFunc, updateTemplate, isOnline } = useChatTemplates(userProfile);
    const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id || '');
    const [customMessage, setCustomMessage] = useState('');

    useEffect(() => {
        const template = templates.find(t => t.id === selectedTemplate)?.template || '';
        const processedMessage = processTemplateFunc(template, {
            clientName: client.name,
            projectName: project.projectName,
        });
        setCustomMessage(processedMessage);
    }, [selectedTemplate, client, project, templates, processTemplateFunc]);

    // Ensure selectedTemplate is always valid when templates list changes
    useEffect(() => {
        if (!templates.find(t => t.id === selectedTemplate)) {
            setSelectedTemplate(templates[0]?.id || '');
        }
    }, [templates, selectedTemplate]);

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplate(templateId);
    };

    const handleShareToWhatsApp = () => {
        if (!client.phone) {
            showNotification('Nomor telepon pengantin tidak tersedia.');
            return;
        }
        const phoneNumber = cleanPhoneNumber(client.phone);
        const encodedMessage = encodeURIComponent(customMessage);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    const handleSaveTemplate = async () => {
        const rawTemplate = customMessage
            .replace(new RegExp(client.name, 'g'), '{clientName}')
            .replace(new RegExp(project.projectName, 'g'), '{projectName}');

        try {
            await updateTemplate(selectedTemplate, { template: rawTemplate });
            showNotification(isOnline ? 'Template berhasil disimpan!' : 'Template disimpan offline, akan disinkronkan saat online');
        } catch (err) {
            console.error('[Chat Template] Gagal menyimpan template:', err);
            showNotification('Gagal menyimpan template.');
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Kirim Pesan ke ${client.name}`} size="2xl">
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-semibold text-brand-text-secondary">Gunakan Template Pesan:</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {templates.map(template => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => handleSelectTemplate(template.id)}
                                className={`button-secondary !text-xs !px-3 !py-1.5 ${selectedTemplate === template.id ? '!bg-brand-accent !text-white !border-brand-accent' : ''}`}
                            >
                                {template.title}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="input-group">
                    <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)} rows={8} className="input-field"></textarea>
                    <label className="input-label">Isi Pesan</label>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-brand-border">
                    <button onClick={handleSaveTemplate} className="button-secondary">Simpan Template Ini</button>
                    <button onClick={handleShareToWhatsApp} className="button-primary inline-flex items-center gap-2">
                        <WhatsappIcon className="w-5 h-5" /> Kirim via WhatsApp
                    </button>
                </div>
            </div>
        </Modal>
    );
};


interface BookingProps {
    leads: Lead[];
    clients: Client[];
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    packages: Package[];
    userProfile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
    handleNavigation: (view: ViewType, action?: NavigationAction) => void;
    showNotification: (message: string) => void;
}

const Booking: React.FC<BookingProps> = ({ leads, clients, projects, setProjects, packages, userProfile, setProfile, handleNavigation, showNotification }) => {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
    const [whatsappTemplateModal, setWhatsappTemplateModal] = useState<{ project: Project, client: Client } | null>(null);
    const [activeStatModal, setActiveStatModal] = useState<string | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    const allBookings = useMemo(() => {
        return projects
            .filter(p => p.bookingStatus)
            .map(project => {
                const lead = leads.find(l => l.notes?.includes(project.clientId)) || {
                    id: `lead-fallback-${project.id}`,
                    name: project.clientName,
                    date: project.date, // Fallback to project date
                };
                return { lead: lead as Lead, project };
            })
            .sort((a, b) => new Date(b.lead.date).getTime() - new Date(a.lead.date).getTime());
    }, [projects, leads]);

    const newBookings = useMemo(() => allBookings.filter(b => b.project.bookingStatus === BookingStatus.BARU), [allBookings]);
    const confirmedBookings = useMemo(() => allBookings.filter(b => b.project.bookingStatus === BookingStatus.TERKONFIRMASI), [allBookings]);

    const filteredNewBookings = useMemo(() => {
        return newBookings.filter(booking => {
            const from = dateFrom ? new Date(dateFrom) : null;
            const to = dateTo ? new Date(dateTo) : null;
            if (from) from.setHours(0, 0, 0, 0);
            if (to) to.setHours(23, 59, 59, 999);
            const bookingDate = new Date(booking.lead.date);
            const dateMatch = (!from || bookingDate >= from) && (!to || bookingDate <= to);
            return dateMatch;
        });
    }, [newBookings, dateFrom, dateTo]);

    // Removed public booking share feature per request

    const packageDonutData = useMemo(() => {
        const packageCounts = allBookings.reduce((acc, booking) => {
            const name = booking.project.packageName || 'Unknown';
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const colors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444'];
        return Object.entries(packageCounts)
            .map(([label, value], i) => ({
                label,
                value,
                color: colors[i % colors.length]
            }));
    }, [allBookings]);

    // Removed share QR generation effect

    // Removed share helpers (copy link, download QR)

    const mostPopularPackage = useMemo(() => {
        const counts = allBookings.reduce((acc, p) => { acc[p.project.packageName] = (acc[p.project.packageName] || 0) + 1; return acc; }, {} as Record<string, number>);
        return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'N/A';
    }, [allBookings]);

    const statModalData = useMemo(() => {
        if (!activeStatModal) return { title: '', bookings: [] };

        switch (activeStatModal) {
            case 'total':
                return { title: 'Semua Booking', bookings: allBookings };
            case 'value':
                return { title: 'Semua Booking (berdasarkan Nilai)', bookings: allBookings };
            case 'popular':
                return { title: `Booking untuk Paket: ${mostPopularPackage}`, bookings: allBookings.filter(b => b.project.packageName === mostPopularPackage) };
            case 'new':
                return { title: 'Booking Baru', bookings: newBookings };
            default:
                return { title: '', bookings: [] };
        }
    }, [activeStatModal, allBookings, newBookings, mostPopularPackage]);

    const handleDeleteBooking = async (projectId: string, clientName: string) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus booking untuk ${clientName}? Tindakan ini tidak dapat dibatalkan.`)) return;
        try {
            await deleteProject(projectId);
            setProjects(prev => prev.filter(p => p.id !== projectId));
            showNotification('Booking berhasil dihapus.');
        } catch (err) {
            console.error('[Booking] Failed to delete booking:', err);
            showNotification('Gagal menghapus booking. Silakan coba lagi.');
        }
    };

    const handleEditBooking = (clientId: string) => {
        handleNavigation(ViewType.CLIENTS, { type: 'VIEW_CLIENT_DETAILS', id: clientId });
    };

    const handleStatusChange = async (projectId: string, newStatus: BookingStatus) => {
        const prevStatus = projects.find(p => p.id === projectId)?.bookingStatus;
        // Optimistic update
        setProjects(prev => prev.map(p => (p.id === projectId ? { ...p, bookingStatus: newStatus } : p)));
        try {
            await updateProject(projectId, { bookingStatus: newStatus });
            showNotification(`Booking berhasil ${newStatus === BookingStatus.TERKONFIRMASI ? 'dikonfirmasi' : 'ditolak'}.`);
        } catch (err) {
            console.warn('[Booking] Failed to persist booking status:', err);
            // Revert on failure
            setProjects(prev => prev.map(p => (p.id === projectId ? { ...p, bookingStatus: prevStatus } : p)));
            showNotification('Gagal menyimpan perubahan status booking. Silakan coba lagi.');
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Jadwal Wedding" subtitle="Pantau seluruh jadwal acara, acara wedding, dan pengingat pelunasan." icon={<CalendarIcon className="w-6 h-6" />} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div onClick={() => setActiveStatModal('total')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <StatCard icon={<UsersIcon className="w-6 h-6" />} title="Total Booking" value={allBookings.length.toString()} subtitle="Semua booking yang masuk" colorVariant="blue" />
                </div>
                <div onClick={() => setActiveStatModal('value')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <StatCard icon={<DollarSignIcon className="w-6 h-6" />} title="Total Nilai Booking" value={formatCurrency(allBookings.reduce((sum, b) => sum + b.project.totalCost, 0))} subtitle="Nilai keseluruhan booking" colorVariant="orange" />
                </div>
                <div onClick={() => setActiveStatModal('popular')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <StatCard icon={<PackageIcon className="w-6 h-6" />} title="Paket Terpopuler" value={mostPopularPackage} subtitle="Paket paling banyak dipilih" colorVariant="purple" />
                </div>
                <div onClick={() => setActiveStatModal('new')} className="cursor-pointer transition-transform duration-200 hover:scale-105">
                    <StatCard icon={<MessageSquareIcon className="w-6 h-6" />} title="Booking Baru" value={newBookings.length.toString()} subtitle="Menunggu konfirmasi" colorVariant="pink" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <BookingChart bookings={allBookings} />
                </div>
                <div className="lg:col-span-2 bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border">
                    <h3 className="font-bold text-lg text-gradient mb-4">Distribusi Paket</h3>
                    <DonutChart data={packageDonutData} />
                </div>
            </div>

            {/* Booking Baru Section */}
            <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                <div className="p-4 border-b border-brand-border">
                    <h3 className="font-semibold text-brand-text-light">Booking Baru Menunggu Konfirmasi ({newBookings.length})</h3>
                </div>
                <div className="p-4 flex items-center gap-4">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" placeholder="Dari Tanggal" />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field !rounded-lg !border !bg-brand-bg p-2.5 w-full" placeholder="Sampai Tanggal" />
                </div>
                {/* Mobile cards */}
                <div className="md:hidden p-4 space-y-3">
                    {filteredNewBookings.map(booking => (
                        <div key={booking.project.id} className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-brand-text-light leading-tight">{booking.project.clientName}</p>
                                    <p className="text-xs text-brand-text-secondary mt-0.5">{booking.project.projectName}</p>
                                    <p className="text-[11px] text-brand-text-secondary mt-1">{formatDate(booking.lead.date)} • {booking.project.projectType}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold">{booking.project.packageName}</p>
                                    <p className="text-xs text-brand-text-secondary">{booking.project.location}</p>
                                </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-brand-text-secondary">Total Biaya</span>
                                <span className="text-right font-semibold">{formatCurrency(booking.project.totalCost)}</span>
                                <span className="text-brand-text-secondary">DP Dibayar</span>
                                <span className="text-right font-semibold text-green-400">{formatCurrency(booking.project.amountPaid)}</span>
                            </div>
                            <div className="mt-3 flex items-center justify-end gap-2">
                                {booking.project.dpProofUrl ? (
                                    <button onClick={() => setViewingProofUrl(booking.project.dpProofUrl!)} className="button-secondary !text-xs !px-3 !py-2">Lihat Bukti</button>
                                ) : (
                                    <span className="text-xs text-brand-text-secondary">-</span>
                                )}
                                <button onClick={() => handleEditBooking(booking.project.clientId)} className="button-secondary !text-xs !px-3 !py-2 inline-flex items-center gap-1"><PencilIcon className="w-3 h-3" /> Edit</button>
                                <button onClick={() => handleDeleteBooking(booking.project.id, booking.project.clientName)} className="button-secondary !text-xs !px-3 !py-2 !text-brand-danger !border-brand-danger hover:!bg-brand-danger/10 inline-flex items-center gap-1"><Trash2Icon className="w-3 h-3" /> Hapus</button>
                                <button onClick={() => handleStatusChange(booking.project.id, BookingStatus.TERKONFIRMASI)} className="button-primary !text-xs !px-3 !py-2">Konfirmasi</button>
                            </div>
                        </div>
                    ))}
                    {filteredNewBookings.length === 0 && (
                        <p className="text-center py-6 text-sm text-brand-text-secondary">Tidak ada booking baru yang cocok dengan filter.</p>
                    )}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="px-4 py-3">Tanggal Booking</th>
                                <th className="px-4 py-3">Nama Pengantin</th>
                                <th className="px-4 py-3">Nama Acara</th>
                                <th className="px-4 py-3">Jenis Acara</th>
                                <th className="px-4 py-3">Lokasi</th>
                                <th className="px-4 py-3">Paket</th>
                                <th className="px-4 py-3 text-right">Total Biaya</th>
                                <th className="px-4 py-3 text-right">DP Dibayar</th>
                                <th className="px-4 py-3 text-center">Bukti Bayar</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {filteredNewBookings.map(booking => (
                                <tr key={booking.project.id} className="hover:bg-brand-bg">
                                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(booking.lead.date)}</td>
                                    <td className="px-4 py-3 font-semibold text-brand-text-light">{booking.project.clientName}</td>
                                    <td className="px-4 py-3">{booking.project.projectName}</td>
                                    <td className="px-4 py-3">{booking.project.projectType}</td>
                                    <td className="px-4 py-3">{booking.project.location}</td>
                                    <td className="px-4 py-3">{booking.project.packageName}</td>
                                    <td className="px-4 py-3 text-right">{formatCurrency(booking.project.totalCost)}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-green-400">{formatCurrency(booking.project.amountPaid)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {booking.project.dpProofUrl ? (
                                            <button
                                                onClick={() => setViewingProofUrl(booking.project.dpProofUrl!)}
                                                className="button-secondary !text-xs !px-3 !py-1.5"
                                            >
                                                Lihat Bukti
                                            </button>
                                        ) : (
                                            <span className="text-brand-text-secondary">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => handleEditBooking(booking.project.clientId)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit Booking"><PencilIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteBooking(booking.project.id, booking.project.clientName)} className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-full" title="Hapus Booking"><Trash2Icon className="w-4 h-4" /></button>
                                            <button
                                                onClick={() => handleStatusChange(booking.project.id, BookingStatus.TERKONFIRMASI)}
                                                className="button-primary !text-xs !px-3 !py-1.5"
                                            >
                                                Konfirmasi
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredNewBookings.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="text-center py-8 text-brand-text-secondary">Tidak ada booking baru yang cocok dengan filter.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Riwayat Booking Section */}
            <div className="bg-brand-surface rounded-2xl shadow-lg border border-brand-border">
                <div className="p-4 border-b border-brand-border">
                    <h3 className="font-semibold text-brand-text-light">Riwayat Booking Dikonfirmasi ({confirmedBookings.length})</h3>
                </div>
                {/* Mobile cards */}
                <div className="md:hidden p-4 space-y-3">
                    {confirmedBookings.map(booking => {
                        const client = clients.find(c => c.id === booking.project.clientId);
                        return (
                            <div key={booking.project.id} className="rounded-2xl bg-white/5 border border-brand-border p-4 shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-semibold text-brand-text-light leading-tight">{booking.project.clientName}</p>
                                        <p className="text-xs text-brand-text-secondary mt-0.5">{booking.project.projectName}</p>
                                        <p className="text-[11px] text-brand-text-secondary mt-1">{formatDate(booking.lead.date)} • {booking.project.projectType}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">{booking.project.packageName}</p>
                                        <p className="text-xs text-brand-text-secondary">{booking.project.location}</p>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                                    <span className="text-brand-text-secondary">Total Biaya</span>
                                    <span className="text-right font-semibold">{formatCurrency(booking.project.totalCost)}</span>
                                    <span className="text-brand-text-secondary">DP Dibayar</span>
                                    <span className="text-right font-semibold text-green-400">{formatCurrency(booking.project.amountPaid)}</span>
                                </div>
                                <div className="mt-3 flex items-center justify-end gap-2">
                                    {client && (
                                        <button onClick={() => setWhatsappTemplateModal({ project: booking.project, client })} className="button-secondary !text-xs !px-3 !py-2">Chat & WA</button>
                                    )}
                                    <button onClick={() => handleEditBooking(booking.project.clientId)} className="button-secondary !text-xs !px-3 !py-2 inline-flex items-center gap-1"><PencilIcon className="w-3 h-3" /> Edit</button>
                                    <button onClick={() => handleDeleteBooking(booking.project.id, booking.project.clientName)} className="button-secondary !text-xs !px-3 !py-2 !text-brand-danger !border-brand-danger hover:!bg-brand-danger/10 inline-flex items-center gap-1"><Trash2Icon className="w-3 h-3" /> Hapus</button>
                                    <button onClick={() => handleNavigation(ViewType.CLIENTS, { type: 'VIEW_CLIENT_DETAILS', id: booking.project.clientId })} className="button-secondary !text-xs !px-3 !py-2">Lihat Detail</button>
                                </div>
                            </div>
                        );
                    })}
                    {confirmedBookings.length === 0 && (
                        <p className="text-center py-6 text-sm text-brand-text-secondary">Belum ada booking yang dikonfirmasi.</p>
                    )}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-brand-text-secondary uppercase">
                            <tr>
                                <th className="px-4 py-3">Tanggal Booking</th>
                                <th className="px-4 py-3">Nama Pengantin</th>
                                <th className="px-4 py-3">Nama Acara</th>
                                <th className="px-4 py-3">Jenis Acara</th>
                                <th className="px-4 py-3">Lokasi</th>
                                <th className="px-4 py-3">Paket</th>
                                <th className="px-4 py-3 text-right">Total Biaya</th>
                                <th className="px-4 py-3 text-right">DP Dibayar</th>
                                <th className="px-4 py-3 text-center">Bukti Bayar</th>
                                <th className="px-4 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {confirmedBookings.map(booking => {
                                const client = clients.find(c => c.id === booking.project.clientId);
                                return (
                                    <tr key={booking.project.id} className="hover:bg-brand-bg">
                                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(booking.lead.date)}</td>
                                        <td className="px-4 py-3 font-semibold text-brand-text-light">{booking.project.clientName}</td>
                                        <td className="px-4 py-3">{booking.project.projectName}</td>
                                        <td className="px-4 py-3">{booking.project.projectType}</td>
                                        <td className="px-4 py-3">{booking.project.location}</td>
                                        <td className="px-4 py-3">{booking.project.packageName}</td>
                                        <td className="px-4 py-3 text-right font-semibold">{formatCurrency(booking.project.totalCost)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-green-400">{formatCurrency(booking.project.amountPaid)}</td>
                                        <td className="px-4 py-3 text-center">
                                            {booking.project.dpProofUrl ? (
                                                <button
                                                    onClick={() => setViewingProofUrl(booking.project.dpProofUrl!)}
                                                    className="button-secondary !text-xs !px-3 !py-1.5"
                                                >
                                                    Lihat Bukti
                                                </button>
                                            ) : (
                                                <span className="text-brand-text-secondary">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => handleEditBooking(booking.project.clientId)} className="p-2 text-brand-text-secondary hover:bg-brand-input rounded-full" title="Edit Booking"><PencilIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteBooking(booking.project.id, booking.project.clientName)} className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-full" title="Hapus Booking"><Trash2Icon className="w-4 h-4" /></button>
                                                {client && (
                                                    <button
                                                        onClick={() => setWhatsappTemplateModal({ project: booking.project, client })}
                                                        className="button-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                                                        title="Kirim Pesan WhatsApp"
                                                    >
                                                        <WhatsappIcon className="w-4 h-4" /> Chat & WA
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleNavigation(ViewType.CLIENTS, { type: 'VIEW_CLIENT_DETAILS', id: booking.project.clientId })}
                                                    className="button-secondary text-xs px-3 py-1.5"
                                                >
                                                    Lihat Detail
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {confirmedBookings.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="text-center py-8 text-brand-text-secondary">Belum ada booking yang dikonfirmasi.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="Panduan Halaman Booking">
                <div className="space-y-4 text-sm text-brand-text-primary">
                    <p>Halaman ini adalah pusat kendali untuk semua booking yang masuk dari formulir publik.</p>
                    <ul className="list-disc list-inside space-y-2">
                        <li><strong>Statistik:</strong> Kartu di atas memberikan ringkasan cepat. Klik kartu untuk melihat detailnya.</li>
                        <li><strong>Grafik:</strong> Visualisasikan tren booking per bulan dan popularitas paket.</li>
                        <li><strong>Booking Baru:</strong> Tabel teratas berisi semua booking yang menunggu tindakan Anda. Verifikasi bukti bayar dan konfirmasi booking untuk memindahkannya ke riwayat.</li>
                        <li><strong>Riwayat Booking:</strong> Tabel bawah berisi semua booking yang sudah Anda konfirmasi. Dari sini, Anda bisa memulai komunikasi dengan pengantin atau melihat detail acara lebih lanjut.</li>
                        <li><strong>Aksi Cepat:</strong> Gunakan tombol "Konfirmasi", "Chat & WA", dan "Lihat Detail" untuk alur kerja yang lebih cepat.</li>
                    </ul>
                </div>
            </Modal>

            {/* Removed Share Booking Form modal per request */}

            <Modal isOpen={!!activeStatModal} onClose={() => setActiveStatModal(null)} title={statModalData.title} size="2xl">
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <div className="space-y-3">
                        {statModalData.bookings.length > 0 ? statModalData.bookings.map(booking => (
                            <div key={booking.project.id} className="p-3 bg-brand-bg rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-brand-text-light">{booking.project.projectName}</p>
                                    <p className="text-sm text-brand-text-secondary">{booking.project.clientName}</p>
                                </div>
                                <span className="font-semibold text-brand-text-primary">{formatCurrency(booking.project.totalCost)}</span>
                            </div>
                        )) : <p className="text-center text-brand-text-secondary py-8">Tidak ada booking dalam kategori ini.</p>}
                    </div>
                </div>
            </Modal>

            {whatsappTemplateModal && (
                <WhatsappTemplateModal
                    project={whatsappTemplateModal.project}
                    client={whatsappTemplateModal.client}
                    onClose={() => setWhatsappTemplateModal(null)}
                    showNotification={showNotification}
                    userProfile={userProfile}
                    setProfile={setProfile}
                />
            )}
            <Modal isOpen={!!viewingProofUrl} onClose={() => setViewingProofUrl(null)} title="Bukti Pembayaran">
                {viewingProofUrl && (
                    <img src={viewingProofUrl} alt="Bukti Pembayaran Penuh" className="w-full h-auto rounded-lg" />
                )}
            </Modal>
        </div>
    );
};

export default Booking;