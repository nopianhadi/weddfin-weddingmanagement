import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, Project, TeamMember, ViewType, NavigationAction } from '../types';
import Modal from './Modal';
import { UsersIcon, FolderKanbanIcon, BriefcaseIcon } from '../constants';

// A re-usable search icon component as it is not exported from constants
const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y1="21" y2="16.65"></line></svg>
);


interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
    clients: Client[];
    projects: Project[];
    teamMembers: TeamMember[];
    handleNavigation: (view: ViewType, action: NavigationAction) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, clients, projects, teamMembers, handleNavigation }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const filteredResults = useMemo(() => {
        if (!searchTerm.trim()) {
            return { clients: [], projects: [], teamMembers: [] };
        }
        const lowerCaseSearch = searchTerm.toLowerCase();
        return {
            clients: clients.filter(c => c.name.toLowerCase().includes(lowerCaseSearch) || c.email.toLowerCase().includes(lowerCaseSearch)),
            projects: projects.filter(p => p.projectName.toLowerCase().includes(lowerCaseSearch) || p.clientName.toLowerCase().includes(lowerCaseSearch)),
            teamMembers: teamMembers.filter(t => t.name.toLowerCase().includes(lowerCaseSearch) || t.role.toLowerCase().includes(lowerCaseSearch)),
        };
    }, [searchTerm, clients, projects, teamMembers]);

    const handleClientClick = (client: Client) => {
        handleNavigation(ViewType.CLIENTS, { type: 'VIEW_CLIENT_DETAILS', id: client.id });
    };

    const handleProjectClick = (project: Project) => {
        handleNavigation(ViewType.PROJECTS, { type: 'VIEW_PROJECT_DETAILS', id: project.id });
    };

    const handleFreelancerClick = (member: TeamMember) => {
        handleNavigation(ViewType.TEAM, { type: 'VIEW_FREELANCER_DETAILS', id: member.id });
    };

    const hasResults = filteredResults.clients.length > 0 || filteredResults.projects.length > 0 || filteredResults.teamMembers.length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Pencarian Global" size="2xl">
            <div className="flex flex-col h-[60vh]">
                <div className="input-group mb-4">
                    <SearchIcon className="absolute left-0 top-2.5 w-5 h-5 text-brand-text-secondary pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="search"
                        id="globalSearch"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder=" "
                        className="input-field !pl-8"
                    />
                    <label htmlFor="globalSearch" className="input-label !pl-8">Cari pengantin, acara, atau freelancer...</label>
                </div>

                {searchTerm.trim() ? (
                    <div className="overflow-y-auto flex-grow pr-2">
                        {hasResults ? (
                            <div className="space-y-6">
                                {filteredResults.clients.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-sm text-brand-text-secondary uppercase tracking-wider mb-2">Pengantin</h4>
                                        <div className="space-y-1">
                                            {filteredResults.clients.map(c => (
                                                <button key={c.id} onClick={() => handleClientClick(c)} className="w-full text-left p-3 rounded-lg hover:bg-brand-bg flex items-center gap-3 transition-colors">
                                                    <UsersIcon className="w-5 h-5 text-brand-text-secondary" />
                                                    <div>
                                                        <p className="font-semibold text-brand-text-light">{c.name}</p>
                                                        <p className="text-xs text-brand-text-secondary">{c.email}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {filteredResults.projects.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-sm text-brand-text-secondary uppercase tracking-wider mb-2">Acara</h4>
                                        <div className="space-y-1">
                                            {filteredResults.projects.map(p => (
                                                <button key={p.id} onClick={() => handleProjectClick(p)} className="w-full text-left p-3 rounded-lg hover:bg-brand-bg flex items-center gap-3 transition-colors">
                                                    <FolderKanbanIcon className="w-5 h-5 text-brand-text-secondary" />
                                                    <div>
                                                        <p className="font-semibold text-brand-text-light">{p.projectName}</p>
                                                        <p className="text-xs text-brand-text-secondary">Pengantin: {p.clientName}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {filteredResults.teamMembers.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-sm text-brand-text-secondary uppercase tracking-wider mb-2">Freelancer</h4>
                                        <div className="space-y-1">
                                            {filteredResults.teamMembers.map(t => (
                                                <button key={t.id} onClick={() => handleFreelancerClick(t)} className="w-full text-left p-3 rounded-lg hover:bg-brand-bg flex items-center gap-3 transition-colors">
                                                    <BriefcaseIcon className="w-5 h-5 text-brand-text-secondary" />
                                                    <div>
                                                        <p className="font-semibold text-brand-text-light">{t.name}</p>
                                                        <p className="text-xs text-brand-text-secondary">{t.role}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-brand-text-secondary">
                                <p>Tidak ada hasil yang ditemukan untuk "{searchTerm}".</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-16 text-brand-text-secondary">
                        <p>Mulai ketik untuk mencari di seluruh aplikasi.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default GlobalSearch;