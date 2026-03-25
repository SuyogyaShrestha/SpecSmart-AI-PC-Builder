import { Component, type ReactNode } from 'react';
import { Cpu, RefreshCw, Home } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, message: '' };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, message: error?.message ?? 'Something went wrong.' };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
        console.error('[ErrorBoundary]', error, info);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4 text-center">
                <div className="h-14 w-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-6">
                    <Cpu className="h-7 w-7 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Something went wrong</h1>
                <p className="text-sm text-[var(--text-muted)] max-w-sm mb-2">
                    An unexpected error occurred. Try refreshing the page.
                </p>
                {this.state.message && (
                    <code className="block text-xs bg-[var(--surface-2)] text-red-500 dark:text-red-400 rounded-lg px-3 py-2 mb-6 max-w-sm truncate">
                        {this.state.message}
                    </code>
                )}
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 h-10 px-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    <a
                        href="/"
                        className="flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                    >
                        <Home className="h-4 w-4" />
                        Home
                    </a>
                </div>
            </div>
        );
    }
}
