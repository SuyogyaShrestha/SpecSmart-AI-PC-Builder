import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Cpu, Eye, EyeOff } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { apiRegister, setTokens, setCachedUser, getCachedUser } from '@/store/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function RegisterPage() {
    const navigate = useNavigate();

    // Already logged in — redirect away immediately
    const existingUser = getCachedUser();
    if (existingUser) {
        return <Navigate to={existingUser.role === 'admin' ? '/admin' : '/dashboard'} replace />;
    }

    const [form, setForm] = useState({
        first_name: '', last_name: '', username: '', email: '', password: '', password2: '',
    });
    const [showPwd, setShowPwd] = useState(false);
    const [errors, setErrors] = useState<Partial<typeof form>>({});
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(false);

    function update(field: keyof typeof form) {
        return (e: React.ChangeEvent<HTMLInputElement>) => {
            setForm(f => ({ ...f, [field]: e.target.value }));
            setErrors(s => ({ ...s, [field]: undefined }));
        };
    }

    function validate() {
        const e: Partial<typeof form> = {};
        if (!form.username.trim()) e.username = 'Username is required.';
        if (!form.email.trim()) e.email = 'Email is required.';
        if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
        if (form.password !== form.password2) e.password2 = 'Passwords do not match.';
        return e;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setApiError('');
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }
        setLoading(true);
        try {
            const { tokens, user } = await apiRegister(form);
            setTokens(tokens);
            setCachedUser(user);
            window.dispatchEvent(new Event('specsmart:auth_updated'));
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setApiError(err instanceof Error ? err.message : 'Registration failed.');
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
                <div className="flex flex-col items-center mb-8">
                    <div className="h-10 w-10 bg-brand-600 rounded-xl flex items-center justify-center mb-3 shadow-lg">
                        <Cpu className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-[var(--text)]">Create your account</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Start building your perfect PC</p>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
                    {apiError && <Alert variant="error" dismissible className="mb-4">{apiError}</Alert>}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="First name" id="first_name" value={form.first_name} onChange={update('first_name')} placeholder="Alex" />
                            <Input label="Last name" id="last_name" value={form.last_name} onChange={update('last_name')} placeholder="Smith" />
                        </div>
                        <Input
                            label="Username" id="username" required autoFocus
                            value={form.username} onChange={update('username')}
                            placeholder="alex_smith" error={errors.username}
                        />
                        <Input
                            label="Email address" id="email" type="email" required
                            value={form.email} onChange={update('email')}
                            placeholder="alex@example.com" error={errors.email}
                        />
                        <Input
                            label="Password" id="password" type={showPwd ? 'text' : 'password'} required
                            value={form.password} onChange={update('password')}
                            placeholder="Min. 8 characters" error={errors.password}
                            rightAddon={
                                <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            }
                        />
                        <Input
                            label="Confirm password" id="password2" type={showPwd ? 'text' : 'password'} required
                            value={form.password2} onChange={update('password2')}
                            placeholder="Repeat password" error={errors.password2}
                        />
                        <Button type="submit" loading={loading} size="md" className="w-full mt-1">
                            Create account
                        </Button>
                    </form>
                </div>

                <p className="text-center text-sm text-[var(--text-muted)] mt-5">
                    Already have an account?{' '}
                    <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </Layout>
    );
}
