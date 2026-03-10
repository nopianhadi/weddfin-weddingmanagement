import React, { useState, useMemo } from 'react';
import { Client, Project } from '../types';
import {
    MessageSquareIcon,
    MailIcon,
    PhoneIcon,
    SendIcon,
    ClockIcon,
    CheckCircleIcon,
    CopyIcon,
    WhatsappIcon
} from '../constants';

interface MessageTemplate {
    id: string;
    title: string;
    category: 'reminder' | 'update' | 'greeting' | 'confirmation' | 'custom';
    template: string;
    variables: string[];
}

interface CommunicationHubProps {
    client: Client;
    projects: Project[];
    onSendMessage: (message: string, channel: 'whatsapp' | 'email' | 'sms') => void;
    showNotification: (message: string) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

const MESSAGE_TEMPLATES: MessageTemplate[] = [
    {
        id: 'payment_reminder',
        title: 'Reminder Pembayaran',
        category: 'reminder',
        template: `Halo {clientName},

Semoga sehat selalu. Kami ingin mengingatkan perihal sisa pembayaran untuk acara Anda.

Acara: {projectName}
Sisa Tagihan: {remainingAmount}
Jatuh Tempo: {dueDate}

Pembayaran dapat ditransfer ke:
{bankAccount}

Mohon konfirmasinya jika pembayaran telah dilakukan. Terima kasih!

Salam,
{companyName}`,
        variables: ['clientName', 'projectName', 'remainingAmount', 'dueDate', 'bankAccount', 'companyName']
    },
    {
        id: 'progress_update',
        title: 'Update Progress',
        category: 'update',
        template: `Halo {clientName},

Kami ingin memberikan update progress acara Anda:

Acara: {projectName}
Status: {currentStatus}
Progress: {progressPercentage}%

{additionalNotes}

Jika ada pertanyaan, jangan ragu untuk menghubungi kami.

Terima kasih,
{companyName}`,
        variables: ['clientName', 'projectName', 'currentStatus', 'progressPercentage', 'additionalNotes', 'companyName']
    },
    {
        id: 'schedule_confirmation',
        title: 'Konfirmasi Jadwal',
        category: 'confirmation',
        template: `Halo {clientName},

Kami ingin mengkonfirmasi jadwal acara Anda:

Acara: {projectName}
Tanggal: {eventDate}
Waktu: {eventTime}
Lokasi: {eventLocation}

Mohon konfirmasi jika ada perubahan.

Terima kasih,
{companyName}`,
        variables: ['clientName', 'projectName', 'eventDate', 'eventTime', 'eventLocation', 'companyName']
    },
    {
        id: 'thank_you',
        title: 'Terima Kasih',
        category: 'greeting',
        template: `Halo {clientName},

Terima kasih telah mempercayakan {projectName} kepada kami.

Kami sangat senang dapat bekerja sama dengan Anda. Semoga hasil yang kami berikan sesuai dengan harapan Anda.

Jangan ragu untuk menghubungi kami jika ada yang perlu didiskusikan.

Salam hangat,
{companyName}`,
        variables: ['clientName', 'projectName', 'companyName']
    },
    {
        id: 'delivery_notification',
        title: 'Notifikasi Pengiriman',
        category: 'update',
        template: `Halo {clientName},

Hasil acara Anda sudah siap!

Acara: {projectName}
Link Download: {downloadLink}

Silakan cek dan berikan feedback Anda. Jika ada revisi, kami siap membantu.

Terima kasih,
{companyName}`,
        variables: ['clientName', 'projectName', 'downloadLink', 'companyName']
    }
];

export const CommunicationHub: React.FC<CommunicationHubProps> = ({
    client,
    projects,
    onSendMessage,
    showNotification,
}) => {
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [message, setMessage] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'templates' | 'history'>('templates');

    const clientProjects = useMemo(() =>
        projects.filter(p => p.clientId === client.id),
        [projects, client.id]
    );

    const activeProject = useMemo(() =>
        clientProjects.find(p => p.id === selectedProject) || clientProjects[0],
        [clientProjects, selectedProject]
    );

    const processTemplate = (template: string) => {
        let processed = template;

        // Replace variables
        processed = processed.replace('{clientName}', client.name);
        processed = processed.replace('{companyName}', 'Vena Pictures');

        if (activeProject) {
            processed = processed.replace('{projectName}', activeProject.projectName);
            processed = processed.replace('{currentStatus}', activeProject.status);
            processed = processed.replace('{eventDate}', new Date(activeProject.date).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }));
            processed = processed.replace('{eventTime}', activeProject.startTime || 'TBA');
            processed = processed.replace('{eventLocation}', activeProject.location || 'TBA');

            const remaining = activeProject.totalCost - activeProject.amountPaid;
            processed = processed.replace('{remainingAmount}', formatCurrency(remaining));

            if (activeProject.deadlineDate) {
                processed = processed.replace('{dueDate}', new Date(activeProject.deadlineDate).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                }));
            }

            // Calculate progress
            const statusConfig = ['Dikonfirmasi', 'Persiapan', 'Pelaksanaan (Hari H)', 'Dikirim', 'Selesai'];
            const currentIndex = statusConfig.indexOf(activeProject.status);
            const progress = currentIndex >= 0 ? Math.round(((currentIndex + 1) / statusConfig.length) * 100) : 0;
            processed = processed.replace('{progressPercentage}', progress.toString());

            processed = processed.replace('{downloadLink}', activeProject.finalDriveLink || '[Link akan dikirim]');
        }

        processed = processed.replace('{bankAccount}', 'BCA 1234567890 a.n. Vena Pictures');
        processed = processed.replace('{additionalNotes}', '');

        return processed;
    };

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplate(templateId);
        const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
        if (template) {
            const processed = processTemplate(template.template);
            setMessage(processed);
        }
    };

    const handleCopyMessage = () => {
        navigator.clipboard.writeText(message);
        showNotification('Pesan berhasil disalin');
    };

    const handleSendWhatsApp = () => {
        if (!message.trim()) {
            showNotification('Pesan tidak boleh kosong');
            return;
        }
        onSendMessage(message, 'whatsapp');
    };

    const handleSendEmail = () => {
        if (!message.trim()) {
            showNotification('Pesan tidak boleh kosong');
            return;
        }
        onSendMessage(message, 'email');
    };

    // Mock communication history
    const communicationHistory = [
        {
            id: '1',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            channel: 'whatsapp' as const,
            message: 'Reminder pembayaran dikirim',
            status: 'sent'
        },
        {
            id: '2',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            channel: 'email' as const,
            message: 'Update progress acara',
            status: 'sent'
        },
    ];

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-brand-border">
                <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'templates'
                        ? 'border-b-2 border-brand-accent text-brand-accent'
                        : 'text-brand-text-secondary hover:text-brand-text-primary'
                        }`}
                >
                    Template Pesan
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'history'
                        ? 'border-b-2 border-brand-accent text-brand-accent'
                        : 'text-brand-text-secondary hover:text-brand-text-primary'
                        }`}
                >
                    Riwayat Komunikasi
                </button>
            </div>

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <div className="space-y-6">
                    {/* Project Selector */}
                    {clientProjects.length > 1 && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-brand-text-secondary">
                                Pilih Acara
                            </label>
                            <select
                                value={selectedProject}
                                onChange={(e) => {
                                    setSelectedProject(e.target.value);
                                    if (selectedTemplate) {
                                        handleTemplateSelect(selectedTemplate);
                                    }
                                }}
                                className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
                            >
                                {clientProjects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.projectName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Template Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-brand-text-secondary">
                            Pilih Template
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {MESSAGE_TEMPLATES.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => handleTemplateSelect(template.id)}
                                    className={`p-3 rounded-lg text-left transition-all ${selectedTemplate === template.id
                                        ? 'bg-brand-accent text-white'
                                        : 'bg-brand-bg hover:bg-brand-input text-brand-text-primary'
                                        }`}
                                >
                                    <p className="font-semibold text-sm">{template.title}</p>
                                    <p className="text-xs opacity-75 mt-1 capitalize">{template.category}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message Editor */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-brand-text-secondary">
                                Isi Pesan
                            </label>
                            <button
                                onClick={handleCopyMessage}
                                className="flex items-center gap-2 text-sm text-brand-accent hover:underline"
                            >
                                <CopyIcon className="w-4 h-4" />
                                Salin
                            </button>
                        </div>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={12}
                            className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white/5 text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
                            placeholder="Pilih template atau tulis pesan Anda..."
                        />
                    </div>

                    {/* Send Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={handleSendWhatsApp}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-all"
                        >
                            <WhatsappIcon className="w-5 h-5" />
                            Kirim via WhatsApp
                        </button>
                        <button
                            onClick={handleSendEmail}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-accent hover:bg-brand-accent-hover text-white font-semibold transition-all"
                        >
                            <MailIcon className="w-5 h-5" />
                            Kirim via Email
                        </button>
                    </div>
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-3">
                    {communicationHistory.length > 0 ? (
                        communicationHistory.map(item => (
                            <div
                                key={item.id}
                                className="p-4 bg-brand-bg rounded-lg border border-brand-border"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {item.channel === 'whatsapp' && (
                                            <WhatsappIcon className="w-5 h-5 text-green-500" />
                                        )}
                                        {item.channel === 'email' && (
                                            <MailIcon className="w-5 h-5 text-blue-500" />
                                        )}
                                        <span className="text-sm font-semibold text-brand-text-light capitalize">
                                            {item.channel}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                        <span className="text-xs text-brand-text-secondary">
                                            Terkirim
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-brand-text-secondary mb-2">
                                    {item.message}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-brand-text-secondary">
                                    <ClockIcon className="w-3 h-3" />
                                    {new Date(item.date).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-brand-text-secondary">
                            <MessageSquareIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Belum ada riwayat komunikasi</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CommunicationHub;
