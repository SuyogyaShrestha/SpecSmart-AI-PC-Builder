import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { getCachedUser } from '@/store/authStore';
import { 
    Cpu, Zap, ShieldCheck, TrendingUp, ArrowRight, 
    MessageSquare, GitCompare, CheckCircle2 
} from 'lucide-react';

const FEATURES = [
    {
        icon: <Zap className="h-5 w-5" />,
        title: 'AI Build Generator',
        desc: 'Our Gemini-powered engine picks the best parts for your budget and use-case.',
        color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/20',
        link: '/builder'
    },
    {
        icon: <MessageSquare className="h-5 w-5" />,
        title: 'Expert AI Review',
        desc: 'Get a detailed expert assessment of your build\'s strengths and potential bottlenecks.',
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    },
    {
        icon: <TrendingUp className="h-5 w-5" />,
        title: 'Nepal Vendor Pricing',
        desc: 'Live pricing from Hukut, BigByte, and PC Mod Nepal. Always find the best deal.',
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    },
    {
        icon: <GitCompare className="h-5 w-5" />,
        title: 'Advanced Comparison',
        desc: 'Compare saved builds side-by-side with AI-driven briefings on value and performance.',
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
        link: '/compare'
    },
    {
        icon: <ShieldCheck className="h-5 w-5" />,
        title: 'Smart Compatibility',
        desc: 'Deep validation of sockets, RAM types, and real-time wattage requirements.',
        color: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    },
    {
        icon: <MessageSquare className="h-5 w-5" />,
        title: 'AI Chat Assistant',
        desc: 'Have a conversation with our Gemini-powered expert about your specific PC building needs.',
        color: 'text-red-600 bg-red-50 dark:bg-red-900/20',
        link: '/chat'
    },
];

export default function HomePage() {
    const [user, setUser] = useState(getCachedUser);

    useEffect(() => {
        const handler = () => setUser(getCachedUser());
        window.addEventListener('specsmart:auth_updated', handler);
        return () => window.removeEventListener('specsmart:auth_updated', handler);
    }, []);

    return (
        <Layout>
            {/* ── Hero ── */}
            <section className="relative py-20 px-4 overflow-hidden border-b border-[var(--border)] mb-12">
                {/* Background Blobs */}
                <div className="absolute top-0 -left-10 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 -right-10 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl -z-10" />

                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-bold mb-6 uppercase tracking-wider">
                            <Cpu className="h-3.5 w-3.5" />
                            Next-Gen PC Building
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-black text-[var(--text)] leading-[1.1] tracking-tight mb-6">
                            The smartest way to <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400 dark:from-brand-500 dark:to-brand-300">build your PC</span>
                        </h1>
                        <p className="text-lg text-[var(--text-muted)] max-w-xl mb-10 leading-relaxed">
                            SpecSmart combines real-time Nepal vendor tracking with Gemini AI to generate, compare, and review your dream PC build. No guesswork. Just hardware at its best.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <Link to="/builder" className="w-full sm:w-auto">
                                <Button size="lg" className="h-14 px-8 text-base shadow-lg shadow-brand-500/20 w-full" rightIcon={<ArrowRight className="h-5 w-5" />}>
                                    Build Your PC
                                </Button>
                            </Link>
                            {!user && (
                                <Link to="/register" className="w-full sm:w-auto">
                                    <Button size="lg" variant="secondary" className="h-14 px-8 text-base border-2 w-full">
                                        Join the Community
                                    </Button>
                                </Link>
                            )}
                        </div>
                        <div className="mt-10 flex items-center gap-6 text-xs font-medium text-[var(--text-subtle)] uppercase tracking-widest">
                            <span className="flex items-center gap-2 text-green-500"><CheckCircle2 className="h-4 w-4" /> Live Prices</span>
                            <span className="flex items-center gap-2 text-green-500"><CheckCircle2 className="h-4 w-4" /> AI Verified</span>
                            <span className="flex items-center gap-2 text-green-500"><CheckCircle2 className="h-4 w-4" /> local Vendors</span>
                        </div>
                    </div>

                    {/* Visual Showcase - Theme-Inverted Builder Screenshots */}
                    <div className="relative group hidden lg:block">
                        <div className="relative aspect-[16/10] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden shadow-brand-500/10">
                            {/* Inverted Theme Logic: Light theme shows Dark screenshot */}
                            <img 
                                src="/images/builder_dark.png" 
                                alt="SpecSmart Builder Dark Mode" 
                                className="w-full h-full object-cover object-top block dark:hidden transition-opacity duration-500"
                            />
                            {/* Inverted Theme Logic: Dark theme shows Light screenshot */}
                            <img 
                                src="/images/builder_light.png" 
                                alt="SpecSmart Builder Light Mode" 
                                className="w-full h-full object-cover object-top hidden dark:block transition-opacity duration-500"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="mb-24 py-10 px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-black text-[var(--text)] mb-4 tracking-tight">Everything You Need to Succeed</h2>
                    <p className="text-[var(--text-muted)] max-w-2xl mx-auto">From real-time component tracking to expert AI assessments, SpecSmart provides the tools you need to build with confidence.</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((f) => {
                        const content = (
                            <div className={`group h-full bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-8 transition-all duration-300 hover:shadow-xl relative overflow-hidden flex flex-col ${f.link ? 'hover:border-brand-500 hover:-translate-y-2 cursor-pointer' : ''}`}>
                                <div className={`inline-flex p-3 w-fit rounded-2xl mb-6 shadow-inner ${f.color}`}>{f.icon}</div>
                                <h3 className="text-xl font-bold text-[var(--text)] mb-3 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{f.title}</h3>
                                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-6">{f.desc}</p>
                                
                                {f.link && (
                                    <div className="mt-auto flex items-center justify-end text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                )}
                            </div>
                        );

                        return f.link ? (
                            <Link key={f.title} to={f.link} className="no-underline">
                                {content}
                            </Link>
                        ) : (
                            <div key={f.title}>
                                {content}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="relative bg-brand-600 dark:bg-brand-950/80 border border-brand-500/50 rounded-[2.5rem] p-12 lg:p-20 text-center mb-12 overflow-hidden">
                <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
                
                <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight leading-tight">Master the market. <br/> Build with intelligence.</h2>
                <p className="text-brand-100 text-lg mb-10 max-w-xl mx-auto leading-relaxed opacity-90">
                    Get started with the world's first AI PC builder designed specifically for the Nepalese market.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link to="/builder">
                        <Button variant="secondary" size="lg" className="h-14 px-10 text-lg shadow-xl shadow-black/20 font-bold">
                            Open PC Builder
                        </Button>
                    </Link>
                </div>
            </section>
        </Layout>
    );
}
