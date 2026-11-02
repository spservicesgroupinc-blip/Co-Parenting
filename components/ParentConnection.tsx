import React, { useRef, useState } from 'react';
import { User, View } from '../types';
import { api } from '../services/api';
import { BookOpenIcon, CalendarDaysIcon, ChatBubbleOvalLeftEllipsisIcon, CheckCircleIcon, ChevronRightIcon, ClockIcon, UserCircleIcon } from './icons';

interface ParentConnectionProps {
    user: User;
    linkedUserId?: string | null;
    invitedBy: string;
    pendingUsername: string;
    onPending: (username: string) => void;
    onConnected: (linkedUserId: string) => void;
    onDismissInvite: () => void;
    onViewChange: (view: View) => void;
    isOffline: boolean;
}

const ParentConnection: React.FC<ParentConnectionProps> = ({ user, linkedUserId, invitedBy, pendingUsername, onPending, onConnected, onDismissInvite, onViewChange, isOffline }) => {
    const [username, setUsername] = useState(invitedBy || pendingUsername);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [copied, setCopied] = useState(false);
    const linkRef = useRef<HTMLInputElement>(null);
    const inviteUrl = new URL(window.location.pathname, window.location.origin);
    inviteUrl.searchParams.set('connect', user.username);

    const connect = async (event: React.FormEvent) => {
        event.preventDefault();
        const target = username.trim();
        setError('');
        setNotice('');
        if (target.toLowerCase() === user.username.trim().toLowerCase()) {
            setError('That is your username. Enter your co-parent’s username instead.');
            return;
        }
        if (!target || isBusy || isOffline) return;
        setIsBusy(true);
        try {
            const result = await api.linkByUsername(user.userId, target);
            if (result.status === 'pending') onPending(target);
            else onConnected(result.linkedUserId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to connect. Please try again.');
        } finally {
            setIsBusy(false);
        }
    };

    const checkConnection = async () => {
        setIsBusy(true);
        setError('');
        setNotice('');
        try {
            const data = await api.syncData(user.userId);
            const linkedId = data.linkedUserId;
            if (linkedId) onConnected(String(linkedId));
            else setNotice('No connection yet. Ask your co-parent to open your invite link and connect.');
        } catch {
            setError('Unable to check your connection. Please try again.');
        } finally {
            setIsBusy(false);
        }
    };

    const copyInvite = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl.toString());
            setCopied(true);
            setNotice('Invite link copied. Paste it into a text or email to your co-parent.');
        } catch {
            linkRef.current?.focus();
            linkRef.current?.select();
            setNotice('Select and copy the invite link below.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <p className="eyebrow">Your family workspace</p>
                <h1 className="page-title">Co-parent connection</h1>
                <p className="mt-2 text-gray-600">Two separate accounts. One place to coordinate.</p>
            </div>

            <section className="surface overflow-hidden" aria-labelledby="connection-heading">
                <div className="p-5 sm:p-7 border-b border-gray-100 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${linkedUserId ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-800'}`}>
                        {linkedUserId ? <CheckCircleIcon className="w-7 h-7" /> : <UserCircleIcon className="w-7 h-7" />}
                    </div>
                    <div className="min-w-0">
                        <h2 id="connection-heading" className="text-lg font-semibold text-gray-900">{linkedUserId ? 'Your accounts are connected' : 'Bring your co-parent into the loop'}</h2>
                        <p className="text-sm text-gray-600 mt-1 break-words">Signed in as <strong>@{user.username}</strong></p>
                    </div>
                    <span className={`ml-auto hidden sm:inline-flex status-pill ${linkedUserId ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{linkedUserId ? 'Connected' : 'Not connected'}</span>
                </div>

                {linkedUserId ? (
                    <div className="p-5 sm:p-7 space-y-5">
                        <p className="text-gray-600">You can now send each other messages and coordinate your family calendar.</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button className="btn-primary" onClick={() => onViewChange('messaging')}><ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5" />Open messages</button>
                            <button className="btn-secondary" onClick={() => onViewChange('calendar')}><CalendarDaysIcon className="w-5 h-5" />Open family calendar</button>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 sm:p-7 space-y-6">
                        {invitedBy && (
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <p className="font-semibold text-blue-950 break-words">@{invitedBy} invited you to connect</p>
                                <p className="text-sm text-blue-900 mt-1">Confirm their username below, then connect to share messages and your family calendar.</p>
                                <button className="text-sm underline text-blue-900 mt-3" onClick={() => { onDismissInvite(); setUsername(''); }}>Dismiss invitation</button>
                            </div>
                        )}

                        {pendingUsername && (
                            <div className="flex gap-3 bg-amber-50 border border-amber-200 p-4 rounded-lg" role="status">
                                <ClockIcon className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-900 min-w-0">
                                    <p className="font-semibold break-words">Waiting for @{pendingUsername} to create an account</p>
                                    <p className="mt-1">No account was found with that username. The server has saved your request; no email or text was sent. Share your invite link, or check the spelling with your co-parent.</p>
                                </div>
                            </div>
                        )}

                        {!invitedBy && (
                            <div>
                                <h3 className="font-semibold text-gray-900">Send a personal invite link</h3>
                                <p className="text-sm text-gray-600 mt-1">Your co-parent opens the link, signs in or creates their own account, and confirms the connection.</p>
                                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                                    <label htmlFor="invite-link" className="sr-only">Your co-parent invite link</label>
                                    <input id="invite-link" ref={linkRef} readOnly value={inviteUrl.toString()} onFocus={event => event.currentTarget.select()} className="field flex-1 min-w-0 bg-gray-50 text-sm" />
                                    <button className="btn-primary flex-shrink-0" onClick={copyInvite}>{copied ? 'Copy link again' : 'Copy invite link'}</button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Your username is included in this link. Share it directly with your co-parent.</p>
                            </div>
                        )}

                        <details className="border border-gray-200 rounded-lg p-4" open={invitedBy ? true : undefined}>
                            <summary className="font-medium text-gray-900 cursor-pointer">{invitedBy ? 'Confirm your connection' : 'Already know their username?'}</summary>
                            <form onSubmit={connect} className="mt-4 space-y-3">
                                <p className="text-sm text-gray-600">Use their sign-in username, which may be different from their name.</p>
                                <label className="block text-sm font-medium text-gray-700" htmlFor="coparent-username">Co-parent’s username</label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input id="coparent-username" className="field flex-1 min-w-0" value={username} onChange={event => { setUsername(event.target.value); setError(''); }} placeholder="Enter their username" required autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={isBusy} />
                                    <button type="submit" className="btn-primary" disabled={!username.trim() || isBusy || isOffline}>{isBusy ? 'Connecting…' : 'Connect accounts'}<ChevronRightIcon className="w-4 h-4" /></button>
                                </div>
                            </form>
                        </details>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                            <p className="text-sm text-gray-600 flex-1">Has your co-parent already connected?</p>
                            <button className="btn-secondary" onClick={checkConnection} disabled={isBusy || isOffline}>{isBusy ? 'Checking…' : 'Check connection'}</button>
                        </div>
                    </div>
                )}
            </section>

            {isOffline && <p role="status" className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-4">You’re offline. Reconnect to link your accounts or check your connection.</p>}
            {error && <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-4">{error}</p>}
            <p role="status" aria-live="polite" className="text-sm text-blue-900">{notice}</p>

            <section className="surface p-5 sm:p-6" aria-labelledby="sharing-heading">
                <h2 id="sharing-heading" className="font-semibold text-gray-900">What connecting means</h2>
                <div className="grid sm:grid-cols-2 gap-5 mt-4 text-sm text-gray-600">
                    <div className="flex gap-3"><ChatBubbleOvalLeftEllipsisIcon className="w-5 h-5 text-blue-800 flex-shrink-0" /><p><strong className="text-gray-900 block mb-1">Messages & family calendar</strong>New messages and shared calendar events are available to both connected accounts.</p></div>
                    <div className="flex gap-3"><BookOpenIcon className="w-5 h-5 text-blue-800 flex-shrink-0" /><p><strong className="text-gray-900 block mb-1">Your personal records stay separate</strong>Your incident log, uploaded documents, and profile remain in your own account.</p></div>
                </div>
            </section>
        </div>
    );
};

export default ParentConnection;
