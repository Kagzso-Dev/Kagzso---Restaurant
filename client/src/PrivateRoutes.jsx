import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// ── Loading spinner while auth state is being restored ───────────────────────
const AuthLoading = () => (
    <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
        <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm font-medium">Restoring session...</p>
        </div>
    </div>
);

// ── Helper: role-based route guard ───────────────────────────────────────────
const RoleRoute = ({ allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);

    // Wait until auth state is restored from localStorage
    if (loading) return <AuthLoading />;

    // No user = not logged in → redirect to login
    if (!user) return <Navigate to="/login" replace />;

    // Check role
    if (allowedRoles.includes(user.role)) {
        return <Outlet />;
    }

    return <Navigate to="/unauthorized" replace />;
};

// ── Individual route guards ──────────────────────────────────────────────────
const SuperAdminRoute = () => (
    <RoleRoute allowedRoles={['superadmin']} />
);

const AdminRoute = () => (
    <RoleRoute allowedRoles={['admin', 'superadmin']} />
);

const KitchenRoute = () => (
    <RoleRoute allowedRoles={['kitchen', 'admin', 'superadmin']} />
);

const CashierRoute = () => (
    <RoleRoute allowedRoles={['cashier', 'admin', 'superadmin']} />
);

const WaiterRoute = () => (
    <RoleRoute allowedRoles={['waiter', 'admin', 'superadmin']} />
);

export { SuperAdminRoute, AdminRoute, KitchenRoute, CashierRoute, WaiterRoute };
