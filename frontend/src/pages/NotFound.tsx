import { Link } from 'react-router-dom';
import { Cpu, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4 text-center">
            {/* Brand mark */}
            <div className="h-14 w-14 bg-brand-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Cpu className="h-7 w-7 text-white" />
            </div>

            {/* 404 */}
            <p className="text-8xl font-black text-brand-600 dark:text-brand-400 tabular-nums leading-none mb-2">
                404
            </p>
            <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Page not found</h1>
            <p className="text-[var(--text-muted)] max-w-xs mb-8">
                The page you're looking for doesn't exist or may have been moved.
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
                <button
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 h-10 px-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Go back
                </button>
                <Link
                    to="/"
                    className="flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
                >
                    <Home className="h-4 w-4" />
                    Home
                </Link>
            </div>
        </div>
    );
}
