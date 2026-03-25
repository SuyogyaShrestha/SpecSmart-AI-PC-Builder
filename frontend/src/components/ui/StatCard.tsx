import React from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    sub?: string;
    color?: 'brand' | 'green' | 'amber' | 'red' | 'default';
    className?: string;
}

const colorClasses = {
    brand: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20',
    green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    default: 'text-[var(--text-muted)] bg-[var(--surface-2)]',
};

export function StatCard({ label, value, icon, sub, color = 'default', className = '' }: StatCardProps) {
    return (
        <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-start gap-3 ${className}`}>
            {icon && (
                <div className={`shrink-0 p-2 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
            )}
            <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold text-[var(--text)] mt-0.5 truncate">{value}</p>
                {sub && <p className="text-xs text-[var(--text-subtle)] mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}
