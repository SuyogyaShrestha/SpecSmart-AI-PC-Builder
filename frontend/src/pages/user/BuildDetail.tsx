import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Edit2, Save, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, PART_TYPE_VARIANT } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { getAccessToken } from '@/store/authStore';
import { saveBuildState } from '@/store/buildStore';
import type { SavedBuild, BuildRow } from '@/types';

const API = 'http://127.0.0.1:8000';

function formatNPR(n: number | string) {
    return `Rs. ${Number(n).toLocaleString('en-NP')}`;
}

export default function BuildDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const token = getAccessToken();

    const [build, setBuild] = useState<SavedBuild | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) return;
        fetch(`${API}/api/builds/${id}/`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
            .then((data: SavedBuild) => { setBuild(data); setName(data.name); })
            .catch(() => setError('Could not load this build.'))
            .finally(() => setLoading(false));
    }, [id]);

    async function handleRename() {
        if (!build || !name.trim()) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/api/builds/${build.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name }),
            });
            const updated: SavedBuild = await res.json();
            setBuild(updated);
            setEditing(false);
        } catch { setError('Could not rename build.'); }
        finally { setSaving(false); }
    }

    function handleLoadIntoBuilder() {
        if (!build) return;
        saveBuildState({
            rows: build.build_data as BuildRow[],
            budget: Number(build.budget),
            usecase: build.usecase,
            mode: 'manual',
            aiData: null,
        }, { emit: true });
        navigate('/builder');
    }

    if (loading) return <Layout><div className="flex justify-center py-16"><Spinner size="lg" /></div></Layout>;
    if (error || !build) return <Layout><Alert variant="error">{error || 'Build not found.'}</Alert></Layout>;

    const rows = (build.build_data as BuildRow[]) ?? [];
    const filled = rows.filter(r => r.part);

    return (
        <Layout>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-5">
                <button onClick={() => navigate('/my-builds')} className="flex items-center gap-1 hover:text-[var(--text)] transition-colors">
                    <ArrowLeft className="h-4 w-4" /> My Builds
                </button>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-[var(--text)]">{build.name}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-4">
                <div className="flex-1">
                    {editing ? (
                        <div className="flex items-center gap-2">
                            <Input
                                id="build-name"
                                value={name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                                wrapperClassName="w-72"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
                                autoFocus
                            />
                            <Button size="sm" loading={saving} onClick={handleRename} leftIcon={<Save className="h-3.5 w-3.5" />}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setName(build.name); }}><X className="h-4 w-4" /></Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-[var(--text)]">{build.name}</h1>
                            <button onClick={() => setEditing(true)} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                                <Edit2 className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="brand" size="sm">{build.usecase}</Badge>
                        <span className="text-xs text-[var(--text-muted)]">{filled.length}/8 parts · <Link to="/builder" className="hover:underline">Open Builder</Link></span>
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{formatNPR(build.total_price)}</p>
                    <p className="text-xs text-[var(--text-muted)]">Budget: {formatNPR(build.budget)}</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_260px] gap-5">
                {/* Parts Table */}
                <Card padding="none">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Component</th>
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Part</th>
                                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-muted)]">Price</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {rows.map(row => (
                                <tr key={row.component} className="hover:bg-[var(--surface-2)] transition-colors">
                                    <td className="px-4 py-3">
                                        <Badge variant={PART_TYPE_VARIANT[row.type] ?? 'default'} size="sm">{row.type}</Badge>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-[var(--text)]">
                                        {row.part ? (
                                            <Link to={`/parts/${row.part.id}`} className="hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-3">
                                                {row.part.specs?.image_url ? (
                                                    <img src={row.part.specs.image_url as string} alt={row.part.name} className="h-10 w-10 object-contain rounded bg-white p-1 shrink-0" />
                                                ) : (
                                                    <div className="h-10 w-10 bg-[var(--surface-3)] rounded flex items-center justify-center text-[var(--text-muted)] text-[10px] border border-[var(--border)] shrink-0">Img</div>
                                                )}
                                                <span className="truncate max-w-xs">{row.part.name}</span>
                                            </Link>
                                        ) : (
                                            <span className="text-[var(--text-muted)] italic">Not selected</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-[var(--text)]">
                                        {row.part ? formatNPR(row.part.price) : <span className="text-[var(--text-subtle)]">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>

                {/* Sidebar */}
                <div className="space-y-4">
                    <Card title="Summary">
                        <div className="space-y-2 text-sm">
                            {filled.map(r => (
                                <div key={r.component} className="flex justify-between">
                                    <span className="text-[var(--text-muted)]">{r.component}</span>
                                    <span className="font-medium tabular-nums text-[var(--text)]">{formatNPR(r.part!.price)}</span>
                                </div>
                            ))}
                            {filled.length > 0 && (
                                <div className="pt-2 border-t border-[var(--border)] flex justify-between font-semibold">
                                    <span className="text-[var(--text)]">Total</span>
                                    <span className="text-brand-600 dark:text-brand-400 tabular-nums">{formatNPR(build.total_price)}</span>
                                </div>
                            )}
                        </div>
                    </Card>
                    <Button className="w-full" onClick={handleLoadIntoBuilder}>
                        Load into Builder
                    </Button>
                    <Link to={`/compare?a=${build.id}`} className="block">
                        <Button variant="secondary" className="w-full">Compare with another</Button>
                    </Link>
                </div>
            </div>
        </Layout>
    );
}
