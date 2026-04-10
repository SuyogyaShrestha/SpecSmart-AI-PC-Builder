import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import {
    Cpu, Users, Store, LayoutDashboard, Zap, ChevronRight,
    ArrowRight, Settings, Shield, Database, Activity,
    Package, UserCog, ShoppingBag, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAccessToken, getCachedUser } from '@/store/authStore';

const API = 'http://127.0.0.1:8000';

interface AdminStats {
    parts_count: number;
    users_count: number;
    vendors_count: number;
    builds_count: number;
}

export default function AdminDashboard() {
    const user = getCachedUser();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [retraining, setRetraining] = useState(false);
    const [retrainMsg, setRetrainMsg] = useState("");

    useEffect(() => {
        fetch(`${API}/api/admin/stats/`, {
            headers: { Authorization: `Bearer ${getAccessToken()}` },
        }).then(r => r.json()).then(setStats).catch(() => { });
    }, []);

    const handleRetrain = async () => {
        setRetraining(true);
        setRetrainMsg("");
        try {
            const res = await fetch(`${API}/api/admin/ml/retrain/`, {
                method: "POST",
                headers: { Authorization: `Bearer ${getAccessToken()}` }
            });
            const data = await res.json();
            setRetrainMsg(data.detail || "Started");
        } catch {
            setRetrainMsg("Failed to start.");
        }
        setRetraining(false);
    };

    return (
        <Layout>
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs font-semibold">
                            <Shield className="h-3 w-3" />
                            Admin Panel
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text)]">
                        Dashboard
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Welcome back, {user?.first_name || user?.username}. Here's your system overview.
                    </p>
                </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                    {
                        label: 'Total Parts', value: stats?.parts_count,
                        icon: <Package className="h-5 w-5" />,
                        color: 'dash-stat-icon--brand', gradient: 'from-brand-500/10 to-brand-500/5'
                    },
                    {
                        label: 'Registered Users', value: stats?.users_count,
                        icon: <Users className="h-5 w-5" />,
                        color: 'dash-stat-icon--emerald', gradient: 'from-emerald-500/10 to-emerald-500/5'
                    },
                    {
                        label: 'Active Vendors', value: stats?.vendors_count,
                        icon: <ShoppingBag className="h-5 w-5" />,
                        color: 'dash-stat-icon--amber', gradient: 'from-amber-500/10 to-amber-500/5'
                    },
                    {
                        label: 'Saved Builds', value: stats?.builds_count,
                        icon: <Activity className="h-5 w-5" />,
                        color: 'dash-stat-icon--rose', gradient: 'from-rose-500/10 to-rose-500/5'
                    },
                ].map((stat) => (
                    <div key={stat.label} className={`dash-stat-card bg-gradient-to-br ${stat.gradient}`}>
                        <div className={`dash-stat-icon ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{stat.label}</p>
                            <p className="text-2xl font-bold text-[var(--text)] mt-0.5">
                                {stat.value !== undefined ? stat.value : '…'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* ── Left: Management Cards ── */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div>
                        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Management</h2>
                        <div className="grid sm:grid-cols-3 gap-4">
                            {[
                                {
                                    to: '/admin/parts', label: 'Parts',
                                    desc: 'Add, edit & manage catalog',
                                    icon: <Cpu className="h-6 w-6" />,
                                    gradient: 'from-brand-500 to-indigo-600',
                                    count: stats?.parts_count,
                                },
                                {
                                    to: '/admin/vendors', label: 'Vendors',
                                    desc: 'Listings & pricing data',
                                    icon: <Store className="h-6 w-6" />,
                                    gradient: 'from-amber-500 to-orange-600',
                                    count: stats?.vendors_count,
                                },
                                {
                                    to: '/admin/users', label: 'Users',
                                    desc: 'Roles & accounts',
                                    icon: <UserCog className="h-6 w-6" />,
                                    gradient: 'from-emerald-500 to-teal-600',
                                    count: stats?.users_count,
                                },
                            ].map(action => (
                                <Link
                                    key={action.to}
                                    to={action.to}
                                    className="admin-mgmt-card group"
                                >
                                    <div className={`admin-mgmt-icon bg-gradient-to-br ${action.gradient} text-white`}>
                                        {action.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-[var(--text)] group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                {action.label}
                                            </p>
                                            {action.count !== undefined && (
                                                <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                                                    {action.count}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{action.desc}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* ML Retrain Section */}
                    <div>
                        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">System Actions</h2>
                        <div className="dash-panel">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="dash-action-icon bg-gradient-to-br from-violet-500 to-purple-700 text-white shrink-0">
                                        <Database className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
                                            ML Pipeline Retrain
                                        </h3>
                                        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md leading-relaxed">
                                            Re-compute Scikit-Learn models after adding new CPUs/GPUs.
                                            This runs in the background and typically takes 2-5 minutes.
                                        </p>
                                    </div>
                                </div>
                                <div className="shrink-0 flex flex-col items-end gap-1.5">
                                    <Button
                                        onClick={handleRetrain}
                                        loading={retraining}
                                        variant="secondary"
                                        disabled={retraining}
                                        size="sm"
                                    >
                                        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${retraining ? 'animate-spin' : ''}`} />
                                        {retraining ? "Running..." : "Retrain Now"}
                                    </Button>
                                    {retrainMsg && (
                                        <p className="text-[11px] text-brand-600 dark:text-brand-400 font-medium max-w-[200px] text-right">
                                            {retrainMsg}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Right Column: Quick Links ── */}
                <div className="flex flex-col gap-6">
                    {/* Quick Navigation */}
                    <div className="dash-panel">
                        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Quick Navigation</h3>
                        <div className="flex flex-col gap-1">
                            {[
                                { to: '/admin/parts', label: 'Add New Part', icon: <Package className="h-4 w-4" />, desc: 'Create a new component' },
                                { to: '/builder', label: 'PC Builder', icon: <Settings className="h-4 w-4" />, desc: 'Test AI builder' },
                                { to: '/parts', label: 'Browse Catalog', icon: <LayoutDashboard className="h-4 w-4" />, desc: 'Public parts view' },
                                { to: '/ai-chat', label: 'AI Chat', icon: <Zap className="h-4 w-4" />, desc: 'Test AI assistant' },
                            ].map(link => (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--surface-2)] transition-colors group"
                                >
                                    <div className="text-[var(--text-muted)] group-hover:text-brand-500 transition-colors">{link.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--text)]">{link.label}</p>
                                        <p className="text-[11px] text-[var(--text-muted)]">{link.desc}</p>
                                    </div>
                                    <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* System Info */}
                    <div className="dash-panel dash-panel--gradient">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-4 w-4 text-brand-500" />
                            <h3 className="text-sm font-semibold text-[var(--text)]">System Info</h3>
                        </div>
                        <div className="flex flex-col gap-2">
                            {[
                                { label: 'Backend', value: 'Django REST Framework' },
                                { label: 'ML Engine', value: 'Scikit-Learn + Gemini' },
                                { label: 'Database', value: 'PostgreSQL' },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between text-xs">
                                    <span className="text-[var(--text-muted)]">{item.label}</span>
                                    <span className="font-medium text-[var(--text)]">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
