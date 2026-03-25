import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

interface HistoryPoint {
    date: string;
    price: number | null;
    vendor: string;
}

interface PriceChartProps {
    /** history[listingId] = [{date, price, currency, in_stock, listing}] */
    history: Record<number, Array<{ id: number; date: string; price: string | number; listing: number }>>;
    /** listings to get vendor names */
    listings: Array<{ id: number; vendor: { name: string } }>;
}

// Merge all listing history into day-keyed rows: { date, VendorA, VendorB, ... }
function mergeHistory(
    history: PriceChartProps['history'],
    listings: PriceChartProps['listings'],
) {
    const vendorById: Record<number, string> = {};
    for (const l of listings) vendorById[l.id] = l.vendor.name;

    const dayMap: Record<string, Record<string, number>> = {};
    for (const [listingIdStr, rows] of Object.entries(history)) {
        const lid = Number(listingIdStr);
        const vendorName = vendorById[lid] ?? `Listing ${lid}`;
        for (const row of rows) {
            const p = row.price != null ? Number(row.price) : null;
            if (p == null) continue;
            if (!dayMap[row.date]) dayMap[row.date] = {};
            dayMap[row.date][vendorName] = p;
        }
    }

    return Object.entries(dayMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, vendors]) => ({ date, ...vendors }));
}

const CHART_COLORS = [
    '#6366f1', // indigo (brand)
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
];

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatNPR(v: number) {
    return `Rs. ${v.toLocaleString('en-NP')}`;
}

interface TooltipPayload {
    color: string;
    name: string;
    value: number;
}

function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
}) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 shadow-lg text-xs">
            <p className="font-semibold text-[var(--text)] mb-2">{label && formatDate(label)}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-[var(--text-muted)]">{p.name}:</span>
                    <span className="font-medium text-[var(--text)]">{formatNPR(p.value)}</span>
                </div>
            ))}
        </div>
    );
}

export function PriceChart({ history, listings }: PriceChartProps) {
    const data = mergeHistory(history, listings);
    const vendorNames = [...new Set(listings.map(l => l.vendor.name))];

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-36 text-sm text-[var(--text-muted)]">
                No price history available for the selected period.
            </div>
        );
    }

    // Min price across all vendors for a reference line
    const allPrices = data.flatMap(d => vendorNames.map(v => (d as Record<string, number | string>)[v] as number).filter(Boolean));
    const minPrice = allPrices.length ? Math.min(...allPrices) : undefined;

    return (
        <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tickFormatter={v => `Rs.${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                />
                <Tooltip content={<CustomTooltip />} />
                {vendorNames.length > 1 && (
                    <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)' }}
                    />
                )}
                {minPrice !== undefined && (
                    <ReferenceLine
                        y={minPrice}
                        stroke="#10b981"
                        strokeDasharray="4 2"
                        label={{ value: 'Best', fill: '#10b981', fontSize: 10, position: 'insideLeft' }}
                    />
                )}
                {vendorNames.map((name, i) => (
                    <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
