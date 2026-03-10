import React, { useState, useMemo, useEffect } from 'react';
import { Project, TeamMember, Profile, AssignedTeamMember, Client, ViewType, NavigationAction } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, UsersIcon, FileTextIcon, PlusIcon, MapPinIcon, CalendarIcon, DollarSignIcon, LinkIcon, FolderKanbanIcon } from '../constants';
import Modal from './Modal';
import { listCalendarEvents, listCalendarEventsInRange, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../services/calendarEvents';
import supabase from '../lib/supabaseClient';

// --- HELPER FUNCTIONS ---

const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
};

const weekdays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const weekdaysFull = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

const eventTypeColors: { [key: string]: string } = {
    'Meeting Pengantin': '#3b82f6',
    'Survey Lokasi': '#22c55e',
    'Libur': '#94a3b8',
    'Workshop': '#a855f7',
    'Lainnya': '#eab308',
};

const getEventColor = (event: Project, profile: Profile) => {
    const isInternalEvent = profile.eventTypes?.includes(event.projectType);
    if (isInternalEvent) {
        return eventTypeColors[event.projectType] || '#64748b';
    }
    return profile.projectStatusConfig?.find(s => s.name === event.status)?.color || '#64748b';
};

const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

// --- SUB-COMPONENTS ---

interface CalendarSidebarProps {
    profile: Profile;
    isClientProjectVisible: boolean;
    visibleEventTypes: Set<string>;
    selectedClientId: string | null;
    clientsThisMonth: { id: string; name: string }[];
    stats: { totalProjects: number; totalInternal: number; totalClients: number };
    onAddEvent: () => void;
    onClientFilterChange: (isVisible: boolean) => void;
    onEventTypeFilterChange: (eventType: string) => void;
    onClientSelect: (clientId: string | null) => void;
    currentDate: Date;
    onDateSelect: (date: Date) => void;
}

const CalendarSidebar: React.FC<CalendarSidebarProps> = ({ profile, isClientProjectVisible, visibleEventTypes, selectedClientId, clientsThisMonth, stats, onAddEvent, onClientFilterChange, onEventTypeFilterChange, onClientSelect, currentDate, onDateSelect }) => {
    // Mini Calendar Logic
    const [miniDate, setMiniDate] = useState(new Date(currentDate));

    // Sync mini calendar when main calendar changes externally
    useEffect(() => {
        setMiniDate(new Date(currentDate));
    }, [currentDate]);

    const handlePrevMonth = () => {
        setMiniDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setMiniDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const daysInMiniMonth = useMemo(() => {
        const days = [];
        const firstDay = new Date(miniDate.getFullYear(), miniDate.getMonth(), 1);
        const lastDay = new Date(miniDate.getFullYear(), miniDate.getMonth() + 1, 0);

        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

        let d = new Date(startDate);
        while (d <= endDate) {
            days.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        return days;
    }, [miniDate]);

    return (
        <div className="w-72 xl:w-80 border-r border-brand-border/40 p-5 flex flex-col hidden lg:flex overflow-y-auto bg-brand-surface/20 backdrop-blur-sm custom-scrollbar">
            <div className="flex items-center gap-3 mb-6 p-3 bg-white/40 rounded-2xl border border-brand-border/30 shadow-sm animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center font-bold text-brand-accent shadow-inner">
                    {getInitials(profile.fullName)}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-sm text-brand-text-light truncate">{profile.fullName?.split(' ')[0] || 'User'}</p>
                    <p className="text-xs text-brand-text-secondary truncate">{profile.email}</p>
                </div>
            </div>
            <button onClick={onAddEvent} className="button-primary w-full mb-6 inline-flex items-center justify-center gap-2 shadow-sm">
                <PlusIcon className="w-5 h-5" />
                Buat Acara
            </button>

            {/* Mini Calendar Start */}
            <div className="mb-6 p-4 glass-card rounded-2xl border border-brand-border/40 shadow-sm animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={handlePrevMonth} className="p-1.5 rounded-full hover:bg-brand-input transition-colors text-brand-text-secondary"><ChevronLeftIcon className="w-4 h-4" /></button>
                    <h3 className="text-xs font-semibold text-brand-text-light">{miniDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</h3>
                    <button onClick={handleNextMonth} className="p-1.5 rounded-full hover:bg-brand-input transition-colors text-brand-text-secondary"><ChevronRightIcon className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (
                        <div key={i} className="text-[10px] font-semibold text-brand-text-secondary">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {daysInMiniMonth.map((day, i) => {
                        const isCurrentMonth = day.getMonth() === miniDate.getMonth();
                        const isToday = day.toDateString() === new Date().toDateString();
                        const isSelectedDate = day.toDateString() === currentDate.toDateString();

                        return (
                            <button
                                key={i}
                                onClick={() => onDateSelect(day)}
                                className={`w-7 h-7 mx-auto rounded-full text-xs font-medium flex items-center justify-center transition-all
                                ${!isCurrentMonth ? 'text-brand-text-secondary/30 hover:bg-white/40' :
                                        isSelectedDate ? 'bg-brand-accent text-white shadow-md scale-110 z-10' :
                                            isToday ? 'bg-brand-accent/20 text-brand-accent font-bold hover:bg-brand-accent/30' :
                                                'text-brand-text-light hover:bg-white/60 hover:shadow-sm'}`}
                            >
                                {day.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>
            {/* Mini Calendar End */}

            <div className="mb-6 p-4 glass-card rounded-2xl space-y-3 border border-brand-border/40 shadow-sm">
                <h3 className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">Statistik Bulan Ini</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-white/50 border border-brand-border/20">
                        <p className="text-xl font-bold text-brand-accent leading-tight">{stats.totalProjects}</p>
                        <p className="text-[9px] font-medium text-brand-text-secondary uppercase tracking-wider mt-0.5">Acara</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/50 border border-brand-border/20">
                        <p className="text-xl font-bold text-brand-accent leading-tight">{stats.totalInternal}</p>
                        <p className="text-[9px] font-medium text-brand-text-secondary uppercase tracking-wider mt-0.5">Internal</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/50 border border-brand-border/20">
                        <p className="text-xl font-bold text-brand-accent leading-tight">{stats.totalClients}</p>
                        <p className="text-[9px] font-medium text-brand-text-secondary uppercase tracking-wider mt-0.5">Pengantin</p>
                    </div>
                </div>
            </div>

            {clientsThisMonth.length > 0 && (
                <div className="mb-4">
                    <h3 className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-2">Pengantin Bulan Ini</h3>
                    <select value={selectedClientId || ''} onChange={(e) => onClientSelect(e.target.value || null)} className="input-field w-full text-sm py-2">
                        <option value="">Semua Pengantin</option>
                        {clientsThisMonth.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <p className="text-[10px] text-brand-text-secondary mt-1">Filter acara berdasarkan pengantin</p>
                </div>
            )}

            <h3 className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-2">Filter Tampilan</h3>
            <div className="space-y-1">
                <label className="flex items-center p-2 rounded-lg hover:bg-brand-bg cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded flex-shrink-0 transition-colors" checked={isClientProjectVisible} onChange={(e) => onClientFilterChange(e.target.checked)} style={{ accentColor: '#ef4444' }} />
                    <span className="ml-2 text-sm font-medium text-brand-text-light">Acara Pengantin</span>
                </label>
                {(profile.eventTypes || []).map(type => (
                    <label key={type} className="flex items-center p-2 rounded-lg hover:bg-brand-bg cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded flex-shrink-0 transition-colors" checked={visibleEventTypes.has(type)} onChange={() => onEventTypeFilterChange(type)} style={{ accentColor: eventTypeColors[type] || '#94a3b8' }} />
                        <span className="w-2 h-2 rounded-full ml-2" style={{ backgroundColor: eventTypeColors[type] || '#94a3b8' }}></span>
                        <span className="ml-2 text-sm font-medium text-brand-text-light">{type}</span>
                    </label>
                ))}
            </div>
        </div>
    );
};


interface CalendarHeaderProps {
    currentDate: Date;
    viewMode: 'Day' | 'Week' | 'Month' | 'Team' | 'Agenda';
    stats?: { totalProjects: number; totalInternal: number; totalClients: number };
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewModeChange: (mode: 'Day' | 'Week' | 'Month' | 'Team' | 'Agenda') => void;
    onInfoClick: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ currentDate, viewMode, stats, onPrev, onNext, onToday, onViewModeChange, onInfoClick }) => {
    const getHeaderTitle = () => {
        if (viewMode === 'Day') {
            return currentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } else if (viewMode === 'Week') {
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
        }
        return currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    };

    const getMobileTitle = () => {
        if (viewMode === 'Day') {
            return currentDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        } else if (viewMode === 'Week') {
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('id-ID', { month: 'short' })}`;
        }
        return currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="flex-shrink-0 border-b border-brand-border">
            {/* Mobile Header */}
            <div className="sm:hidden">
                <div className="p-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-brand-text-light">{getMobileTitle()}</h2>
                    <button onClick={onToday} className="button-secondary px-3 py-1.5 text-xs">Hari Ini</button>
                </div>
                {stats && (
                    <div className="px-3 pb-2 flex gap-3 text-xs">
                        <span className="font-semibold text-brand-accent">{stats.totalProjects} Acara</span>
                        <span className="text-brand-text-secondary">{stats.totalInternal} Acara</span>
                        <span className="text-brand-text-secondary">{stats.totalClients} Pengantin</span>
                    </div>
                )}
                <div className="px-3 pb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                        <button onClick={onPrev} className="p-2 rounded-full hover:bg-brand-input active:bg-brand-input"><ChevronLeftIcon className="w-5 h-5" /></button>
                        <button onClick={onNext} className="p-2 rounded-full hover:bg-brand-input active:bg-brand-input"><ChevronRightIcon className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 flex p-0.5 bg-brand-bg rounded-lg overflow-x-auto">
                        {(['Day', 'Week', 'Month', 'Team', 'Agenda'] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => onViewModeChange(v)}
                                className={`flex-shrink-0 px-2 py-1.5 text-[10px] font-medium rounded-md transition-all ${viewMode === v ? 'bg-brand-surface shadow-sm text-brand-text-light' : 'text-brand-text-secondary'}`}
                            >
                                {v === 'Day' ? 'Hari' : v === 'Week' ? 'Minggu' : v === 'Team' ? 'Tim' : v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden sm:flex p-4 items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={onPrev} className="p-2 rounded-full hover:bg-brand-input"><ChevronLeftIcon className="w-5 h-5" /></button>
                    <button onClick={onNext} className="p-2 rounded-full hover:bg-brand-input"><ChevronRightIcon className="w-5 h-5" /></button>
                    <h2 className="text-lg font-semibold text-brand-text-light ml-2">{getHeaderTitle()}</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onInfoClick} className="button-secondary px-3 py-1.5 text-sm hidden md:block">Pelajari Halaman Ini</button>
                    <button onClick={onToday} className="button-secondary px-3 py-1.5 text-sm">Hari Ini</button>
                    <div className="p-1 bg-brand-bg rounded-lg flex">
                        {(['Day', 'Week', 'Month', 'Team', 'Agenda'] as const).map(v => (
                            <button
                                key={v}
                                onClick={() => onViewModeChange(v)}
                                className={`px-3 py-1 text-sm font-medium rounded-md ${viewMode === v ? 'bg-brand-surface shadow-sm' : 'text-brand-text-secondary'}`}
                            >
                                {v === 'Day' ? 'Hari' : v === 'Week' ? 'Minggu' : v === 'Team' ? 'Tim' : v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- TOOLTIP COMPONENT ---
interface HoverTooltipProps {
    event: Project;
    profile: Profile;
    position: { x: number; y: number } | null;
}

const SmartHoverTooltip: React.FC<HoverTooltipProps> = ({ event, profile, position }) => {
    if (!position || !event) return null;

    const bgColor = getEventColor(event, profile);
    const subtitle = event.clientId === 'INTERNAL' ? event.projectType : (event.clientName || '');

    // Ensure tooltip stays within viewport (basic collision detection)
    const leftOffset = position.x > window.innerWidth - 300 ? position.x - 280 : position.x + 10;
    const topOffset = position.y > window.innerHeight - 200 ? position.y - 180 : position.y + 10;

    return (
        <div
            className="fixed z-50 w-64 p-3 bg-brand-surface/90 backdrop-blur-xl border border-brand-border/40 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] pointer-events-none animate-fade-in"
            style={{ left: leftOffset, top: topOffset }}
        >
            <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: bgColor }}></div>
                <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">{event.projectType}</span>
            </div>
            <h4 className="font-bold text-sm text-brand-text-light mb-0.5 leading-tight">{event.projectName}</h4>
            {subtitle && <p className="text-xs font-medium text-brand-text-secondary mb-2">{subtitle}</p>}

            <div className="space-y-1.5 mt-3 pt-2 border-t border-brand-border/40">
                <div className="flex items-start gap-2 text-xs">
                    <ClockIcon className="w-3.5 h-3.5 text-brand-text-secondary mt-0.5" />
                    <span className="text-brand-text-light">{event.startTime ? `${event.startTime} - ${event.endTime || '...'}` : 'Sepanjang hari'}</span>
                </div>
                {event.location && (
                    <div className="flex items-start gap-2 text-xs">
                        <MapPinIcon className="w-3.5 h-3.5 text-brand-text-secondary mt-0.5" />
                        <span className="text-brand-text-light truncate">{event.location}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- LOADING SKELETON ---
const CalendarSkeleton = () => (
    <div className="absolute inset-0 z-30 bg-brand-surface/50 backdrop-blur-[2px] flex items-center justify-center animate-pulse rounded-2xl">
        <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-brand-accent/40 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 rounded-full bg-brand-accent/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 rounded-full bg-brand-accent/80 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
    </div>
);

interface MonthViewProps {
    currentDate: Date;
    daysInMonth: Date[];
    eventsByDate: Map<string, Project[]>;
    profile: Profile;
    isLoading?: boolean;
    onDayClick: (date: Date) => void;
    onEventClick: (event: Project) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ currentDate, daysInMonth, eventsByDate, profile, isLoading, onDayClick, onEventClick }) => {
    const [hoveredEvent, setHoveredEvent] = useState<{ event: Project, pos: { x: number, y: number } } | null>(null);

    return (
        <div className="grid grid-cols-7 flex-grow h-full calendar-grid bg-brand-surface/30 relative">
            {isLoading && <CalendarSkeleton />}
            {weekdays.map(day => (<div key={day} className="text-center py-3 text-xs font-semibold text-brand-text-secondary border-b border-l border-brand-border/40 bg-white/50 backdrop-blur-sm">{day}</div>))}
            {daysInMonth.map((day, i) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();
                const events = eventsByDate.get(day.toDateString()) || [];
                return (
                    <div key={i} onClick={() => onDayClick(day)} className={`relative border-b border-l border-brand-border/40 p-1.5 sm:p-2 flex flex-col h-24 sm:h-32 ${isCurrentMonth ? 'bg-white/40' : 'bg-brand-bg/40 backdrop-blur-sm opacity-60'} cursor-pointer hover:bg-white transition-colors group`}>
                        <span className={`text-xs font-semibold self-start mb-1.5 w-6 h-6 flex items-center justify-center rounded-full transition-colors ${isCurrentMonth ? 'text-brand-text-light group-hover:bg-brand-input' : 'text-brand-text-secondary/50'} ${isToday ? '!bg-brand-accent text-white shadow-md' : ''}`}>{day.getDate()}</span>
                        <div className="flex-grow space-y-1.5 overflow-hidden custom-scrollbar pr-0.5">
                            {events.map(event => {
                                const bgColor = getEventColor(event, profile);
                                const subtitle = event.clientId === 'INTERNAL' ? event.projectType : (event.clientName || '');
                                return (
                                    <div
                                        key={event.id}
                                        onClick={(e) => { e.stopPropagation(); setHoveredEvent(null); onEventClick(event); }}
                                        onMouseEnter={(e) => setHoveredEvent({ event, pos: { x: e.clientX, y: e.clientY } })}
                                        onMouseMove={(e) => setHoveredEvent({ event, pos: { x: e.clientX, y: e.clientY } })}
                                        onMouseLeave={() => setHoveredEvent(null)}
                                        className="text-[10px] sm:text-xs p-1.5 rounded-lg text-white truncate cursor-pointer leading-tight shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
                                        style={{ backgroundColor: bgColor }}
                                    >
                                        {event.image && <img src={event.image} alt={event.projectName} className="h-6 w-full object-cover rounded mb-1 opacity-90" />}
                                        <p className="font-semibold truncate tracking-tight">{event.projectName}</p>
                                        {subtitle && <p className="truncate opacity-90 text-[9px] sm:text-[10px]">{subtitle}</p>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                );
            })}
            {hoveredEvent && <SmartHoverTooltip event={hoveredEvent.event} profile={profile} position={hoveredEvent.pos} />}
        </div>
    );
};


interface AgendaViewProps {
    agendaByDate: [string, Project[]][];
    profile: Profile;
    onEventClick: (event: Project) => void;
}

const AgendaView: React.FC<AgendaViewProps> = ({ agendaByDate, profile, onEventClick }) => (
    <div className="p-4 md:p-6 lg:p-10 max-w-4xl mx-auto custom-scrollbar overflow-x-hidden">
        {agendaByDate.map(([dateString, eventsOnDate]) => (
            <div key={dateString} className="mb-10 animate-fade-in relative">
                <div className="sticky top-0 z-10 bg-brand-surface/90 backdrop-blur-md py-3 -mx-4 px-4 md:mx-0 md:px-0 mb-4 border-b border-brand-border/40">
                    <h3 className="font-bold text-base md:text-lg text-brand-text-light">{new Date(dateString).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                </div>
                <div className="relative pl-10 md:pl-16 border-l-2 border-brand-border/40 ml-2 md:ml-4">
                    {eventsOnDate.map(event => {
                        const bgColor = getEventColor(event, profile);
                        return (
                            <div key={event.id} className="relative mb-6 group">
                                <div className="absolute -left-[3.5rem] md:-left-[5rem] top-2 font-semibold text-[10px] md:text-xs text-brand-text-primary bg-white/60 px-1.5 py-0.5 rounded shadow-sm scale-90 md:scale-100 origin-right">{event.startTime || 'All Day'}</div>
                                <div className="absolute -left-[0.65rem] top-2.5 w-4 h-4 rounded-full border-4 border-brand-surface shadow-sm ring-2 ring-transparent group-hover:ring-brand-accent/30 transition-all" style={{ backgroundColor: bgColor }}></div>
                                <div onClick={() => onEventClick(event)} className="ml-4 md:ml-6 p-4 md:p-5 rounded-2xl cursor-pointer glass-card card-hover-lift shadow-sm transition-all" style={{ borderLeft: `4px solid ${bgColor}` }}>
                                    <h4 className="font-bold text-sm md:text-base text-brand-text-light">{event.projectName}</h4>
                                    <p className="text-xs md:text-sm font-medium text-brand-text-secondary mt-1">
                                        {event.clientId === 'INTERNAL' ? event.projectType : (event.clientName || event.projectType)}
                                        {event.location && ` • ${event.location}`}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        ))}
        {agendaByDate.length === 0 && <p className="text-center text-brand-text-secondary py-16">Tidak ada acara mendatang.</p>}
    </div>
);


interface WeekViewProps {
    currentDate: Date;
    eventsByDate: Map<string, Project[]>;
    profile: Profile;
    isLoading?: boolean;
    onDayClick: (date: Date) => void;
    onEventClick: (event: Project) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ currentDate, eventsByDate, profile, isLoading, onDayClick, onEventClick }) => {
    const weekStart = new Date(currentDate);
    const [hoveredEvent, setHoveredEvent] = useState<{ event: Project, pos: { x: number, y: number } } | null>(null);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        return day;
    });

    const getEventPosition = (event: Project) => {
        if (!event.startTime) return { top: 0, height: 60 };
        const [hours, minutes] = event.startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;

        let endMinutes = startMinutes + 60;
        if (event.endTime) {
            const [endHours, endMins] = event.endTime.split(':').map(Number);
            endMinutes = endHours * 60 + endMins;
        }

        const duration = endMinutes - startMinutes;
        return {
            top: (startMinutes / 60) * 60,
            height: Math.max((duration / 60) * 60, 30)
        };
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Week header */}
            <div className="grid grid-cols-8 border-b border-brand-border/40 bg-white/70 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                <div className="p-1 sm:p-2 text-[10px] sm:text-xs font-semibold text-brand-text-secondary border-r border-brand-border/40 flex items-center justify-center text-center">Waktu</div>
                {weekDays.map((day, i) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                        <div key={i} className={`p-1 sm:p-2 text-center border-r border-brand-border/40 ${isToday ? 'bg-brand-accent/5 backdrop-blur-sm' : 'bg-white/40'}`}>
                            <div className="text-[10px] sm:text-xs font-medium text-brand-text-secondary">{weekdays[day.getDay()]}</div>
                            <div className={`text-sm sm:text-lg font-bold mt-0.5 sm:mt-1 mx-auto w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-accent text-white shadow-md' : 'text-brand-text-light'}`}>
                                {day.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Time grid */}
            <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar bg-brand-surface/30">
                <div className="grid grid-cols-8 relative" style={{ minHeight: '1440px', minWidth: '600px' }}>
                    <div className="border-r border-brand-border/40 bg-white/40 backdrop-blur-sm shadow-sm z-10 relative">
                        {hours.map((hour) => (
                            <div key={hour} className="h-[60px] border-b border-brand-border/40 px-1 sm:px-2 py-1.5 text-[10px] sm:text-xs font-medium text-brand-text-secondary text-center">
                                {hour}
                            </div>
                        ))}
                    </div>

                    {weekDays.map((day, dayIndex) => {
                        const events = eventsByDate.get(day.toDateString()) || [];
                        const isToday = day.toDateString() === new Date().toDateString();

                        return (
                            <div
                                key={dayIndex}
                                className={`relative border-r border-brand-border ${isToday ? 'bg-brand-accent/5' : ''}`}
                                onClick={() => onDayClick(day)}
                            >
                                {hours.map((_, i) => (
                                    <div key={i} className="h-[60px] border-b border-brand-border hover:bg-brand-input/50 active:bg-brand-input cursor-pointer transition-colors"></div>
                                ))}

                                <div className="absolute inset-0 pointer-events-none">
                                    {events.map(event => {
                                        const { top, height } = getEventPosition(event);
                                        const bgColor = getEventColor(event, profile);

                                        return (
                                            <div
                                                key={event.id}
                                                onClick={(e) => { e.stopPropagation(); setHoveredEvent(null); onEventClick(event); }}
                                                onMouseEnter={(e) => setHoveredEvent({ event, pos: { x: e.clientX, y: e.clientY } })}
                                                onMouseMove={(e) => setHoveredEvent({ event, pos: { x: e.clientX, y: e.clientY } })}
                                                onMouseLeave={() => setHoveredEvent(null)}
                                                className="absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md p-0.5 sm:p-1 cursor-pointer pointer-events-auto overflow-hidden text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
                                                style={{
                                                    top: `${top}px`,
                                                    height: `${height}px`,
                                                    backgroundColor: bgColor
                                                }}
                                            >
                                                <div className="text-[9px] sm:text-xs font-semibold truncate leading-tight">{event.projectName}</div>
                                                <div className="text-[8px] sm:text-[10px] truncate opacity-90 leading-tight">{event.clientId === 'INTERNAL' ? event.projectType : (event.clientName || '')}</div>
                                                <div className="text-[8px] sm:text-[10px] truncate leading-tight hidden xl:block">{event.startTime}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {hoveredEvent && <SmartHoverTooltip event={hoveredEvent.event} profile={profile} position={hoveredEvent.pos} />}
        </div>
    );
};


interface DayViewProps {
    currentDate: Date;
    eventsByDate: Map<string, Project[]>;
    profile: Profile;
    onEventClick: (event: Project) => void;
}

const DayView: React.FC<DayViewProps> = ({ currentDate, eventsByDate, profile, onEventClick }) => {
    const events = eventsByDate.get(currentDate.toDateString()) || [];
    const isToday = currentDate.toDateString() === new Date().toDateString();

    const getEventPosition = (event: Project) => {
        if (!event.startTime) return { top: 0, height: 60 };
        const [hours, minutes] = event.startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;

        let endMinutes = startMinutes + 60;
        if (event.endTime) {
            const [endHours, endMins] = event.endTime.split(':').map(Number);
            endMinutes = endHours * 60 + endMins;
        }

        const duration = endMinutes - startMinutes;
        return {
            top: (startMinutes / 60) * 60,
            height: Math.max((duration / 60) * 60, 30)
        };
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Day header */}
            <div className="border-b border-brand-border/40 bg-white/70 backdrop-blur-md p-3 sm:p-5 sticky top-0 z-10 shadow-sm">
                <div className="text-center flex flex-col items-center">
                    <div className="text-xs sm:text-sm font-semibold text-brand-text-secondary uppercase tracking-wider">{weekdaysFull[currentDate.getDay()]}</div>
                    <div className={`text-2xl sm:text-4xl font-black mt-2 mb-1 flex items-center justify-center rounded-full ${isToday ? 'w-12 h-12 sm:w-16 sm:h-16 bg-brand-accent text-white shadow-lg' : 'text-brand-text-light'}`}>
                        {currentDate.getDate()}
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-brand-text-secondary">
                        {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Time grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-brand-surface/30">
                <div className="flex relative" style={{ minHeight: '1440px' }}>
                    <div className="w-12 sm:w-20 border-r border-brand-border/40 flex-shrink-0 bg-white/40 backdrop-blur-sm z-10">
                        {hours.map((hour) => (
                            <div key={hour} className="h-[60px] border-b border-brand-border/40 px-1 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-brand-text-secondary text-right">
                                {hour}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 relative">
                        {hours.map((_, i) => (
                            <div key={i} className="h-[60px] border-b border-brand-border hover:bg-brand-input/50 active:bg-brand-input transition-colors"></div>
                        ))}

                        <div className="absolute inset-0">
                            {events.map(event => {
                                const { top, height } = getEventPosition(event);
                                const bgColor = getEventColor(event, profile);

                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => onEventClick(event)}
                                        className="absolute left-1 right-1 sm:left-2 sm:right-2 rounded-lg p-2 sm:p-3 cursor-pointer text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
                                        style={{
                                            top: `${top}px`,
                                            height: `${height}px`,
                                            backgroundColor: bgColor
                                        }}
                                    >
                                        <div className="font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1 truncate">{event.projectName}</div>
                                        {(event.clientName || event.clientId === 'INTERNAL') && (
                                            <div className="text-[10px] sm:text-xs opacity-90 truncate">{event.clientId === 'INTERNAL' ? event.projectType : event.clientName}</div>
                                        )}
                                        <div className="text-[10px] sm:text-xs opacity-90">{event.startTime} - {event.endTime || ''}</div>
                                        {event.location && height > 50 && (
                                            <div className="text-[10px] sm:text-xs opacity-90 mt-1 flex items-center gap-1 truncate">
                                                <MapPinIcon className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{event.location}</span>
                                            </div>
                                        )}
                                        {event.notes && height > 90 && (
                                            <div className="text-[10px] sm:text-xs opacity-75 mt-2 line-clamp-2">{event.notes}</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface EventPanelProps {
    isOpen: boolean;
    mode: 'detail' | 'edit';
    selectedEvent: Project | null;
    eventForm: any;
    teamMembers: TeamMember[];
    profile: Profile;
    onClose: () => void;
    onSetMode: (mode: 'detail' | 'edit') => void;
    onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    onFormCustomColorChange?: (color: string) => void;
    onTeamChange: (memberId: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    onDelete: () => void;
    onNavigateToProject?: (projectId: string) => void;
    onNavigateToClient?: (clientId: string) => void;
}

const customColors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#22c55e', // green
    '#eab308', // yellow
    '#a855f7', // purple
    '#ec4899', // pink
    '#f97316', // orange
    '#14b8a6', // teal
    '#6366f1', // indigo
    '#64748b'  // slate
];

// --- TEAM VIEW COMPONENT ---
interface TeamViewProps {
    currentDate: Date;
    eventsByDate: Map<string, Project[]>;
    teamMembers: TeamMember[];
    profile: Profile;
    isLoading?: boolean;
    onEventClick: (event: Project) => void;
}

const TeamView: React.FC<TeamViewProps> = ({ currentDate, eventsByDate, teamMembers, profile, isLoading, onEventClick }) => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        return day;
    });

    const [hoveredEvent, setHoveredEvent] = useState<{ event: Project, pos: { x: number, y: number } } | null>(null);

    return (
        <div className="flex flex-col h-full overflow-hidden relative bg-brand-surface/30">
            {isLoading && <CalendarSkeleton />}
            <div className="flex border-b border-brand-border/40 bg-white/70 backdrop-blur-md sticky top-0 z-20 shadow-sm">
                <div className="w-32 sm:w-48 p-3 font-semibold text-xs text-brand-text-secondary border-r border-brand-border/40 flex items-center justify-center shrink-0">Anggota Tim</div>
                <div className="flex-1 grid grid-cols-7 min-w-[600px]">
                    {weekDays.map((day, i) => {
                        const isToday = day.toDateString() === new Date().toDateString();
                        return (
                            <div key={i} className={`p-2 text-center border-r border-brand-border/40 ${isToday ? 'bg-brand-accent/5' : 'bg-white/40'}`}>
                                <div className="text-[10px] sm:text-xs font-medium text-brand-text-secondary">{weekdays[day.getDay()]}</div>
                                <div className={`text-sm font-bold mt-1 mx-auto w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-accent text-white shadow-md' : 'text-brand-text-light'}`}>
                                    {day.getDate()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="min-w-[600px] pb-10 flex flex-col">
                    {teamMembers.map(member => (
                        <div key={member.id} className="flex border-b border-brand-border/40 hover:bg-white/40 transition-colors group">
                            <div className="w-32 sm:w-48 p-3 border-r border-brand-border/40 flex items-center gap-3 shrink-0 bg-brand-surface/50 z-10 sticky left-0 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                <div className="w-8 h-8 rounded-full bg-brand-input flex items-center justify-center text-xs font-bold text-brand-text-secondary border border-brand-border/50">{getInitials(member.name)}</div>
                                <div className="min-w-0 hidden sm:block">
                                    <p className="font-semibold text-sm text-brand-text-light truncate">{member.name}</p>
                                    <p className="text-[10px] text-brand-text-secondary truncate">{member.role}</p>
                                </div>
                            </div>
                            <div className="flex-1 grid grid-cols-7">
                                {weekDays.map((day, dayIndex) => {
                                    const events = eventsByDate.get(day.toDateString()) || [];
                                    const memberEvents = events.filter(e => e.team && e.team.some(t => t.memberId === member.id));
                                    const isToday = day.toDateString() === new Date().toDateString();

                                    return (
                                        <div key={dayIndex} className={`p-1.5 border-r border-brand-border/40 min-h-[80px] ${isToday ? 'bg-brand-accent/5' : ''}`}>
                                            <div className="space-y-1.5 flex flex-col">
                                                {memberEvents.map(event => {
                                                    const bgColor = getEventColor(event, profile);
                                                    return (
                                                        <div
                                                            key={event.id}
                                                            onClick={(e) => { e.stopPropagation(); setHoveredEvent(null); onEventClick(event); }}
                                                            onMouseEnter={(e) => setHoveredEvent({ event, pos: { x: e.clientX, y: e.clientY } })}
                                                            onMouseMove={(e) => setHoveredEvent({ event, pos: { x: e.clientX, y: e.clientY } })}
                                                            onMouseLeave={() => setHoveredEvent(null)}
                                                            className="text-[10px] p-1.5 rounded-md text-white truncate cursor-pointer shadow-sm hover:opacity-90 active:scale-95 transition-all text-left"
                                                            style={{ backgroundColor: bgColor }}
                                                        >
                                                            <p className="font-semibold truncate leading-tight">{event.projectName}</p>
                                                            {event.startTime && <p className="text-[8px] opacity-90 truncate leading-tight">{event.startTime}</p>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                    {teamMembers.length === 0 && (
                        <div className="p-10 text-center text-brand-text-secondary">Tidak ada anggota tim terdaftar.</div>
                    )}
                </div>
            </div>
            {hoveredEvent && <SmartHoverTooltip event={hoveredEvent.event} profile={profile} position={hoveredEvent.pos} />}
        </div>
    );
};

const EventPanel: React.FC<EventPanelProps> = ({ isOpen, mode, selectedEvent, eventForm, teamMembers, profile, onClose, onSetMode, onFormChange, onFormCustomColorChange, onTeamChange, onSubmit, onDelete, onNavigateToProject, onNavigateToClient }) => (
    <div className={`flex-shrink-0 w-full md:w-[400px] border-l border-brand-border/30 flex flex-col bg-brand-surface/80 backdrop-blur-xl transform transition-transform duration-300 ease-in-out z-20 ${isOpen ? 'translate-x-0 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)]' : 'translate-x-full absolute right-0 bottom-0 top-0'}`}>
        <div className="p-4 border-b border-brand-border/40 bg-white/40 flex items-center justify-between">
            <h3 className="font-semibold text-brand-text-light text-sm">{mode === 'detail' ? 'Detail Acara' : (selectedEvent ? 'Edit Acara' : 'Buat Acara Baru')}</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white text-brand-text-secondary transition-colors">
                <ChevronRightIcon className="w-5 h-5" />
            </button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1">
            {mode === 'detail' && selectedEvent ? (
                <div className="flex-1 flex flex-col animate-fade-in">
                    {selectedEvent.image && <div className="relative h-48 w-full"><img src={selectedEvent.image} alt={selectedEvent.projectName} className="w-full h-full object-cover" /><div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent"></div></div>}
                    <div className="p-6 flex-1 relative bg-white/30">
                        <h3 className="text-xl font-semibold text-brand-text-light">{selectedEvent.projectName}</h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full mt-2 inline-block" style={{ backgroundColor: `${getEventColor(selectedEvent, profile)}30`, color: getEventColor(selectedEvent, profile) }}>{selectedEvent.projectType}</span>
                        {selectedEvent.clientId !== 'INTERNAL' && selectedEvent.clientName && (
                            <div className="mt-3 p-3 bg-brand-bg rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <UsersIcon className="w-5 h-5 text-brand-accent" />
                                    <div>
                                        <p className="text-xs text-brand-text-secondary">Pengantin</p>
                                        <p className="font-semibold text-brand-text-light">{selectedEvent.clientName}</p>
                                    </div>
                                </div>
                                {onNavigateToClient && (
                                    <button onClick={() => onNavigateToClient(selectedEvent.clientId)} className="text-xs font-semibold text-brand-accent hover:underline flex items-center gap-1">
                                        Buka <LinkIcon className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        )}
                        {selectedEvent.clientId !== 'INTERNAL' && (selectedEvent.packageName || selectedEvent.totalCost !== undefined) && (
                            <div className="mt-3 p-3 bg-brand-bg rounded-lg space-y-1">
                                {selectedEvent.packageName && <p className="text-sm"><span className="text-brand-text-secondary">Paket:</span> <span className="font-medium text-brand-text-light">{selectedEvent.packageName}</span></p>}
                                <p className="text-sm flex items-center gap-1"><DollarSignIcon className="w-4 h-4 text-brand-accent" /><span className="text-brand-text-secondary">Total:</span> <span className="font-semibold text-brand-text-light">{formatCurrency(selectedEvent.totalCost || 0)}</span></p>
                                {selectedEvent.paymentStatus && <p className="text-xs"><span className="text-brand-text-secondary">Status Bayar:</span> <span className="font-medium" style={{ color: selectedEvent.paymentStatus === 'Lunas' ? '#22c55e' : selectedEvent.paymentStatus === 'DP Terbayar' ? '#eab308' : '#ef4444' }}>{selectedEvent.paymentStatus}</span></p>}
                            </div>
                        )}
                        <div className="mt-6 space-y-5 text-sm">
                            <div className="flex items-start gap-4"><ClockIcon className="w-5 h-5 text-brand-text-secondary flex-shrink-0 mt-0.5" /><p className="text-brand-text-primary font-medium">{new Date(selectedEvent.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} <br /><span className="text-brand-text-secondary">{selectedEvent.startTime && selectedEvent.endTime ? `${selectedEvent.startTime} - ${selectedEvent.endTime}` : 'Sepanjang hari'}</span></p></div>
                            {selectedEvent.location && (<div className="flex items-start gap-4"><MapPinIcon className="w-5 h-5 text-brand-text-secondary flex-shrink-0 mt-0.5" /><p className="text-brand-text-primary font-medium">{selectedEvent.location}</p></div>)}
                            {selectedEvent.team && selectedEvent.team.length > 0 && (<div className="flex items-start gap-4"><UsersIcon className="w-5 h-5 text-brand-text-secondary flex-shrink-0 mt-0.5" /><div><p className="font-medium text-brand-text-light mb-2">Tim yang Bertugas</p><div className="flex items-center -space-x-2">{selectedEvent.team.map(t => (<div key={t.memberId} className="w-8 h-8 rounded-full bg-brand-input flex items-center justify-center text-xs font-bold text-brand-text-secondary border-2 border-brand-surface" title={t.name}>{getInitials(t.name)}</div>))}</div></div></div>)}
                            {selectedEvent.notes && <div className="flex items-start gap-4"><FileTextIcon className="w-5 h-5 text-brand-text-secondary flex-shrink-0 mt-0.5" /><p className="text-brand-text-primary whitespace-pre-wrap">{selectedEvent.notes}</p></div>}
                        </div>
                    </div>
                    <div className="p-6 border-t border-brand-border space-y-2">
                        {selectedEvent.clientId !== 'INTERNAL' && onNavigateToProject && !selectedEvent.id.endsWith('-deadline') && (
                            <button onClick={() => onNavigateToProject(selectedEvent.id)} className="button-secondary w-full inline-flex items-center justify-center gap-2">
                                <FolderKanbanIcon className="w-5 h-5" /> Buka Halaman Acara
                            </button>
                        )}
                        <button onClick={() => onSetMode('edit')} className="button-primary w-full">{profile.eventTypes?.includes(selectedEvent.projectType) ? 'Edit Detail Acara' : 'Lihat Detail (Baca Saja)'}</button>
                        {!profile.eventTypes?.includes(selectedEvent.projectType) && (
                            <p className="text-xs text-brand-text-secondary mt-2">Acara pengantin hanya dapat diedit di halaman Acara.</p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-6 relative bg-white/30 min-h-full">
                    <form onSubmit={onSubmit} className="space-y-5 animate-fade-in form-compact">
                        <div className="input-group"><input type="text" id="eventName" name="projectName" value={eventForm.projectName} onChange={onFormChange} className="input-field bg-white/80" placeholder=" " required /><label htmlFor="eventName" className="input-label">Nama Acara</label></div>
                        <div className="input-group"><select name="projectType" id="projectType" value={eventForm.projectType} onChange={onFormChange} className="input-field bg-white/80">{(profile.eventTypes || []).map(type => <option key={type} value={type}>{type}</option>)}</select><label htmlFor="projectType" className="input-label">Jenis Acara</label></div>
                        <div className="input-group"><input type="date" id="eventDate" name="date" value={eventForm.date} onChange={onFormChange} className="input-field bg-white/80" placeholder=" " required /><label htmlFor="eventDate" className="input-label">Tanggal</label></div>
                        <div className="grid grid-cols-2 gap-4"><div className="input-group"><input type="time" id="startTime" name="startTime" value={eventForm.startTime} onChange={onFormChange} className="input-field bg-white/80" placeholder=" " /><label htmlFor="startTime" className="input-label">Mulai</label></div><div className="input-group"><input type="time" id="endTime" name="endTime" value={eventForm.endTime} onChange={onFormChange} className="input-field bg-white/80" placeholder=" " /><label htmlFor="endTime" className="input-label">Selesai</label></div></div>
                        <div className="input-group"><input type="text" id="eventLocation" name="location" value={eventForm.location || ''} onChange={onFormChange} className="input-field bg-white/80" placeholder=" " /><label htmlFor="eventLocation" className="input-label">Lokasi (Opsional)</label></div>
                        <div className="input-group"><input type="url" id="imageUrl" name="image" value={eventForm.image} onChange={onFormChange} className="input-field bg-white/80" placeholder=" " /><label htmlFor="imageUrl" className="input-label">URL Gambar Sampul (Opsional)</label></div>
                        <div className="input-group">
                            <label className="input-label !static !-top-4 !text-brand-accent">Warna Acara</label>
                            <div className="flex flex-wrap gap-2 mt-2 p-3 border border-brand-border/40 bg-white/60 rounded-xl shadow-inner">
                                {customColors.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => onFormCustomColorChange && onFormCustomColorChange(color)}
                                        className={`w-6 h-6 rounded-full border-2 transition-transform ${eventForm.color === color ? 'border-brand-text-primary scale-110 shadow-sm' : 'border-transparent hover:scale-110'}`}
                                        style={{ backgroundColor: color }}
                                        aria-label={`Pilih warna ${color}`}
                                    />
                                ))}
                            </div>
                            <p className="text-[10px] text-brand-text-secondary mt-1">Acara internal akan menggunakan warna ini. Acara pengantin akan menggunakan warna status acara (jika ada).</p>
                        </div>
                        <div className="input-group"><label className="input-label !static !-top-4 !text-brand-accent">Tim</label><div className="p-3 border border-brand-border/40 bg-white/60 rounded-xl max-h-32 overflow-y-auto space-y-2 mt-2 custom-scrollbar shadow-inner">{teamMembers.map(member => (<label key={member.id} className="flex items-center group cursor-pointer"><input type="checkbox" checked={eventForm.team.some((t: any) => t.memberId === member.id)} onChange={() => onTeamChange(member.id)} className="h-4 w-4 rounded border-gray-300 text-brand-accent focus:ring-brand-accent transition flex-shrink-0" /><span className="ml-3 text-sm font-medium text-brand-text-secondary group-hover:text-brand-text-light">{member.name}</span></label>))}</div></div>
                        <div className="input-group"><textarea name="notes" id="eventNotes" value={eventForm.notes} onChange={onFormChange} className="input-field bg-white/80 custom-scrollbar" rows={3} placeholder=" "></textarea><label htmlFor="eventNotes" className="input-label">Catatan</label></div>
                        <div className="flex justify-end gap-3 pt-6 pb-2 border-t border-brand-border/40">
                            {selectedEvent && profile.eventTypes.includes(selectedEvent.projectType) && (
                                <button type="button" onClick={onDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-semibold transition-colors mr-auto">Hapus</button>
                            )}
                            <button type="button" onClick={mode === 'edit' && selectedEvent ? () => onSetMode('detail') : onClose} className="button-secondary shadow-sm">Batal</button>
                            <button type="submit" className="button-primary shadow-md">{selectedEvent ? 'Update Acara' : 'Simpan Acara'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    </div>
);


// --- MAIN COMPONENT ---
interface CalendarViewProps {
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    teamMembers: TeamMember[];
    profile: Profile;
    clients: Client[];
    handleNavigation: (view: ViewType, action?: NavigationAction) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ projects, setProjects, teamMembers, profile, clients, handleNavigation }) => {
    // STATE
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month' | 'Team' | 'Agenda'>('Month');
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Project | null>(null);
    const [panelMode, setPanelMode] = useState<'detail' | 'edit'>('detail');
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [internalEvents, setInternalEvents] = useState<Project[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);

    const [filters, setFilters] = useState<{
        isClientProjectVisible: boolean;
        visibleEventTypes: Set<string>;
        selectedClientId: string | null;
    }>({
        isClientProjectVisible: true,
        visibleEventTypes: new Set(profile.eventTypes || []),
        selectedClientId: null,
    });

    const initialFormState = useMemo(() => ({
        id: '', projectName: '', projectType: (profile.eventTypes || [])[0] || 'Lainnya', date: new Date().toISOString().split('T')[0],
        startTime: '', endTime: '', notes: '', team: [] as AssignedTeamMember[], image: '', location: '', color: '#3b82f6'
    }), [profile.eventTypes]);

    const [eventForm, setEventForm] = useState(initialFormState);

    useEffect(() => {
        setIsPanelOpen(false);
    }, [currentDate, viewMode]);

    // Load internal calendar events from Supabase for the current month
    useEffect(() => {
        let isMounted = true;
        (async () => {
            setIsLoadingEvents(true);
            try {
                const from = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
                const to = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
                const rows = await listCalendarEventsInRange(from, to);
                if (!isMounted) return;
                setInternalEvents(Array.isArray(rows) ? rows : []);
            } catch (e) {
                console.warn('[Supabase] Failed to fetch calendar events (range).', e);
            } finally {
                if (isMounted) setIsLoadingEvents(false);
            }
        })();
        return () => { isMounted = false; };
    }, [currentDate]);

    // Realtime subscription for calendar_events
    useEffect(() => {
        const channel = supabase
            .channel('calendar-events-ch')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calendar_events' }, (payload) => {
                // Refetch or append
                // Safer to re-map quickly
                (async () => {
                    try {
                        const from = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
                        const to = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
                        const rows = await listCalendarEventsInRange(from, to);
                        setInternalEvents(Array.isArray(rows) ? rows : []);
                    } catch { }
                })();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calendar_events' }, (payload) => {
                (async () => {
                    try {
                        const from = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
                        const to = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
                        const rows = await listCalendarEventsInRange(from, to);
                        setInternalEvents(Array.isArray(rows) ? rows : []);
                    } catch { }
                })();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'calendar_events' }, (payload) => {
                setInternalEvents(prev => prev.filter(e => e.id !== (payload.old as any).id));
            })
            .subscribe();

        return () => {
            try { supabase.removeChannel(channel); } catch { }
        };
    }, [currentDate]);

    // MEMOS
    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const lastDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);

    const daysInMonthGrid = useMemo(() => {
        const days = [];
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        const endDate = new Date(lastDayOfMonth);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
        let date = startDate;
        while (date <= endDate) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [firstDayOfMonth, lastDayOfMonth]);

    const filteredEvents = useMemo(() => {
        const deadlineEvents = (projects || [])
            .filter(p => (p as Project & { deadlineDate?: string }).deadlineDate)
            .map(p => ({
                ...p,
                id: `${p.id}-deadline`,
                projectName: `Deadline: ${p.projectName}`,
                date: (p as Project & { deadlineDate?: string }).deadlineDate!,
            } as Project));

        const all = [...projects, ...internalEvents, ...deadlineEvents];
        return all.filter(p => {
            const isInternalEvent = profile.eventTypes?.includes(p.projectType);
            if (isInternalEvent) {
                const showAllTypes = filters.visibleEventTypes.size === 0;
                return showAllTypes || filters.visibleEventTypes.has(p.projectType);
            }
            if (!filters.isClientProjectVisible) return false;
            if (filters.selectedClientId) {
                return p.clientId === filters.selectedClientId;
            }
            return true;
        });
    }, [projects, internalEvents, filters, profile.eventTypes]);

    const stats = useMemo(() => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const projectsInRange = (projects || []).filter(p => {
            const d = new Date(p.date);
            return d >= monthStart && d <= monthEnd;
        });
        const internalInRange = internalEvents.filter(p => {
            const d = new Date(p.date);
            return d >= monthStart && d <= monthEnd;
        });
        const clientIds = new Set(projectsInRange.map(p => p.clientId).filter(id => id && id !== 'INTERNAL'));
        return {
            totalProjects: projectsInRange.length,
            totalInternal: internalInRange.length,
            totalClients: clientIds.size,
        };
    }, [projects, internalEvents, currentDate]);

    const clientsThisMonth = useMemo(() => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const clientIds = new Set<string>();
        (projects || []).filter(p => {
            const d = new Date(p.date);
            return d >= monthStart && d <= monthEnd && p.clientId && p.clientId !== 'INTERNAL';
        }).forEach(p => clientIds.add(p.clientId));
        return Array.from(clientIds).map(id => {
            const client = clients.find(c => c.id === id);
            return { id, name: client?.name || projects.find(p => p.clientId === id)?.clientName || 'Pengantin' };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [projects, clients, currentDate]);

    const agendaByDate = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const map = new Map<string, Project[]>();
        filteredEvents
            .filter(event => new Date(event.date) >= today)
            .sort((a, b) => {
                const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
                if (dateDiff !== 0) return dateDiff;
                if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                return 0;
            })
            .forEach(event => {
                const dateKey = new Date(event.date).toDateString();
                if (!map.has(dateKey)) { map.set(dateKey, []); }
                map.get(dateKey)!.push(event);
            });
        return Array.from(map.entries());
    }, [filteredEvents]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, Project[]>();
        filteredEvents.forEach(p => {
            const dateKey = new Date(p.date).toDateString();
            if (!map.has(dateKey)) { map.set(dateKey, []); }
            map.get(dateKey)!.push(p);
        });
        return map;
    }, [filteredEvents]);

    // HANDLERS
    const handleOpenPanelForAdd = (date: Date) => {
        setSelectedEvent(null);
        setEventForm({ ...initialFormState, date: date.toISOString().split('T')[0] });
        setPanelMode('edit');
        setIsPanelOpen(true);
    };

    const handleOpenPanelForEdit = (event: Project) => {
        setSelectedEvent(event);
        setEventForm({
            id: event.id, projectName: event.projectName, projectType: event.projectType, date: event.date,
            startTime: event.startTime || '', endTime: event.endTime || '', notes: event.notes || '',
            team: event.team || [], image: event.image || '', location: event.location || '',
            color: event.color || '#3b82f6',
        });
        setPanelMode('detail');
        setIsPanelOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setEventForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleTeamChange = (memberId: string) => {
        const member = teamMembers.find(m => m.id === memberId);
        if (!member) return;
        setEventForm(prev => {
            const isSelected = prev.team.some(t => t.memberId === memberId);
            return { ...prev, team: isSelected ? prev.team.filter(t => t.memberId !== memberId) : [...prev.team, { memberId: member.id, name: member.name, role: member.role, fee: member.standardFee, reward: 0 }] };
        });
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isInternalEvent = profile.eventTypes.includes(eventForm.projectType);
        // Validate time range if both provided
        if (eventForm.startTime && eventForm.endTime) {
            const [sh, sm] = eventForm.startTime.split(':').map((n: string) => parseInt(n, 10));
            const [eh, em] = eventForm.endTime.split(':').map((n: string) => parseInt(n, 10));
            const startMin = sh * 60 + (sm || 0);
            const endMin = eh * 60 + (em || 0);
            if (endMin <= startMin) {
                alert('Waktu selesai harus lebih besar dari waktu mulai.');
                return;
            }
        }
        try {
            if (selectedEvent) {
                // Editing
                if (isInternalEvent && internalEvents.some(ev => ev.id === selectedEvent.id)) {
                    const updated = await updateCalendarEvent(selectedEvent.id, {
                        title: eventForm.projectName,
                        eventType: eventForm.projectType,
                        date: eventForm.date,
                        startTime: eventForm.startTime || undefined,
                        endTime: eventForm.endTime || undefined,
                        notes: eventForm.notes || undefined,
                        team: eventForm.team,
                        image: eventForm.image || undefined,
                        location: selectedEvent.location || undefined,
                    });
                    setInternalEvents(prev => prev.map(p => p.id === selectedEvent.id ? updated : p));
                    setSelectedEvent(updated);
                    setPanelMode('detail');
                } else {
                    // Client projects are view-only from Calendar. Prevent edit here.
                    alert('Edit acara pengantin dari halaman Acara. Kalender hanya mengedit acara internal.');
                }
            } else {
                // Adding new
                if (!isInternalEvent) {
                    alert('Untuk menambahkan acara di Kalender, pilih jenis acara internal.');
                    return;
                }
                const created = await createCalendarEvent({
                    title: eventForm.projectName,
                    eventType: eventForm.projectType,
                    date: eventForm.date,
                    startTime: eventForm.startTime || undefined,
                    endTime: eventForm.endTime || undefined,
                    notes: eventForm.notes || undefined,
                    team: eventForm.team,
                    image: eventForm.image || undefined,
                    location: eventForm.location || '',
                });
                setInternalEvents(prev => [...prev, created]);
                setIsPanelOpen(false);
            }
        } catch (err: any) {
            console.error('[Supabase][calendar_events.save] error:', err);
            alert(`Gagal menyimpan acara. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;
        const isInternal = profile.eventTypes.includes(selectedEvent.projectType);
        if (!isInternal) {
            alert('Hapus acara pengantin dari halaman Acara. Kalender hanya menghapus acara internal.');
            return;
        }
        if (!window.confirm(`Yakin ingin menghapus acara "${selectedEvent.projectName}"?`)) return;
        try {
            await deleteCalendarEvent(selectedEvent.id);
            setInternalEvents(prev => prev.filter(p => p.id !== selectedEvent.id));
            setIsPanelOpen(false);
        } catch (err: any) {
            console.error('[Supabase][calendar_events.delete] error:', err);
            alert(`Gagal menghapus acara. ${err?.message || 'Coba lagi.'}`);
        }
    };

    const handleFilterChange = (filterType: 'client' | 'event', value: boolean | string) => {
        if (filterType === 'client') {
            setFilters(prev => ({ ...prev, isClientProjectVisible: value as boolean }));
        } else {
            setFilters(prev => {
                const newSet = new Set(prev.visibleEventTypes);
                if (newSet.has(value as string)) newSet.delete(value as string);
                else newSet.add(value as string);
                return { ...prev, visibleEventTypes: newSet };
            });
        }
    };

    const handleClientSelect = (clientId: string | null) => {
        setFilters(prev => ({ ...prev, selectedClientId: clientId }));
    };

    const handleNavigateToProject = (projectId: string) => {
        const id = projectId.replace(/-deadline$/, '');
        handleNavigation(ViewType.PROJECTS, { type: 'VIEW_PROJECT_DETAILS', id });
    };

    const handleNavigateToClient = (clientId: string) => {
        handleNavigation(ViewType.CLIENTS, { type: 'VIEW_CLIENT_DETAILS', id: clientId });
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] bg-brand-surface rounded-2xl overflow-hidden relative">
            {/* Mobile: floating add button */}
            <div className="lg:hidden fixed bottom-20 right-4 z-20">
                <button onClick={() => handleOpenPanelForAdd(new Date())} className="w-12 h-12 rounded-full bg-brand-accent text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95" aria-label="Buat acara baru">
                    <PlusIcon className="w-6 h-6" />
                </button>
            </div>
            <CalendarSidebar
                profile={profile}
                isClientProjectVisible={filters.isClientProjectVisible}
                visibleEventTypes={filters.visibleEventTypes}
                selectedClientId={filters.selectedClientId}
                clientsThisMonth={clientsThisMonth}
                stats={stats}
                onAddEvent={() => handleOpenPanelForAdd(new Date())}
                onClientFilterChange={(v) => handleFilterChange('client', v)}
                onEventTypeFilterChange={(v) => handleFilterChange('event', v)}
                onClientSelect={handleClientSelect}
                currentDate={currentDate}
                onDateSelect={setCurrentDate}
            />

            <div className="flex-1 flex flex-row overflow-hidden">
                <div className="flex-1 flex flex-col overflow-y-auto">
                    <CalendarHeader
                        currentDate={currentDate}
                        viewMode={viewMode}
                        stats={stats}
                        onPrev={() => {
                            if (viewMode === 'Day') {
                                const newDate = new Date(currentDate);
                                newDate.setDate(currentDate.getDate() - 1);
                                setCurrentDate(newDate);
                            } else if (viewMode === 'Week') {
                                const newDate = new Date(currentDate);
                                newDate.setDate(currentDate.getDate() - 7);
                                setCurrentDate(newDate);
                            } else {
                                setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
                            }
                        }}
                        onNext={() => {
                            if (viewMode === 'Day') {
                                const newDate = new Date(currentDate);
                                newDate.setDate(currentDate.getDate() + 1);
                                setCurrentDate(newDate);
                            } else if (viewMode === 'Week') {
                                const newDate = new Date(currentDate);
                                newDate.setDate(currentDate.getDate() + 7);
                                setCurrentDate(newDate);
                            } else {
                                setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
                            }
                        }}
                        onToday={() => setCurrentDate(new Date())}
                        onViewModeChange={setViewMode}
                        onInfoClick={() => setIsInfoModalOpen(true)}
                    />
                    <div
                        className="flex-1 calendar-grid-container"
                        onTouchStart={(e) => {
                            const touch = e.touches[0];
                            (e.currentTarget as any).touchStartX = touch.clientX;
                        }}
                        onTouchEnd={(e) => {
                            const touchEndX = e.changedTouches[0].clientX;
                            const touchStartX = (e.currentTarget as any).touchStartX;
                            if (touchStartX === undefined) return;
                            const diff = touchStartX - touchEndX;

                            // Swipe Left (Next)
                            if (diff > 50) {
                                if (viewMode === 'Day') {
                                    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1));
                                } else if (viewMode === 'Week') {
                                    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7));
                                } else if (viewMode === 'Month') {
                                    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                                }
                            }
                            // Swipe Right (Prev)
                            else if (diff < -50) {
                                if (viewMode === 'Day') {
                                    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1));
                                } else if (viewMode === 'Week') {
                                    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7));
                                } else if (viewMode === 'Month') {
                                    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                                }
                            }
                        }}
                    >
                        {isLoadingEvents && viewMode !== 'Agenda' && <CalendarSkeleton />}
                        {viewMode === 'Day' ? (
                            <DayView
                                currentDate={currentDate}
                                eventsByDate={eventsByDate}
                                profile={profile}
                                onEventClick={handleOpenPanelForEdit}
                            />
                        ) : viewMode === 'Week' ? (
                            <WeekView
                                currentDate={currentDate}
                                eventsByDate={eventsByDate}
                                profile={profile}
                                isLoading={isLoadingEvents}
                                onDayClick={setCurrentDate}
                                onEventClick={handleOpenPanelForEdit}
                            />
                        ) : viewMode === 'Month' ? (
                            <MonthView
                                currentDate={currentDate}
                                daysInMonth={daysInMonthGrid}
                                eventsByDate={eventsByDate}
                                profile={profile}
                                isLoading={isLoadingEvents}
                                onDayClick={handleOpenPanelForAdd}
                                onEventClick={handleOpenPanelForEdit}
                            />
                        ) : viewMode === 'Team' ? (
                            <TeamView
                                currentDate={currentDate}
                                eventsByDate={eventsByDate}
                                teamMembers={teamMembers}
                                profile={profile}
                                isLoading={isLoadingEvents}
                                onEventClick={handleOpenPanelForEdit}
                            />
                        ) : (
                            <AgendaView
                                agendaByDate={agendaByDate}
                                profile={profile}
                                onEventClick={handleOpenPanelForEdit}
                            />
                        )}
                    </div>
                </div>

                <EventPanel
                    isOpen={isPanelOpen}
                    mode={panelMode}
                    selectedEvent={selectedEvent}
                    eventForm={eventForm}
                    teamMembers={teamMembers}
                    profile={profile}
                    onClose={() => setIsPanelOpen(false)}
                    onSetMode={setPanelMode}
                    onFormChange={handleFormChange}
                    onTeamChange={handleTeamChange}
                    onSubmit={handleFormSubmit}
                    onDelete={handleDeleteEvent}
                    onNavigateToProject={handleNavigateToProject}
                    onNavigateToClient={handleNavigateToClient}
                />
            </div>

            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="Panduan Halaman Kalender">
                <div className="space-y-4 text-sm text-brand-text-primary max-h-[70vh] overflow-y-auto">
                    <p>Halaman Kalender membantu Anda memvisualisasikan semua jadwal penting dalam satu tempat.</p>
                    <h4 className="font-semibold text-brand-text-light mt-4">Fitur Tampilan</h4>
                    <ul className="list-disc list-inside space-y-1.5">
                        <li><strong>Hari:</strong> Tampilan detail per hari dengan timeline jam.</li>
                        <li><strong>Minggu:</strong> Tampilan mingguan untuk melihat jadwal 7 hari sekaligus.</li>
                        <li><strong>Bulan:</strong> Kalender bulanan tradisional dengan acara di tiap tanggal.</li>
                        <li><strong>Agenda:</strong> Daftar acara mendatang diurutkan per tanggal.</li>
                    </ul>
                    <h4 className="font-semibold text-brand-text-light mt-4">Jenis Acara</h4>
                    <ul className="list-disc list-inside space-y-1.5">
                        <li><strong>Acara Pengantin:</strong> Semua acara wedding pengantin tampil otomatis dengan nama pengantin, paket, status bayar, dan lokasi. Klik acara untuk lihat detail lengkap dan buka halaman Acara/Pengantin.</li>
                        <li><strong>Acara Internal:</strong> Meeting Pengantin, Survey Lokasi, Libur, Workshop, dll. Bisa dibuat dan diedit langsung dari kalender.</li>
                        <li><strong>Deadline Acara:</strong> Tanggal deadline acara tampil otomatis sebagai acara terpisah.</li>
                    </ul>
                    <h4 className="font-semibold text-brand-text-light mt-4">Filter & Statistik</h4>
                    <ul className="list-disc list-inside space-y-1.5">
                        <li><strong>Statistik Bulan:</strong> Jumlah acara, acara internal, dan pengantin unik bulan ini.</li>
                        <li><strong>Filter per Pengantin:</strong> Dropdown untuk fokus pada acara satu pengantin tertentu.</li>
                        <li><strong>Filter Tampilan:</strong> Sembunyikan acara pengantin atau acara internal tertentu (Meeting, Libur, dll).</li>
                    </ul>
                    <h4 className="font-semibold text-brand-text-light mt-4">Aksi Cepat</h4>
                    <ul className="list-disc list-inside space-y-1.5">
                        <li>Klik tanggal kosong → buka form buat acara baru pada tanggal tersebut.</li>
                        <li>Klik acara → panel detail dengan info pengantin, paket, pembayaran, lokasi, tim.</li>
                        <li><strong>Buka Halaman Acara</strong> → navigasi langsung ke detail acara.</li>
                        <li><strong>Buka Pengantin</strong> → navigasi ke profil pengantin.</li>
                    </ul>
                </div>
            </Modal>
        </div>
    );
};

export default CalendarView;