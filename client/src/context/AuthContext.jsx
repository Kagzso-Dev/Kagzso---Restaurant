import { createContext, useState, useEffect, useCallback } from 'react';
import api, { baseURL as API_BASE } from '../api';
import { io } from 'socket.io-client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [selectedTenantId, setSelectedTenantId] = useState(null);
    const [settings, setSettings] = useState({
        restaurantName: 'Restaurant',
        currency: 'INR',
        currencySymbol: '₹',
        taxRate: 5,
        gstNumber: '',
    });

    // ── Socket init (joins branch-specific room) ──────────────────────────────
    const initSocket = useCallback((branchId) => {
        const newSocket = io(API_BASE, {
            transports: ['websocket'],
            withCredentials: true
        });

        newSocket.on('connect', () => {
            if (branchId) {
                newSocket.emit('join-branch', branchId);
                console.log('Joined branch room:', branchId);
            }
        });
        setSocket(newSocket);
        return newSocket;
    }, []);

    // ── Fetch settings ────────────────────────────────────────────────────────
    const fetchSettings = useCallback(async () => {
        try {
            const res = await api.get('/api/settings');
            setSettings(res.data);
        } catch (error) {
            console.warn('Settings not loaded yet:', error.response?.status);
        }
    }, []);

    // ── Restore session on mount ──────────────────────────────────────────────
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);

            const savedTenantId = localStorage.getItem('selectedTenantId');
            if (savedTenantId && userData.role === 'superadmin') {
                setSelectedTenantId(savedTenantId);
            }

            initSocket(userData.branchId);
            fetchSettings();
        }
        setLoading(false);
    }, [initSocket, fetchSettings]);

    // ── Login ─────────────────────────────────────────────────────────────────
    const login = async (username, password) => {
        try {
            const res = await api.post('/api/auth/login', { username, password });
            const userData = res.data;

            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));

            initSocket(userData.branchId);
            fetchSettings();

            return userData;
        } catch (error) {
            throw error.response?.data?.message || 'Login failed';
        }
    };

    // ── Logout ────────────────────────────────────────────────────────────────
    const logout = () => {
        setUser(null);
        setSelectedTenantId(null);
        localStorage.removeItem('user');
        localStorage.removeItem('selectedTenantId');
        if (socket) socket.disconnect();
        setSocket(null);
        setSettings({
            restaurantName: 'Restaurant',
            currency: 'INR',
            currencySymbol: '₹',
            taxRate: 5,
            gstNumber: '',
        });
    };

    // ── Switch Tenant (SuperAdmin) ───────────────────────────────────────────
    const switchTenant = (tenantId) => {
        setSelectedTenantId(tenantId);
        if (tenantId) {
            localStorage.setItem('selectedTenantId', tenantId);
        } else {
            localStorage.removeItem('selectedTenantId');
        }
        window.location.reload();
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const formatPrice = (amount) => {
        return `${settings.currencySymbol}${(amount || 0).toFixed(2)}`;
    };

    const tenantId = user?.tenantId || null;
    const branchId = user?.branchId || null;
    const role = user?.role || null;
    const isSuperAdmin = role === 'superadmin';
    const isAdmin = role === 'admin';

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            loading,
            socket,
            settings,
            fetchSettings,
            formatPrice,
            tenantId,
            branchId,
            role,
            isSuperAdmin,
            isAdmin,
            selectedTenantId,
            switchTenant,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

