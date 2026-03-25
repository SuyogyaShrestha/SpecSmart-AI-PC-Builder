import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Cpu, Zap, ShieldCheck, TrendingUp, ArrowRight } from 'lucide-react';

const FEATURES = [
    {
        icon: <Zap className="h-5 w-5" />,
        title: 'AI Build Generator',
        desc: 'Enter your budget and use-case. Our AI picks the best CPU, GPU, RAM, and more — perfectly balanced.',
        color: 'text-brand-500 bg-brand-50 dark:bg-brand-900/20',
    },
    {
        icon: <ShieldCheck className="h-5 w-5" />,
        title: 'Compatibility Checks',
        desc: 'Real-time socket, RAM type, and PSU wattage validation. No more incompatible parts.',
        color: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    },
    {
        icon: <TrendingUp className="h-5 w-5" />,
        title: 'Nepal Vendor Pricing',
        desc: 'Live prices from Hukut, BigByte, and PC Mod Nepal. Always know the best local deal.',
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    },
];

export default function HomePage() {
    return (
        <Layout>
            {/* ── Hero ── */}
            <section className="py-16 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-medium mb-6">
                    <Cpu className="h-3.5 w-3.5" />
                    AI-powered PC building for Nepal
                </div>

                <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--text)] leading-tight tracking-tight max-w-2xl mx-auto">
                    Build your perfect PC,{' '}
                    <span className="text-brand-600 dark:text-brand-400">powered by AI</span>
                </h1>

                <p className="mt-5 text-base text-[var(--text-muted)] max-w-xl mx-auto">
                    SpecSmart lets you manually pick parts or let AI generate a full build from your budget.
                    Real Nepal vendor prices, real compatibility checks, real performance scores.
                </p>

                <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
                    <Link to="/builder">
                        <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                            Start Building
                        </Button>
                    </Link>
                    <Link to="/register">
                        <Button size="lg" variant="secondary">
                            Create free account
                        </Button>
                    </Link>
                </div>
            </section>

            {/* ── Stats strip ── */}
            <section className="border-y border-[var(--border)] py-6 grid grid-cols-3 gap-4 text-center mb-12">
                {[
                    { val: '80+', label: 'Parts in catalog' },
                    { val: '3', label: 'Nepal vendors' },
                    { val: 'AI', label: 'Build generation' },
                ].map((s) => (
                    <div key={s.label}>
                        <p className="text-2xl font-bold text-[var(--text)]">{s.val}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.label}</p>
                    </div>
                ))}
            </section>

            {/* ── Features ── */}
            <section className="mb-16">
                <h2 className="text-xl font-bold text-[var(--text)] mb-6 text-center">Everything you need</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                    {FEATURES.map((f) => (
                        <div key={f.title} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
                            <div className={`inline-flex p-2 rounded-lg mb-3 ${f.color}`}>{f.icon}</div>
                            <h3 className="font-semibold text-[var(--text)] mb-1.5">{f.title}</h3>
                            <p className="text-sm text-[var(--text-muted)]">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="bg-brand-600 dark:bg-brand-900/60 border border-brand-500 rounded-2xl p-10 text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Ready to build?</h2>
                <p className="text-brand-200 text-sm mb-6">
                    Set your budget, tell the AI your use-case, and get a full build in seconds.
                </p>
                <Link to="/builder">
                    <Button variant="secondary" size="lg">
                        Open PC Builder →
                    </Button>
                </Link>
            </section>
        </Layout>
    );
}
