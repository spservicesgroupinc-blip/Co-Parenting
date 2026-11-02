
import React from 'react';
import { Report, UserProfile, IncidentCategory } from '../types';
import { PlusIcon, CalendarDaysIcon, BookOpenIcon, LightBulbIcon, ChatBubbleOvalLeftEllipsisIcon, ClockIcon, SparklesIcon } from './icons';

type View = 'dashboard' | 'timeline' | 'new_report' | 'patterns' | 'insights' | 'assistant' | 'profile' | 'documents' | 'calendar';

interface DashboardProps {
    userProfile: UserProfile | null;
    reports: Report[];
    onViewChange: (view: View) => void;
    onAnalyzeIncident: (reportId: string) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; description: string; trend?: 'up' | 'down' | 'neutral' }> = ({ title, value, icon, description, trend }) => (
    <div className="relative overflow-hidden bg-white p-6 border border-gray-200/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out"></div>
        <div className="flex items-center justify-between relative z-10">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl ring-1 ring-blue-100/50">
                {icon}
            </div>
            {trend === 'up' && <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">Elevated</span>}
            {trend === 'down' && <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">Decreased</span>}
        </div>
        <div className="mt-5 relative z-10">
            <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
            <p className="text-sm font-semibold text-gray-700 mt-1">{title}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
    </div>
);

const ActionCard: React.FC<{ title: string; description: string; icon: React.ReactNode; onClick: () => void; primary?: boolean }> = ({ title, description, icon, onClick, primary }) => (
    <button
        onClick={onClick}
        className={`group relative flex flex-col justify-between p-6 rounded-2xl text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 overflow-hidden ${
            primary 
            ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 border border-blue-700 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-1' 
            : 'bg-white border border-gray-200/60 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-1'
        }`}
    >
        {primary && <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>}
        <div className="relative z-10">
            <div className={`p-3 inline-flex rounded-xl shadow-sm ${primary ? 'bg-white/10 text-white backdrop-blur-sm border border-white/10' : 'bg-blue-50 text-blue-700 border border-blue-100/50'}`}>
                {icon}
            </div>
            <h2 className={`text-xl font-bold mt-5 tracking-tight ${primary ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
            <p className={`text-sm mt-2 leading-relaxed ${primary ? 'text-blue-100' : 'text-gray-600'}`}>{description}</p>
        </div>
        <div className={`mt-6 flex items-center text-sm font-bold relative z-10 ${primary ? 'text-white' : 'text-blue-700'}`}>
            <span>Continue</span>
            <svg className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
        </div>
    </button>
);

const Dashboard: React.FC<DashboardProps> = ({ userProfile, reports, onViewChange, onAnalyzeIncident }) => {

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const incidentsThisMonth = reports.filter(r => new Date(r.createdAt) >= startOfMonth).length;

    const communicationIssues = reports.filter(r => r.category === IncidentCategory.COMMUNICATION_ISSUE).length;

    const last7Days = new Date();
    last7Days.setDate(today.getDate() - 7);
    const recentActivityCount = reports.filter(r => new Date(r.createdAt) >= last7Days).length;

    const sortedReports = [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recentReports = sortedReports.slice(0, 3);

    const welcomeMessage = userProfile?.name ? `Blessings, ${userProfile.name}.` : 'Welcome to Shouting Parents.';

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-white border border-gray-200/60 rounded-3xl p-8 sm:p-10 shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-50 rounded-full blur-2xl -ml-10 -mb-10 opacity-60 pointer-events-none"></div>
                
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
                        {welcomeMessage}
                    </h1>
                    <p className="mt-4 text-lg text-gray-600 leading-relaxed">
                        Your sanctuary for peace and organization. <br className="hidden sm:block" />
                        <span className="italic text-gray-500">"Let all things be done decently and in order." (1 Cor 14:40)</span>
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatCard 
                    title="Total Logs" 
                    value={reports.length} 
                    icon={<BookOpenIcon className="w-6 h-6" />}
                    description="Recorded events" 
                />
                <StatCard 
                    title="Trials This Month" 
                    value={incidentsThisMonth} 
                    icon={<CalendarDaysIcon className="w-6 h-6" />}
                    description={`Since ${startOfMonth.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} 
                    trend={incidentsThisMonth > 5 ? 'up' : undefined}
                />
                <StatCard 
                    title="Communication Strife" 
                    value={communicationIssues} 
                    icon={<ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6" />}
                    description="Conflicts in speech"
                />
                <StatCard 
                    title="Recent Activity" 
                    value={recentActivityCount} 
                    icon={<ClockIcon className="w-6 h-6" />}
                    description="Logs in the last 7 days"
                />
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                 <ActionCard 
                    title="Log a Conflict"
                    description="Speak the truth in love. Document an incident with the AI's guidance to maintain an accurate, neutral record."
                    icon={<PlusIcon className="w-7 h-7"/>}
                    onClick={() => onViewChange('new_report')}
                    primary={true}
                 />
                 <ActionCard 
                    title="View Restoration Log"
                    description="Review your history, identify patterns, and see the path to peace through organized documentation."
                    icon={<CalendarDaysIcon className="w-7 h-7"/>}
                    onClick={() => onViewChange('timeline')}
                 />
            </div>

            {/* Recent Logs Section */}
            <div className="bg-white border border-gray-200/60 rounded-3xl shadow-sm overflow-hidden">
                 <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Recent Logs</h2>
                        <p className="text-sm text-gray-500 mt-1">The last 3 records of your co-parenting journey.</p>
                    </div>
                     <button 
                        onClick={() => onViewChange('timeline')} 
                        className="inline-flex items-center text-sm font-bold text-blue-700 hover:text-blue-800 transition-colors group"
                    >
                        View Full Log 
                        <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                
                {recentReports.length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                        {recentReports.map((report, index) => (
                            <li key={report.id} className="p-6 sm:p-8 hover:bg-gray-50/50 transition-colors group">
                                <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100/50">
                                                {report.category}
                                            </span>
                                            <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                                                <ClockIcon className="w-3.5 h-3.5" />
                                                {new Date(report.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-base text-gray-800 mt-3 leading-relaxed line-clamp-2 pr-4">
                                            {report.content.split('### Summary of Events:')[1]?.split('\n')[1]?.trim() || report.content.split('\n')[0]}
                                        </p>
                                    </div>
                                    <div className="flex flex-row items-center gap-3 w-full lg:w-auto flex-shrink-0">
                                        <button 
                                            onClick={() => onAnalyzeIncident(report.id)} 
                                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-amber-900 bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200/60 rounded-xl hover:shadow-md hover:from-amber-200 hover:to-amber-100 transition-all"
                                        >
                                            <SparklesIcon className="w-4 h-4 text-amber-600"/>
                                            <span>Heart Inspection</span>
                                        </button>
                                        <button 
                                            onClick={() => onViewChange('timeline')} 
                                            className="flex-1 lg:flex-none px-4 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all text-center"
                                        >
                                            Details
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-20 px-6">
                        <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-white shadow-sm">
                            <BookOpenIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Peaceful Beginnings</h3>
                        <p className="mt-2 text-base text-gray-500 max-w-sm mx-auto">
                            "To everything there is a season..." Your documented logs and events will appear here.
                        </p>
                        <button 
                            onClick={() => onViewChange('new_report')}
                            className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-blue-900 rounded-xl hover:bg-blue-800 transition-colors shadow-sm"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Log Your First Event
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
