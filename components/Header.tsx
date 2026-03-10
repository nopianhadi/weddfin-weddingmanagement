import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ViewType, User, Notification, NavigationAction, Profile } from '../types';
import { LightbulbIcon, ClockIcon, CheckSquareIcon, MessageSquareIcon, DollarSignIcon, UsersIcon, LogOutIcon } from '../constants';

interface HeaderProps {
    pageTitle: ViewType;
    toggleSidebar: () => void;
    setIsSearchOpen: (isOpen: boolean) => void;
    notifications: Notification[];
    handleNavigation: (view: ViewType, action?: NavigationAction, notificationId?: string) => void;
    handleMarkAllAsRead: () => void;
    currentUser: User | null;
    profile: Profile;
    handleLogout: () => void;
}

const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="12" x2="20" y2="12"></line>
        <line x1="4" y1="6" x2="20" y2="6"></line>
        <line x1="4" y1="18" x2="20" y2="18"></line>
    </svg>
);

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" x2="16.65" y1="21" y2="16.65"></line></svg>
);

const BellIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
);

const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes}m lalu`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}j lalu`;

    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
};

const notificationIcons: { [key in Notification['icon']]: React.ReactNode } = {
    lead: <LightbulbIcon className="w-5 h-5 text-yellow-400" />,
    deadline: <ClockIcon className="w-5 h-5 text-orange-400" />,
    feedback: <MessageSquareIcon className="w-5 h-5 text-blue-400" />,
    payment: <DollarSignIcon className="w-5 h-5 text-red-400" />,
    completed: <CheckSquareIcon className="w-5 h-5 text-green-400" />,
    comment: <MessageSquareIcon className="w-5 h-5 text-cyan-400" />,
};

const Header: React.FC<HeaderProps> = ({ pageTitle, toggleSidebar, setIsSearchOpen, notifications, handleNavigation, handleMarkAllAsRead, currentUser, profile, handleLogout }) => {
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    // Force light mode for stability
    useEffect(() => {
        document.documentElement.classList.remove('dark');
        try { localStorage.setItem('theme', 'light'); } catch {}
    }, []);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const onNotificationClick = (notification: Notification) => {
        if (notification.link) {
            handleNavigation(notification.link.view, notification.link.action, notification.id);
        }
        setIsNotifOpen(false);
    };

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };


    return (
        <div className="flex-shrink-0">
            <header 
                id="app-header" 
                className="
                    bg-brand-surface/95
                    backdrop-blur-md
                    flex items-center justify-between 
                    h-16 sm:h-20 
                    px-3 sm:px-4 md:px-6 lg:px-8 
                    border-b border-brand-border/50
                    sticky top-0 z-50
                    shadow-lg
                "
                style={{
                    paddingTop: 'calc(0.75rem + var(--safe-area-inset-top, 0px))',
                    height: 'calc(4rem + var(--safe-area-inset-top, 0px))',
                }}
            >
                {/* Left Section */}
                <div className="flex items-center min-w-0 flex-1">
                    {/* Enhanced Menu Button */}
                    <button
                        onClick={toggleSidebar}
                        className="
                            text-brand-text-secondary 
                            hover:text-brand-text-light 
                            active:text-brand-text-light
                            p-2 sm:p-2.5 
                            -ml-2 
                            rounded-xl 
                            hover:bg-brand-input 
                            active:bg-brand-input/80
                            xl:hidden
                            min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]
                            flex items-center justify-center
                            transition-all duration-200
                            focus:outline-none
                            focus:ring-2 focus:ring-brand-accent/20
                        "
                        aria-label="Toggle sidebar"
                    >
                        <MenuIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    
                    {/* Page Title */}
                     <h1 className="
                        text-lg xl:text-xl 
                        font-bold 
                        text-brand-text-light 
                        ml-2 lg:ml-0
                        truncate
                        select-none
                    ">
                        {pageTitle}
                    </h1>
                </div>

                {/* Right Section - Action Buttons */}
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {/* Enhanced Search Button */}
                    <button 
                        onClick={() => setIsSearchOpen(true)}
                        className="
                            p-2.5 sm:p-3
                            text-brand-text-secondary 
                            hover:text-brand-text-light 
                            active:text-brand-text-light
                            rounded-xl 
                            hover:bg-brand-input 
                            active:bg-brand-input/80
                            min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px]
                            flex items-center justify-center
                            transition-all duration-200
                            focus:outline-none
                            focus:ring-2 focus:ring-brand-accent/20
                        "
                        aria-label="Buka pencarian global"
                    >
                        <SearchIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    
                    {/* Theme toggle removed: app is locked to light mode */}

                    {/* Enhanced Notification Button */}
                    <div className="relative" ref={notifRef}>
                        <button 
                            onClick={() => setIsNotifOpen(prev => !prev)}
                            className="
                                relative 
                                p-2.5 sm:p-3
                                text-brand-text-secondary 
                                hover:text-brand-text-light 
                                active:text-brand-text-light
                                rounded-xl 
                                hover:bg-brand-input 
                                active:bg-brand-input/80
                                min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px]
                                flex items-center justify-center
                                transition-all duration-200
                                focus:outline-none
                                focus:ring-2 focus:ring-brand-accent/20
                            "
                            aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} baru)` : ''}`}
                        >
                            <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 flex">
                                    <span className="
                                        animate-ping absolute inline-flex 
                                        h-3 w-3 
                                        rounded-full 
                                        bg-red-400 
                                        opacity-75
                                    "></span>
                                    <span className="
                                        relative inline-flex 
                                        rounded-full 
                                        h-3 w-3 
                                        bg-red-500
                                        border-2 border-brand-surface
                                        shadow-sm
                                    "></span>
                                </span>
                            )}
                        </button>
                        
                        {/* Enhanced Notification Dropdown */}
                        {isNotifOpen && (
                            <div className="
                                absolute top-full right-0 
                                mt-3 
                                w-80 sm:w-96 
                                bg-brand-surface 
                                rounded-2xl 
                                shadow-2xl 
                                border border-brand-border/50 
                                z-[60]
                                animate-slide-down
                                max-h-96
                                flex flex-col
                                overflow-hidden
                            ">
                                {/* Header */}
                                <div className="
                                    flex justify-between items-center 
                                    p-4 sm:p-5 
                                    border-b border-brand-border/50
                                    bg-brand-surface/90
                                    flex-shrink-0
                                ">
                                    <h4 className="font-semibold text-brand-text-light">
                                        Notifikasi
                                    </h4>
                                    {unreadCount > 0 && (
                                        <button 
                                            onClick={handleMarkAllAsRead} 
                                            className="
                                                text-xs 
                                                font-semibold 
                                                text-brand-accent 
                                                hover:text-brand-accent-hover
                                                active:text-brand-accent-hover 
                                                px-3 py-1.5
                                                rounded-lg
                                                hover:bg-brand-accent/10
                                                active:bg-brand-accent/20
                                                transition-all duration-200
                                                min-h-[32px]
                                            "
                                        >
                                            Tandai semua dibaca
                                        </button>
                                    )}
                                </div>
                                
                                {/* Notifications List */}
                                <div className="
                                    max-h-80 
                                    overflow-y-auto 
                                    overscroll-contain
                                    flex-1
                                " 
                                style={{ WebkitOverflowScrolling: 'touch' }}>
                                    {notifications.length > 0 ? (
                                        notifications.map(notif => (
                                            <div 
                                                key={notif.id}
                                                onClick={() => onNotificationClick(notif)}
                                                className={`
                                                    flex items-start gap-3 sm:gap-4 
                                                    p-3 sm:p-4 
                                                    border-b border-brand-border/30 
                                                    last:border-b-0 
                                                    cursor-pointer 
                                                    transition-all duration-200
                                                    hover:bg-brand-input/50
                                                    active:bg-brand-input/80
                                                    min-h-[60px]
                                                    ${!notif.isRead ? 'bg-blue-500/5 border-l-4 border-l-blue-400' : ''}
                                                `}
                                            >
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {notificationIcons[notif.icon]}
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <p className="
                                                        font-semibold 
                                                        text-sm 
                                                        text-brand-text-light
                                                        leading-tight
                                                        mb-1
                                                    ">
                                                        {notif.title}
                                                    </p>
                                                    <p className="
                                                        text-xs 
                                                        text-brand-text-secondary
                                                        leading-relaxed
                                                        line-clamp-2
                                                    ">
                                                        {notif.message}
                                                    </p>
                                                </div>
                                                <div className="
                                                    flex-shrink-0 
                                                    text-right
                                                    flex flex-col items-end
                                                    gap-1
                                                ">
                                                    <p className="
                                                        text-xs 
                                                        text-brand-text-secondary
                                                        whitespace-nowrap
                                                    ">
                                                        {getRelativeTime(notif.timestamp)}
                                                    </p>
                                                    {!notif.isRead && (
                                                        <div className="
                                                            w-2 h-2 
                                                            bg-brand-accent 
                                                            rounded-full 
                                                            shadow-sm
                                                        "></div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="
                                            text-center 
                                            text-sm 
                                            text-brand-text-secondary 
                                            p-8
                                            flex flex-col items-center
                                            gap-3
                                        ">
                                            <BellIcon className="w-8 h-8 opacity-50" />
                                            <p>Tidak ada notifikasi.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Profile Dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button 
                            onClick={() => setIsProfileOpen(prev => !prev)}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-brand-accent/20 to-brand-accent/10 flex items-center justify-center border-2 border-brand-accent/20 shadow-sm hover:ring-2 hover:ring-brand-accent/50 transition-all"
                            aria-haspopup="true"
                            aria-expanded={isProfileOpen}
                        >
                            <span className="font-bold text-sm text-brand-accent">{getInitials(currentUser?.fullName || '')}</span>
                        </button>

                        {isProfileOpen && (
                            <div className="absolute top-full right-0 mt-3 w-72 bg-brand-surface rounded-2xl shadow-2xl border border-brand-border/50 z-[60] animate-slide-down overflow-hidden">
                                <div className="p-4 border-b border-brand-border/50">
                                    <p className="font-semibold text-brand-text-light truncate">{currentUser?.fullName}</p>
                                    <p className="text-sm text-brand-text-secondary truncate">{currentUser?.email}</p>
                                </div>
                                <div className="p-2">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-text-primary hover:bg-brand-input transition-colors"
                                    >
                                        <LogOutIcon className="w-5 h-5 text-brand-text-secondary" />
                                        <span>Keluar</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <style>{`
                    @keyframes slideDown {
                        from { 
                            opacity: 0; 
                            transform: translateY(-10px) scale(0.95); 
                        }
                        to { 
                            opacity: 1; 
                            transform: translateY(0) scale(1); 
                        }
                    }
                    
                    .animate-slide-down { 
                        animation: slideDown 0.2s ease-out forwards; 
                    }
                    
                    /* Text truncation utility */
                    .line-clamp-2 {
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    
                    /* Enhanced scrollbar for notifications */
                    .overflow-y-auto::-webkit-scrollbar {
                        width: 6px;
                    }
                    
                    .overflow-y-auto::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    
                    .overflow-y-auto::-webkit-scrollbar-thumb {
                        background: var(--color-border);
                        border-radius: 3px;
                    }
                    
                    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                        background: var(--color-text-secondary);
                    }
                `}</style>
            </header>
        </div>
    );
};

export default Header;
