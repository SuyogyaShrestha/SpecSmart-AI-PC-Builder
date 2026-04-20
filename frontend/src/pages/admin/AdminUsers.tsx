import { useEffect, useState } from 'react';
import { Search, ShieldCheck, ShieldOff, User2, Trash2, CheckCircle2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { getAccessToken } from '@/store/authStore';
import type { User } from '@/types';

const API = 'http://127.0.0.1:8000';

function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` };
}

function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [confirmUser, setConfirmUser] = useState<{ user: User; action: 'promote' | 'demote' | 'deactivate' | 'activate' | 'delete' } | null>(null);
    const [acting, setActing] = useState(false);

    useEffect(() => {
        fetch(`${API}/api/admin/users/`, { headers: authHeaders() })
            .then(r => r.json())
            .then(setUsers)
            .catch(() => setError('Could not load users.'))
            .finally(() => setLoading(false));
    }, []);

    async function handleAction() {
        if (!confirmUser) return;
        setActing(true);
        const { user, action } = confirmUser;

        try {
            if (action === 'delete') {
                await fetch(`${API}/api/admin/users/${user.id}/`, {
                    method: 'DELETE', headers: authHeaders(),
                });
                setUsers(prev => prev.filter(u => u.id !== user.id));
            } else {
                const payload =
                    action === 'promote' ? { role: 'admin' } :
                        action === 'demote' ? { role: 'user' } :
                            action === 'deactivate' ? { is_active: false } :
                                { is_active: true };

                const res = await fetch(`${API}/api/admin/users/${user.id}/`, {
                    method: 'PATCH', headers: authHeaders(),
                    body: JSON.stringify(payload),
                });
                const updated = await res.json();
                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
            }
            setConfirmUser(null);
        } catch { setError('Could not update user.'); }
        finally { setActing(false); }
    }

    const filtered = users.filter(u =>
        !search || u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const actionLabel = confirmUser ? {
        promote: 'Promote to Admin',
        demote: 'Demote to User',
        deactivate: 'Deactivate',
        activate: 'Activate',
        delete: 'Delete User',
    }[confirmUser.action] : '';

    return (
        <Layout>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">Manage Users</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">{users.length} registered users</p>
                </div>
            </div>

            {error && <Alert variant="error" className="mb-4" dismissible>{error}</Alert>}

            <Card padding="sm" className="mb-4">
                <Input id="user-search" placeholder="Search by username or email…" value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    leftAddon={<Search className="h-4 w-4" />} wrapperClassName="max-w-sm" />
            </Card>

            {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : (
                <Card padding="none">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">User</th>
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Email</th>
                                <th className="text-center px-4 py-2.5 font-medium text-[var(--text-muted)]">Role</th>
                                <th className="text-center px-4 py-2.5 font-medium text-[var(--text-muted)]">Status</th>
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Joined</th>
                                <th className="w-28 px-4 py-2.5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {filtered.map(u => (
                                <tr key={u.id} className="hover:bg-[var(--surface-2)] transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold">
                                                {u.username[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-[var(--text)]">{u.username}</p>
                                                {(u.first_name || u.last_name) && (
                                                    <p className="text-xs text-[var(--text-muted)]">{u.first_name} {u.last_name}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--text-muted)]">{u.email}</td>
                                    <td className="px-4 py-3 text-center">
                                        <Badge variant={u.role === 'admin' ? 'brand' : 'default'} size="sm">{u.role}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Badge variant={u.is_active ? 'success' : 'default'} size="sm">
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--text-muted)]">{formatDate(u.date_joined)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {u.role === 'user' ? (
                                                <button onClick={() => setConfirmUser({ user: u, action: 'promote' })}
                                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition-colors">
                                                    <ShieldCheck className="h-3 w-3" /> Promote
                                                </button>
                                            ) : (
                                                <button onClick={() => setConfirmUser({ user: u, action: 'demote' })}
                                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors">
                                                    <User2 className="h-3 w-3" /> Demote
                                                </button>
                                            )}
                                            {u.is_active ? (
                                                <button onClick={() => setConfirmUser({ user: u, action: 'deactivate' })}
                                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-500 hover:bg-amber-100 transition-colors" title="Deactivate">
                                                    <ShieldOff className="h-3 w-3" />
                                                </button>
                                            ) : (
                                                <button onClick={() => setConfirmUser({ user: u, action: 'activate' })}
                                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-500 hover:bg-green-100 transition-colors" title="Activate">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                </button>
                                            )}
                                            <button onClick={() => setConfirmUser({ user: u, action: 'delete' })}
                                                className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors" title="Delete">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">No users found</td></tr>}
                        </tbody>
                    </table>
                </Card>
            )}

            <Modal open={confirmUser !== null} onClose={() => setConfirmUser(null)} title={actionLabel}
                footer={<div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setConfirmUser(null)}>Cancel</Button>
                    <Button loading={acting} onClick={handleAction}>{actionLabel}</Button>
                </div>}
            >
                <p className="text-sm text-[var(--text-muted)]">
                    Are you sure you want to <strong>{actionLabel?.toLowerCase()}</strong>{' '}
                    <strong>{confirmUser?.user.username}</strong>?
                </p>
            </Modal>
        </Layout>
    );
}
