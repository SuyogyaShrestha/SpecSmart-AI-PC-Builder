import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 shadow-sm',
    secondary: 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] border border-[var(--border)]',
    ghost: 'bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)]',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    outline: 'border border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/30',
};

const sizeClasses: Record<Size, string> = {
    sm: 'h-7 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', loading, leftIcon, rightIcon, className = '', children, disabled, ...rest }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={[
                    'inline-flex items-center justify-center font-medium rounded-lg',
                    'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    variantClasses[variant],
                    sizeClasses[size],
                    className,
                ].join(' ')}
                {...rest}
            >
                {loading ? (
                    <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                ) : (
                    leftIcon && <span className="shrink-0">{leftIcon}</span>
                )}
                {children}
                {rightIcon && !loading && <span className="shrink-0">{rightIcon}</span>}
            </button>
        );
    },
);
Button.displayName = 'Button';
