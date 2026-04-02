import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    titleRight?: React.ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' };

export function Card({ children, className = '', title, titleRight, padding = 'md' }: CardProps) {
    return (
        <div
            className={`bg-[var(--surface)] border border-[var(--border)] rounded-xl ${paddingClasses[padding]} ${className}`}
        >
            {(title || titleRight) && (
                <div className={`flex items-center justify-between mb-3 ${padding === 'none' ? 'px-4 pt-4' : ''}`}>
                    {title && <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>}
                    {titleRight}
                </div>
            )}
            {children}
        </div>
    );
}
