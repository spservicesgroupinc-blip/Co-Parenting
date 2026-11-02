
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
        <nav aria-label="Quick navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none bg-white safe-bottom">
            <div className="bg-white border-t border-gray-200 pointer-events-auto">
                <div className="flex justify-between items-center h-16 px-4 max-w-md mx-auto relative">
                    {/* Home */}
                    <button
                        onClick={() => onViewChange('dashboard')}
                        aria-current={activeView === 'dashboard' ? 'page' : undefined}
                        className={`flex flex-col items-center justify-center w-14 h-full touch-manipulation transition-colors ${activeView === 'dashboard' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <HomeIcon className={`w-6 h-6 ${activeView === 'dashboard' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                        <span className="text-[10px] font-medium mt-1">Home</span>
                    </button>

                    {/* Calendar */}
                    <button
                        onClick={() => onViewChange('calendar')}
                        aria-current={activeView === 'calendar' ? 'page' : undefined}
                        className={`flex flex-col items-center justify-center w-14 h-full touch-manipulation transition-colors ${activeView === 'calendar' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <CalendarDaysIcon className={`w-6 h-6 ${activeView === 'calendar' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                        <span className="text-[10px] font-medium mt-1">Calendar</span>
                    </button>

                    {/* New Report (Floating FAB) */}
                    <div className="flex justify-center w-16 h-full">
                        <button
                            onClick={() => onViewChange('new_report')}
                            className="text-blue-900 flex flex-col items-center justify-center gap-1 w-full h-full touch-manipulation"
                            aria-label="Log an incident"
                            aria-current={activeView === 'new_report' ? 'page' : undefined}
                        >
                            <span className="bg-blue-950 text-white rounded-lg p-1"><PlusIcon className="w-5 h-5" /></span>
                            <span className="text-[10px] font-semibold">New log</span>
                        </button>
                    </div>

                    {/* Messages */}
                    <button
                        onClick={() => onViewChange('messaging')}
                        aria-current={activeView === 'messaging' ? 'page' : undefined}
                        className={`flex flex-col items-center justify-center w-14 h-full touch-manipulation transition-colors ${activeView === 'messaging' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <ChatBubbleOvalLeftEllipsisIcon className={`w-6 h-6 ${activeView === 'messaging' ? 'stroke-2' : 'stroke-[1.5]'}`} />
                        <span className="text-[10px] font-medium mt-1">Messages</span>
                    </button>

                    {/* Menu */}
                    <button
                        onClick={onMenuClick}
                        aria-controls="app-navigation"
                        className="flex flex-col items-center justify-center w-14 h-full text-gray-400 hover:text-gray-600 touch-manipulation transition-colors"
                    >
                        <MenuIcon className="w-6 h-6 stroke-[1.5]" />
                        <span className="text-[10px] font-medium mt-1">Menu</span>
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default BottomNav;
