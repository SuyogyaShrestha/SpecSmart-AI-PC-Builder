import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Cpu, Eye, EyeOff } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { apiLogin, setTokens, setCachedUser, getCachedUser } from '@/store/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

    // Already logged in — redirect away
    const existingUser = getCachedUser();
    if (existingUser) {
        return <Navigate to={existingUser.role === 'admin' ? '/admin' : '/dashboard'} replace />;
    }

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!username.trim() || !password) {
            setError('Please enter your username and password.');
            return;
        }
        setLoading(true);
        try {
            const { tokens, user } = await apiLogin(username.trim(), password);
            setTokens(tokens);
            setCachedUser(user);
            window.dispatchEvent(new Event('specsmart:auth_updated'));
            navigate(user.role === 'admin' ? '/admin' : from, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout bare>
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="h-10 w-10 bg-brand-600 rounded-xl flex items-center justify-center mb-3 shadow-lg">
                        <Cpu className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-[var(--text)]">Welcome back</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Sign in to your SpecSmart account</p>
                </div>

                {/* Card */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                    {error && <Alert variant="error" dismissible className="mb-4">{error}</Alert>}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                        <Input
                            label="Username"
                            id="username"
                            type="text"
                            autoComplete="username"
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="your_username"
                        />
                        <Input
                            label="Password"
                            id="password"
                            type={showPwd ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            rightAddon={
                                <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            }
                        />
                        <div className="flex justify-end -mt-2">
                            <Link to="/forgot-password" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
                                Forgot password?
                            </Link>
                        </div>
                        <Button type="submit" loading={loading} size="md" className="w-full mt-1">
                            Sign in
                        </Button>
                    </form>
                </div>

                <p className="text-center text-sm text-[var(--text-muted)] mt-5">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                        Create one
                    </Link>
                </p>
            </div>
        </Layout>
    );
}
