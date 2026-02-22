import { createContext, useState, useEffect, useCallback } from 'react';
import api, { baseURL as API_BASE } from '../api';
import { io } from 'socket.io-client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // ── Synchronous session restore ───────────────────────────────────────────
    // Read user from localStorage in the useState initializer so the FIRST
    // render already has the correct user value.  This eliminates the brief
    // window where loading===false AND user===null that caused page refreshes
    // to bounce through /login and back to the role dashboard.
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem('user');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    // loading starts false — user is already known synchronously above.
    // We only flip it true if we ever need an async auth check in the future.
    const [loading, setLoading] = useState(false);
    const [socket, setSocket] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState(() => {
        return localStorage.getItem('selectedTenantId') || null;
    });
    const [settings, setSettings] = useState({
        restaurantName: 'Restaurant',
        currency: 'INR',
        currencySymbol: '₹',
        taxRate: 5,
        gstNumber: '',
    });

    // ── Socket init (joins branch-specific + role-specific rooms) ──────────
    const initSocket = useCallback((branchId, role) => {
        const newSocket = io(API_BASE, {
            // Try WebSocket first; fall back to long-polling on restrictive mobile networks
            transports: ['websocket', 'polling'],
            withCredentials: true,
            // Reconnection settings — essential for mobile devices
            reconnection: true,
            reconnectionAttempts: 10,      // retry up to 10 times
            reconnectionDelay: 1000,        // wait 1s before first retry
            reconnectionDelayMax: 30000,    // cap at 30s between retries (exponential backoff)
            randomizationFactor: 0.5,       // jitter to prevent thundering-herd
            timeout: 20000,                 // 20s connection timeout
        });

        const joinRooms = () => {
            if (branchId) {
                newSocket.emit('join-branch', branchId);
                console.log('✅ Socket joined branch room:', branchId);
            }
            if (branchId && role) {
                newSocket.emit('join-role', { branchId, role });
                console.log('✅ Socket joined role room:', `${branchId}_${role}`);
            }
        };

        newSocket.on('connect', () => {
            setSocketConnected(true);
            joinRooms();
        });

        // Re-join branch room on every reconnect (socket ID changes after reconnect)
        newSocket.on('reconnect', (attempt) => {
            setSocketConnected(true);
            console.log(`🔄 Socket reconnected (attempt ${attempt}) — re-joining rooms`);
            joinRooms();
        });

        newSocket.on('reconnect_attempt', (attempt) => {
            console.log(`⏳ Socket reconnect attempt ${attempt}...`);
        });

        newSocket.on('disconnect', (reason) => {
            setSocketConnected(false);
            console.log(`⚠️ Socket disconnected: ${reason}`);
            // If server forcibly disconnected, socket.io will automatically try to reconnect
        });

        newSocket.on('connect_error', (err) => {
            setSocketConnected(false);
            console.error('Socket connection error:', err.message);
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

    // ── Side effects that depend on a restored session ────────────────────────
    // Connect socket and load settings once on mount if user already exists.
    useEffect(() => {
        if (user) {
            initSocket(user.branchId, user.role);
            fetchSettings();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — runs once on mount only

    // ── Login ─────────────────────────────────────────────────────────────────
    const login = async (username, password) => {
        try {
            const res = await api.post('/api/auth/login', { username, password });
            const userData = res.data;

            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));

            initSocket(userData.branchId, userData.role);
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
        setSocketConnected(false);
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
            socketConnected,
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

