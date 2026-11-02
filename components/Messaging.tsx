
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, StoredDocument, Message, UserProfile, GeneratedReportData, Report } from '../types';
import { api } from '../services/api';
import { generateAutoReply, generateChatIncidentReport } from '../services/geminiService';
import { PaperAirplaneIcon, ChatBubbleOvalLeftEllipsisIcon, SparklesIcon, ShieldCheckIcon, XMarkIcon, PlusIcon, ArrowLeftIcon } from './icons';
import ReactMarkdown from 'react-markdown';

interface MessagingProps {
    user: User;
    userProfile: UserProfile | null;
    onAddDocument: (document: StoredDocument) => void;
    onReportGenerated: (report: Report) => void;
    onConsumeTokens: (cost: number) => boolean;
}

interface Thread {
    id: string;
    subject: string;
    messages: Message[];
    lastMessageAt: string;
}

const Messaging: React.FC<MessagingProps> = ({ user, userProfile, onAddDocument, onReportGenerated, onConsumeTokens }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isAiEnabled, setIsAiEnabled] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    
    // Thread State
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [isCreatingThread, setIsCreatingThread] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    const [newMessageText, setNewMessageText] = useState('');
    
    // Incident Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [generatedIncident, setGeneratedIncident] = useState<GeneratedReportData | null>(null);
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const processedMessageIds = useRef<Set<string>>(new Set());

    const getOtherPartyName = () => {
        if (!userProfile) return 'Co-Parent';
        if (userProfile.role === 'Mother') return 'Father';
        if (userProfile.role === 'Father') return 'Mother';
        return 'Co-Parent';
    };

    const mergeMessages = (current: Message[], incoming: Message[]) => {
        const msgMap = new Map<string, Message>();
        current.forEach(m => msgMap.set(m.id, m));
        incoming.forEach(m => msgMap.set(m.id, m));
        return Array.from(msgMap.values()).sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    };

    useEffect(() => {
        let isMounted = true;
        const fetchMessages = async () => {
            try {
                const msgs = await api.getMessages(user.userId);
                
                if (isMounted) {
                    // Identify truly new messages that are NOT me and NOT processed
                    const newIncomingMessages = msgs.filter(m => 
                        !processedMessageIds.current.has(m.id) && 
                        String(m.senderId) !== String(user.userId)
                    );

                    // Mark all fetched messages as processed
                    msgs.forEach(m => processedMessageIds.current.add(m.id));
                    
                    setMessages(prev => mergeMessages(prev, msgs));

                    // Only trigger AI if enabled, not initial load, and we have new messages
                    if (isAiEnabled && !isInitialLoad && newIncomingMessages.length > 0) {
                        const lastMessage = newIncomingMessages[newIncomingMessages.length - 1];
                        // Double check timestamp to ensure it's recent (within last 30 seconds) to avoid zombie replies
                        const msgTime = new Date(lastMessage.timestamp).getTime();
                        if (Date.now() - msgTime < 30000) {
                            handleAiAutoReply(lastMessage.content, lastMessage.threadId, lastMessage.subject);
                        }
                    }
                    
                    if (isInitialLoad) {
                        setIsInitialLoad(false);
                    }
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 5000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [user.userId, isAiEnabled, isInitialLoad]);

    useEffect(() => {
        if (activeThreadId) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isAiThinking, activeThreadId]);

    const handleAiAutoReply = async (incomingText: string, threadId?: string, subject?: string) => {
        setIsAiThinking(true);
        try {
            const replyText = await generateAutoReply(incomingText, userProfile);
            const confirmedMessage = await api.sendMessage(user.userId, replyText, threadId, subject);
            setMessages(prev => mergeMessages(prev, [confirmedMessage]));
            processedMessageIds.current.add(confirmedMessage.id);
        } catch (error) {
            console.error("AI Auto-reply failed:", error);
        } finally {
            setIsAiThinking(false);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim() || !activeThreadId) return;
        const content = inputValue;
        setInputValue('');
        
        const currentThread = threads.find(t => t.id === activeThreadId);
        const subject = currentThread?.subject || 'General Discussion';
        const tId = activeThreadId === 'general' ? undefined : activeThreadId;
        
        const tempId = `temp_${Date.now()}`;
        const tempMsg: Message = {
            id: tempId,
            senderId: user.userId,
            recipientId: userProfile?.linkedUserId || undefined,
            content,
            timestamp: new Date().toISOString(),
            threadId: tId,
            subject: tId ? subject : undefined
        };
        
        setMessages(prev => [...prev, tempMsg]);

        try {
            const confirmedMessage = await api.sendMessage(user.userId, content, tId, tId ? subject : undefined);
            setMessages(prev => {
                const withoutTemp = prev.filter(m => m.id !== tempId);
                return mergeMessages(withoutTemp, [confirmedMessage]);
            });
            processedMessageIds.current.add(confirmedMessage.id);
        } catch (err) {
            console.error("Failed to send", err);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("Failed to send message. Please check your connection.");
        }
    };

    const handleCreateThread = async () => {
        if (!newSubject.trim() || !newMessageText.trim()) return;
        const newThreadId = `thread_${Date.now()}`;
        
        const content = newMessageText;
        const subject = newSubject;
        
        setIsCreatingThread(false);
        setNewSubject('');
        setNewMessageText('');
        
        const tempId = `temp_init_${Date.now()}`;
        const tempMsg: Message = {
            id: tempId,
            senderId: user.userId,
            recipientId: userProfile?.linkedUserId || undefined,
            content,
            timestamp: new Date().toISOString(),
            threadId: newThreadId,
            subject: subject
        };
        
        setMessages(prev => [...prev, tempMsg]);
        setActiveThreadId(newThreadId);

        try {
            const confirmedMessage = await api.sendMessage(user.userId, content, newThreadId, subject);
            setMessages(prev => {
                const withoutTemp = prev.filter(m => m.id !== tempId);
                return mergeMessages(withoutTemp, [confirmedMessage]);
            });
            processedMessageIds.current.add(confirmedMessage.id);
        } catch (err) {
            console.error("Failed to send", err);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("Failed to start discussion. Please check your connection.");
        }
    };

    const handleAnalyzeHostility = async () => {
        if (!activeThreadId) return;
        const threadMessages = threads.find(t => t.id === activeThreadId)?.messages || [];
        
        if (threadMessages.length < 2) {
            alert("Not enough conversation history to analyze.");
            return;
        }

        // Cost: 5 Tokens for Hostility Analysis
        if (!onConsumeTokens(5)) return;

        setIsAnalyzing(true);
        try {
            // Send recent messages (last 30 for context)
            const recentMessages = threadMessages.slice(-30);
            const reportData = await generateChatIncidentReport(recentMessages, userProfile);
            
            if (reportData) {
                setGeneratedIncident(reportData);
                setShowAnalysisModal(true);
            } else {
                alert("Could not generate analysis. Please try again.");
            }
        } catch (e) {
            console.error("Analysis failed", e);
            alert("Error during analysis.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveIncident = () => {
        if (!generatedIncident) return;
        
        const newReport: Report = {
            ...generatedIncident,
            id: `rep_chat_${Date.now()}`,
            createdAt: new Date().toISOString(),
            images: [],
            legalContext: generatedIncident.legalContext || ''
        };

        // Use the callback to update App state and persist to API
        onReportGenerated(newReport);
        
        alert("Incident Report saved to your Timeline.");
        setShowAnalysisModal(false);
        setGeneratedIncident(null);
    };

    const threads = useMemo(() => {
        const threadMap = new Map<string, Thread>();
        
        // Default general thread
        threadMap.set('general', {
            id: 'general',
            subject: 'General Discussion',
            messages: [],
            lastMessageAt: new Date(0).toISOString()
        });

        messages.forEach(msg => {
            const tId = msg.threadId || 'general';
            if (!threadMap.has(tId)) {
                threadMap.set(tId, {
                    id: tId,
                    subject: msg.subject || 'No Subject',
                    messages: [],
                    lastMessageAt: msg.timestamp
                });
            }
            const thread = threadMap.get(tId)!;
            thread.messages.push(msg);
            if (new Date(msg.timestamp) > new Date(thread.lastMessageAt)) {
                thread.lastMessageAt = msg.timestamp;
                if (msg.subject && thread.subject === 'No Subject') {
                    thread.subject = msg.subject;
                }
            }
        });

        return Array.from(threadMap.values()).sort((a, b) => 
            new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
    }, [messages]);

    const isConnected = !!userProfile?.linkedUserId;
    const activeThread = threads.find(t => t.id === activeThreadId);

    return (
        <>
            {/* Analysis Review Modal */}
            {showAnalysisModal && generatedIncident && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
                        <header className="p-4 border-b border-gray-200 flex justify-between items-center bg-red-50 rounded-t-xl">
                            <div className="flex items-center gap-2 text-red-800">
                                <ShieldCheckIcon className="w-6 h-6" />
                                <h3 className="font-bold text-lg">Forensic Chat Analysis</h3>
                            </div>
                            <button onClick={() => setShowAnalysisModal(false)} className="text-gray-500 hover:text-gray-800">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-6 bg-white">
                            <div className="prose prose-sm max-w-none text-gray-800">
                                <ReactMarkdown>{generatedIncident.content}</ReactMarkdown>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {generatedIncident.tags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md border border-gray-200">#{tag}</span>
                                ))}
                            </div>
                        </div>
                        <footer className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                            <button onClick={() => setShowAnalysisModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
                            <button onClick={handleSaveIncident} className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 font-semibold shadow-sm">
                                Save to Incident Log
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            {/* Create Thread Modal */}
            {isCreatingThread && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
                        <header className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-lg">New Subject</h3>
                            <button onClick={() => setIsCreatingThread(false)} className="text-gray-500 hover:text-gray-800">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </header>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
                                <input 
                                    type="text" 
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    placeholder="e.g., Summer Vacation Schedule"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Initial Message</label>
                                <textarea 
                                    value={newMessageText}
                                    onChange={(e) => setNewMessageText(e.target.value)}
                                    placeholder="Type your message here..."
                                    rows={4}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                />
                            </div>
                        </div>
                        <footer className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                            <button onClick={() => setIsCreatingThread(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Cancel</button>
                            <button 
                                onClick={handleCreateThread} 
                                disabled={!newSubject.trim() || !newMessageText.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold shadow-sm"
                            >
                                Send & Start Discussion
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            <div className="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {!activeThreadId ? (
                    // THREAD LIST VIEW
                    <div className="flex flex-col h-full">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Discussions</h2>
                                <p className="text-xs text-gray-500">
                                    {isConnected ? `Connected with ${getOtherPartyName()}` : 'Not linked.'}
                                </p>
                            </div>
                            {isConnected && (
                                <button 
                                    onClick={() => setIsCreatingThread(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    New Subject
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {threads.length === 0 || (threads.length === 1 && threads[0].messages.length === 0) ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
                                    <ChatBubbleOvalLeftEllipsisIcon className="w-12 h-12 mb-4 text-gray-300" />
                                    <p className="text-gray-600 font-medium">No discussions yet.</p>
                                    <p className="text-sm mt-1">Start a new subject to organize your conversations.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {threads.map(thread => {
                                        if (thread.id === 'general' && thread.messages.length === 0) return null;
                                        const lastMsg = thread.messages[thread.messages.length - 1];
                                        return (
                                            <button 
                                                key={thread.id}
                                                onClick={() => setActiveThreadId(thread.id)}
                                                className="w-full text-left p-4 hover:bg-blue-50 transition-colors flex flex-col gap-1"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-semibold text-gray-900 truncate pr-4">{thread.subject}</h3>
                                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                                        {new Date(thread.lastMessageAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 truncate">
                                                    {lastMsg ? (
                                                        <>
                                                            <span className="font-medium">{String(lastMsg.senderId) === String(user.userId) ? 'You: ' : `${getOtherPartyName()}: `}</span>
                                                            {lastMsg.content}
                                                        </>
                                                    ) : 'No messages yet.'}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // CHAT VIEW
                    <div className="flex flex-col h-full">
                        <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setActiveThreadId(null)}
                                    className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                    <ArrowLeftIcon className="w-5 h-5" />
                                </button>
                                <div className="flex flex-col">
                                    <h2 className="text-base font-semibold text-gray-800 truncate max-w-[200px] sm:max-w-xs">
                                        {activeThread?.subject}
                                    </h2>
                                </div>
                            </div>
                            
                            {/* Toolbar */}
                            {isConnected && (
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={handleAnalyzeHostility}
                                        disabled={isAnalyzing}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 transition-colors disabled:opacity-50"
                                        title="Detect hostility, gaslighting, and narcissism in recent messages. (5 Tokens)"
                                    >
                                        <ShieldCheckIcon className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                                        <span className="hidden sm:inline">{isAnalyzing ? 'Analyzing...' : 'Analyze Hostility'}</span>
                                    </button>

                                    <button 
                                        onClick={() => setIsAiEnabled(!isAiEnabled)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                            isAiEnabled 
                                                ? 'bg-purple-100 text-purple-800 border-purple-300 ring-2 ring-purple-500/20' 
                                                : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'
                                        }`}
                                        title={isAiEnabled ? "AI is auto-replying politely" : "Turn on AI Auto-Reply"}
                                    >
                                        <SparklesIcon className={`w-3.5 h-3.5 ${isAiEnabled ? 'animate-pulse text-purple-600' : 'text-gray-400'}`} />
                                        <span className="hidden sm:inline">{isAiEnabled ? 'AI Agent: ON' : 'AI Agent: OFF'}</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {activeThread?.messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <ChatBubbleOvalLeftEllipsisIcon className="w-12 h-12 mb-2" />
                                    <p>Start the conversation.</p>
                                </div>
                            )}
                            {activeThread?.messages.map((msg) => {
                                const isMe = String(msg.senderId) === String(user.userId);
                                const senderLabel = isMe ? 'You' : getOtherPartyName();

                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2`}>
                                        <span className="text-[10px] text-gray-500 mb-1 px-2 font-medium">
                                            {senderLabel}
                                        </span>
                                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
                                            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                                isMe 
                                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                            } ${msg.id.startsWith('temp_') ? 'opacity-70' : 'opacity-100'} transition-opacity duration-300`}>
                                                <p>{msg.content}</p>
                                                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {msg.id.startsWith('temp_') && ' • Sending...'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {isAiThinking && (
                                <div className="flex flex-col items-end mb-2">
                                    <span className="text-[10px] text-purple-600 mb-1 px-2 font-medium flex items-center gap-1">
                                        <SparklesIcon className="w-3 h-3"/> AI Peacekeeper is typing...
                                    </span>
                                    <div className="bg-purple-50 border border-purple-100 rounded-2xl rounded-br-none px-4 py-2 shadow-sm">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-white border-t border-gray-200">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder={isConnected ? "Type a message..." : "Link accounts in Profile to message."}
                                    disabled={!isConnected}
                                    className="w-full pl-4 pr-12 py-3 bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors disabled:opacity-50"
                                />
                                <button 
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || !isConnected}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Messaging;
