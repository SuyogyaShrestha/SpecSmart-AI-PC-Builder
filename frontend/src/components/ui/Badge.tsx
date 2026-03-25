import React from 'react';

type BadgeVariant = 'default' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
    variant?: BadgeVariant;
    size?: BadgeSize;
    children: React.ReactNode;
    className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]',
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
};

const sizeClasses: Record<BadgeSize, string> = {
    sm: 'px-1.5 py-0 text-[10px] leading-5',
    md: 'px-2 py-0.5 text-xs',
};

export function Badge({ variant = 'default', size = 'md', children, className = '' }: BadgeProps) {
    return (
        <span className={`inline-flex items-center rounded font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
            {children}
        </span>
    );
}

// Part type color map
export const PART_TYPE_VARIANT: Record<string, BadgeVariant> = {
    CPU: 'brand',
    GPU: 'info',
    MOBO: 'success',
    RAM: 'warning',
    SSD: 'warning',
    PSU: 'danger',
    CASE: 'default',
    COOLER: 'default',
};
