import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cpu, HardDrive, PlusCircle, GitCompare } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { getCachedUser, getAccessToken } from '@/store/authStore';

const API = 'http://127.0.0.1:8000';

export default function DashboardPage() {
    const user = getCachedUser();
    const [buildCount, setBuildCount] = useState<number | null>(null);

    useEffect(() => {
        const token = getAccessToken();
        if (!token) return;
        fetch(`${API}/api/builds/`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then((data: unknown[]) => setBuildCount(Array.isArray(data) ? data.length : 0))
            .catch(() => setBuildCount(0));
    }, []);

    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--text)]">
                    Welcome back, {user?.first_name || user?.username} 👋
                </h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">Here's your SpecSmart overview</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        <Cpu className="h-4 w-4" />
                        <span className="text-sm font-medium">Saved Builds</span>
                    </div>
                    {buildCount === null ? (
                        <Spinner size="sm" />
                    ) : (
                        <p className="text-3xl font-bold text-[var(--text)]">{buildCount}</p>
                    )}
                    <Link to="/my-builds">
                        <Button variant="secondary" size="sm">View all builds</Button>
                    </Link>
                </Card>
                <Card className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        <HardDrive className="h-4 w-4" />
                        <span className="text-sm font-medium">Builder</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">Pick parts or let AI generate a build for you</p>
                    <Link to="/builder">
                        <Button variant="secondary" size="sm">Open Builder</Button>
                    </Link>
                </Card>
                <Card className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        <PlusCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">New AI Build</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">Start a fresh AI-powered PC build</p>
                    <Link to="/builder">
                        <Button size="sm">Start with AI</Button>
                    </Link>
                </Card>
                {buildCount !== null && buildCount >= 2 && (
                    <Card className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-[var(--text-muted)]">
                            <GitCompare className="h-4 w-4" />
                            <span className="text-sm font-medium">Compare Builds</span>
                        </div>
                        <p className="text-sm text-[var(--text-muted)]">Compare your saved builds side by side</p>
                        <Link to="/compare">
                            <Button variant="secondary" size="sm">Compare</Button>
                        </Link>
                    </Card>
                )}
            </div>
        </Layout>
    );
}
