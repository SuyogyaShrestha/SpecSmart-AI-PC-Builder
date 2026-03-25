import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    footer?: React.ReactNode;
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
    useEffect(() => {
        if (!open) return;
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', esc);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', esc);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Panel */}
            <div
                className={`relative z-10 w-full ${sizeClasses[size]} bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]`}
            >
                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
                        <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}
                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
                {/* Footer */}
                {footer && (
                    <div className="px-5 py-4 border-t border-[var(--border)] shrink-0 flex justify-end gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}
