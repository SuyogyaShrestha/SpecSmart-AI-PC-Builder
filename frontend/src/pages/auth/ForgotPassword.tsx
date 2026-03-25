import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { apiForgotPassword } from '@/store/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!email.trim()) { setError('Please enter your email address.'); return; }
        setLoading(true);
        try {
            await apiForgotPassword(email.trim());
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
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
                    <h1 className="text-xl font-bold text-[var(--text)]">Forgot your password?</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1 text-center">
                        Enter your email and we'll send a reset link
                    </p>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                    {sent ? (
                        <div className="flex flex-col items-center gap-3 py-4">
                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                            <p className="text-sm text-center text-[var(--text)]">
                                Check your inbox — we've sent a password reset link to <strong>{email}</strong>.
                            </p>
                        </div>
                    ) : (
                        <>
                            {error && <Alert variant="error" dismissible className="mb-4">{error}</Alert>}
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                                <Input
                                    label="Email address" id="email" type="email" autoFocus
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder="alex@example.com"
                                />
                                <Button type="submit" loading={loading} size="md" className="w-full">
                                    Send reset link
                                </Button>
                            </form>
                        </>
                    )}
                </div>

                <Link
                    to="/login"
                    className="flex items-center justify-center gap-1.5 mt-5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                </Link>
            </div>
        </Layout>
    );
}
