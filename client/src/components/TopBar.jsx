import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import TenantSwitch from './TenantSwitch';
import { Bell, Search, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

/**
 * Responsive TopBar
 * Props:
 *   onMenuClick      – opens sidebar drawer on mobile/tablet
 *   sidebarCollapsed – (unused visually, reserved for breadcrumb logic)
 */
const TopBar = ({ onMenuClick, sidebarCollapsed }) => {
    const { user, isSuperAdmin } = useContext(AuthContext);
    const location = useLocation();

    const getPageTitle = () => {
        const segments = location.pathname.split('/').filter(Boolean);
        if (!segments.length) return 'Dashboard';
        const last = segments[segments.length - 1];
        // Map slug → human title
        const titles = {
            admin: 'Dashboard',
            kitchen: 'Kitchen Display',
            cashier: 'Cashier POS',
            waiter: 'Waiter Mode',
            menu: 'Menu Items',
            tables: 'Table Map',
            categories: 'Categories',
            orders: 'Order History',
            settings: 'Settings',
            superadmin: 'Super Admin',
            'new-order': 'New Order',
            'working-process': 'Working Process',
            'kitchen-view': 'Kitchen View',
        };
        return titles[last] || (last.charAt(0).toUpperCase() + last.slice(1));
    };

    const getBreadcrumb = () => {
        const segments = location.pathname.split('/').filter(Boolean);
        return segments.map((seg, i) => {
            const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
            return (
                <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-gray-600">/</span>}
                    <span className={i === segments.length - 1 ? 'text-orange-400 font-semibold' : 'text-gray-500'}>
                        {label}
                    </span>
                </span>
            );
        });
    };

    const isKitchenView = location.pathname.includes('kitchen');

    return (
        <header className="
            sticky top-0 z-30 flex items-center justify-between
            px-4 md:px-6 lg:px-8 h-16
            bg-[#0f172a]/90 backdrop-blur-md
            border-b border-gray-800/60
            flex-shrink-0
        ">
            {/* ── Left: Hamburger + Title ──────────────────────────────── */}
            <div className="flex items-center gap-3 min-w-0">
                {/* Hamburger – hidden on desktop */}
                <button
                    onClick={onMenuClick}
                    className="
                        lg:hidden flex-shrink-0
                        p-2 rounded-lg text-gray-400 hover:text-white
                        hover:bg-gray-800 transition-colors
                        min-h-[44px] min-w-[44px] flex items-center justify-center
                    "
                    aria-label="Open menu"
                >
                    <Menu size={22} />
                </button>

                <div className="min-w-0">
                    <h1 className="text-lg font-bold text-white truncate leading-tight">
                        {getPageTitle()}
                    </h1>
                    {/* Breadcrumb – tablet+ only */}
                    <div className="hidden md:flex items-center gap-1 text-xs mt-0.5">
                        {getBreadcrumb()}
                    </div>
                    {/* Welcome text – mobile only (hidden on tablet+) */}
                    <p className="md:hidden text-xs text-gray-500 mt-0.5 truncate">
                        {user?.username}
                    </p>
                </div>
            </div>

            {/* ── Right: Search + Tenant + Notifications ───────────────── */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                {!isKitchenView && (
                    <>
                        {/* Search – hidden on mobile */}
                        <div className="hidden md:flex items-center bg-gray-800/80 rounded-xl px-3 py-2 border border-gray-700/60 focus-within:border-orange-500/50 transition-all gap-2">
                            <Search size={16} className="text-gray-400 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="
                                    bg-transparent text-sm text-white placeholder-gray-500
                                    focus:outline-none w-32 md:w-40 lg:w-48
                                    border-none p-0 min-h-0
                                "
                            />
                        </div>

                        {/* Notifications */}
                        <button
                            className="
                                relative p-2 text-gray-400 hover:text-white
                                bg-gray-800/80 hover:bg-gray-700 rounded-xl
                                transition-colors min-h-[44px] min-w-[44px]
                                flex items-center justify-center
                            "
                            aria-label="Notifications"
                        >
                            <Bell size={19} />
                            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full ring-2 ring-[#0f172a]" />
                        </button>

                        {/* User avatar – desktop only */}
                        <div className="hidden lg:flex items-center gap-2.5">
                            <div className="text-right">
                                <p className="text-sm font-semibold text-white leading-tight">{user?.username}</p>
                                <p className="text-[10px] text-gray-500 capitalize">{user?.role}</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </>
                )}

                {/* Tenant Switch – SuperAdmin only - Keep this separate as it might be needed even in kitchen */}
                {isSuperAdmin && (
                    <div className="border-l border-gray-700 pl-4">
                        <TenantSwitch />
                    </div>
                )}
            </div>
        </header>
    );
};

export default TopBar;

