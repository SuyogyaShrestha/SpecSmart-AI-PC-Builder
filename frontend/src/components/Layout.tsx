import React from 'react';
import { Navbar } from '@/components/Navbar';

interface LayoutProps {
    children: React.ReactNode;
    /** Pass true for pages that should NOT have the Navbar (e.g. auth pages) */
    bare?: boolean;
}

export function Layout({ children, bare }: LayoutProps) {
    if (bare) {
        return (
            <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
                {children}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col">
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
                {children}
            </main>
            <footer className="border-t border-[var(--border)] py-4 text-center text-xs text-[var(--text-subtle)]">
                © 2025 SpecSmart · AI PC Builder for Nepal
            </footer>
        </div>
    );
}
