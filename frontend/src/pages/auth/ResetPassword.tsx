import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Cpu, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { apiResetPassword } from '@/store/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function ResetPasswordPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        if (password !== password2) { setError('Passwords do not match.'); return; }
        if (!token) { setError('Invalid reset link.'); return; }
        setLoading(true);
        try {
            await apiResetPassword(token, password, password2);
            setDone(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Layout bare>
            <div className="absolute top-4 right-4"><ThemeToggle /></div>
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-8">
                    <div className="h-10 w-10 bg-brand-600 rounded-xl flex items-center justify-center mb-3 shadow-lg">
                        <Cpu className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-[var(--text)]">Set new password</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Choose a strong password</p>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                    {done ? (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                            <p className="text-sm text-center text-[var(--text)]">
                                Password reset! Redirecting to sign in…
                            </p>
                        </div>
                    ) : (
                        <>
                            {error && <Alert variant="error" dismissible className="mb-4">{error}</Alert>}
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <Input
                                    label="New password" id="password"
                                    type={showPwd ? 'text' : 'password'} autoFocus
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                    rightAddon={
                                        <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                                            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    }
                                />
                                <Input
                                    label="Confirm new password" id="password2"
                                    type={showPwd ? 'text' : 'password'}
                                    value={password2} onChange={(e) => setPassword2(e.target.value)}
                                    placeholder="Repeat password"
                                />
                                <Button type="submit" loading={loading} size="md" className="w-full">
                                    Reset password
                                </Button>
                            </form>
                        </>
                    )}
                </div>
                <p className="text-center text-sm text-[var(--text-muted)] mt-5">
                    <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                        Back to sign in
                    </Link>
                </p>
            </div>
        </Layout>
    );
}
