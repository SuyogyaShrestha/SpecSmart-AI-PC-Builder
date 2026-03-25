import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftAddon?: React.ReactNode;
    rightAddon?: React.ReactNode;
    wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, hint, leftAddon, rightAddon, wrapperClassName = '', className = '', id, ...rest }, ref) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
                {label && (
                    <label htmlFor={inputId} className="text-sm font-medium text-[var(--text)]">
                        {label}
                    </label>
                )}
                <div className="relative flex items-center">
                    {leftAddon && (
                        <div className="absolute left-3 text-[var(--text-muted)] flex items-center">{leftAddon}</div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={[
                            'w-full h-9 rounded-lg border bg-[var(--surface)] text-[var(--text)] text-sm',
                            'border-[var(--border)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                            'placeholder:text-[var(--text-subtle)] transition-colors outline-none',
                            'disabled:opacity-50 disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed',
                            error ? 'border-red-500 focus:ring-red-500/20' : '',
                            leftAddon ? 'pl-9' : 'pl-3',
                            rightAddon ? 'pr-9' : 'pr-3',
                            className,
                        ].join(' ')}
                        {...rest}
                    />
                    {rightAddon && (
                        <div className="absolute right-3 text-[var(--text-muted)] flex items-center">{rightAddon}</div>
                    )}
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
            </div>
        );
    },
);
Input.displayName = 'Input';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: { value: string; label: string }[];
    wrapperClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, options, wrapperClassName = '', className = '', id, ...rest }, ref) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
                {label && (
                    <label htmlFor={inputId} className="text-sm font-medium text-[var(--text)]">
                        {label}
                    </label>
                )}
                <select
                    ref={ref}
                    id={inputId}
                    className={[
                        'w-full h-9 rounded-lg border bg-[var(--surface)] text-[var(--text)] text-sm px-3',
                        'border-[var(--border)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                        'transition-colors outline-none appearance-none cursor-pointer',
                        error ? 'border-red-500' : '',
                        className,
                    ].join(' ')}
                    {...rest}
                >
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
        );
    },
);
Select.displayName = 'Select';
