import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { PageSpinner } from '@/components/ui/Spinner';
import { ProtectedRoute, AdminRoute } from '@/components/ProtectedRoute';
import { apiGetMe, setCachedUser, getAccessToken } from '@/store/authStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// ── Lazy-loaded pages ──────────────────────────
// Public
const HomePage = lazy(() => import('@/pages/Home'));
const LoginPage = lazy(() => import('@/pages/auth/Login'));
const RegisterPage = lazy(() => import('@/pages/auth/Register'));
const ForgotPwPage = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPwPage = lazy(() => import('@/pages/auth/ResetPassword'));

// Core tool
const BuilderPage = lazy(() => import('@/pages/Builder'));
const PartPickerPage = lazy(() => import('@/pages/PartPicker'));
const PartDetailPage = lazy(() => import('@/pages/PartDetail'));
const PartsIndexPage = lazy(() => import('@/pages/PartsIndex'));

// User
const DashboardPage = lazy(() => import('@/pages/user/Dashboard'));
const MyBuildsPage = lazy(() => import('@/pages/user/MyBuilds'));
const BuildDetailPage = lazy(() => import('@/pages/user/BuildDetail'));
const ComparePage = lazy(() => import('@/pages/user/Compare'));

// Admin
const AdminDashPage = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminPartsPage = lazy(() => import('@/pages/admin/AdminParts'));
const AdminVendorsPage = lazy(() => import('@/pages/admin/AdminVendors'));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsers'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

export default function App() {
    // On every app load, refresh the user profile from the server to keep
    // role / is_active in sync with the database (e.g. after an admin changes
    // a user's role, the user gets the updated role without having to log out).
    useEffect(() => {
        if (getAccessToken()) {
            apiGetMe()
                .then(freshUser => {
                    setCachedUser(freshUser);
                    window.dispatchEvent(new Event('specsmart:auth_updated'));
                })
                .catch(() => { /* token expired — ProtectedRoute will redirect */ });
        }
    }, []);

    return (
        <ErrorBoundary>
            <BrowserRouter>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[var(--bg)]"><PageSpinner /></div>}>
                    <Routes>
                        {/* ── Public ── */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/forgot-password" element={<ForgotPwPage />} />
                        <Route path="/reset-password/:token" element={<ResetPwPage />} />

                        {/* ── Core tool (public, no auth required) ── */}
                        <Route path="/builder" element={<BuilderPage />} />
                        <Route path="/parts" element={<PartsIndexPage />} />
                        <Route path="/pick/:type" element={<PartPickerPage />} />
                        <Route path="/parts/:id" element={<PartDetailPage />} />

                        {/* ── Authenticated user ── */}
                        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                        <Route path="/my-builds" element={<ProtectedRoute><MyBuildsPage /></ProtectedRoute>} />
                        <Route path="/my-builds/:id" element={<ProtectedRoute><BuildDetailPage /></ProtectedRoute>} />
                        <Route path="/compare" element={<ProtectedRoute><ComparePage /></ProtectedRoute>} />

                        {/* ── Admin only ── */}
                        <Route path="/admin" element={<AdminRoute><AdminDashPage /></AdminRoute>} />
                        <Route path="/admin/parts" element={<AdminRoute><AdminPartsPage /></AdminRoute>} />
                        <Route path="/admin/vendors" element={<AdminRoute><AdminVendorsPage /></AdminRoute>} />
                        <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />

                        {/* ── 404 ── */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </BrowserRouter>
        </ErrorBoundary>
    );
}
