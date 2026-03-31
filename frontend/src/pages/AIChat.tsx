import React, { useState, useRef, useEffect } from 'react';
import { Send, Cpu, Loader2 } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { getAccessToken } from '@/store/authStore';
import { Layout } from '@/components/Layout';

export default function AIChat() {
    const { messages, isLoading, sendMessage } = useChatStore();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const token = getAccessToken();
        if (!input.trim() || !token) return;
        const msg = input;
        setInput('');
        await sendMessage(msg, token);
    };

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[500px] w-full max-w-5xl mx-auto bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-[var(--surface)] border-b border-[var(--border)] p-4 sm:p-5 shrink-0 flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <Cpu className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text)]">SpecSmart AI Consultant</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-0.5">Your personal, expert PC builder utilizing Gemini 2.5 Flash.</p>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
                        {messages.map((m, idx) => (
                            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {m.role === 'model' && (
                                    <div className="h-8 w-8 bg-blue-600/10 dark:bg-blue-500/20 rounded-lg flex items-center justify-center mr-3 mt-1 shrink-0">
                                        <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                )}
                                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 text-[0.95rem] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-bl-sm'}`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="h-8 w-8 bg-blue-600/10 dark:bg-blue-500/20 rounded-lg flex items-center justify-center mr-3 mt-1 shrink-0">
                                    <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-bl-sm px-5 py-3.5 text-sm text-[var(--text-muted)] flex items-center gap-2 shadow-sm">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your request...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 sm:p-6 bg-[var(--surface)] border-t border-[var(--border)] shrink-0">
                        <form onSubmit={handleSend} className="flex items-end gap-3 max-w-4xl mx-auto relative group">
                            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about specific parts, physical clearance, or high-end build advice..." className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3.5 text-[0.95rem] text-[var(--text)] placeholder-[var(--text-muted)] transition-all" disabled={isLoading} autoFocus />
                            <button type="submit" disabled={!input.trim() || isLoading} className="h-[52px] px-6 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 font-medium flex items-center gap-2 shadow-md transition-all active:scale-95">
                                <span>Send</span>
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                        <p className="text-center text-xs text-[var(--text-muted)] mt-3">
                            SpecSmart AI is tuned to automatically understand component topology. It can make mistakes.
                        </p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
