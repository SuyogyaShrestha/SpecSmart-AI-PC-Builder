import { useEffect, useState } from 'react';
import { Store, Globe, ToggleLeft, ToggleRight } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { getAccessToken } from '@/store/authStore';
import type { Vendor } from '@/types';

const API = 'http://127.0.0.1:8000';

function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` };
}

export default function AdminVendorsPage() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [toggling, setToggling] = useState<number | null>(null);

    useEffect(() => {
        fetch(`${API}/api/admin/vendors/`, { headers: authHeaders() })
            .then(r => r.json())
            .then(setVendors)
            .catch(() => setError('Could not load vendors.'))
            .finally(() => setLoading(false));
    }, []);

    async function toggleActive(v: Vendor) {
        setToggling(v.id);
        try {
            const res = await fetch(`${API}/api/admin/vendors/${v.id}/`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify({ is_active: !v.is_active }),
            });
            const updated: Vendor = await res.json();
            setVendors(prev => prev.map(x => x.id === v.id ? updated : x));
        } catch { setError('Could not update vendor.'); }
        finally { setToggling(null); }
    }

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--text)]">Manage Vendors</h1>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">{vendors.length} vendors configured</p>
            </div>

            {error && <Alert variant="error" className="mb-4" dismissible>{error}</Alert>}

            {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendors.map(v => (
                        <Card key={v.id} className="flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center">
                                        <Store className="h-4 w-4 text-[var(--text-muted)]" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[var(--text)]">{v.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{v.vendor_slug}</p>
                                    </div>
                                </div>
                                <Badge variant={v.is_active ? 'success' : 'default'} size="sm">
                                    {v.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>

                            {v.base_url && (
                                <a href={v.base_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline truncate">
                                    <Globe className="h-3 w-3 shrink-0" />
                                    {v.base_url}
                                </a>
                            )}

                            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                                <span>{v.region} · {v.currency}</span>
                                <button
                                    onClick={() => toggleActive(v)}
                                    disabled={toggling === v.id}
                                    className="flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors disabled:opacity-50"
                                >
                                    {toggling === v.id ? (
                                        <Spinner size="sm" />
                                    ) : v.is_active ? (
                                        <><ToggleRight className="h-4 w-4 text-green-500" /> Deactivate</>
                                    ) : (
                                        <><ToggleLeft className="h-4 w-4" /> Activate</>
                                    )}
                                </button>
                            </div>
                        </Card>
                    ))}
                    {vendors.length === 0 && (
                        <div className="col-span-full text-center py-12 text-[var(--text-muted)]">
                            No vendors configured.
                        </div>
                    )}
                </div>
            )}
        </Layout>
    );
}
