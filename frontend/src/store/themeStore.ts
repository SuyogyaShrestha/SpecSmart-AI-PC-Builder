const THEME_KEY = 'specsmart-theme';

export type Theme = 'light' | 'dark';

export function getTheme(): Theme {
    try {
        const stored = localStorage.getItem(THEME_KEY) as Theme | null;
        if (stored === 'light' || stored === 'dark') return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
        return 'light';
    }
}

export function applyTheme(theme: Theme): void {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {/* ignore */ }
}

export function toggleTheme(): Theme {
    const current = getTheme();
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    return next;
}

export function initTheme(): void {
    applyTheme(getTheme());
}
