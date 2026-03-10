

import React from 'react';
import { TeamProjectPayment, Project } from '../types';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

interface FreelancerProjectsProps {
    unpaidProjects: TeamProjectPayment[];
    projectsToPay: string[];
    onToggleProject: (projectPaymentId: string) => void;
    onProceedToPayment: () => void;
    projects: Project[];
}

const FreelancerProjects: React.FC<FreelancerProjectsProps> = ({ unpaidProjects, projectsToPay, onToggleProject, onProceedToPayment, projects }) => {
    if (unpaidProjects.length === 0) {
        return <p className="text-center text-brand-text-secondary py-8">Tidak ada item yang belum dibayar untuk vendor ini.</p>;
    }

    const totalSelected = unpaidProjects
        .filter(p => projectsToPay.includes(p.id))
        .reduce((sum, p) => sum + p.fee, 0);

    return (
        <div className="overflow-x-auto">
            <p className="text-sm text-brand-text-secondary mb-4">Pilih acara yang akan dibayarkan. Anda dapat memilih beberapa acara sekaligus.</p>
            <div className="border border-white/10 bg-white/5 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-brand-text-secondary uppercase bg-brand-surface/50 border-b border-white/10 backdrop-blur-md">
                        <tr>
                            <th className="px-5 py-4 w-12 text-center">
                                <input
                                    type="checkbox"
                                    checked={projectsToPay.length === unpaidProjects.length && unpaidProjects.length > 0}
                                    className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded flex-shrink-0"
                                    onChange={() => {
                                        if (projectsToPay.length === unpaidProjects.length) {
                                            unpaidProjects.forEach(p => onToggleProject(p.id));
                                        } else {
                                            unpaidProjects.filter(p => !projectsToPay.includes(p.id)).forEach(p => onToggleProject(p.id));
                                        }
                                    }}
                                />
                            </th>
                            <th className="px-4 py-3 font-medium tracking-wider">Acara</th>
                            <th className="px-4 py-3 font-medium tracking-wider">Tanggal</th>
                            <th className="px-4 py-3 font-medium tracking-wider text-right">Fee/Gaji</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {unpaidProjects.map(p => {
                            const projectName = projects.find(proj => proj.id === p.projectId)?.projectName || 'Acara Tidak Ditemukan';
                            const isSelected = projectsToPay.includes(p.id);
                            return (
                                <tr key={p.id} className={`transition-all duration-300 cursor-pointer border-b border-white/5 last:border-0 ${isSelected ? 'bg-brand-accent/20' : 'hover:bg-brand-surface/50'}`} onClick={() => onToggleProject(p.id)}>
                                    <td className="px-4 py-3 text-center">
                                        <input type="checkbox" checked={isSelected} readOnly className="h-4 w-4 rounded flex-shrink-0 pointer-events-none text-blue-600 focus:ring-blue-500 transition-colors" />
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-brand-text-light">{projectName}</td>
                                    <td className="px-4 py-3 text-brand-text-primary">{new Date(p.date).toLocaleDateString('id-ID')}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-brand-text-light">{formatCurrency(p.fee)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {projectsToPay.length > 0 && (
                <div className="mt-6 p-5 bg-white/10 backdrop-blur-lg border border-brand-accent/30 rounded-2xl flex flex-col sm:flex-row justify-between items-center shadow-lg animate-fade-in gap-4">
                    <div>
                        <span className="text-sm font-semibold mr-4 text-brand-accent px-3 py-1 bg-brand-accent/10 rounded-full">{projectsToPay.length} acara dipilih</span>
                        <span className="text-sm text-brand-text-secondary">Total Pembayaran: <span className="font-extrabold text-lg text-brand-text-light">{formatCurrency(totalSelected)}</span></span>
                    </div>
                    <button type="button" onClick={onProceedToPayment} className="button-primary w-full sm:w-auto shadow-md hover:shadow-brand-accent/50 transition-shadow">
                        Lanjut ke Pembayaran &rarr;
                    </button>
                </div>
            )}
        </div>
    );
};

export default FreelancerProjects;
