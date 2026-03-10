
import React from 'react';
import { FolderKanbanIcon, DollarSignIcon, UsersIcon, CheckIcon } from '../constants';

const FeatureCard: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({ title, description, icon }) => (
    <div className="bg-brand-surface p-6 rounded-2xl shadow-lg border border-brand-border text-center">
        <div className="w-16 h-16 rounded-full bg-brand-accent/10 flex items-center justify-center mx-auto mb-4 text-brand-accent">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-brand-text-light mb-2">{title}</h3>
        <p className="text-brand-text-secondary">{description}</p>
    </div>
);

const Homepage: React.FC = () => {
    return (
        <div className="bg-brand-bg text-brand-text-primary">
            {/* Header */}
            <header className="py-4 px-6 md:px-12 flex justify-between items-center bg-brand-surface/80 backdrop-blur-sm sticky top-0 z-50 border-b border-brand-border">
                <div className="flex items-center gap-2">
                    <img src="/assets/images/logos/logoIcon.svg" alt="" className="w-8 h-8" />
                    <span className="text-xl font-extrabold text-brand-text-light">weddfin</span>
                </div>
                <div className="space-x-2">
                    <button type="button" onClick={() => window.location.hash = '#/login'} className="button-primary px-6 py-2 text-sm">Masuk</button>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48 px-6 bg-brand-surface">
                {/* Banner Background */}
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                    <img src="/assets/images/landingpage/banner-bg.png" alt="" className="w-full h-full object-cover" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-brand-text-light leading-tight">
                            Sistem Manajemen All-in-One <br /> untuk <span className="text-brand-accent">Vendor Pernikahan</span>
                        </h1>
                        <p className="max-w-2xl mt-6 text-lg text-brand-text-secondary">
                            Dari manajemen pengantin dan acara hingga keuangan dan penjadwalan tim, weddfin menyediakan semua yang Anda butuhkan untuk berkembang.
                        </p>
                        <button type="button" onClick={() => window.location.hash = '#/login'} className="mt-8 button-primary text-lg px-8 py-3">Masuk ke Dasbor Anda</button>
                    </div>

                    <div className="flex-1 relative">
                        <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
                            <img src="/assets/images/landingpage/banner-img.png" alt="Dashboard Preview" className="w-full h-auto" />
                        </div>
                        {/* Decorative blob/glow */}
                        <div className="absolute -inset-4 bg-brand-accent/20 blur-3xl -z-10 rounded-full"></div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-brand-text-light">Sederhanakan Alur Kerja Anda</h2>
                        <p className="text-brand-text-secondary mt-2">Fokus pada kreativitas Anda, biarkan kami yang mengurus administrasinya.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            title="Manajemen Acara"
                            description="Lacak setiap acara dari prospek hingga selesai dengan papan Kanban visual dan checklist progres."
                            icon={<FolderKanbanIcon className="w-8 h-8" />}
                        />
                        <FeatureCard
                            title="Keuangan Terintegrasi"
                            description="Catat setiap transaksi, kelola akun, dan pantau arus kas bisnis Anda secara real-time."
                            icon={<DollarSignIcon className="w-8 h-8" />}
                        />
                        <FeatureCard
                            title="Portal Pengantin & Tim"
                            description="Berikan akses eksklusif kepada pengantin dan freelancer untuk melihat progres, file, dan jadwal."
                            icon={<UsersIcon className="w-8 h-8" />}
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 text-center text-brand-text-secondary text-sm">
                <p>&copy; {new Date().getFullYear()} weddfin. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Homepage;