import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Badge, PART_TYPE_VARIANT } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { getAccessToken } from '@/store/authStore';
import type { SavedBuild, BuildRow } from '@/types';

const API = 'http://127.0.0.1:8000';

function formatNPR(n: number | string) {
    return `Rs. ${Number(n).toLocaleString('en-NP')}`;
}

const COMPONENTS = ['CPU', 'CPU Cooler', 'GPU', 'Motherboard', 'RAM', 'SSD', 'Case', 'PSU'];

export default function ComparePage() {
    const [searchParams] = useSearchParams();
    const token = getAccessToken();

    const [builds, setBuilds] = useState<SavedBuild[]>([]);
    const [loadingBuilds, setLoadingBuilds] = useState(true);
    const [error, setError] = useState('');

    const [idA, setIdA] = useState<string>(searchParams.get('a') ?? '');
    const [idB, setIdB] = useState<string>(searchParams.get('b') ?? '');

    useEffect(() => {
        fetch(`${API}/api/builds/`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(setBuilds)
            .catch(() => setError('Could not load builds.'))
            .finally(() => setLoadingBuilds(false));
    }, []);

    const buildA = builds.find(b => String(b.id) === idA) ?? null;
    const buildB = builds.find(b => String(b.id) === idB) ?? null;

    function getRow(build: SavedBuild | null, component: string): BuildRow | undefined {
        if (!build) return undefined;
        return (build.build_data as BuildRow[]).find(r => r.component === component);
    }

    const buildOptions = [
        { value: '', label: '— select a build —' },
        ...builds.map(b => ({ value: String(b.id), label: b.name })),
    ];

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--text)]">Compare Builds</h1>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">Side-by-side comparison of two saved builds</p>
            </div>

            {error && <Alert variant="error" className="mb-4">{error}</Alert>}

            {loadingBuilds ? (
                <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : builds.length < 2 ? (
                <Card>
                    <div className="text-center py-10">
                        <p className="font-medium text-[var(--text)]">You need at least 2 saved builds to compare.</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1 mb-4">Go to the builder and save your builds first.</p>
                        <Link to="/builder" className="text-brand-600 dark:text-brand-400 hover:underline text-sm">Open Builder →</Link>
                    </div>
                </Card>
            ) : (
                <>
                    {/* Selectors */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <Select
                            label="Build A"
                            options={buildOptions}
                            value={idA}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIdA(e.target.value)}
                        />
                        <Select
                            label="Build B"
                            options={buildOptions}
                            value={idB}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIdB(e.target.value)}
                        />
                    </div>

                    {(!buildA || !buildB) ? (
                        <Card>
                            <p className="text-center text-sm text-[var(--text-muted)] py-8">Select two builds above to start comparing.</p>
                        </Card>
                    ) : (
                        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                                        <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)] w-32">Component</th>
                                        <th className="text-left px-4 py-3 font-semibold text-[var(--text)]">
                                            {buildA.name}
                                            <span className="ml-2 text-xs font-normal text-brand-600 dark:text-brand-400 tabular-nums">{formatNPR(buildA.total_price)}</span>
                                        </th>
                                        <th className="text-left px-4 py-3 font-semibold text-[var(--text)]">
                                            {buildB.name}
                                            <span className="ml-2 text-xs font-normal text-brand-600 dark:text-brand-400 tabular-nums">{formatNPR(buildB.total_price)}</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {COMPONENTS.map(comp => {
                                        const rowA = getRow(buildA, comp);
                                        const rowB = getRow(buildB, comp);
                                        const type = rowA?.type ?? rowB?.type;
                                        const priceA = rowA?.part?.price ?? 0;
                                        const priceB = rowB?.part?.price ?? 0;
                                        const cheaper = priceA < priceB ? 'A' : priceA > priceB ? 'B' : 'equal';
                                        return (
                                            <tr key={comp} className="hover:bg-[var(--surface-2)] transition-colors">
                                                <td className="px-4 py-3">
                                                    <Badge variant={PART_TYPE_VARIANT[type ?? ''] ?? 'default'} size="sm">{comp}</Badge>
                                                </td>
                                                <td className={`px-4 py-3 ${cheaper === 'A' && priceA > 0 ? 'bg-green-50 dark:bg-green-900/10' : ''}`}>
                                                    {rowA?.part ? (
                                                        <div>
                                                            <Link to={`/parts/${rowA.part.id}`} className="font-medium text-[var(--text)] hover:text-brand-600 dark:hover:text-brand-400">
                                                                {rowA.part.name}
                                                            </Link>
                                                            <p className="text-xs text-[var(--text-muted)] tabular-nums mt-0.5">{formatNPR(rowA.part.price)}</p>
                                                        </div>
                                                    ) : <span className="text-[var(--text-subtle)] italic text-xs">Not selected</span>}
                                                </td>
                                                <td className={`px-4 py-3 ${cheaper === 'B' && priceB > 0 ? 'bg-green-50 dark:bg-green-900/10' : ''}`}>
                                                    {rowB?.part ? (
                                                        <div>
                                                            <Link to={`/parts/${rowB.part.id}`} className="font-medium text-[var(--text)] hover:text-brand-600 dark:hover:text-brand-400">
                                                                {rowB.part.name}
                                                            </Link>
                                                            <p className="text-xs text-[var(--text-muted)] tabular-nums mt-0.5">{formatNPR(rowB.part.price)}</p>
                                                        </div>
                                                    ) : <span className="text-[var(--text-subtle)] italic text-xs">Not selected</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Total row */}
                                    <tr className="bg-[var(--surface-2)] font-semibold">
                                        <td className="px-4 py-3 text-[var(--text-muted)]">Total</td>
                                        <td className={`px-4 py-3 tabular-nums text-brand-600 dark:text-brand-400 ${Number(buildA.total_price) <= Number(buildB.total_price) ? 'font-bold' : ''}`}>
                                            {formatNPR(buildA.total_price)}
                                            {Number(buildA.total_price) <= Number(buildB.total_price) && <span className="ml-2 text-xs text-green-500">✓ cheaper</span>}
                                        </td>
                                        <td className={`px-4 py-3 tabular-nums text-brand-600 dark:text-brand-400 ${Number(buildB.total_price) < Number(buildA.total_price) ? 'font-bold' : ''}`}>
                                            {formatNPR(buildB.total_price)}
                                            {Number(buildB.total_price) < Number(buildA.total_price) && <span className="ml-2 text-xs text-green-500">✓ cheaper</span>}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </Layout>
    );
}
