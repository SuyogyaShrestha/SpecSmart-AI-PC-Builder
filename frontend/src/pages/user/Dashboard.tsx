import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Cpu, Zap, GitCompare, ChevronRight, Clock, ArrowRight,
    Monitor, MemoryStick, HardDrive, Box, Fan, BatteryCharging,
    Sparkles, Plus, Wrench
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { getCachedUser, getAccessToken } from '@/store/authStore';
import type { SavedBuild } from '@/types';

const API = 'http://127.0.0.1:8000';

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
    CPU: <Cpu className="h-3.5 w-3.5" />,
    GPU: <Monitor className="h-3.5 w-3.5" />,
    RAM: <MemoryStick className="h-3.5 w-3.5" />,
    SSD: <HardDrive className="h-3.5 w-3.5" />,
    PSU: <BatteryCharging className="h-3.5 w-3.5" />,
    CASE: <Box className="h-3.5 w-3.5" />,
    COOLER: <Fan className="h-3.5 w-3.5" />,
};

const USECASE_COLORS: Record<string, string> = {
    Gaming: 'from-violet-500 to-indigo-600',
    Productivity: 'from-emerald-500 to-teal-600',
    Streaming: 'from-rose-500 to-pink-600',
    'Video Editing': 'from-amber-500 to-orange-600',
    '3D Rendering': 'from-cyan-500 to-blue-600',
    'Office / Browsing': 'from-slate-400 to-slate-600',
    'Software Development': 'from-green-500 to-emerald-600',
    default: 'from-brand-500 to-brand-700',
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
    const user = getCachedUser();
    const navigate = useNavigate();
    const [builds, setBuilds] = useState<SavedBuild[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = getAccessToken();
        if (!token) { setLoading(false); return; }
        fetch(`${API}/api/builds/`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then((data: SavedBuild[]) => setBuilds(Array.isArray(data) ? data : []))
            .catch(() => setBuilds([]))
            .finally(() => setLoading(false));
    }, []);

    const recentBuilds = builds.slice(0, 3);
    const totalSpent = builds.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
    const avgPrice = builds.length > 0 ? Math.round(totalSpent / builds.length) : 0;
    const usecases = [...new Set(builds.map(b => b.usecase).filter(Boolean))];

    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    })();

    return (
        <Layout>
            {/* ── Header ── */}
            <div className="mb-8">
                <p className="text-sm text-[var(--text-muted)] mb-1">{greeting},</p>
                <h1 className="text-3xl font-bold text-[var(--text)]">
                    {user?.first_name || user?.username} 👋
                </h1>
            </div>

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="dash-stat-card">
                    <div className="dash-stat-icon dash-stat-icon--brand"><Cpu className="h-5 w-5" /></div>
                    <div>
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Saved Builds</p>
                        {loading ? <Spinner size="sm" /> : (
                            <p className="text-2xl font-bold text-[var(--text)] mt-0.5">{builds.length}</p>
                        )}
                    </div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-icon dash-stat-icon--emerald"><Zap className="h-5 w-5" /></div>
                    <div>
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Avg Build Cost</p>
                        <p className="text-2xl font-bold text-[var(--text)] mt-0.5">
                            {avgPrice > 0 ? `Rs.${avgPrice.toLocaleString()}` : '—'}
                        </p>
                    </div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-icon dash-stat-icon--amber"><Sparkles className="h-5 w-5" /></div>
                    <div>
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Use Cases</p>
                        <p className="text-2xl font-bold text-[var(--text)] mt-0.5">{usecases.length || '—'}</p>
                    </div>
                </div>
                <div className="dash-stat-card">
                    <div className="dash-stat-icon dash-stat-icon--rose"><GitCompare className="h-5 w-5" /></div>
                    <div>
                        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Total Invested</p>
                        <p className="text-2xl font-bold text-[var(--text)] mt-0.5">
                            {totalSpent > 0 ? `Rs.${totalSpent.toLocaleString()}` : '—'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* ── Left Column: Quick Actions + Recent Builds ── */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Quick Actions */}
                    <div>
                        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Quick Actions</h2>
                        <div className="grid sm:grid-cols-3 gap-4">
                            {/* Combined Builder Card */}
                            <button
                                onClick={() => navigate('/builder')}
                                className="dash-action-card dash-action-card--primary group"
                            >
                                <div className="dash-action-icon bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                                    <Wrench className="h-6 w-6" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-semibold text-[var(--text)] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                        PC Builder
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        Pick parts manually or let AI generate a build
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-brand-500 transition-all group-hover:translate-x-0.5" />
                            </button>

                            {/* Compare Card */}
                            <button
                                onClick={() => navigate('/compare')}
                                className="dash-action-card group"
                            >
                                <div className="dash-action-icon bg-gradient-to-br from-violet-500 to-purple-700 text-white">
                                    <GitCompare className="h-6 w-6" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-semibold text-[var(--text)] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                        Compare Builds
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        Side-by-side comparison of your saved builds
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-violet-500 transition-all group-hover:translate-x-0.5" />
                            </button>

                            {/* My Builds Card */}
                            <button
                                onClick={() => navigate('/my-builds')}
                                className="dash-action-card group"
                            >
                                <div className="dash-action-icon bg-gradient-to-br from-emerald-500 to-teal-700 text-white">
                                    <HardDrive className="h-6 w-6" />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-semibold text-[var(--text)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        Saved Builds
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        View and manage all your builds
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-emerald-500 transition-all group-hover:translate-x-0.5" />
                            </button>
                        </div>
                    </div>

                    {/* Recent Builds */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Recent Builds</h2>
                            {builds.length > 3 && (
                                <Link to="/my-builds" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                                    View all <ChevronRight className="h-3 w-3" />
                                </Link>
                            )}
                        </div>

                        {loading ? (
                            <div className="dash-panel flex items-center justify-center py-12">
                                <Spinner />
                            </div>
                        ) : recentBuilds.length === 0 ? (
                            <div className="dash-panel text-center py-12">
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--surface-2)] mb-4">
                                    <Plus className="h-6 w-6 text-[var(--text-muted)]" />
                                </div>
                                <p className="text-sm font-medium text-[var(--text)]">No builds yet</p>
                                <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Create your first PC build to see it here</p>
                                <Link to="/builder">
                                    <Button size="sm">Start Building</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {recentBuilds.map(build => {
                                    const gradient = USECASE_COLORS[build.usecase] || USECASE_COLORS.default;
                                    const partCount = build.build_data?.filter(r => r.part).length || 0;
                                    return (
                                        <Link
                                            key={build.id}
                                            to={`/my-builds/${build.id}`}
                                            className="dash-build-card group"
                                        >
                                            <div className={`dash-build-indicator bg-gradient-to-b ${gradient}`} />
                                            <div className="flex-1 min-w-0 py-3.5 pl-6 pr-4">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <h3 className="font-semibold text-sm text-[var(--text)] truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                        {build.name}
                                                    </h3>
                                                    <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 shrink-0 ml-3">
                                                        <Clock className="h-3 w-3" />
                                                        {timeAgo(build.updated_at)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-2)] font-medium">
                                                        {build.usecase || 'General'}
                                                    </span>
                                                    <span>{partCount} parts</span>
                                                    <span className="font-semibold text-[var(--text)]">
                                                        Rs.{Number(build.total_price).toLocaleString()}
                                                    </span>
                                                </div>
                                                {/* Part icons row */}
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    {build.build_data?.filter(r => r.part).slice(0, 6).map((row, i) => (
                                                        <div
                                                            key={i}
                                                            className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[var(--surface-2)] text-[var(--text-muted)]"
                                                            title={`${row.component}: ${row.part?.name}`}
                                                        >
                                                            {COMPONENT_ICONS[row.type] || <Cpu className="h-3 w-3" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-[var(--text-muted)] shrink-0 mr-3 group-hover:text-brand-500 transition-all group-hover:translate-x-0.5" />
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Column: Profile + Tips ── */}
                <div className="flex flex-col gap-6">
                    {/* Profile Card */}
                    <div className="dash-panel">
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/20">
                                {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                            </div>
                            <div>
                                <p className="font-semibold text-[var(--text)]">
                                    {user?.first_name} {user?.last_name}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[var(--surface-2)] rounded-xl p-3 text-center">
                                <p className="text-lg font-bold text-[var(--text)]">{builds.length}</p>
                                <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase">Builds</p>
                            </div>
                            <div className="bg-[var(--surface-2)] rounded-xl p-3 text-center">
                                <p className="text-lg font-bold text-[var(--text)]">{usecases.length}</p>
                                <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase">Categories</p>
                            </div>
                        </div>
                    </div>

                    {/* Explore Parts */}
                    <div className="dash-panel">
                        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Explore Parts</h3>
                        <div className="flex flex-col gap-1.5">
                            {[
                                { type: 'CPU', label: 'Processors', icon: <Cpu className="h-4 w-4" /> },
                                { type: 'GPU', label: 'Graphics Cards', icon: <Monitor className="h-4 w-4" /> },
                                { type: 'RAM', label: 'Memory', icon: <MemoryStick className="h-4 w-4" /> },
                                { type: 'SSD', label: 'Storage', icon: <HardDrive className="h-4 w-4" /> },
                            ].map(item => (
                                <Link
                                    key={item.type}
                                    to={`/pick/${item.type}`}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors group"
                                >
                                    <div className="text-[var(--text-muted)] group-hover:text-brand-500 transition-colors">{item.icon}</div>
                                    <span className="text-sm text-[var(--text)] flex-1">{item.label}</span>
                                    <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* AI Chat Prompt */}
                    <div className="dash-panel dash-panel--gradient">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4 text-brand-500" />
                            <h3 className="text-sm font-semibold text-[var(--text)]">Open AI Chat</h3>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                            Ask questions about your build compatibility, 
                            get upgrade recommendations, or compare setups instantly.
                        </p>
                        <Link to="/chat" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 mt-3 hover:underline">
                            Start Chatting <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
