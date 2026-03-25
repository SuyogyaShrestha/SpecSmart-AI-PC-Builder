import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import React, { useState } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
    variant?: AlertVariant;
    title?: string;
    children: React.ReactNode;
    dismissible?: boolean;
    className?: string;
}

const CONFIG: Record<AlertVariant, { icon: React.FC<{ className?: string }>; classes: string }> = {
    info: { icon: Info, classes: 'bg-sky-50 border-sky-200 text-sky-800 dark:bg-sky-900/20 dark:border-sky-700 dark:text-sky-300' },
    success: { icon: CheckCircle2, classes: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300' },
    warning: { icon: TriangleAlert, classes: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300' },
    error: { icon: AlertCircle, classes: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300' },
};

export function Alert({ variant = 'info', title, children, dismissible, className = '' }: AlertProps) {
    const [dismissed, setDismissed] = useState(false);
    if (dismissed) return null;
    const { icon: Icon, classes } = CONFIG[variant];

    return (
        <div className={`flex gap-2.5 rounded-lg border p-3 text-sm ${classes} ${className}`} role="alert">
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                {title && <p className="font-semibold mb-0.5">{title}</p>}
                <div>{children}</div>
            </div>
            {dismissible && (
                <button onClick={() => setDismissed(true)} className="shrink-0 hover:opacity-70 transition-opacity">
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
