// ── Part Types ──────────────────────────────────────────────────
export type PartType = 'CPU' | 'GPU' | 'MOBO' | 'RAM' | 'SSD' | 'PSU' | 'CASE' | 'COOLER';

export interface Part {
    id: number;
    type: PartType;
    name: string;
    brand: string;
    price: number;
    image_url?: string;
    specs: Record<string, string | number | boolean>;
    is_active?: boolean;
    // ML scores (populated by AI endpoints)
    score?: number;
    utility?: number;
    vendor_urls?: Record<string, string>;
    has_in_stock_vendors?: boolean;
}

export interface BuildRow {
    component: string;
    type: PartType;
    part: Part | null;
    custom_price?: number;
}

// ── Build / AI ──────────────────────────────────────────────────
export interface BuildMetrics {
    overall: number;   // 0-100 weighted composite
    performance: number;   // 0-100 CPU+GPU power relative to DB
    value: number;   // 0-100 performance per rupee
    efficiency: number;   // 0-100 performance per watt
    balance: number;   // 0-100 CPU/GPU balance (bottleneck check)
    compatibility: number;   // 0-100 rule-based: socket, RAM, PSU
    _raw?: {
        cpu_score: number;
        gpu_score: number;
        perf_raw: number;
        estimated_watts: number;
        total_price: number;
    };
}

export interface BuildAlternative extends Part {
    extra_cost?: number;
}

export interface BuildAiData {
    total_price: number | null;
    warnings: string[];
    metrics: BuildMetrics | null;
    estimated_watts?: number;
    within_budget?: boolean;
    over_by?: number;
}

export interface BuildAiExtras {
    alternatives: Record<string, Part[]> | null;
    upgrade_path: Record<string, { part: Part; extra_cost: number }[]> | null;
}

export interface GenerateBuildResponse {
    build: BuildRow[];
    total_price: number;
    metrics: BuildMetrics;
    compatible: boolean;
    warnings: string[];
    alternatives: Record<string, Part[]>;
    upgrade_path: Record<string, { part: Part; extra_cost: number }[]>;
    within_budget: boolean;
    over_by: number;
}

// ── Pricing ─────────────────────────────────────────────────────
export interface Vendor {
    id: number;
    vendor_slug: string;
    name: string;
    base_url: string;
    region: string;
    currency: string;
    is_active: boolean;
}

export interface VendorListing {
    id: number;
    vendor: Vendor;
    vendor_sku: string;
    product_url: string;
    is_active: boolean;
    in_stock: boolean;
    last_price: number | null;
    last_checked_at: string | null;
}

export interface PriceHistoryRow {
    id: number;
    listing: number;
    date: string;
    price: number;
    currency: string;
    in_stock: boolean;
}

export interface PartPricesResponse {
    part: Part;
    best_price: number | null;
    listings: VendorListing[];
    history: Record<number, PriceHistoryRow[]>;
    days: number;
}

// ── Auth ────────────────────────────────────────────────────────
export type UserRole = 'user' | 'admin';

export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    is_active: boolean;
    date_joined: string;
}

export interface AuthTokens {
    access: string;
    refresh: string;
}

// ── Saved Build ─────────────────────────────────────────────────
export interface SavedBuild {
    id: number;
    name: string;
    tags: string;
    budget: number;
    usecase: string;
    build_data: BuildRow[];
    total_price: number;
    is_public: boolean;
    created_at: string;
    updated_at: string;
}
