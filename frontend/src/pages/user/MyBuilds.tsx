import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Trash2, ExternalLink, Calendar, Cpu } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { CardGridSkeleton } from '@/components/ui/Skeleton';
import { getAccessToken } from '@/store/authStore';
import type { SavedBuild } from '@/types';

const API = 'http://127.0.0.1:8000';

function formatNPR(n: number | string) {
    return `Rs. ${Number(n).toLocaleString('en-NP')}`;
}
function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function MyBuildsPage() {
    const navigate = useNavigate();
    const [builds, setBuilds] = useState<SavedBuild[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState<number | null>(null);
    const [confirmId, setConfirmId] = useState<number | null>(null);

    const token = getAccessToken();

    async function fetchBuilds() {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/builds/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to load builds');
            setBuilds(await res.json());
        } catch {
            setError('Could not load your builds.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchBuilds(); }, []);

    async function handleDelete(id: number) {
        setDeleting(id);
        try {
            await fetch(`${API}/api/builds/${id}/`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            setBuilds(b => b.filter(x => x.id !== id));
        } catch {
            setError('Could not delete build.');
        } finally {
            setDeleting(null);
            setConfirmId(null);
        }
    }

    return (
        <Layout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">My Builds</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                        {builds.length} saved {builds.length === 1 ? 'configuration' : 'configurations'}
                    </p>
                </div>
                <Link to="/builder">
                    <Button leftIcon={<PlusCircle className="h-4 w-4" />}>New Build</Button>
                </Link>
            </div>

            {error && <Alert variant="error" className="mb-4" dismissible>{error}</Alert>}

            {loading ? (
                <CardGridSkeleton count={3} />
            ) : builds.length === 0 ? (
                <Card>
                    <div className="text-center py-12">
                        <Cpu className="h-10 w-10 text-[var(--text-subtle)] mx-auto mb-3" />
                        <p className="font-medium text-[var(--text)]">No saved builds yet</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">
                            Build your dream PC and save it to access it anytime.
                        </p>
                        <Link to="/builder">
                            <Button>Start with AI Builder</Button>
                        </Link>
                    </div>
                </Card>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {builds.map(build => {
                        const parts = Array.isArray(build.build_data)
                            ? build.build_data.filter((r: { part: unknown }) => r.part)
                            : [];
                        return (
                            <Card key={build.id} className="flex flex-col gap-3 hover:shadow-md transition-shadow">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-[var(--text)] truncate">{build.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Badge variant="brand" size="sm">{build.usecase}</Badge>
                                            {build.is_public && <Badge variant="success" size="sm">Public</Badge>}
                                        </div>
                                    </div>
                                    <p className="text-base font-bold text-brand-600 dark:text-brand-400 shrink-0 tabular-nums">
                                        {formatNPR(build.total_price)}
                                    </p>
                                </div>

                                {/* Part count */}
                                <p className="text-xs text-[var(--text-muted)]">
                                    {parts.length}/8 parts · Budget: {formatNPR(build.budget)}
                                </p>

                                {/* Tags */}
                                {build.tags && (
                                    <div className="flex flex-wrap gap-1">
                                        {build.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                                            <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Date */}
                                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-auto">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(build.updated_at)}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => navigate(`/my-builds/${build.id}`)}
                                        leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        loading={deleting === build.id}
                                        onClick={() => setConfirmId(build.id)}
                                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Delete confirm modal */}
            <Modal
                open={confirmId !== null}
                onClose={() => setConfirmId(null)}
                title="Delete Build"
                footer={
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setConfirmId(null)}>Cancel</Button>
                        <Button
                            variant="primary"
                            className="bg-red-600 hover:bg-red-700"
                            loading={deleting !== null}
                            onClick={() => confirmId && handleDelete(confirmId)}
                        >
                            Delete
                        </Button>
                    </div>
                }
            >
                <p className="text-sm text-[var(--text-muted)]">
                    Are you sure you want to delete this build? This cannot be undone.
                </p>
            </Modal>
        </Layout>
    );
}
