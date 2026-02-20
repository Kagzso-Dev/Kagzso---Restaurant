import { useState, useContext, useCallback, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { Outlet, Navigate } from 'react-router-dom';

/**
 * Responsive Layout
 *
 * Mobile  (<768px):  No sidebar. Full-width content + BottomNav bar.
 *                    Hamburger opens slide-in Drawer.
 * Tablet  (768-1024): Collapsible sidebar (icon-only by default), TopBar visible.
 * Desktop (1025px+): Permanent full sidebar, no BottomNav.
 */
const Layout = () => {
    const { user, loading } = useContext(AuthContext);

    // Controls whether the sidebar drawer is open on mobile/tablet
    const [drawerOpen, setDrawerOpen] = useState(false);
    // On tablet: sidebar collapsed to icon-only mode
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const openDrawer = useCallback(() => {
        setDrawerOpen(true);
        document.body.classList.add('drawer-open');
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        document.body.classList.remove('drawer-open');
    }, []);

    // Close drawer on route change (resize observer equivalent via resize event)
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1025) {
                closeDrawer();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [closeDrawer]);

    // ── Auth Guards ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm font-medium tracking-wide">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-screen bg-[#0f172a] text-gray-100 font-sans overflow-hidden">

            {/* ── Mobile / Tablet: Overlay backdrop when drawer open ─────── */}
            {drawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
                    onClick={closeDrawer}
                    aria-hidden="true"
                />
            )}

            {/* ── Sidebar ───────────────────────────────────────────────── */}
            {/*
             * Mobile (<768):  hidden by default, slides in as drawer
             * Tablet (768-1024): collapsible sidebar, always in DOM
             * Desktop (1025+): permanent sidebar
             */}
            <aside
                className={`
                    fixed top-0 left-0 h-full z-50
                    transition-transform duration-300 ease-in-out
                    ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0 lg:relative lg:flex-shrink-0
                `}
                style={{
                    width: sidebarCollapsed ? '80px' : '288px',
                    minWidth: sidebarCollapsed ? '80px' : '288px',
                }}
            >
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(c => !c)}
                    onClose={closeDrawer}
                />
            </aside>

            {/* ── Main Content Area ────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Bar with hamburger menu trigger */}
                <TopBar onMenuClick={openDrawer} sidebarCollapsed={sidebarCollapsed} />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 animate-fade-in">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
            <BottomNav />
        </div>
    );
};

export default Layout;

