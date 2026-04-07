import { create } from 'zustand';

export interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

interface ChatState {
    messages: ChatMessage[];
    isOpen: boolean;
    isLoading: boolean;
    
    // Actions
    setIsOpen: (isOpen: boolean) => void;
    toggleChat: () => void;
    clearChat: () => void;
    sendMessage: (content: string, token?: string | null) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
    // Initialize with a welcome message
    messages: [{ role: 'model', content: "Hello! I am SpecSmart AI, your expert PC building assistant. How can I help you today?" }],
    isOpen: false,
    isLoading: false,

    setIsOpen: (isOpen) => set({ isOpen }),
    toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
    clearChat: () => set({ 
        messages: [{ role: 'model', content: "Hello! I am SpecSmart AI, your expert PC building assistant. How can I help you today?" }] 
    }),

    sendMessage: async (content: string, token?: string | null) => {
        if (!content.trim()) return;

        // Optimistically add user message
        const userMsg: ChatMessage = { role: 'user', content };
        set((state) => ({ 
            messages: [...state.messages, userMsg],
            isLoading: true
        }));

        try {
            // Only send the history (excluding the first welcome message to save tokens if desired, 
            // but we'll send it all so the bot remembers the intro personality)
            const history = get().messages.slice(0, -1); // excluding the optimistic user message we just added

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('http://127.0.0.1:8000/api/build/chat/', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    history: history,
                    message: content
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send message');
            }

            const data = await response.json();
            
            // Add AI response
            set((state) => ({
                messages: [...state.messages, { role: 'model', content: data.response }],
                isLoading: false
            }));

        } catch (error: any) {
            console.error("Chat API Error:", error);
            // Add error message to chat
            set((state) => ({
                messages: [...state.messages, { 
                    role: 'model', 
                    content: `Sorry, I encountered an error: ${error.message}` 
                }],
                isLoading: false
            }));
        }
    }
}));
