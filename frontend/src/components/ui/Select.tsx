import React from 'react';

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
                <div className="relative flex items-center">
                    <select
                        ref={ref}
                        id={inputId}
                        className={[
                            'w-full h-9 rounded-lg border bg-[var(--surface)] text-[var(--text)] text-sm px-3 pr-8',
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
                    {/* Chevron icon */}
                    <div className="pointer-events-none absolute right-2.5 text-[var(--text-muted)]">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
        );
    },
);
Select.displayName = 'Select';
