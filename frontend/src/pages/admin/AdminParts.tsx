import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge, PART_TYPE_VARIANT } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { getAccessToken } from '@/store/authStore';
import type { Part, PartType } from '@/types';

const API = 'http://127.0.0.1:8000';

const PART_TYPES: { value: string; label: string }[] = [
    { value: '', label: 'All types' },
    { value: 'CPU', label: 'CPU' }, { value: 'GPU', label: 'GPU' },
    { value: 'MOBO', label: 'Motherboard' }, { value: 'RAM', label: 'RAM' },
    { value: 'SSD', label: 'SSD' }, { value: 'PSU', label: 'PSU' },
    { value: 'CASE', label: 'Case' }, { value: 'COOLER', label: 'CPU Cooler' },
];

type FieldDef = { key: string; label: string; type: 'text' | 'number' | 'boolean' | 'select'; options?: string[] };
const SPEC_EDIT_FIELDS: Record<string, FieldDef[]> = {
    CPU: [
        { key: 'socket', label: 'Socket', type: 'text' },
        { key: 'cores', label: 'Cores', type: 'number' },
        { key: 'threads', label: 'Threads', type: 'number' },
        { key: 'base_clock_mhz', label: 'Base Clock (MHz)', type: 'number' },
        { key: 'boost_clock_mhz', label: 'Boost Clock (MHz)', type: 'number' },
        { key: 'tdp', label: 'TDP (W)', type: 'number' },
        { key: 'l3_cache_mb', label: 'L3 Cache (MB)', type: 'number' },
        { key: 'architecture', label: 'Architecture', type: 'text' },
        { key: 'includes_cooler', label: 'Includes Cooler', type: 'boolean' },
        { key: 'has_igpu', label: 'Has iGPU', type: 'boolean' },
    ],
    GPU: [
        { key: 'vram_gb', label: 'VRAM (GB)', type: 'number' },
        { key: 'memory_type', label: 'Memory Type', type: 'text' },
        { key: 'tdp', label: 'TDP (W)', type: 'number' },
        { key: 'boost_clock_mhz', label: 'Boost Clock (MHz)', type: 'number' },
        { key: 'bus_width', label: 'Bus Width (bit)', type: 'number' },
        { key: 'length_mm', label: 'Length (mm)', type: 'number' },
        { key: 'pcie_gen', label: 'PCIe Generation', type: 'text' },
        { key: 'recommended_psu', label: 'Recommended PSU (W)', type: 'number' },
        { key: 'color', label: 'Color', type: 'text' },
        { key: 'fans', label: 'Fans', type: 'number' },
        { key: 'slots', label: 'Slots', type: 'number' },
    ],
    MOBO: [
        { key: 'socket', label: 'Socket', type: 'text' },
        { key: 'chipset', label: 'Chipset', type: 'text' },
        { key: 'ram_type', label: 'RAM Type', type: 'select', options: ['DDR4', 'DDR5'] },
        { key: 'form_factor', label: 'Form Factor', type: 'select', options: ['ATX', 'mATX', 'ITX', 'E-ATX'] },
        { key: 'max_ram_gb', label: 'Max RAM (GB)', type: 'number' },
        { key: 'ram_slots', label: 'RAM Slots', type: 'number' },
        { key: 'm2_slots', label: 'M.2 Slots', type: 'number' },
        { key: 'wifi', label: 'WiFi', type: 'boolean' },
        { key: 'bluetooth', label: 'Bluetooth', type: 'boolean' },
        { key: 'color', label: 'Color', type: 'text' },
    ],
    RAM: [
        { key: 'ram_type', label: 'RAM Type', type: 'select', options: ['DDR4', 'DDR5'] },
        { key: 'capacity_gb', label: 'Total Capacity (GB)', type: 'number' },
        { key: 'speed_mhz', label: 'Speed (MHz)', type: 'number' },
        { key: 'cas_latency', label: 'CAS Latency (CL)', type: 'number' },
        { key: 'sticks', label: 'Sticks (Modules)', type: 'number' },
        { key: 'voltage', label: 'Voltage (V)', type: 'number' },
        { key: 'ecc', label: 'ECC', type: 'boolean' },
        { key: 'rgb', label: 'RGB', type: 'boolean' },
        { key: 'color', label: 'Color', type: 'text' },
        { key: 'height_mm', label: 'Height (mm)', type: 'number' },
    ],
    SSD: [
        { key: 'capacity_gb', label: 'Capacity (GB)', type: 'number' },
        { key: 'interface', label: 'Interface', type: 'select', options: ['NVMe Gen5', 'NVMe Gen4', 'NVMe Gen3', 'SATA'] },
        { key: 'form_factor', label: 'Form Factor', type: 'select', options: ['M.2 2280', '2.5"'] },
        { key: 'read_speed_mbps', label: 'Read Speed (MB/s)', type: 'number' },
        { key: 'write_speed_mbps', label: 'Write Speed (MB/s)', type: 'number' },
        { key: 'has_dram', label: 'Has DRAM', type: 'boolean' },
        { key: 'tbw', label: 'TBW Endurance', type: 'number' },
    ],
    PSU: [
        { key: 'wattage', label: 'Wattage (W)', type: 'number' },
        { key: 'efficiency_rating', label: 'Efficiency', type: 'select', options: ['80+ Titanium', '80+ Platinum', '80+ Gold', '80+ Silver', '80+ Bronze', '80+'] },
        { key: 'modular', label: 'Modular', type: 'select', options: ['Fully-Modular', 'Semi-Modular', 'Non-Modular'] },
        { key: 'psu_tier', label: 'Tier (A/B/C/D)', type: 'select', options: ['A', 'B', 'C', 'D', 'E', 'F'] },
        { key: 'form_factor', label: 'Form Factor', type: 'text' },
        { key: 'atx_version', label: 'ATX Version', type: 'text' },
        { key: 'pcie_gen5_connector', label: '12VHPWR', type: 'boolean' },
        { key: 'color', label: 'Color', type: 'text' },
    ],
    CASE: [
        { key: 'form_factor', label: 'Form Factor', type: 'text' },
        { key: 'gpu_max_mm', label: 'Max GPU (mm)', type: 'number' },
        { key: 'cooler_max_mm', label: 'Max Cooler (mm)', type: 'number' },
        { key: 'mobo_support', label: 'Mobo Support', type: 'text' },
        { key: 'included_fans', label: 'Included Fans', type: 'number' },
        { key: 'max_fans', label: 'Max Fans', type: 'number' },
        { key: 'radiator_support', label: 'Radiator Support', type: 'text' },
        { key: 'side_panel', label: 'Side Panel', type: 'text' },
        { key: 'color', label: 'Color', type: 'text' },
    ],
    COOLER: [
        { key: 'cooler_type', label: 'Type', type: 'select', options: ['Air', 'AIO', 'Custom'] },
        { key: 'tdp_support', label: 'TDP Support (W)', type: 'number' },
        { key: 'height_mm', label: 'Height (mm)', type: 'number' },
        { key: 'fan_size_mm', label: 'Fan Size (mm)', type: 'number' },
        { key: 'fans', label: 'Fan Count', type: 'number' },
        { key: 'socket_support', label: 'Sockets', type: 'text' },
        { key: 'noise_dba', label: 'Noise (dBA)', type: 'number' },
        { key: 'rgb', label: 'RGB', type: 'boolean' },
        { key: 'color', label: 'Color', type: 'text' },
    ],
};

const EMPTY_FORM = { name: '', brand: '', type: 'CPU' as PartType, price: '', image_url: '', specs: '{}', is_active: true };

function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` };
}

export default function AdminPartsPage() {
    const [parts, setParts] = useState<Part[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [sortField, setSortField] = useState<'name' | 'price' | 'type'>('name');
    const [sortAsc, setSortAsc] = useState(true);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Part | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM, vendor_urls: { hukut: '', bigbyte: '', pcmodnepal: '' } as Record<string, string> });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    // Delete confirm
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    async function fetchParts() {
        setLoading(true);
        try {
            const url = typeFilter ? `${API}/api/admin/parts/?type=${typeFilter}` : `${API}/api/admin/parts/`;
            const res = await fetch(url, { headers: authHeaders() });
            if (!res.ok) throw new Error('Failed');
            setParts(await res.json());
        } catch { setError('Could not load parts.'); }
        finally { setLoading(false); }
    }

    useEffect(() => { fetchParts(); }, [typeFilter]);

    function openAdd() {
        setEditing(null);
        setForm({ ...EMPTY_FORM, vendor_urls: { hukut: '', bigbyte: '', pcmodnepal: '' } });
        setFormError('');
        setModalOpen(true);
    }

    function openEdit(p: Part) {
        setEditing(p);
        const vendors = p.vendor_urls || {};
        setForm({ 
            name: p.name, brand: p.brand, type: p.type, price: String(p.price), 
            image_url: p.image_url || ((p.specs?.image_url as string) || ''), 
            specs: JSON.stringify(p.specs, null, 2), 
            is_active: p.is_active ?? true,
            vendor_urls: { hukut: vendors.hukut || '', bigbyte: vendors.bigbyte || '', pcmodnepal: vendors.pcmodnepal || '' }
        });
        setFormError('');
        setModalOpen(true);
    }

    async function handleSave() {
        setSaving(true);
        setFormError('');
        let specsObj: Record<string, unknown> = {};
        try { specsObj = JSON.parse(form.specs || '{}'); } catch { setFormError('Specs must be valid JSON.'); setSaving(false); return; }

        const payload = { ...form, price: Number(form.price), specs: specsObj };
        try {
            const url = editing ? `${API}/api/admin/parts/${editing.id}/` : `${API}/api/admin/parts/`;
            const method = editing ? 'PATCH' : 'POST';
            const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) { setFormError(data?.detail || JSON.stringify(data)); return; }
            setParts(prev => editing ? prev.map(p => p.id === editing.id ? data : p) : [data, ...prev]);
            setModalOpen(false);
        } catch { setFormError('Could not save part.'); }
        finally { setSaving(false); }
    }

    async function handleDelete(id: number) {
        setDeleting(true);
        try {
            await fetch(`${API}/api/admin/parts/${id}/`, { method: 'DELETE', headers: authHeaders() });
            setParts(prev => prev.filter(p => p.id !== id));
            setDeleteId(null);
        } catch { setError('Could not delete part.'); }
        finally { setDeleting(false); }
    }

    function toggleSort(field: typeof sortField) {
        if (sortField === field) setSortAsc(a => !a);
        else { setSortField(field); setSortAsc(true); }
    }

    const SortIcon = ({ field }: { field: typeof sortField }) =>
        sortField === field ? (sortAsc ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />) : null;

    const filtered = parts
        .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
            const v = sortField === 'price' ? Number(a.price) - Number(b.price) : String(a[sortField]).localeCompare(String(b[sortField]));
            return sortAsc ? v : -v;
        });

    return (
        <Layout>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">Manage Parts</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">{parts.length} parts in catalog</p>
                </div>
                <Button onClick={openAdd} leftIcon={<Plus className="h-4 w-4" />}>Add Part</Button>
            </div>

            {error && <Alert variant="error" className="mb-4" dismissible>{error}</Alert>}

            {/* Filters */}
            <Card padding="sm" className="mb-4">
                <div className="flex flex-wrap gap-3">
                    <Input id="parts-search" placeholder="Search by name or brand…" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} leftAddon={<Search className="h-4 w-4" />} wrapperClassName="flex-1 min-w-48" />
                    <Select options={PART_TYPES} value={typeFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)} wrapperClassName="w-44" />
                </div>
            </Card>

            {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : (
                <Card padding="none">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)] cursor-pointer select-none" onClick={() => toggleSort('type')}>Type <SortIcon field="type" /></th>
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)] cursor-pointer select-none" onClick={() => toggleSort('name')}>Name <SortIcon field="name" /></th>
                                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Brand</th>
                                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-muted)] cursor-pointer select-none" onClick={() => toggleSort('price')}>Price <SortIcon field="price" /></th>
                                <th className="text-center px-4 py-2.5 font-medium text-[var(--text-muted)]">Status</th>
                                <th className="w-20 px-4 py-2.5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {filtered.map(p => (
                                <tr key={p.id} className="hover:bg-[var(--surface-2)] transition-colors group">
                                    <td className="px-4 py-2.5"><Badge variant={PART_TYPE_VARIANT[p.type] ?? 'default'} size="sm">{p.type}</Badge></td>
                                    <td className="px-4 py-2.5 font-medium text-[var(--text)]">{p.name}</td>
                                    <td className="px-4 py-2.5 text-[var(--text-muted)]">{p.brand || '—'}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text)]">Rs. {Number(p.price).toLocaleString('en-NP')}</td>
                                    <td className="px-4 py-2.5 text-center">
                                        <Badge variant={p.is_active ? 'success' : 'default'} size="sm">{p.is_active ? 'Active' : 'Inactive'}</Badge>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                            <button title="Edit Part" onClick={() => openEdit(p)} className="p-1.5 text-[var(--text-muted)] hover:text-brand-600 dark:hover:text-brand-400 rounded"><Pencil className="h-4 w-4" /></button>
                                            <button title="Delete Part" onClick={() => setDeleteId(p.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500 rounded"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-[var(--text-muted)]">No parts found</td></tr>}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* Add / Edit Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Part' : 'Add Part'} size="lg"
                footer={<div className="flex gap-2 justify-end"><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button loading={saving} onClick={handleSave}>{editing ? 'Save Changes' : 'Add Part'}</Button></div>}
            >
                <div className="space-y-3">
                    {formError && <Alert variant="error">{formError}</Alert>}
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Name" id="part-name" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, name: e.target.value }))} wrapperClassName="col-span-2" />
                        <Input label="Brand" id="part-brand" value={form.brand} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, brand: e.target.value }))} />
                        <Input label="Price (NPR)" id="part-price" type="number" value={form.price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, price: e.target.value }))} />
                        <Select label="Type" options={PART_TYPES.slice(1)} value={form.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, type: e.target.value as PartType }))} />
                        <Input label="Image URL" id="part-image" value={form.image_url || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
                        <div className="flex items-center gap-2 pt-5">
                            <input type="checkbox" id="part-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
                            <label htmlFor="part-active" className="text-sm text-[var(--text)]">Active</label>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border)] mt-4">
                        <label className="block text-sm font-semibold text-[var(--text)] mb-3">Targeted Scraper Links (Vendor URLs)</label>
                        <div className="grid grid-cols-1 gap-3 mb-2">
                            <Input label="Hukut URL" id="vendor-hukut" placeholder="https://hukut.com/..." value={form.vendor_urls?.hukut || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, vendor_urls: { ...f.vendor_urls, hukut: e.target.value } }))} />
                            <Input label="BigByte URL" id="vendor-bigbyte" placeholder="https://bigbyte.com.np/..." value={form.vendor_urls?.bigbyte || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, vendor_urls: { ...f.vendor_urls, bigbyte: e.target.value } }))} />
                            <Input label="PCMOD Nepal URL" id="vendor-pcmod" placeholder="https://pcmodnepal.com/..." value={form.vendor_urls?.pcmodnepal || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, vendor_urls: { ...f.vendor_urls, pcmodnepal: e.target.value } }))} />
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">Adding a URL will automatically fetch the exact price and High-Res image on Save.</p>
                    </div>
                    
                    <div className="pt-3 border-t border-[var(--border)] mt-4">
                        <label className="block text-sm font-semibold text-[var(--text)] mb-3">{form.type} Specifications</label>
                        {(() => {
                            const fields = SPEC_EDIT_FIELDS[form.type];
                            if (!fields) return <p className="text-sm text-[var(--text-muted)]">No specific fields for {form.type}.</p>;
                            
                            let parsed: Record<string, any> = {};
                            try { parsed = JSON.parse(form.specs || '{}'); } catch {}

                            const updateSpec = (k: string, v: any) => {
                                const next = { ...parsed, [k]: v };
                                if (v === '' || v === null || v === undefined) delete next[k]; // clean up empty
                                setForm(f => ({ ...f, specs: JSON.stringify(next) }));
                            };

                            return (
                                <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                                    {fields.map(f => (
                                        <div key={f.key}>
                                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">{f.label}</label>
                                            {f.type === 'boolean' ? (
                                                <select value={parsed[f.key] === true ? 'true' : parsed[f.key] === false ? 'false' : ''} onChange={e => updateSpec(f.key, e.target.value === 'true' ? true : e.target.value === 'false' ? false : '')} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-[var(--text)]">
                                                    <option value="">--</option>
                                                    <option value="true">Yes</option>
                                                    <option value="false">No</option>
                                                </select>
                                            ) : f.type === 'select' ? (
                                                <select value={parsed[f.key] || ''} onChange={e => updateSpec(f.key, e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-[var(--text)]">
                                                    <option value="">--</option>
                                                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            ) : (
                                                <input type={f.type} value={parsed[f.key] ?? ''} onChange={e => updateSpec(f.key, f.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-[var(--text)]" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm */}
            <Modal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Part"
                footer={<div className="flex gap-2 justify-end"><Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button><Button className="bg-red-600 hover:bg-red-700" loading={deleting} onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button></div>}
            >
                <p className="text-sm text-[var(--text-muted)]">This will permanently delete the part and all associated data from the database. (If you just want to hide it, cancel and uncheck "Active" instead).</p>
            </Modal>
        </Layout>
    );
}
