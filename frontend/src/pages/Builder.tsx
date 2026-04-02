import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, RefreshCw, ChevronRight, TriangleAlert, X, TrendingUp, BookmarkPlus, CheckCircle, XCircle, ArrowUpRight, AlertTriangle, Pencil, Bot } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, PART_TYPE_VARIANT } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
    loadBuildState, saveBuildState, subscribeBuildStore,
    removePartFromBuild, setCustomPrice, DEFAULT_ROWS, type BuildState,
} from '@/store/buildStore';
import { Modal } from '@/components/ui/Modal';
import { getCachedUser, getAccessToken } from '@/store/authStore';
import type { BuildRow, Part } from '@/types';

const API = 'http://127.0.0.1:8000';
const BUDGET_MIN = 50000;

// IMPORTANT: usecase values must match backend exactly.
// Most backends use "AI/ML" rather than "AI-ML".
const USECASE_OPTIONS = [
    { value: 'Gaming', label: '🎮 Gaming' },
    { value: 'Editing', label: '🎬 Video Editing' },
    { value: 'AI/ML', label: '🤖 AI / ML' },
    { value: 'General Use', label: '💻 General Use' },
];

const BRAND_OPTIONS = [
    { value: '', label: 'Any brand' },
    { value: 'AMD', label: 'AMD' },
    { value: 'Intel', label: 'Intel' },
];

const GPU_BRAND_OPTIONS = [
    { value: '', label: 'Any brand' },
    { value: 'NVIDIA', label: 'NVIDIA' },
    { value: 'AMD', label: 'AMD' },
];

// Backend expects:
// current_build: [
//   { component: "CPU", part: { id: 12 } },
//   { component: "GPU", part: { id: 55 } },
// ]
function toCurrentBuildPayload(rows: BuildRow[]) {
    return rows
        .filter(r => r.part)
        .map(r => ({
            component: r.component,
            part: { id: r.part!.id },
        }));
}

function formatNPR(n: number) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 'Rs. -';
    return `Rs. ${Math.round(x).toLocaleString('en-NP')}`;
}

export default function BuilderPage() {
    const navigate = useNavigate();
    const [state, setState] = useState<BuildState>(loadBuildState);
    const [aiLoading, setAiLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [scoringLoading, setScoringLoading] = useState(false);
    const [error, setError] = useState('');
    const [saveOpen, setSaveOpen] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [aiReview, setAiReview] = useState<any>(null);
    const [aiReviewLoading, setAiReviewLoading] = useState(false);
    const user = getCachedUser();

    async function handleAiReview() {
        const filled = rows.filter(x => x.part);
        if (filled.length < 2) return;
        setAiReviewLoading(true);
        setAiReview(null);
        try {
            const currentBuild = toCurrentBuildPayload(filled);
            const res = await fetch(`${API}/api/build/ai-review/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    budget,
                    usecase,
                    current_build: currentBuild,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setAiReview(data.review || { available: false, summary: 'No review returned.' });
            }
        } catch { /* ignore */ }
        finally { setAiReviewLoading(false); }
    }

    // Subscribe to store changes
    useEffect(() => {
        return subscribeBuildStore((s) => setState(s));
    }, []);

    const { rows, budget, usecase, cpuBrand, gpuBrand, preferencesText, aiData } = state;

    const totalManual = rows.reduce((s, r) => s + (Number(r.custom_price ?? r.part?.price) || 0), 0);
    const filledCount = rows.filter(r => r.part).length;
    const budgetInvalid = budget < BUDGET_MIN;

    // Client-side instant wattage calculation (PCPartPicker style)
    // Updates immediately as parts are added — no API round-trip needed
    const clientEstimatedWatts = React.useMemo(() => {
        let watts = 0;
        for (const r of rows) {
            if (!r.part?.specs) continue;
            const tdp = Number(String(r.part.specs.tdp ?? '').replace(/[^\d.]/g, '')) || 0;
            
            if (tdp > 0) {
                watts += tdp;
            } else {
                // If TDP isn't explicitly defined, add standard PCPartPicker component estimates
                switch (r.type) {
                    case 'MOBO': watts += 30; break;
                    case 'RAM': watts += 10; break; // ~5W per stick
                    case 'SSD': watts += 10; break;
                    case 'COOLER': watts += 15; break; // Fans/Pump
                }
            }
        }
        return Math.round(watts);
    }, [rows]);

    // Real-time validation Engine (ML + Compat)
    // Debounced so it doesn't slam the API on fast clicks
    const runCompatCheck = useCallback(
        debounce(async (r: BuildRow[]) => {
            const filled = r.filter(x => x.part);
            if (filled.length < 2) return;

            setValidating(true);
            try {
                const currentBuild = toCurrentBuildPayload(filled);

                const res = await fetch(`${API}/api/build/validate/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        budget: state.budget,
                        usecase: state.usecase,
                        current_build: currentBuild
                    }),
                });

                if (!res.ok) return;
                const data = await res.json();

                saveBuildState({
                    aiData: {
                        total_price: totalManual,
                        warnings: data.warnings ?? [],
                        metrics: data.metrics ?? null,
                        estimated_watts: data.estimated_watts,
                        within_budget: totalManual <= budget,
                        over_by: totalManual > budget ? (totalManual - budget) : 0,
                    },
                }, { emit: true });

            } catch {
                /* ignore background validation errors */
            } finally {
                setValidating(false);
            }
        }, 600),
        [budget, totalManual, state.budget, state.usecase]
    );

    // Create a stable string signature of the current parts so reference changes don't cause infinite loops
    const buildSignature = React.useMemo(() => rows.map(r => r.part?.id || 0).join('-'), [rows]);

    useEffect(() => {
        if (state.mode === 'manual' || state.mode === 'ai') runCompatCheck(rows);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buildSignature, state.mode, state.usecase, runCompatCheck]);

    // Clear stale AI reviews if the build physically changes
    useEffect(() => {
        setAiReview(null);
    }, [buildSignature]);

    const [showMethodModal, setShowMethodModal] = useState(false);

    async function handleGenerate(method: 'llm' | 'ml' = 'ml') {
        setShowMethodModal(false);
        if (budgetInvalid) { setError(`Minimum budget is ${formatNPR(BUDGET_MIN)}.`); return; }

        setError('');
        setAiLoading(true);

        try {
            const res = await fetch(`${API}/api/build/generate/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    budget,
                    usecase,
                    cpu_brand: cpuBrand,
                    gpu_brand: gpuBrand,
                    preferences_text: preferencesText,
                    method,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setError(data?.detail || data?.error || 'Generation failed.'); return; }

            const newRows = (data.build as BuildRow[]) ?? DEFAULT_ROWS;

            saveBuildState({
                rows: newRows,
                mode: 'ai',
                aiData: {
                    total_price: data.total_price,
                    warnings: data.warnings ?? [],
                    metrics: data.metrics ?? null,
                    estimated_watts: data.estimated_watts,
                    within_budget: data.within_budget,
                    over_by: data.over_by,
                },
            }, { emit: true });

        } catch {
            setError('Could not reach the server.');
        } finally {
            setAiLoading(false);
        }
    }

    async function handleFill() {
        if (budgetInvalid) { setError(`Minimum budget is ${formatNPR(BUDGET_MIN)}.`); return; }
        if (filledCount === 0) { setError('Add at least one part first, then use Fill.'); return; }

        setError('');
        setAiLoading(true);

        try {
            const currentBuild = toCurrentBuildPayload(rows);

            const res = await fetch(`${API}/api/build/fill/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    budget,
                    usecase,
                    cpu_brand: cpuBrand,
                    gpu_brand: gpuBrand,
                    preferences_text: preferencesText,
                    current_build: currentBuild,
                }),
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) { setError(data?.detail || data?.error || 'Fill failed.'); return; }

            saveBuildState({
                rows: (data.build as BuildRow[]) ?? rows,
                mode: 'ai',
                aiData: {
                    total_price: data.total_price,
                    warnings: data.warnings ?? [],
                    metrics: data.metrics ?? null,
                    estimated_watts: data.estimated_watts,
                    within_budget: data.within_budget,
                    over_by: data.over_by,
                },
            }, { emit: true });

        } catch {
            setError('Could not reach the server.');
        } finally {
            setAiLoading(false);
        }
    }

    function handleClear() {
        saveBuildState({ rows: DEFAULT_ROWS, aiData: null, mode: 'manual' }, { emit: true });
    }

    async function handleSaveBuild() {
        if (!saveName.trim()) { setSaveError('Please enter a build name.'); return; }
        setSaving(true);
        setSaveError('');
        try {
            const res = await fetch(`${API}/api/builds/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getAccessToken()}`,
                },
                body: JSON.stringify({
                    name: saveName.trim(),
                    budget,
                    usecase,
                    build_data: rows,
                    total_price: displayTotal,
                }),
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                setSaveError(d?.detail || 'Failed to save.');
                return;
            }
            setSaveOpen(false);
            setSaveName('');
            navigate('/my-builds');
        } catch {
            setSaveError('Could not reach the server.');
        } finally {
            setSaving(false);
        }
    }

    const displayTotal = aiData?.total_price ?? totalManual;
    const warnings = aiData?.warnings ?? [];
    const metrics = aiData?.metrics;

    return (
        <Layout>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text)]">PC Builder</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                        {state.mode === 'ai' ? 'AI-generated build' : 'Manual build'} · {filledCount}/8 parts
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {validating && <Spinner size="sm" />}
                    {user ? (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => { setSaveOpen(true); setSaveName(`${usecase} Build`); }}
                            disabled={filledCount < 2}
                            leftIcon={<BookmarkPlus className="h-3.5 w-3.5" />}
                        >
                            Save
                        </Button>
                    ) : (
                        <Link to="/login">
                            <Button variant="secondary" size="sm" leftIcon={<BookmarkPlus className="h-3.5 w-3.5" />}>
                                Save
                            </Button>
                        </Link>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleClear} leftIcon={<X className="h-3.5 w-3.5" />}>
                        Clear
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_320px] gap-5">
                {/* ── Left: Build Table ── */}
                <div className="space-y-2.5">
                    {/* AI Controls */}
                    <Card padding="sm">
                        <div className="flex flex-wrap gap-3 items-end">
                            <Input
                                label="Budget (NPR)"
                                id="budget"
                                type="number"
                                value={budget}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    saveBuildState({ budget: Number(e.target.value || 0) }, { emit: true })
                                }
                                error={budgetInvalid ? `Min. ${formatNPR(BUDGET_MIN)}` : undefined}
                                wrapperClassName="w-40"
                            />
                            <Select
                                label="Use-case"
                                options={USECASE_OPTIONS}
                                value={usecase}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    saveBuildState({ usecase: e.target.value }, { emit: true })
                                }
                                wrapperClassName="w-44"
                            />
                            <Select
                                label="CPU brand"
                                options={BRAND_OPTIONS}
                                value={cpuBrand}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    saveBuildState({ cpuBrand: e.target.value }, { emit: true })
                                }
                                wrapperClassName="w-32"
                            />
                            <Select
                                label="GPU brand"
                                options={GPU_BRAND_OPTIONS}
                                value={gpuBrand}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    saveBuildState({ gpuBrand: e.target.value }, { emit: true })
                                }
                                wrapperClassName="w-32"
                            />
                            <div className="flex gap-2 pb-0.5">
                                <Button onClick={() => setShowMethodModal(true)} loading={aiLoading} leftIcon={<Zap className="h-4 w-4" />}>
                                    Generate
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={handleFill}
                                    loading={aiLoading}
                                    leftIcon={<RefreshCw className="h-4 w-4" />}
                                    disabled={filledCount === 0}
                                >
                                    Fill
                                </Button>
                            </div>
                        </div>

                        <div className="mt-3">
                            <textarea
                                rows={2}
                                className="w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] px-3 py-2 placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                                placeholder='Preferences (e.g. "16GB RAM, prefer NVMe, WiFi motherboard, quiet build")'
                                value={preferencesText}
                                onChange={e => saveBuildState({ preferencesText: e.target.value }, { emit: true })}
                            />
                            <p className="text-[11px] text-[var(--text-subtle)] mt-1 ml-1 leading-snug">
                                Note: The custom preferences text box is exclusively supported by the Gemini AI generation method.
                            </p>
                        </div>
                    </Card>

                    {error && <Alert variant="error" dismissible>{error}</Alert>}

                    {aiData?.within_budget === false && (
                        <Alert variant="warning">
                            Build is over budget by <strong>{formatNPR(aiData.over_by ?? 0)}</strong>.
                        </Alert>
                    )}

                    {/* General Use savings message */}
                    {usecase === 'General Use' && filledCount >= 4 && displayTotal > 0 && budget > 100000 && displayTotal < budget * 0.8 && (
                        <Alert variant="info">
                            💡 <strong>Smart Savings:</strong> Because you selected <strong>General Use</strong>, the system intentionally saved you <strong>{formatNPR(budget - displayTotal)}</strong>. Web browsing and office work don't require high-spec components — your build is optimized for value!
                        </Alert>
                    )}

                    {/* Compatibility & Wattage Banner (PCPartPicker Style) */}
                    <div className="flex flex-col sm:flex-row items-stretch rounded-t-xl overflow-hidden mb-0">
                        <div className={`flex-1 px-4 py-3 flex items-center gap-2 text-white font-medium ${warnings.length === 0 ? 'bg-emerald-600 dark:bg-emerald-600/90' : 'bg-red-600 dark:bg-red-600/90'}`}>
                            {warnings.length === 0 ? (
                                <><CheckCircle className="h-5 w-5" /> Compatibility: No issues or incompatibilities found.</>
                            ) : (
                                <><XCircle className="h-5 w-5" /> Compatibility: {warnings.length} issue(s) or incompatibilities found.</>
                            )}
                        </div>
                        <div className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 flex items-center justify-center gap-2 font-medium shrink-0">
                            <Zap className="h-4 w-4" /> Estimated Wattage: {clientEstimatedWatts}W
                        </div>
                    </div>

                    {/* Build Rows */}
                    <div className="bg-[var(--surface)] border-x border-b border-[var(--border)] rounded-b-xl overflow-hidden">
                        <table className="w-full text-sm table-fixed">
                            <thead>
                                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                                    <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)] w-32">Component</th>
                                    <th className="text-left px-4 py-2.5 font-medium text-[var(--text-muted)]">Part</th>
                                    <th className="text-right px-4 py-2.5 font-medium text-[var(--text-muted)] w-28">Price</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {rows.map((row) => (
                                    <BuildRowItem
                                        key={row.component}
                                        row={row}
                                        onNavigate={navigate}
                                        onRemove={() => removePartFromBuild(row.component)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Warnings */}
                    {warnings.length > 0 && (
                        <Card title="Compatibility Warnings" padding="sm">
                            <ul className="space-y-1.5">
                                {warnings.map((w, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                                        <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                        {w}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>

                {/* ── Right: Sidebar ── */}
                <div className="space-y-4">
                    {/* Price summary */}
                    <Card title="Build Summary">
                        <div className="space-y-2">
                            {rows.filter(r => r.part).map(r => (
                                <div key={r.component} className="flex justify-between text-sm">
                                    <span className="text-[var(--text-muted)]">{r.component}</span>
                                    <span className="font-medium text-[var(--text)] tabular-nums">{formatNPR(Number(r.custom_price ?? r.part!.price))}</span>
                                </div>
                            ))}
                            {filledCount === 0 && <p className="text-sm text-[var(--text-muted)] text-center py-3">No parts selected</p>}
                            {filledCount > 0 && (
                                <>
                                    <div className="pt-2 mt-2 border-t border-[var(--border)] flex justify-between font-semibold">
                                        <span className="text-[var(--text)]">Total</span>
                                        <span className="text-brand-600 dark:text-brand-400 tabular-nums">{formatNPR(displayTotal)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>

                    {/* ── Build Scores UI Removed per user request ── */}

                    {/* AI Review (Gemini LLM) Trigger */}
                    {filledCount >= 2 && (
                        <Card title="AI Expert Review" titleRight={<Zap className="h-4 w-4 text-purple-500" />}>
                            <div className="text-center py-2">
                                <p className="text-xs text-[var(--text-muted)] mb-3">Get an intelligent hardware review powered by Google Gemini AI</p>
                                <Button
                                    className="w-full"
                                    variant={aiReview ? "secondary" : "primary"}
                                    loading={aiReviewLoading}
                                    onClick={handleAiReview}
                                    leftIcon={<Zap className="h-3.5 w-3.5" />}
                                >
                                    {aiReview ? 'Refresh AI Review' : 'Get AI Review'}
                                </Button>
                                {aiReview && (
                                    <p className="text-xs text-brand-600 dark:text-brand-400 mt-2 font-medium">
                                        ↓ Scroll down to view your review
                                    </p>
                                )}
                            </div>
                        </Card>
                    )}



                </div>
            </div>

            {/* Full Width AI Review Results */}
            {aiReview && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-purple-500/30 dark:border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.05)]">
                        <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4 mb-5">
                            <div className="bg-purple-100 dark:bg-purple-500/20 p-2 rounded-lg">
                                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[var(--text)]">Gemini AI Expert Review</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-0.5">Comprehensive architectural analysis of your build</p>
                            </div>
                            {aiReview.rating && (
                                <div className="ml-auto text-right">
                                    <span className={`text-4xl font-black ${aiReview.rating >= 70 ? 'text-green-500' : aiReview.rating >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                        {aiReview.rating}
                                    </span>
                                    <span className="text-sm font-medium text-[var(--text-muted)] ml-1">/ 100</span>
                                </div>
                            )}
                        </div>

                        {aiReview.available === false ? (
                            <p className="text-[var(--text-muted)] text-center py-8">{aiReview.summary}</p>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-sm">
                                {/* Left Column: Summary & Bottlenecks & Recs */}
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[15px] text-[var(--text)] leading-relaxed italic border-l-4 border-purple-500 pl-4 py-1">"{aiReview.summary}"</p>
                                    </div>
                                    
                                    {aiReview.bottleneck_analysis && (
                                        <div>
                                            <h4 className="font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                Bottleneck Analysis
                                            </h4>
                                            <p className="text-[var(--text-muted)] leading-relaxed bg-amber-50 dark:bg-amber-500/5 p-4 rounded-xl border border-amber-100 dark:border-amber-500/10">
                                                {aiReview.bottleneck_analysis}
                                            </p>
                                        </div>
                                    )}

                                    {aiReview.recommendations?.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-3 border-b border-[var(--border)] pb-2 flex items-center gap-2">
                                                <BookmarkPlus className="h-4 w-4" /> Top Recommendations
                                            </h4>
                                            <ul className="space-y-3">
                                                {aiReview.recommendations.map((r: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-3 bg-blue-50 dark:bg-blue-500/5 p-3 rounded-xl border border-blue-100 dark:border-blue-500/10">
                                                        <span className="text-blue-500 mt-0.5">→</span>
                                                        <span className="text-[var(--text)] leading-relaxed">{r}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Strengths/Weaknesses & Upgrades */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {aiReview.strengths?.length > 0 && (
                                            <div className="bg-green-50 dark:bg-green-500/5 p-4 rounded-xl border border-green-100 dark:border-green-500/10">
                                                <h4 className="font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4" /> Strengths
                                                </h4>
                                                <ul className="space-y-2 text-[var(--text-muted)]">
                                                    {aiReview.strengths.map((s: string, i: number) => <li key={i} className="flex gap-2"><span className="text-green-500 shrink-0">✓</span><span className="leading-snug">{s}</span></li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {aiReview.weaknesses?.length > 0 && (
                                            <div className="bg-red-50 dark:bg-red-500/5 p-4 rounded-xl border border-red-100 dark:border-red-500/10">
                                                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                                                    <XCircle className="h-4 w-4" /> Weaknesses
                                                </h4>
                                                <ul className="space-y-2 text-[var(--text-muted)]">
                                                    {aiReview.weaknesses.map((w: string, i: number) => <li key={i} className="flex gap-2"><span className="text-red-500 shrink-0">✗</span><span className="leading-snug">{w}</span></li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {(aiReview.budget_alternatives?.length > 0 || aiReview.upgrade_paths?.length > 0) && (
                                        <div className="grid grid-cols-1 gap-4">
                                            {aiReview.budget_alternatives?.length > 0 && (
                                                <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)]">
                                                    <h4 className="font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-emerald-500" /> Budget Alternatives
                                                    </h4>
                                                    <ul className="space-y-3 text-[var(--text-muted)]">
                                                        {aiReview.budget_alternatives.map((b: string, i: number) => <li key={i} className="flex gap-3 border-b border-[var(--border)] last:border-0 pb-3 last:pb-0"><span className="text-emerald-500 shrink-0 mt-0.5">$</span><span className="leading-snug">{b}</span></li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {aiReview.upgrade_paths?.length > 0 && (
                                                <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)]">
                                                    <h4 className="font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                                                        <ArrowUpRight className="h-4 w-4 text-brand-500" /> Future Upgrade Path
                                                    </h4>
                                                    <ul className="space-y-3 text-[var(--text-muted)]">
                                                        {aiReview.upgrade_paths.map((u: string, i: number) => <li key={i} className="flex gap-3 border-b border-[var(--border)] last:border-0 pb-3 last:pb-0"><span className="text-brand-500 shrink-0 mt-0.5">⇡</span><span className="leading-snug">{u}</span></li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="mt-6 flex justify-end pt-4 border-t border-[var(--border)]">
                            <Button variant="ghost" onClick={() => setAiReview(null)}>Dismiss Review</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Save Build Modal */}
            <Modal
                open={saveOpen}
                onClose={() => { setSaveOpen(false); setSaveError(''); }}
                title="Save Build"
                footer={
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
                        <Button loading={saving} onClick={handleSaveBuild} leftIcon={<BookmarkPlus className="h-4 w-4" />}>
                            Save Build
                        </Button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <Input
                        label="Build name"
                        id="save-build-name"
                        value={saveName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBuild(); }}
                        autoFocus
                        error={saveError}
                    />
                    <p className="text-xs text-[var(--text-muted)]">
                        Saving {filledCount} parts · {formatNPR(displayTotal)}
                    </p>
                </div>
            </Modal>
            <Modal
                open={showMethodModal}
                onClose={() => setShowMethodModal(false)}
                title="Choose Generation Assistant"
            >
                <div className="space-y-4 pt-2">
                    <p className="text-sm text-[var(--text-muted)]">
                        Select which artificial intelligence model should assemble your build.
                    </p>
                    
                    <button
                        onClick={() => handleGenerate('ml')}
                        className="w-full text-left p-4 rounded-xl border-2 border-[var(--border)] hover:border-brand-500 bg-[var(--surface-2)] transition-colors flex items-start gap-4"
                    >
                        <div className="bg-brand-500/10 p-2.5 rounded-lg shrink-0 mt-0.5">
                            <Zap className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-[var(--text)] text-base">Smart ML Algorithm</h4>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Uses a rigorously trained random forest to identify the highest tier performance-to-price ratio component benchmarks.</p>
                            <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-400">High Reliability</span>
                        </div>
                    </button>

                    <button
                        onClick={() => handleGenerate('llm')}
                        className="w-full text-left p-4 rounded-xl border-2 border-[var(--border)] hover:border-purple-500 bg-[var(--surface-2)] transition-colors flex items-start gap-4"
                    >
                        <div className="bg-purple-500/10 p-2.5 rounded-lg shrink-0 mt-0.5">
                            <Bot className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h4 className="font-bold text-[var(--text)] text-base">Gemini LLM</h4>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Communicates with Google's foundation AI models to synthesize a build factoring in edge-cases and visual aesthetics.</p>
                            <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400">Supports text preferences</span>
                        </div>
                    </button>
                    
                    <div className="flex justify-end pt-2">
                        <Button variant="ghost" onClick={() => setShowMethodModal(false)}>Cancel</Button>
                    </div>
                </div>
            </Modal>

        </Layout>
    );
}

function getPartSubtitle(part: Part): string {
    if (!part?.specs) return part.brand || '';
    const s = part.specs;
    switch (part.type) {
        case 'CPU': return [s.cores && `${s.cores}-Core`, s.boost_clock_mhz && `${s.boost_clock_mhz}MHz`, s.tdp && `${s.tdp}W`].filter(Boolean).join(' · ');
        case 'GPU': return [s.vram_gb && `${s.vram_gb}GB ${s.memory_type || ''}`, s.length_mm && `${s.length_mm}mm`].filter(Boolean).join(' · ');
        case 'MOBO': return [s.form_factor, s.chipset, s.wifi && 'WiFi'].filter(Boolean).join(' · ');
        case 'RAM': return [s.ram_type, s.speed_mhz && `${s.speed_mhz}MHz`, s.cas_latency && `CL${s.cas_latency}`, s.capacity_gb && `${s.capacity_gb}GB (${s.sticks}x)`].filter(Boolean).join(' · ');
        case 'SSD': return [s.capacity_gb && (Number(s.capacity_gb) >= 1000 ? `${(Number(s.capacity_gb)/1000).toFixed(1)}TB` : `${s.capacity_gb}GB`), s.interface, s.form_factor].filter(Boolean).join(' · ');
        case 'PSU': return [s.wattage && `${s.wattage}W`, s.efficiency_rating, s.modular].filter(Boolean).join(' · ');
        case 'CASE': return [s.form_factor, s.color].filter(Boolean).join(' · ');
        case 'COOLER': return [s.cooler_type, s.tdp_support && `${s.tdp_support}W TDP`, s.height_mm && `${s.height_mm}mm`].filter(Boolean).join(' · ');
        default: return part.brand || '';
    }
}

function BuildRowItem({ row, onNavigate, onRemove }: { row: BuildRow; onNavigate: (to: string) => void; onRemove: () => void }) {
    const { component, type, part, custom_price } = row;
    const imageUrl = part ? (part.image_url || part.specs?.image_url as string) : null;
    const isOutOfStock = part && part.has_in_stock_vendors === false;

    const [isEditing, setIsEditing] = useState(false);
    const displayPrice = custom_price !== undefined ? custom_price : (part?.price || 0);
    const [editValue, setEditValue] = useState(displayPrice.toString());

    const handleSavePrice = () => {
        setIsEditing(false);
        const parsed = parseInt(editValue, 10);
        if (!isNaN(parsed) && parsed >= 0) {
            setCustomPrice(component, parsed);
        } else {
            setCustomPrice(component, undefined);
            setEditValue((part?.price || 0).toString());
        }
    };

    return (
        <tr className="group hover:bg-[var(--surface-2)] transition-colors">
            <td className="px-4 py-3">
                <Badge variant={PART_TYPE_VARIANT[type] ?? 'default'} size="sm">{type}</Badge>
            </td>
            <td className="px-4 py-3 min-w-0 overflow-hidden">
                {part ? (
                    <div className="flex items-center justify-between w-full">
                        <button
                            onClick={() => onNavigate(`/parts/${part.id}`)}
                            className="text-left flex items-start gap-3 min-w-0 flex-1 group/btn"
                        >
                            {imageUrl ? (
                                <img src={imageUrl} alt={part.name} className="h-10 w-10 object-contain rounded bg-white p-1 border border-[var(--border)] shrink-0" />
                            ) : (
                                <div className="h-10 w-10 bg-[var(--surface-3)] rounded flex items-center justify-center text-[var(--text-muted)] text-[10px] border border-[var(--border)] shrink-0">Img</div>
                            )}
                            <div className="min-w-0 flex-1 pt-0.5">
                                <div className="font-medium text-[var(--text)] group-hover/btn:text-brand-600 dark:group-hover/btn:text-brand-400 truncate flex items-center gap-1.5">
                                    {part.name}
                                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover/btn:opacity-100 text-[var(--text-muted)] shrink-0 transition-opacity" />
                                </div>
                                <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                                    {getPartSubtitle(part)}
                                </div>
                                {isOutOfStock && custom_price === undefined && (
                                    <div className="text-[11px] font-medium text-red-500 mt-1 flex items-center gap-1">
                                        <TriangleAlert className="h-3 w-3" />
                                        Out of stock natively. Please set a manual price override.
                                    </div>
                                )}
                            </div>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => onNavigate(`/pick/${type}`)}
                        className="text-sm font-medium text-[var(--text-muted)] hover:text-brand-600 dark:hover:text-brand-400 py-2 inline-block"
                    >
                        + Choose {component}
                    </button>
                )}
            </td>
            <td className="px-4 py-3 text-right tabular-nums font-medium text-[var(--text)] shrink-0 w-36">
                {part ? (
                    isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                            <input
                                type="number"
                                className="w-20 text-right text-sm border border-[var(--border)] rounded px-1.5 py-0.5 bg-[var(--surface-2)] text-[var(--text)] focus:outline-none focus:border-brand-500"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSavePrice(); }}
                                autoFocus
                                onBlur={handleSavePrice}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-end gap-2 group/price cursor-pointer" onClick={() => setIsEditing(true)}>
                            <Pencil className="h-3 w-3 text-[var(--text-subtle)] opacity-0 group-hover/price:opacity-100 transition-opacity" />
                            <span className={custom_price !== undefined ? "text-brand-600 dark:text-brand-400 font-bold" : ""}>
                                {isOutOfStock && custom_price === undefined ? (
                                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 mt-0.5 inline-block">Out of Stock</span>
                                ) : (
                                    formatNPR(Number(displayPrice))
                                )}
                            </span>
                        </div>
                    )
                ) : (
                    <span className="text-[var(--text-subtle)]">—</span>
                )}
            </td>
            <td className="px-2 py-3 shrink-0">
                {part && (
                    <button
                        onClick={onRemove}
                        className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-500 transition-all p-1"
                        title="Remove part"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </td>
        </tr>
    );
}

// Debounce helper
function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
    let t: ReturnType<typeof setTimeout>;
    return (...args: T) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
