import React, { useEffect, useRef, useState } from 'react';
import { BookOpenIcon, ChartBarIcon, LightBulbIcon, PlusIcon, DocumentTextIcon, ScaleIcon, CalendarDaysIcon, HomeIcon, ChatBubbleOvalLeftEllipsisIcon, ArrowRightOnRectangleIcon, LockClosedIcon, UserCircleIcon, XMarkIcon } from './icons';
import { View, SubscriptionTier } from '../types';

interface SidebarProps {
    activeView: View;
    onViewChange: (view: View) => void;
    reportCount: number;
    isOpen: boolean;
    onLogout: () => void;
    userTier?: SubscriptionTier;
    isConnected: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, reportCount, isOpen, onLogout, userTier = 'Free', isConnected, onClose }) => {
    const panelRef = useRef<HTMLElement>(null);
    const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
    useEffect(() => {
        const media = window.matchMedia('(min-width: 1024px)');
        const update = () => setIsDesktop(media.matches);
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);
    useEffect(() => {
        if (!isOpen || isDesktop) return;
        const previous = document.activeElement as HTMLElement;
        panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
        return () => previous?.focus();
    }, [isOpen, isDesktop]);

    const navItem = (view: View, label: string, icon: React.ReactNode, detail?: string) => (
        <button key={view} onClick={() => onViewChange(view)} aria-current={activeView === view ? 'page' : undefined}
            disabled={view === 'insights' && reportCount === 0}
            title={view === 'insights' && reportCount === 0 ? 'Log an incident to begin an inspection' : undefined}
            className={`flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg text-sm transition-colors ${activeView === view ? 'bg-white/15 text-white font-semibold' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}>
            <span className="w-5 h-5 flex-shrink-0">{icon}</span><span className="flex-1">{label}</span>
            {detail && <span className="text-xs text-blue-200">{detail}</span>}
            {view === 'assistant' && userTier === 'Free' && <LockClosedIcon className="w-4 h-4 text-amber-300" />}
        </button>
    );

    return (
        <aside ref={panelRef} id="app-navigation" aria-label="Main navigation" role={isOpen && !isDesktop ? 'dialog' : undefined} aria-modal={isOpen && !isDesktop ? true : undefined} inert={!isOpen && !isDesktop}
            onKeyDown={event => {
                if (!isOpen || isDesktop) return;
                if (event.key === 'Escape') { event.preventDefault(); onClose(); }
                if (event.key === 'Tab') {
                    const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
                    if (!buttons?.length) return;
                    const first = buttons[0], last = buttons[buttons.length - 1];
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                }
            }}
            className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[90vw] flex-shrink-0 bg-blue-950 p-4 transform transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex lg:flex-col`}>
            <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between pb-4 mb-3 border-b border-white/10 lg:hidden"><span className="text-white font-semibold">Your workspace</span><button onClick={onClose} className="p-3 text-blue-100 rounded-lg hover:bg-white/10" aria-label="Close navigation"><XMarkIcon className="w-5 h-5" /></button></div>
                <button className="btn-primary w-full mb-5 border border-blue-700" onClick={() => onViewChange('new_report')}><PlusIcon className="w-5 h-5" />Log an incident</button>
                <nav className="flex-1 overflow-y-auto space-y-1" aria-label="Workspace">
                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-blue-300">Day to day</p>
                    {navItem('dashboard', 'Home', <HomeIcon />)}
                    {navItem('timeline', 'Incident log', <BookOpenIcon />, String(reportCount))}
                    {navItem('calendar', 'Family calendar', <CalendarDaysIcon />)}
                    {navItem('messaging', 'Messages', <ChatBubbleOvalLeftEllipsisIcon />)}
                    {navItem('connection', 'Co-parent connection', <UserCircleIcon />)}
                    <p className="px-3 pt-6 pb-2 text-[10px] font-semibold uppercase tracking-widest text-blue-300">Records & guidance</p>
                    {navItem('documents', 'Documents', <DocumentTextIcon />)}
                    {navItem('patterns', 'Patterns & reflection', <ChartBarIcon />)}
                    {navItem('insights', 'Heart inspection', <LightBulbIcon />)}
                    {navItem('assistant', 'Biblical counsel', <ScaleIcon />)}
                </nav>
                <div className="border-t border-white/10 pt-3 mt-4 space-y-2">
                    <button onClick={() => onViewChange('connection')} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-blue-100"><span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-blue-300'}`} />{isConnected ? 'Co-parent connected' : 'Co-parent not connected'}</button>
                    <button onClick={onLogout} className="flex items-center w-full px-3 py-3 text-sm text-blue-200 hover:bg-white/10 hover:text-white rounded-lg"><ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />Sign out</button>
                    <p className="text-[11px] text-blue-300 px-3 pt-2">Guided by faith. Focused on family.</p>
                </div>
            </div>
        </aside>
    );
};
export default Sidebar;
