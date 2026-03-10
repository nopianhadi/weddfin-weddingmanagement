import React, { useState, useMemo } from 'react';
import { Lead, LeadStatus, ContactChannel, Profile, PublicLeadFormProps } from '../types';
import { createLead } from '../services/leads';
import { cleanPhoneNumber } from '../constants';

const PublicLeadForm: React.FC<PublicLeadFormProps> = ({ setLeads, userProfile, showNotification }) => {
    const [formState, setFormState] = useState({
        name: '',
        whatsapp: '',
        eventLocation: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const template = userProfile?.publicPageConfig?.template || 'classic';

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const notes = `Lead baru dari formulir website. Kota: ${formState.eventLocation}. Menunggu diskusi lebih lanjut.`;

        try {
            const created = await createLead({
                name: formState.name,
                whatsapp: formState.whatsapp,
                contactChannel: ContactChannel.WEBSITE,
                location: formState.eventLocation,
                status: LeadStatus.DISCUSSION,
                date: new Date().toISOString(),
                notes,
            });
            setLeads(prev => [created, ...prev]);
            setIsSubmitted(true);

            // Send notification to admin if available
            if ((window as any).addNotification) {
                (window as any).addNotification({
                    title: 'Prospek Baru',
                    message: `${formState.name} telah mengisi formulir lead.`,
                    type: 'info',
                    action: { view: 'PROSPEK' }
                });
            }

            showNotification('Prospek baru diterima dari formulir web.');
        } catch (err: any) {
            console.error('Submit error:', err);
            alert('Gagal mengirim formulir. Silakan coba lagi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Brand title update
    React.useEffect(() => {
        if (userProfile.companyName) {
            document.title = `Formulir | ${userProfile.companyName}`;
        }
    }, [userProfile.companyName]);

    // Professional logo for branding
    const Logo = ({ size = "h-20" }: { size?: string }) => (
        userProfile.logoBase64 ? (
            <img
                src={userProfile.logoBase64}
                alt={userProfile.companyName}
                className={`${size} w-auto object-contain drop-shadow-md mx-auto`}
            />
        ) : null
    );

    if (isSubmitted) {
        return (
            <div className={`template-wrapper template-${template} flex items-center justify-center min-h-screen p-4`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                `}</style>
                <div className="w-full max-w-lg p-10 text-center bg-public-surface rounded-[2.5rem] shadow-2xl border border-public-border relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900"></div>
                    <div className="mb-6 flex justify-center">
                        <Logo size="h-16" />
                    </div>
                    <div className="mb-4">
                        <svg className="w-16 h-16 mx-auto text-slate-900 bg-slate-100 rounded-full p-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1">Terima Kasih! 🎉</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-6">{userProfile.companyName}</p>
                    <p className="text-base text-public-text-primary leading-relaxed mb-8">
                        Formulir Anda telah berhasil kami terima. Tim kami akan segera menghubungi Anda melalui WhatsApp untuk diskusi lebih lanjut.
                    </p>
                    <a
                        href={`https://wa.me/${cleanPhoneNumber(userProfile.phone)}?text=Halo%20${encodeURIComponent(userProfile.companyName || '')}%2C%20saya%20sudah%20mengisi%20formulir%20prospek.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Konfirmasi via WhatsApp
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={`template-wrapper template-${template} flex items-center justify-center min-h-screen p-4`} style={{ fontFamily: 'Poppins, sans-serif' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                
                .template-wrapper { 
                    background-color: var(--public-bg); 
                    color: var(--public-text-primary);
                    font-family: 'Poppins', sans-serif;
                }
                .template-classic .form-container { max-width: 42rem; width: 100%; margin: auto; }
                .template-modern .form-container { max-width: 56rem; width: 100%; margin: auto; display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; align-items: center; }
                .template-gallery .form-container { max-width: 36rem; width: 100%; margin: auto; }
                @media (max-width: 768px) { .template-modern .form-container { grid-template-columns: 1fr; } }
            `}</style>
            <div className="form-container">
                {template === 'modern' && (
                    <div className="p-8 hidden md:block">
                        {userProfile.logoBase64 ? <img src={userProfile.logoBase64} alt="logo" className="h-12 mb-4" /> : <h2 className="text-2xl font-bold text-gradient">{userProfile.companyName}</h2>}
                        <p className="text-public-text-secondary text-sm mt-4">{userProfile.bio}</p>
                    </div>
                )}
                <div className="bg-public-surface p-6 sm:p-10 md:p-12 rounded-[2.5rem] shadow-2xl border border-public-border relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-slate-900 via-slate-600 to-slate-900"></div>
                    <div className="text-center mb-10">
                        <div className="flex justify-center mb-6">
                            <Logo />
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                            {userProfile.companyName || 'Formulir Pendaftaran'}
                        </h1>
                        <p className="text-sm font-bold text-slate-400 mt-2 tracking-widest uppercase">Pendaftaran Prospek Baru</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {/* Info Section */}
                        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-2">
                            <p className="text-xs text-center text-slate-600 leading-relaxed font-medium">
                                Isi formulir di bawah ini dengan lengkap. Kami akan menghubungi Anda secepatnya untuk diskusi lebih lanjut! ✨
                            </p>
                        </div>

                        {/* Data Pribadi */}
                        <div>
                            <h3 className="text-sm font-semibold text-public-text-primary mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Data Pribadi
                            </h3>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label htmlFor="name" className="block text-xs font-medium text-public-text-primary">Nama Lengkap</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formState.name}
                                        onChange={handleFormChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400"
                                        placeholder="Masukkan nama lengkap"
                                        required
                                    />
                                    <p className="text-xs text-public-text-secondary">Nama lengkap Anda atau pasangan</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="whatsapp" className="block text-xs font-medium text-public-text-primary">Nomor WhatsApp</label>
                                    <input
                                        type="tel"
                                        id="whatsapp"
                                        name="whatsapp"
                                        value={formState.whatsapp}
                                        onChange={handleFormChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400"
                                        placeholder="08123456789"
                                        required
                                    />
                                    <p className="text-xs text-public-text-secondary">Nomor aktif yang bisa dihubungi</p>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="eventLocation" className="block text-xs font-medium text-public-text-primary">Lokasi (Kota / Venue)</label>
                                    <input
                                        type="text"
                                        id="eventLocation"
                                        name="eventLocation"
                                        value={formState.eventLocation}
                                        onChange={handleFormChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all placeholder:text-slate-400"
                                        placeholder="Jakarta, Bandung, dll"
                                        required
                                    />
                                    <p className="text-xs text-public-text-secondary">Kota atau rencana lokasi acara</p>
                                </div>
                            </div>
                        </div>


                        {/* Submit Section */}
                        <div className="pt-4 space-y-3">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full px-6 py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-black active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Kirim Informasi
                                </span>
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-public-border"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="px-2 bg-public-surface text-public-text-secondary">atau</span>
                                </div>
                            </div>

                            <a
                                href={`https://wa.me/${cleanPhoneNumber(userProfile.phone)}?text=Halo%20${encodeURIComponent(userProfile.companyName || '')}%2C%20saya%20tertarik%20dengan%20layanan%20Anda.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 button-secondary text-center py-3 rounded-xl border border-public-border hover:bg-public-bg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Hubungi via WhatsApp
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PublicLeadForm;
