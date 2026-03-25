import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Cpu, MonitorDot, CircuitBoard, MemoryStick, HardDrive, Plug, Fan, Box } from 'lucide-react';

const CATEGORIES = [
    { type: 'CPU', label: 'Processors', desc: 'CPUs from AMD & Intel', icon: Cpu, color: 'text-blue-500' },
    { type: 'GPU', label: 'Graphics Cards', desc: 'NVIDIA & AMD GPUs', icon: MonitorDot, color: 'text-green-500' },
    { type: 'MOBO', label: 'Motherboards', desc: 'ATX, mATX, ITX boards', icon: CircuitBoard, color: 'text-purple-500' },
    { type: 'RAM', label: 'Memory', desc: 'DDR4 & DDR5 RAM kits', icon: MemoryStick, color: 'text-amber-500' },
    { type: 'SSD', label: 'Storage', desc: 'NVMe & SATA SSDs', icon: HardDrive, color: 'text-red-500' },
    { type: 'PSU', label: 'Power Supplies', desc: 'Modular & semi-modular PSUs', icon: Plug, color: 'text-yellow-500' },
    { type: 'COOLER', label: 'CPU Coolers', desc: 'Air & AIO liquid coolers', icon: Fan, color: 'text-cyan-500' },
    { type: 'CASE', label: 'Cases', desc: 'Tower, mid-tower & ITX cases', icon: Box, color: 'text-pink-500' },
];

export default function PartsIndexPage() {
    return (
        <Layout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-[var(--text)]">Browse Parts</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">Choose a category to explore available components</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                        <Link
                            key={cat.type}
                            to={`/pick/${cat.type}`}
                            className="group bg-[var(--surface)] border border-[var(--border)] hover:border-brand-400 rounded-xl p-5 transition-all hover:shadow-lg hover:-translate-y-0.5"
                        >
                            <div className={`${cat.color} mb-3`}>
                                <Icon className="h-8 w-8" />
                            </div>
                            <p className="font-semibold text-[var(--text)] group-hover:text-brand-600 dark:group-hover:text-brand-400">
                                {cat.label}
                            </p>
                            <p className="text-sm text-[var(--text-muted)] mt-1">{cat.desc}</p>
                        </Link>
                    );
                })}
            </div>
        </Layout>
    );
}
