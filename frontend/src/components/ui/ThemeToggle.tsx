import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { getTheme, toggleTheme, type Theme } from '@/store/themeStore';

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(getTheme);

    function handleToggle() {
        const next = toggleTheme();
        setTheme(next);
    }

    return (
        <button
            onClick={handleToggle}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
    );
}
