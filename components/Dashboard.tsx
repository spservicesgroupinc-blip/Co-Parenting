import React from 'react';
import { Report, UserProfile, View } from '../types';
import { PlusIcon, CalendarDaysIcon, BookOpenIcon, ChatBubbleOvalLeftEllipsisIcon, ChevronRightIcon, UserCircleIcon, SparklesIcon } from './icons';

interface DashboardProps {
    userProfile: UserProfile | null;
    reports: Report[];
    onViewChange: (view: View) => void;
    onAnalyzeIncident: (reportId: string) => void;
    pendingLinkUsername: string;
}

const Dashboard: React.FC<DashboardProps> = ({ userProfile, reports, onViewChange, onAnalyzeIncident, pendingLinkUsername }) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonth = reports.filter(report => new Date(report.createdAt) >= startOfMonth).length;
    const recentReports = [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
    const connected = !!userProfile?.linkedUserId;
    const shortcuts = [
        { view: 'calendar' as View, title: 'Family calendar', detail: 'Coordinate your schedule', icon: CalendarDaysIcon },
        { view: 'messaging' as View, title: 'Messages', detail: connected ? 'Continue a conversation' : 'Connect and start talking', icon: ChatBubbleOvalLeftEllipsisIcon },
        { view: 'documents' as View, title: 'Documents', detail: 'Keep your records together', icon: BookOpenIcon },
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <p className="eyebrow">{today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    <h1 className="page-title">{userProfile?.name ? `Welcome back, ${userProfile.name.split(' ')[0]}.` : 'Welcome to your workspace.'}</h1>
                    <p className="text-sm text-gray-600 mt-2">A little clarity for your family's day.</p>
                </div>
                <button className="btn-primary self-start" onClick={() => onViewChange('new_report')}><PlusIcon className="w-5 h-5" />Log an incident</button>
            </div>

            <section className="surface overflow-hidden" aria-labelledby="family-connection-heading">
                <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 border-l-4 border-blue-900">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <UserCircleIcon className="w-6 h-6 text-blue-800 flex-shrink-0" />
                        <div className="min-w-0">
                            <h2 id="family-connection-heading" className="font-semibold text-gray-900">{connected ? 'Your co-parent is connected' : pendingLinkUsername ? 'Your connection is pending' : 'A shared plan starts with a connection'}</h2>
                            <p className="text-sm text-gray-600 mt-1">{connected ? 'Messages and your family calendar are ready to use.' : pendingLinkUsername ? `Waiting for @${pendingLinkUsername}. You can check the status or share your invite link.` : 'Send your co-parent an invite link to bring messages and your calendar together.'}</p>
                        </div>
                    </div>
                    <button className="btn-secondary flex-shrink-0" onClick={() => onViewChange('connection')}>{connected ? 'View connection' : pendingLinkUsername ? 'Check connection' : 'Connect co-parent'}<ChevronRightIcon className="w-4 h-4" /></button>
                </div>
            </section>

            <section className="grid grid-cols-2 sm:grid-cols-3 gap-3" aria-label="Your records at a glance">
                <div className="surface p-4 sm:p-5"><p className="text-xs text-gray-600">Total records</p><p className="text-2xl font-semibold tracking-tight text-gray-900 mt-2">{reports.length}</p></div>
                <div className="surface p-4 sm:p-5"><p className="text-xs text-gray-600">Logged this month</p><p className="text-2xl font-semibold tracking-tight text-gray-900 mt-2">{thisMonth}</p></div>
                <div className="surface p-4 sm:p-5 hidden sm:block"><p className="text-xs text-gray-600">Co-parent connection</p><p className={`text-sm font-semibold mt-3 ${connected ? 'text-green-800' : 'text-gray-700'}`}>{connected ? 'Connected' : pendingLinkUsername ? 'Pending' : 'Not connected yet'}</p></div>
            </section>

            <section className="surface overflow-hidden" aria-labelledby="recent-heading">
                <div className="p-5 sm:px-6 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div><h2 id="recent-heading" className="text-lg font-semibold text-gray-900">Recent records</h2><p className="text-xs text-gray-500 mt-1">Your latest documented events</p></div>
                    <button className="text-sm font-semibold text-blue-900 py-3 flex items-center gap-1" onClick={() => onViewChange('timeline')}>View all<ChevronRightIcon className="w-4 h-4" /></button>
                </div>
                {recentReports.length ? (
                    <ul className="divide-y divide-gray-100">
                        {recentReports.map(report => (
                            <li key={report.id} className="p-5 sm:px-6">
                                <div className="flex items-center gap-3 flex-wrap"><span className="status-pill bg-blue-50 text-blue-900">{report.category}</span><time dateTime={report.createdAt} className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time></div>
                                <p className="mt-3 text-sm text-gray-700 leading-relaxed line-clamp-2">{report.content.split('### Summary of Events:')[1]?.trim().split('\n')[0] || report.content.split('\n')[0]}</p>
                                <div className="flex flex-wrap gap-2 mt-4"><button className="btn-secondary" onClick={() => onViewChange('timeline')}>Open incident log</button><button className="inline-flex items-center gap-2 py-2 px-3 text-sm text-blue-900 font-medium" onClick={() => onAnalyzeIncident(report.id)}><SparklesIcon className="w-4 h-4" />Heart inspection</button></div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="px-5 py-10 text-center">
                        <BookOpenIcon className="w-9 h-9 text-blue-800 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-900">Your first record starts here</h3>
                        <p className="text-sm text-gray-600 max-w-sm mx-auto mt-2 leading-relaxed">Capture what happened, when it happened, and any supporting details. Your records will appear here.</p>
                        <button className="btn-secondary mt-5" onClick={() => onViewChange('new_report')}><PlusIcon className="w-4 h-4" />Create a record</button>
                    </div>
                )}
            </section>

            <section aria-labelledby="shortcuts-heading">
                <h2 id="shortcuts-heading" className="eyebrow mb-3">Your everyday tools</h2>
                <div className="grid sm:grid-cols-3 gap-3">
                    {shortcuts.map(({ view, title, detail, icon: Icon }) => <button key={view} className="surface p-4 text-left flex items-center gap-3 hover:border-blue-300 transition-colors" onClick={() => onViewChange(view)}><Icon className="w-5 h-5 text-blue-800 flex-shrink-0" /><span className="flex-1"><span className="block text-sm font-semibold text-gray-900">{title}</span><span className="block text-xs text-gray-500 mt-1">{detail}</span></span><ChevronRightIcon className="w-4 h-4 text-gray-400" /></button>)}
                </div>
            </section>
            <p className="text-xs text-gray-500 text-center pb-2">"Let all things be done decently and in order." · 1 Corinthians 14:40</p>
        </div>
    );
};
export default Dashboard;
