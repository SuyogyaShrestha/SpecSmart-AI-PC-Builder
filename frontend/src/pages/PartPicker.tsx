import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown, ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge, PART_TYPE_VARIANT } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { PartTableSkeleton } from '@/components/ui/Skeleton';
import { upsertPartInBuild, COMPONENT_TO_TYPE } from '@/store/buildStore';
import type { Part, PartType } from '@/types';

const API = 'http://127.0.0.1:8000';

// Which spec columns to show per part type
const SPEC_COLS: Record<string, { key: string; label: string }[]> = {
    CPU: [{ key: 'cores', label: 'Cores' }, { key: 'boost_clock_mhz', label: 'Boost (MHz)' }, { key: 'socket', label: 'Socket' }, { key: 'tdp', label: 'TDP (W)' }],
    GPU: [{ key: 'vram_gb', label: 'VRAM (GB)' }, { key: 'length_mm', label: 'Length (mm)' }, { key: 'tdp', label: 'TDP (W)' }],
    MOBO: [{ key: 'socket', label: 'Socket' }, { key: 'chipset', label: 'Chipset' }, { key: 'ram_type', label: 'RAM' }],
    RAM: [{ key: 'ram_type', label: 'Type' }, { key: 'speed_mhz', label: 'Speed (MHz)' }, { key: 'cas_latency', label: 'CL' }, { key: 'capacity_gb', label: 'Size (GB)' }],
    SSD: [{ key: 'capacity_gb', label: 'Capacity (GB)' }, { key: 'interface', label: 'Interface' }],
    PSU: [{ key: 'wattage', label: 'Wattage (W)' }, { key: 'efficiency_rating', label: 'Rating' }, { key: 'psu_tier', label: 'Tier' }],
    CASE: [{ key: 'form_factor', label: 'Form Factor' }],
    COOLER: [{ key: 'cooler_type', label: 'Type' }, { key: 'tdp_support', label: 'TDP Limit (W)' }],
};

const SORT_OPTIONS = [
    { value: 'price_asc', label: 'Price: Low → High' },
    { value: 'price_desc', label: 'Price: High → Low' },
    { value: 'name_asc', label: 'Name A → Z' },
    { value: 'score_desc', label: 'Score: High → Low' },
];

// Map URL :type param to component name for the store
const TYPE_TO_COMPONENT: Record<string, string> = {
    CPU: 'CPU', GPU: 'GPU', MOBO: 'Motherboard',
    RAM: 'RAM', SSD: 'SSD', PSU: 'PSU', CASE: 'Case', COOLER: 'CPU Cooler',
};

export default function PartPickerPage() {
    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const partType = (type?.toUpperCase() ?? 'CPU') as PartType;
    const componentName = TYPE_TO_COMPONENT[partType] ?? partType;
    const specCols = SPEC_COLS[partType] ?? [];

    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('price_asc');
    const [added, setAdded] = useState<number | null>(null);

    useEffect(() => {
        setLoading(true);
        setError('');
        fetch(`${API}/api/parts/?type=${partType}`)
            .then(r => r.json())
            .then(data => setParts(Array.isArray(data) ? data : []))
            .catch(() => setError('Could not load parts. Is the backend running?'))
            .finally(() => setLoading(false));
    }, [partType]);

    const filtered = parts
        .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            if (sort === 'price_asc') return a.price - b.price;
            if (sort === 'price_desc') return b.price - a.price;
            if (sort === 'name_asc') return a.name.localeCompare(b.name);
            if (sort === 'score_desc') return (b.score ?? 0) - (a.score ?? 0);
            return 0;
        });

    function handleAdd(part: Part) {
        upsertPartInBuild(componentName, part);
        setAdded(part.id);
        setTimeout(() => navigate('/builder'), 600);
    }

    return (
        <Layout>
            <div className="flex items-center gap-3 mb-5">
                <button onClick={() => navigate(-1)} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">
                        Choose {componentName}
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                        <Badge variant={PART_TYPE_VARIANT[partType] ?? 'default'} size="sm">{partType}</Badge>
                        <span className="ml-2">{filtered.length} parts</span>
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 mb-4">
                <Input
                    id="search"
                    placeholder={`Search ${partType}s…`}
                    value={search}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                    leftAddon={<Search className="h-4 w-4" />}
                    wrapperClassName="flex-1 min-w-52"
                />
                <Select
                    id="sort"
                    options={SORT_OPTIONS}
                    value={sort}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSort(e.target.value)}
                    wrapperClassName="w-48"
                />
            </div>

            {error && <Alert variant="error" className="mb-4">{error}</Alert>}

            {loading ? (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Part</th>
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Brand</th>
                                {specCols.map(col => (
                                    <th key={col.key} className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)] hidden md:table-cell">{col.label}</th>
                                ))}
                                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-muted)]">Price (NPR)</th>
                                <th className="w-28"></th>
                            </tr>
                        </thead>
                        <PartTableSkeleton rows={8} cols={4 + specCols.length} />
                    </table>
                </div>
            ) : (

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">
                                    <div className="flex items-center gap-1.5"><ArrowUpDown className="h-3.5 w-3.5" /> Part</div>
                                </th>
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Brand</th>
                                {specCols.map(col => (
                                    <th key={col.key} className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)] hidden md:table-cell">{col.label}</th>
                                ))}
                                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-muted)]">Price (NPR)</th>
                                <th className="w-28"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={4 + specCols.length} className="text-center py-12 text-[var(--text-muted)] text-sm">
                                    No parts match your search.
                                </td></tr>
                            ) : filtered.map(part => (
                                <tr key={part.id} className="hover:bg-[var(--surface-2)] transition-colors group">
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => navigate(`/parts/${part.id}`)}
                                            className="font-medium text-[var(--text)] hover:text-brand-600 dark:hover:text-brand-400 text-left flex items-center gap-3"
                                        >
                                            {part.image_url || part.specs?.image_url ? (
                                                <img src={(part.image_url || part.specs?.image_url) as string} alt={part.name} className="h-10 w-10 object-contain rounded bg-white p-0.5 shrink-0 border border-[var(--border)]" />
                                            ) : (
                                                <div className="h-10 w-10 bg-[var(--surface-3)] rounded flex items-center justify-center text-[var(--text-muted)] text-[10px] border border-[var(--border)] shrink-0">{partType[0]}</div>
                                            )}
                                            <span className="truncate max-w-[200px]">{part.name}</span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--text-muted)]">{part.brand}</td>
                                    {specCols.map(col => (
                                        <td key={col.key} className="px-4 py-3 text-[var(--text-muted)] hidden md:table-cell">
                                            {String(part.specs?.[col.key] ?? '—')}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--text)]">
                                        {part.price.toLocaleString('en-NP')}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            size="sm"
                                            variant={added === part.id ? 'secondary' : 'primary'}
                                            onClick={() => handleAdd(part)}
                                        >
                                            {added === part.id ? '✓ Added' : 'Select'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Layout>
    );
}
