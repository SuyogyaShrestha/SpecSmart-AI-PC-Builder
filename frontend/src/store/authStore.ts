import type { User, AuthTokens } from '@/types';

const ACCESS_KEY = 'specsmart_access';
const REFRESH_KEY = 'specsmart_refresh';
const USER_KEY = 'specsmart_user';
const API = 'http://127.0.0.1:8000';

// ── Token Storage ────────────────────────────────────────────────────────────
export function getAccessToken(): string | null { return localStorage.getItem(ACCESS_KEY); }
export function getRefreshToken(): string | null { return localStorage.getItem(REFRESH_KEY); }

export function setTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_KEY, tokens.access);
    localStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function clearTokens(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
}

// ── User Cache ───────────────────────────────────────────────────────────────
export function getCachedUser(): User | null {
    try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? (JSON.parse(raw) as User) : null;
    } catch { return null; }
}
export function setCachedUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ── Auth Header ──────────────────────────────────────────────────────────────
export function authHeader(): Record<string, string> {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Silent token refresh ──────────────────────────────────────────────────────
// Guards against multiple concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        const refresh = getRefreshToken();
        if (!refresh) return null;
        try {
            const res = await fetch(`${API}/api/auth/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh }),
            });
            if (!res.ok) return null;
            const data = await res.json();
            // simplejwt returns new access + (if ROTATE_REFRESH_TOKENS) new refresh
            localStorage.setItem(ACCESS_KEY, data.access);
            if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);
            return data.access as string;
        } catch {
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * authFetch — drop-in replacement for fetch() that:
 *   1. Attaches the Authorization header automatically
 *   2. On 401: silently refreshes the access token and retries once
 *   3. On second 401 (refresh expired/blacklisted): clears tokens + dispatches
 *      'specsmart:session_expired' so the app can redirect to /login
 */
export async function authFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    const headers = { 'Content-Type': 'application/json', ...authHeader(), ...(init.headers as Record<string, string> | undefined) };
    let res = await fetch(input, { ...init, headers });

    if (res.status === 401) {
        // Try to refresh
        const newToken = await refreshAccessToken();
        if (newToken) {
            // Retry original request with fresh token
            const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
            res = await fetch(input, { ...init, headers: retryHeaders });
        }

        // If still 401 after refresh attempt → session is dead
        if (res.status === 401) {
            clearTokens();
            window.dispatchEvent(new Event('specsmart:session_expired'));
        }
    }

    return res;
}

// ── API Helpers ───────────────────────────────────────────────────────────────
export async function apiLogin(username: string, password: string): Promise<{ tokens: AuthTokens; user: User }> {
    const res = await fetch(`${API}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.detail || json?.non_field_errors?.[0] || 'Login failed');
    return json;
}

export async function apiRegister(data: {
    username: string; email: string; password: string; password2: string;
    first_name?: string; last_name?: string;
}): Promise<{ tokens: AuthTokens; user: User }> {
    const res = await fetch(`${API}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
        const msg = json?.username?.[0] || json?.email?.[0] || json?.password?.[0] || json?.detail || 'Registration failed';
        throw new Error(msg);
    }
    return json;
}

export async function apiGetMe(): Promise<User> {
    const res = await authFetch(`${API}/api/auth/me/`);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.detail || 'Failed to get user');
    return json;
}

export async function apiLogout(): Promise<void> {
    const refresh = getRefreshToken();
    if (refresh) {
        // Best-effort — don't throw if this fails
        try {
            await authFetch(`${API}/api/auth/logout/`, {
                method: 'POST',
                body: JSON.stringify({ refresh }),
            });
        } catch { /* ignore */ }
    }
    clearTokens();
}

export async function apiForgotPassword(email: string): Promise<void> {
    const res = await fetch(`${API}/api/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.detail || 'Failed to send reset email');
    }
}

export async function apiResetPassword(token: string, password: string, password2: string): Promise<void> {
    const res = await fetch(`${API}/api/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, password2 }),
    });
    if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.detail || json?.password?.[0] || 'Failed to reset password');
    }
}
