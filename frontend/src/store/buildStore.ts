import type { BuildRow, BuildAiData, BuildAiExtras, PartType } from '@/types';

const KEY = 'specsmart_builder_unified_v1';
const EVENT = 'specsmart:build_updated';

export const DEFAULT_ROWS: BuildRow[] = [
    { component: 'CPU', type: 'CPU', part: null },
    { component: 'CPU Cooler', type: 'COOLER', part: null },
    { component: 'GPU', type: 'GPU', part: null },
    { component: 'Motherboard', type: 'MOBO', part: null },
    { component: 'RAM', type: 'RAM', part: null },
    { component: 'SSD', type: 'SSD', part: null },
    { component: 'Case', type: 'CASE', part: null },
    { component: 'PSU', type: 'PSU', part: null },
];

export type BuildMode = 'manual' | 'ai';

export interface BuildState {
    budget: number;
    usecase: string;
    cpuBrand: string;
    gpuBrand: string;
    preferencesText: string;
    rows: BuildRow[];
    aiData: BuildAiData | null;
    mode: BuildMode;
}

export const COMPONENT_TO_TYPE: Record<string, PartType> = {
    'CPU': 'CPU',
    'CPU Cooler': 'COOLER',
    'GPU': 'GPU',
    'Motherboard': 'MOBO',
    'RAM': 'RAM',
    'SSD': 'SSD',
    'Case': 'CASE',
    'PSU': 'PSU',
};

export function mergeRows(partialRows?: BuildRow[]): BuildRow[] {
    const map = new Map<string, BuildRow>();
    (Array.isArray(partialRows) ? partialRows : []).forEach((r) => {
        if (r && r.component) map.set(r.component, r);
    });
    return DEFAULT_ROWS.map((base) => {
        const incoming = map.get(base.component);
        return { 
            component: base.component, 
            type: base.type, 
            part: incoming?.part ?? null,
            custom_price: incoming?.custom_price 
        };
    });
}

function normalize(state: Partial<BuildState>): BuildState {
    const s = state && typeof state === 'object' ? state : {};
    return {
        budget: (s.budget as number) ?? 150000,
        usecase: s.usecase ?? 'Gaming',
        cpuBrand: s.cpuBrand ?? '',
        gpuBrand: s.gpuBrand ?? '',
        preferencesText: s.preferencesText ?? '',
        rows: mergeRows(s.rows),
        aiData: s.aiData ?? null,
        mode: s.mode ?? 'manual',
    };
}

export function loadBuildState(): BuildState {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return normalize({});
        return normalize(JSON.parse(raw) as Partial<BuildState>);
    } catch {
        return normalize({});
    }
}

export function saveBuildState(patch: Partial<BuildState>, opts: { emit?: boolean } = { emit: true }): void {
    const current = loadBuildState();
    const next = normalize({ ...current, ...patch });
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {/* storage full */ }
    if (opts?.emit) window.dispatchEvent(new Event(EVENT));
}

export function subscribeBuildStore(callback: (state: BuildState) => void): () => void {
    const handler = () => callback(loadBuildState());
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
}

export function upsertPartInBuild(componentName: string, part: import('@/types').Part): BuildState {
    const state = loadBuildState();
    const rows = mergeRows(state.rows).map((r) =>
        r.component === componentName ? { ...r, part, custom_price: undefined } : r,
    );
    saveBuildState({ rows, aiData: null, mode: 'manual' }, { emit: true });
    return loadBuildState();
}

export function removePartFromBuild(componentName: string): BuildState {
    const state = loadBuildState();
    const rows = mergeRows(state.rows).map((r) =>
        r.component === componentName ? { ...r, part: null, custom_price: undefined } : r,
    );
    saveBuildState({ rows, aiData: null, mode: 'manual' }, { emit: true });
    return loadBuildState();
}

export function setCustomPrice(componentName: string, price: number | undefined): BuildState {
    const state = loadBuildState();
    const rows = mergeRows(state.rows).map((r) =>
        r.component === componentName ? { ...r, custom_price: price } : r,
    );
    saveBuildState({ rows }, { emit: true });
    return loadBuildState();
}

export function setPreferencesText(text: string): BuildState {
    saveBuildState({ preferencesText: text, aiData: null, mode: 'manual' }, { emit: true });
    return loadBuildState();
}
