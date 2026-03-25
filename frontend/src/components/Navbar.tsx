import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Cpu, ChevronDown, User, LayoutDashboard, LogOut, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getCachedUser, clearTokens, apiLogout } from '@/store/authStore';
import type { User as UserType } from '@/types';

const NAV_LINKS = [
    { to: '/builder', label: 'PC Builder' },
    { to: '/parts', label: 'Parts' },
];

export function Navbar() {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserType | null>(getCachedUser);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Re-check user on auth changes
    useEffect(() => {
        const handler = () => setUser(getCachedUser());
        window.addEventListener('specsmart:auth_updated', handler);
        return () => window.removeEventListener('specsmart:auth_updated', handler);
    }, []);

    // Auto-logout when token refresh fails (session expired server-side)
    useEffect(() => {
        const handler = () => {
            setUser(null);
            navigate('/login');
        };
        window.addEventListener('specsmart:session_expired', handler);
        return () => window.removeEventListener('specsmart:session_expired', handler);
    }, [navigate]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    async function handleLogout() {
        setMenuOpen(false);
        await apiLogout();          // blacklists refresh token, clears localStorage
        setUser(null);
        window.dispatchEvent(new Event('specsmart:auth_updated'));
        navigate('/');
    }

    return (
        <header className="sticky top-0 z-40 h-14 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
            <div className="max-w-7xl mx-auto h-full px-4 flex items-center gap-6">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 shrink-0">
                    <div className="h-7 w-7 bg-brand-600 rounded-lg flex items-center justify-center">
                        <Cpu className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-[var(--text)] text-base tracking-tight">SpecSmart</span>
                </Link>

                {/* Nav Links */}
                <nav className="hidden md:flex items-center gap-1 flex-1">
                    {NAV_LINKS.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) =>
                                `px-3 h-8 flex items-center text-sm rounded-md font-medium transition-colors ${isActive
                                    ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
                                }`
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Right side */}
                <div className="ml-auto flex items-center gap-2">
                    <ThemeToggle />

                    {user ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setMenuOpen((v) => !v)}
                                className="flex items-center gap-1.5 h-8 pl-2 pr-2.5 rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                            >
                                <div className="h-6 w-6 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-bold">
                                    {(user.first_name?.[0] ?? user.username[0]).toUpperCase()}
                                </div>
                                <span className="hidden sm:block max-w-24 truncate">{user.first_name || user.username}</span>
                                <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-10 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg py-1 z-50">
                                    <div className="px-3 py-2 border-b border-[var(--border)]">
                                        <p className="text-sm font-medium text-[var(--text)] truncate">{user.username}</p>
                                        <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                                    </div>
                                    <DropItem to="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" onClick={() => setMenuOpen(false)} />
                                    {user.role === 'admin' && (
                                        <DropItem to="/admin" icon={<Shield className="h-4 w-4" />} label="Admin Panel" onClick={() => setMenuOpen(false)} />
                                    )}
                                    <div className="my-1 border-t border-[var(--border)]" />
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-[var(--surface-2)] transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link
                                to="/login"
                                className="h-8 px-3 flex items-center text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            >
                                Sign in
                            </Link>
                            <Link
                                to="/register"
                                className="h-8 px-3 flex items-center text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                            >
                                Get started
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function DropItem({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
        >
            <span className="text-[var(--text-muted)]">{icon}</span>
            {label}
        </Link>
    );
}
