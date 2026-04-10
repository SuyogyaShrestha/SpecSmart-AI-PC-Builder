import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Send, Cpu, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useChatStore } from '../store/useChatStore';
import { getCachedUser, getAccessToken } from '../store/authStore';
import type { User } from '../types';

export default function FloatingChat() {
    const { messages, isOpen, isLoading, toggleChat, setIsOpen, sendMessage } = useChatStore();
    const [user, setUser] = useState<User | null>(getCachedUser);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    // Listen for global auth changes
    useEffect(() => {
        const handler = () => setUser(getCachedUser());
        window.addEventListener('specsmart:auth_updated', handler);
        return () => window.removeEventListener('specsmart:auth_updated', handler);
    }, []);

    // Auto-scroll to bottom when messages update
    useEffect(() => {
        if (messagesEndRef.current && isOpen) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;
        const msg = input;
        setInput('');
        await sendMessage(msg, getAccessToken());
    };

    // If currently on the full-page AI chat route, hide the floating chat
    if (location.pathname === '/chat') {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl shadow-2xl mb-4 w-[350px] sm:w-[400px] h-[500px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    {/* Header */}
                    <div className="bg-blue-600 dark:bg-blue-500 text-white p-4 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <Cpu className="h-5 w-5" />
                            <div>
                                <h3 className="font-semibold text-sm">SpecSmart AI</h3>
                                <p className="text-xs text-blue-100">Expert PC Builder</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--surface)]">
                        {messages.map((m, idx) => (
                            <div 
                                key={idx} 
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div 
                                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                        m.role === 'user' 
                                            ? 'bg-blue-600 text-white rounded-br-sm' 
                                            : 'bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-bl-sm'
                                    }`}
                                >
                                    <div className={m.role === 'user' ? 'rm-inline text-white' : 'rm-full text-[var(--text)]'}>
                                        <ReactMarkdown>{m.content}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-[var(--surface-3)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-[var(--text-muted)] flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-[var(--surface-2)] border-t border-[var(--border)] shrink-0">
                        <form 
                            onSubmit={handleSend}
                            className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-full px-2 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/50 transition-shadow"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about PC parts or builds..."
                                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-3 py-1 text-sm text-[var(--text)] placeholder-[var(--text-muted)]"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={toggleChat}
                className="h-14 w-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
            </button>
        </div>
    );
}
