import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Cpu, Users, Store, LayoutDashboard, Zap } from 'lucide-react';
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
        } catch(e) {
            setRetrainMsg("Failed to start.");
        }
        setRetraining(false);
    };

    const n = (v: number | undefined) => v !== undefined ? String(v) : '…';

    return (
        <Layout>
            <div className="mb-6">
                <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="text-sm">Admin Panel</span>
                </div>
                <h1 className="text-2xl font-bold text-[var(--text)]">Dashboard</h1>
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

            <div className="mt-8 border-t border-[var(--border)] pt-8">
                <h2 className="text-xl font-bold text-[var(--text)] mb-4">System Actions</h2>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-[var(--text)] flex items-center gap-2">
                            <Zap className="h-4 w-4 text-brand-500" />
                            Force ML Pipeline Retrain
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1 max-w-lg">
                            If you've recently added several CPUs/GPUs to the catalog, trigger a background sequence to computationally test compatible pipelines and update the predictive Scikit-Learn logic.
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <Button 
                            onClick={handleRetrain} 
                            loading={retraining} 
                            variant="secondary"
                            disabled={retraining}
                        >
                            {retraining ? "Initializing..." : "Retrain Machine Learning"}
                        </Button>
                        {retrainMsg && <p className="text-xs text-brand-600 dark:text-brand-400 mt-2 font-medium">{retrainMsg}</p>}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
