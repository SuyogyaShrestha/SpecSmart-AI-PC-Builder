import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, ChevronRight, TrendingUp } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Badge, PART_TYPE_VARIANT } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { PriceChart } from '@/components/PriceChart';
import type { PartPricesResponse, VendorListing } from '@/types';

const API = 'http://127.0.0.1:8000';

// ── PCPartPicker-style spec labels per part type ────────────────────────────

const SPEC_LABELS: Record<string, { key: string; label: string; format?: (v: unknown) => string }[]> = {
    CPU: [
        { key: 'socket', label: 'Socket' },
        { key: 'cores', label: 'Cores' },
        { key: 'threads', label: 'Threads' },
        { key: 'base_clock_mhz', label: 'Base Clock', format: v => v ? (Number(v) >= 100 ? `${parseFloat((Number(v) / 1000).toFixed(2))} GHz` : `${v} GHz`) : '—' },
        { key: 'boost_clock_mhz', label: 'Boost Clock', format: v => v ? (Number(v) >= 100 ? `${parseFloat((Number(v) / 1000).toFixed(2))} GHz` : `${v} GHz`) : '—' },
        { key: 'tdp', label: 'TDP', format: v => v ? `${v}W` : '—' },
        { key: 'l3_cache_mb', label: 'L3 Cache', format: v => v ? `${v} MB` : '—' },
        { key: 'architecture', label: 'Architecture' },
        { key: 'includes_cooler', label: 'Includes Cooler', format: v => (v === true || v === 'true' || v === 'Yes' || v === 1 || v === '1') ? 'Yes' : 'No' },
        { key: 'has_igpu', label: 'Integrated Graphics', format: v => v ? 'Yes' : 'No' },
    ],
    GPU: [
        { key: 'vram_gb', label: 'VRAM', format: v => v ? `${v} GB` : '—' },
        { key: 'memory_type', label: 'Memory Type' },
        { key: 'tdp', label: 'TDP / TGP', format: v => v ? `${v}W` : '—' },
        { key: 'boost_clock_mhz', label: 'Boost Clock', format: v => v ? `${v} MHz` : '—' },
        { key: 'bus_width', label: 'Bus Width', format: v => v ? `${v}-bit` : '—' },
        { key: 'length_mm', label: 'Card Length', format: v => v ? `${v} mm` : '—' },
        { key: 'pcie_gen', label: 'PCIe' },
        { key: 'recommended_psu', label: 'Recommended PSU', format: v => v ? `${v}W` : '—' },
        { key: 'color', label: 'Color' },
        { key: 'fans', label: 'Fans' },
        { key: 'slots', label: 'Slot Width', format: v => v ? `${v} slots` : '—' },
    ],
    MOBO: [
        { key: 'socket', label: 'Socket' },
        { key: 'chipset', label: 'Chipset' },
        { key: 'ram_type', label: 'Memory Type' },
        { key: 'form_factor', label: 'Form Factor' },
        { key: 'max_ram_gb', label: 'Max RAM', format: v => v ? `${v} GB` : '—' },
        { key: 'ram_slots', label: 'RAM Slots' },
        { key: 'm2_slots', label: 'M.2 Slots' },
        { key: 'wifi', label: 'WiFi', format: v => v ? 'Yes' : 'No' },
        { key: 'bluetooth', label: 'Bluetooth', format: v => v ? 'Yes' : 'No' },
        { key: 'color', label: 'Color' },
    ],
    RAM: [
        { key: 'ram_type', label: 'Memory Type' },
        { key: 'capacity_gb', label: 'Total Capacity', format: v => v ? `${v} GB` : '—' },
        { key: 'speed_mhz', label: 'Speed', format: v => v ? `${v} MHz` : '—' },
        { key: 'cas_latency', label: 'CAS Latency', format: v => v ? `CL${v}` : '—' },
        { key: 'sticks', label: 'Modules', format: v => v ? `${v}x ${((Number(v) > 0 ? Math.round(Number(v)) : 0))}` : '—' },
        { key: 'voltage', label: 'Voltage', format: v => v ? `${v}V` : '—' },
        { key: 'ecc', label: 'ECC', format: v => v ? 'Yes' : 'No' },
        { key: 'rgb', label: 'RGB', format: v => v ? 'Yes' : 'No' },
        { key: 'color', label: 'Color' },
        { key: 'height_mm', label: 'Height', format: v => v ? `${v} mm` : '—' },
    ],
    SSD: [
        { key: 'capacity_gb', label: 'Capacity', format: v => Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)} TB` : `${v} GB` },
        { key: 'interface', label: 'Interface' },
        { key: 'form_factor', label: 'Form Factor' },
        { key: 'read_speed', label: 'Read Speed', format: v => v ? `${v} MB/s` : '—' },
        { key: 'write_speed', label: 'Write Speed', format: v => v ? `${v} MB/s` : '—' },
        { key: 'has_dram', label: 'DRAM Cache', format: v => v ? 'Yes' : 'No' },
        { key: 'tbw', label: 'Endurance (TBW)', format: v => v ? `${v} TB` : '—' },
    ],
    PSU: [
        { key: 'wattage', label: 'Wattage', format: v => v ? `${v}W` : '—' },
        { key: 'efficiency_rating', label: 'Efficiency Rating' },
        { key: 'modular', label: 'Modularity' },
        { key: 'psu_tier', label: 'Quality Tier', format: v => {
            const labels: Record<string, string> = { A: 'Tier A — Premium', B: 'Tier B — Good', C: 'Tier C — Budget', D: 'Tier D — Avoid' };
            return labels[String(v)] || String(v || '—');
        }},
        { key: 'form_factor', label: 'Form Factor' },
        { key: 'atx_version', label: 'ATX Version' },
        { key: 'pcie_gen5_connector', label: '12VHPWR Connector', format: v => v ? 'Yes' : 'No' },
        { key: 'color', label: 'Color' },
    ],
    CASE: [
        { key: 'form_factor', label: 'Form Factor' },
        { key: 'gpu_max_mm', label: 'Max GPU Length', format: v => v ? `${v} mm` : '—' },
        { key: 'cooler_max_mm', label: 'Max Cooler Height', format: v => v ? `${v} mm` : '—' },
        { key: 'mobo_support', label: 'Motherboard Support' },
        { key: 'included_fans', label: 'Pre-installed Fans' },
        { key: 'max_fans', label: 'Max Fan Slots' },
        { key: 'radiator_support', label: 'Radiator Support' },
        { key: 'side_panel', label: 'Side Panel' },
        { key: 'color', label: 'Color' },
    ],
    COOLER: [
        { key: 'cooler_type', label: 'Type' },
        { key: 'tdp_support', label: 'TDP Support', format: v => v ? `${v}W` : '—' },
        { key: 'height_mm', label: 'Height', format: v => v ? `${v} mm` : '—' },
        { key: 'fan_size_mm', label: 'Fan Size', format: v => v ? `${v} mm` : '—' },
        { key: 'fans', label: 'Number of Fans' },
        { key: 'socket_support', label: 'Socket Compatibility' },
        { key: 'noise_dba', label: 'Noise Level', format: v => v ? `${v} dB(A)` : '—' },
        { key: 'rgb', label: 'RGB', format: v => (v === true || v === 'true' || v === 'Yes' || v === 1 || v === '1') ? 'Yes' : 'No' },
        { key: 'color', label: 'Color' },
    ],
};

const VENDOR_LOGOS: Record<string, string> = {
    'Hukut': 'https://hukut.com/_next/image?url=%2Fassets%2Fhukut-logo-dark.png&w=256&q=75',
    'BigByte': 'https://bigbyte.com.np/wp-content/uploads/2024/05/bigbyte-logo-for-website--1536x550.jpg',
    'PC Mod Nepal': 'https://pcmodnepal.com/wp-content/uploads/2026/02/cropped-ChatGPT-Image-Feb-7-2026-10_07_52-PM.png',
};
function SpecsTable({ type, specs }: { type: string; specs: Record<string, unknown> }) {
    const labels = SPEC_LABELS[type];
    if (!labels) return null;

    const rows = labels
        .map(l => {
            const val = specs[l.key];
            if (val === null || val === undefined || val === '') return null;
            const display = l.format ? l.format(val) : String(val);
            if (display === '—' || display === '0' || display === 'false') return null;
            return { label: l.label, value: display };
        })
        .filter(Boolean) as { label: string; value: string }[];

    if (rows.length === 0) return null;

    return (
        <Card title="Specifications" padding="none">
            <div className="divide-y divide-[var(--border)]">
                {rows.map(r => (
                    <div key={r.label} className="flex px-4 py-3 text-sm">
                        <span className="w-44 shrink-0 font-medium text-[var(--text-muted)]">
                            {r.label}
                        </span>
                        <span className="text-[var(--text)] font-medium">{r.value}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

const DAYS_OPTIONS = [
    { label: '7 days', value: 7 },
    { label: '30 days', value: 30 },
    { label: '90 days', value: 90 },
];

function formatNPR(n: number | null | undefined) {
    if (n == null) return '—';
    return `Rs. ${Number(n).toLocaleString('en-NP')}`;
}

function PartDetailSkeleton() {
    return (
        <Layout>
            <div className="flex items-center gap-2 mb-5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
            </div>
            <div className="grid lg:grid-cols-[1fr_300px] gap-5">
                <div className="space-y-4">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-3">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-7 w-3/4" />
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default function PartDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<PartPricesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [days, setDays] = useState(30);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        fetch(`${API}/api/parts/${id}/prices/?days=${days}`)
            .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
            .then(setData)
            .catch(() => setError('Could not load part details.'))
            .finally(() => setLoading(false));
    }, [id, days]);

    if (loading) return <PartDetailSkeleton />;
    if (error || !data) return <Layout><Alert variant="error">{error || 'Part not found.'}</Alert></Layout>;

    const { part, best_price, listings, history } = data;
    const specs = part.specs ?? {};
    const imageUrl = part.image_url || (specs.image_url as string) || '';
    const hasHistory = history && Object.keys(history).length > 0;

    return (
        <Layout>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-5 flex-wrap">
                <button onClick={() => navigate(-1)} className="flex items-center gap-1 hover:text-[var(--text)] transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <Link to="/builder" className="hover:text-[var(--text)] transition-colors">Builder</Link>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[var(--text)] truncate max-w-[200px]">{part.name}</span>
            </div>

            <div className="grid lg:grid-cols-[1fr_300px] gap-5">
                {/* ── Left ── */}
                <div className="space-y-4">
                    {/* Header */}
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                        {/* Product image */}
                        {imageUrl ? (
                            <div className="mb-4 flex justify-center">
                                <div className="w-full max-w-xs h-48 bg-white rounded-lg border border-[var(--border)] flex items-center justify-center overflow-hidden">
                                    <img
                                        src={imageUrl}
                                        alt={part.name}
                                        className="max-h-44 max-w-full object-contain p-2"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="mb-4 flex justify-center">
                                <div className="w-full max-w-xs h-48 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] flex flex-col items-center justify-center text-[var(--text-muted)]">
                                    <span className="text-5xl font-bold opacity-20">{part.type[0]}</span>
                                    <span className="text-xs mt-2 opacity-50">No image available</span>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <Badge variant={PART_TYPE_VARIANT[part.type] ?? 'default'} className="mb-2">{part.type}</Badge>
                                <h1 className="text-xl font-bold text-[var(--text)]">{part.name}</h1>
                                <p className="text-sm text-[var(--text-muted)] mt-0.5">{part.brand}</p>
                            </div>
                            <div className="text-right shrink-0">
                                {best_price != null && best_price > 0 ? (
                                    <>
                                        <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{formatNPR(best_price)}</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">Best vendor price</p>
                                    </>
                                ) : part.price > 0 ? (
                                    <p className="text-lg font-bold text-[var(--text)]">{formatNPR(part.price)}</p>
                                ) : (
                                    <span className="inline-block mt-1 px-3 py-1 text-sm font-semibold rounded bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                        Out of Stock
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Price History Chart */}
                    <Card
                        title="Price History"
                        titleRight={
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                                <div className="flex gap-1">
                                    {DAYS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setDays(opt.value)}
                                            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${days === opt.value
                                                ? 'bg-brand-600 text-white'
                                                : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        }
                    >

                        {hasHistory ? (
                            <PriceChart history={history} listings={listings} />
                        ) : (
                            <div className="flex items-center justify-center h-36 text-sm text-[var(--text-muted)]">
                                No price history data available.
                            </div>
                        )}
                    </Card>

                    {/* Specs — PCPartPicker-style, category-specific */}
                    <SpecsTable type={part.type} specs={specs} />
                </div>

                {/* ── Right: Vendor Pricing ── */}
                <div className="space-y-4">
                    <Card title="Vendor Pricing">
                        {listings.length === 0 ? (
                            <p className="text-sm text-[var(--text-muted)] text-center py-4">No vendor listings available.</p>
                        ) : (
                            <div className="space-y-2">
                                {listings.map((listing: VendorListing) => (
                                    <div key={listing.id} className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors">
                                        <div className="min-w-0">
                                            {VENDOR_LOGOS[listing.vendor.name] ? (
                                                <div className="h-6 flex items-center mb-0.5">
                                                    <img 
                                                        src={VENDOR_LOGOS[listing.vendor.name]} 
                                                        alt={listing.vendor.name} 
                                                        className="max-h-full max-w-[100px] object-contain opacity-90 transition-opacity hover:opacity-100 dark:brightness-110"
                                                        onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'; }}
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm font-medium text-[var(--text)] truncate">{listing.vendor.name}</p>
                                            )}
                                            {listing.last_checked_at && (
                                                <p className="text-[10px] text-[var(--text-muted)]">
                                                    Updated {new Date(listing.last_checked_at).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            {listing.in_stock ? (
                                                <span className="text-sm font-semibold tabular-nums text-[var(--text)]">
                                                    {formatNPR(listing.last_price)}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 shrink-0">
                                                    Out of Stock
                                                </span>
                                            )}
                                            {listing.product_url && (
                                                <a href={listing.product_url} target="_blank" rel="noopener noreferrer"
                                                    className="text-[var(--text-muted)] hover:text-brand-500 transition-colors">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Button variant="secondary" size="sm" className="w-full" onClick={() => navigate(`/pick/${part.type}`)}>
                        Browse all {part.type}s
                    </Button>
                </div>
            </div>
        </Layout>
    );
}
