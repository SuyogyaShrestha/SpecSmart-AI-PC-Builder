import { Navigate, useLocation } from 'react-router-dom';
import { getCachedUser } from '@/store/authStore';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: UserRole;
    redirectTo?: string;
}

export function ProtectedRoute({ children, requiredRole, redirectTo = '/login' }: ProtectedRouteProps) {
    const location = useLocation();
    const user = getCachedUser();

    if (!user) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        // Regular user trying to access admin page
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute requiredRole="admin" redirectTo="/login">
            {children}
        </ProtectedRoute>
    );
}
