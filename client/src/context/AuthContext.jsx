import { createContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

export const AuthContext = createContext();

const API_BASE = 'http://localhost:5000';

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

    // ── Axios default header ──────────────────────────────────────────────────
    const setAuthHeader = (token, tenantId = null) => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }

        if (tenantId) {
            axios.defaults.headers.common['x-tenant-id'] = tenantId;
        } else {
            delete axios.defaults.headers.common['x-tenant-id'];
        }
    };

    // ── Socket init (joins branch-specific room) ──────────────────────────────
    const initSocket = useCallback((branchId) => {
        const newSocket = io(API_BASE, { transports: ['websocket'] });
        newSocket.on('connect', () => {
            if (branchId) {
                // Join branch room for isolated real-time events
                newSocket.emit('join-branch', branchId);
                console.log('Joined branch room:', branchId);
            }
        });
        setSocket(newSocket);
        return newSocket;
    }, []);

    // ── Fetch settings (requires auth token) ─────────────────────────────────
    const fetchSettings = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/settings`);
            setSettings(res.data);
        } catch (error) {
            // Settings fetch may fail before login — that's OK
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
                setAuthHeader(userData.token, savedTenantId);
            } else {
                setAuthHeader(userData.token);
            }

            initSocket(userData.branchId);
            fetchSettings();
        }
        setLoading(false);
    }, []);

    // ── Login ─────────────────────────────────────────────────────────────────
    const login = async (username, password) => {
        try {
            const res = await axios.post(`${API_BASE}/api/auth/login`, { username, password });
            const userData = res.data;

            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));

            // Check if there was a previous session tenantId (optional, mostly clean state preferred)
            setAuthHeader(userData.token);
            initSocket(userData.branchId);

            // Fetch branch-specific settings after login
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
        setAuthHeader(null);
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
        setAuthHeader(user?.token, tenantId);
        window.location.reload();
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const formatPrice = (amount) => {
        return `${settings.currencySymbol}${(amount || 0).toFixed(2)}`;
    };

    // Convenience getters from user object
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
            // Multi-tenant context
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
