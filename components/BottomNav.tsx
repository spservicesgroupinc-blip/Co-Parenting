
import React from 'react';
import { HomeIcon, CalendarDaysIcon, PlusIcon, ChatBubbleOvalLeftEllipsisIcon, MenuIcon } from './icons';
import { View } from '../types';

interface BottomNavProps {
    activeView: View;
    onViewChange: (view: View) => void;
    onMenuClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, onViewChange, onMenuClick }) => {
    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-[env(safe-area-inset-bottom)]">
            <div className="bg-white/90 backdrop-blur-xl border-t border-gray-200/60 shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.1)] pointer-events-auto">
                <div className="flex justify-between items-center h-16 px-4 max-w-md mx-auto relative">
                    {/* Home */}
                    <button
                        onClick={() => onViewChange('dashboard')}
                        className={`flex flex-col items-center justify-center w-14 h-full touch-manipulation transition-colors ${activeView === 'dashboard' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <HomeIcon className={`w-6 h-6 ${activeView === 'dashboard' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                        <span className="text-[10px] font-medium mt-1">Home</span>
                    </button>

                    {/* Calendar */}
                    <button
                        onClick={() => onViewChange('calendar')}
                        className={`flex flex-col items-center justify-center w-14 h-full touch-manipulation transition-colors ${activeView === 'calendar' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <CalendarDaysIcon className={`w-6 h-6 ${activeView === 'calendar' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                        <span className="text-[10px] font-medium mt-1">Calendar</span>
                    </button>

                    {/* New Report (Floating FAB) */}
                    <div className="relative flex justify-center w-16">
                        <button
                            onClick={() => onViewChange('new_report')}
                            className="absolute -top-10 bg-gradient-to-tr from-blue-600 to-blue-800 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center transform active:scale-95 transition-all border-4 border-white touch-manipulation hover:shadow-blue-600/40 hover:-translate-y-0.5"
                            aria-label="New Report"
                        >
                            <PlusIcon className="w-7 h-7 stroke-2" />
                        </button>
                    </div>

                    {/* Messages */}
                    <button
                        onClick={() => onViewChange('messaging')}
                        className={`flex flex-col items-center justify-center w-14 h-full touch-manipulation transition-colors ${activeView === 'messaging' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <ChatBubbleOvalLeftEllipsisIcon className={`w-6 h-6 ${activeView === 'messaging' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                        <span className="text-[10px] font-medium mt-1">Chat</span>
                    </button>

                    {/* Menu */}
                    <button
                        onClick={onMenuClick}
                        className="flex flex-col items-center justify-center w-14 h-full text-gray-400 hover:text-gray-600 touch-manipulation transition-colors"
                    >
                        <MenuIcon className="w-6 h-6 stroke-[1.5]" />
                        <span className="text-[10px] font-medium mt-1">Menu</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BottomNav;
