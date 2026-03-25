import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { Cpu, Users, Store, LayoutDashboard, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAccessToken } from '@/store/authStore';

const API = 'http://127.0.0.1:8000';

interface AdminStats {
    parts_count: number;
    users_count: number;
    vendors_count: number;
    builds_count: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [scraping, setScraping] = useState(false);
    const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API}/api/admin/stats/`, {
            headers: { Authorization: `Bearer ${getAccessToken()}` },
        }).then(r => r.json()).then(setStats).catch(() => { });
    }, []);

    const pollStatus = useCallback(() => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${API}/api/admin/scraper/status/`, {
                    headers: { Authorization: `Bearer ${getAccessToken()}` },
                });
                const data = await res.json();
                if (!data.running) {
                    clearInterval(interval);
                    setScraping(false);
                    if (data.error) {
                        setScrapeMsg(`❌ Scrape failed: ${data.error}`);
                    } else {
                        const refreshed = data.totals?.refreshed ?? 0;
                        setScrapeMsg(`✅ Scrape complete — ${refreshed} listing(s) refreshed.`);
                    }
                    // Refresh stats
                    fetch(`${API}/api/admin/stats/`, {
                        headers: { Authorization: `Bearer ${getAccessToken()}` },
                    }).then(r => r.json()).then(setStats).catch(() => { });
                    setTimeout(() => setScrapeMsg(null), 8000);
                }
            } catch { /* ignore poll errors */ }
        }, 3000);
    }, []);

    const handleScrapeNow = async () => {
        setScraping(true);
        setScrapeMsg(null);
        try {
            const res = await fetch(`${API}/api/admin/scraper/run/`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${getAccessToken()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ dry_run: false }),
            });
            if (res.status === 409) {
                setScrapeMsg('⚠️ A scrape is already running.');
                setScraping(false);
                return;
            }
            setScrapeMsg('🔄 Scraping all vendor prices…');
            pollStatus();
        } catch {
            setScrapeMsg('❌ Could not start scrape.');
            setScraping(false);
        }
    };

    const n = (v: number | undefined) => v !== undefined ? String(v) : '…';

    return (
        <Layout>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                        <LayoutDashboard className="h-4 w-4" />
                        <span className="text-sm">Admin Panel</span>
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">Dashboard</h1>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <button
                        onClick={handleScrapeNow}
                        disabled={scraping}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className={`h-4 w-4 ${scraping ? 'animate-spin' : ''}`} />
                        {scraping ? 'Scraping…' : 'Scrape All Prices Now'}
                    </button>
                    {scrapeMsg && (
                        <span className="text-xs text-[var(--text-muted)] max-w-[280px] text-right">{scrapeMsg}</span>
                    )}
                </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Parts" value={n(stats?.parts_count)} icon={<Cpu className="h-4 w-4" />} color="brand" />
                <StatCard label="Total Users" value={n(stats?.users_count)} icon={<Users className="h-4 w-4" />} color="green" />
                <StatCard label="Vendors" value={n(stats?.vendors_count)} icon={<Store className="h-4 w-4" />} color="amber" />
                <StatCard label="Saved Builds" value={n(stats?.builds_count)} icon={<LayoutDashboard className="h-4 w-4" />} color="default" />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
                {[
                    { to: '/admin/parts', label: 'Manage Parts', desc: 'Add, edit, deactivate parts in the catalog' },
                    { to: '/admin/vendors', label: 'Manage Vendors', desc: 'Update vendor listings and pricing data' },
                    { to: '/admin/users', label: 'Manage Users', desc: 'View users, change roles, deactivate accounts' },
                ].map((action) => (
                    <Link key={action.to} to={action.to} className="group bg-[var(--surface)] border border-[var(--border)] hover:border-brand-400 rounded-xl p-4 transition-colors">
                        <p className="font-semibold text-[var(--text)] group-hover:text-brand-600 dark:group-hover:text-brand-400">{action.label}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{action.desc}</p>
                    </Link>
                ))}
            </div>
        </Layout>
    );
}
