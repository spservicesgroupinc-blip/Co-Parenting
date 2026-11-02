
import { Report, StoredDocument, IncidentTemplate, UserProfile, User, Message, SharedEvent, ParentLinkResult } from '../types';

const DEFAULT_API_URL = import.meta.env.VITE_BACKEND_URL || '';
let API_URL = DEFAULT_API_URL;

export const setApiUrl = (url: string) => {
    API_URL = url;
};

const request = async (action: string, data: any = {}) => {
    const targetUrl = API_URL || DEFAULT_API_URL;
    const separator = targetUrl.includes('?') ? '&' : '?';
    const urlWithAction = `${targetUrl}${separator}action=${encodeURIComponent(action)}`;
    const response = await fetch(urlWithAction, {
        method: 'POST', 
        mode: 'cors',
        body: JSON.stringify({ action, ...data })
    });
    const result = await response.json();
    if (result.status === 'error') throw new Error(result.message);
    return result;
};

export const api = {
    login: async (username: string, password: string): Promise<User> => {
        const res = await request('login', { username, password });
        return { userId: res.userId, username: res.username, linkedUserId: res.linkedUserId };
    },
    signup: async (username: string, password: string, email?: string): Promise<User> => {
        const res = await request('signup', { username, password, email });
        return { userId: res.userId, username: res.username };
    },
    syncData: async (userId: string) => {
        const res = await request('sync', { userId });
        return res.data;
    },
    getDocumentContent: async (userId: string, docId: string): Promise<string> => {
        const res = await request('getDocumentContent', { userId, docId });
        return res.data;
    },
    saveReports: async (userId: string, reports: Report[]) => request('saveItems', { userId, type: 'reports', items: reports }),
    saveDocuments: async (userId: string, documents: StoredDocument[]) => request('saveItems', { userId, type: 'documents', items: documents }),
    saveTemplates: async (userId: string, templates: IncidentTemplate[]) => request('saveItems', { userId, type: 'templates', items: templates }),
    saveProfile: async (userId: string, profile: UserProfile) => request('saveItems', { userId, type: 'profile', items: [profile] }),
    sendMessage: async (userId: string, content: string, threadId?: string, subject?: string) => {
        const res = await request('sendMessage', { userId, content, threadId, subject });
        return res.message;
    },
    getMessages: async (userId: string, after?: string) => {
        const res = await request('getMessages', { userId, after });
        return res.messages as Message[];
    },
    linkByUsername: async (userId: string, targetUsername: string): Promise<ParentLinkResult> => {
        const res = await request('linkByUsername', { userId, targetUsername });
        if (res.status === 'pending') return { status: 'pending' };
        if (res.status === 'success' && typeof res.linkedUserId === 'string' && res.linkedUserId) {
            return { status: 'success', linkedUserId: res.linkedUserId };
        }
        throw new Error('The connection could not be confirmed. Please check again.');
    },
    saveSharedEventsBatch: async (userId: string, events: SharedEvent[]) => request('saveSharedEventsBatch', { userId, events }),
    getSharedEvents: async (userId: string) => {
        const res = await request('getSharedEvents', { userId });
        return res.events as SharedEvent[];
    },
    saveSharedEvent: async (userId: string, event: SharedEvent) => request('saveSharedEventsBatch', { userId, events: [event] })
};
