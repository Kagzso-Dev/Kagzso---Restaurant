import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import { ChefHat, Clock, RefreshCw, CheckCheck, Utensils, XCircle } from 'lucide-react';
import CancelOrderModal from '../../components/CancelOrderModal';

/* ── Status badge color ──────────────────────────────────────────────────── */
const ticketBg = {
    pending: { bar: 'bg-blue-500', badge: 'bg-blue-500/15 text-blue-400', glow: 'hover:shadow-blue-500/10' },
    accepted: { bar: 'bg-indigo-500', badge: 'bg-indigo-500/15 text-indigo-400', glow: 'hover:shadow-indigo-500/10' },
    preparing: { bar: 'bg-orange-500', badge: 'bg-orange-500/15 text-orange-400', glow: 'hover:shadow-orange-500/10' },
    ready: { bar: 'bg-green-500', badge: 'bg-green-500/15 text-green-400', glow: 'hover:shadow-green-500/10' },
};

/* ── Time since order ────────────────────────────────────────────────────── */
const useElapsed = (createdAt) => {
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        const calc = () => {
            const diff = Math.floor((Date.now() - new Date(createdAt)) / 1000);
            if (diff < 60) { setElapsed(`${diff}s`); return; }
            const m = Math.floor(diff / 60), s = diff % 60;
            if (m < 60) { setElapsed(`${m}m ${s}s`); return; }
            setElapsed(`${Math.floor(m / 60)}h ${m % 60}m`);
        };
        calc();
        const id = setInterval(calc, 1000);
        return () => clearInterval(id);
    }, [createdAt]);
    return elapsed;
};

/* ── KOT Ticket Card ─────────────────────────────────────────────────────── */
const KotTicket = ({ order, onUpdateStatus, onUpdateItemStatus, onCancel, onCancelItem, userRole }) => {
    const cfg = ticketBg[order.orderStatus] || ticketBg.pending;
    const elapsed = useElapsed(order.createdAt);

    // Urgency: warn if > 10 mins
    const urgency = (Date.now() - new Date(order.createdAt)) > 600000;

    return (
        <div className={`
            relative bg-[#131f35] rounded-2xl overflow-hidden border border-gray-700/50
            flex flex-col shadow-card hover:shadow-card-hover transition-all duration-300
            ${urgency ? 'border-red-500/30' : ''}
            animate-fade-in
        `}>
            {/* Top color bar */}
            <div className={`h-1.5 ${cfg.bar} ${urgency ? 'animate-pulse' : ''}`} />

            {/* Ticket Header */}
            <div className="p-4 border-b border-gray-700/40 text-left">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Order</p>
                        <h3 className="text-xl font-black text-white leading-none mt-0.5">{order.orderNumber}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {(order.orderStatus === 'pending' || order.orderStatus === 'accepted' || order.orderStatus === 'preparing') && (
                            <button
                                onClick={() => onCancel(order)}
                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
                                title="Cancel Order"
                            >
                                <XCircle size={14} />
                            </button>
                        )}
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${cfg.badge}`}>
                            {order.orderStatus}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                        {order.orderType === 'dine-in'
                            ? <><Utensils size={12} /> Table {order.tableId?.number || order.tableId || '?'}</>
                            : <><ChefHat size={12} /> Token {order.tokenNumber}</>
                        }
                    </span>
                    <span className={`flex items-center gap-1 font-mono ${urgency ? 'text-red-400 font-bold' : ''}`}>
                        <Clock size={11} />
                        {elapsed}
                    </span>
                </div>
            </div>

            {/* Items List */}
            <div className="flex-1 p-4 space-y-2.5 overflow-y-auto max-h-[280px] custom-scrollbar">
                {order.items.map(item => (
                    <div key={item._id} className="flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                                <div className={`
                                    w-6 h-6 rounded-lg flex-shrink-0
                                    flex items-center justify-center text-xs font-bold
                                    ${item.status === 'READY' || item.status === 'ready' ? 'bg-green-500/20 text-green-400' :
                                        item.status === 'PREPARING' || item.status === 'preparing' ? 'bg-orange-500/20 text-orange-400' :
                                            item.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 opacity-50' :
                                                'bg-gray-700 text-gray-300'}
                                `}>
                                    {item.quantity}
                                </div>
                                <div className="min-w-0 text-left">
                                    <p className={`text-sm font-semibold leading-tight ${['READY', 'ready'].includes(item.status) ? 'text-green-400 line-through' :
                                        item.status === 'CANCELLED' ? 'text-red-500/50 line-through' :
                                            'text-gray-100'
                                        }`}>
                                        {item.name}
                                    </p>
                                    {item.notes && item.status !== 'CANCELLED' && (
                                        <p className="text-[10px] text-gray-500 italic mt-0.5 truncate">
                                            "{item.notes}"
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Item action – kitchen only */}
                                {userRole === 'kitchen' && order.orderStatus !== 'ready' && item.status === 'PENDING' && (
                                    <button
                                        onClick={() => onUpdateItemStatus(order._id, item._id, 'PREPARING')}
                                        className="p-1.5 text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors"
                                        title="Start Preparing"
                                    >
                                        <CheckCheck size={14} />
                                    </button>
                                )}

                                {userRole === 'kitchen' &&
                                    (item.status?.toUpperCase() === 'PENDING' || item.status?.toUpperCase() === 'PREPARING') && (
                                        <button
                                            onClick={() => onCancelItem(order, item)}
                                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Cancel Item"
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    )}
                            </div>
                        </div>

                        {item.status === 'CANCELLED' && (
                            <div className="ml-8 mt-1 p-2 bg-red-500/10 rounded-lg border border-red-500/10">
                                <p className="text-[9px] text-red-400 font-bold uppercase tracking-tighter">
                                    Cancelled by {item.cancelledBy}
                                </p>
                                <p className="text-[10px] text-red-400/60 italic leading-tight mt-0.5">
                                    "{item.cancelReason}"
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            {(userRole === 'kitchen' || userRole === 'admin') && (
                <div className="p-3 border-t border-gray-700/40 flex gap-2 text-left">
                    {order.orderStatus === 'pending' && (
                        <button
                            onClick={() => onUpdateStatus(order._id, 'accepted')}
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 min-h-[44px]"
                        >
                            Accept
                        </button>
                    )}
                    {(order.orderStatus === 'accepted' || order.orderStatus === 'preparing') && (
                        <button
                            onClick={() => onUpdateStatus(order._id, order.orderStatus === 'accepted' ? 'preparing' : 'ready')}
                            className={`flex-1 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 min-h-[44px] ${order.orderStatus === 'accepted' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                        >
                            {order.orderStatus === 'accepted' ? 'Start Cooking' : 'Mark Ready ✓'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

/* ── Main Screen ─────────────────────────────────────────────────────────── */
const KitchenDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'cancelled'
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null, item: null });
    const { user, socket, settings } = useContext(AuthContext);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setOrders(res.data.orders || []);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Kitchen fetch error', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;

        fetchOrders();

        if (socket) {
            const onNewOrder = (order) => {
                setOrders(prev => {
                    if (prev.find(o => o._id === order._id)) return prev;
                    return [order, ...prev];
                });
            };

            const onUpdateOrder = (order) => {
                setOrders(prev => {
                    const exists = prev.find(o => o._id === order._id);
                    if (exists) {
                        return prev.map(o => o._id === order._id ? order : o);
                    } else {
                        return [order, ...prev];
                    }
                });
            };

            const onCancelled = (order) => {
                setOrders(prev => prev.map(o => o._id === order._id ? order : o));
            };

            socket.on('new-order', onNewOrder);
            socket.on('order-updated', onUpdateOrder);
            socket.on('order-completed', onUpdateOrder);
            socket.on('orderCancelled', onCancelled);
            socket.on('itemUpdated', onUpdateOrder);

            return () => {
                socket.off('new-order', onNewOrder);
                socket.off('order-updated', onUpdateOrder);
                socket.off('order-completed', onUpdateOrder);
                socket.off('orderCancelled', onCancelled);
                socket.off('itemUpdated', onUpdateOrder);
            };
        }
    }, [user, socket, fetchOrders]);


    const updateStatus = async (orderId, newStatus) => {
        try {
            await axios.put(`http://localhost:5000/api/orders/${orderId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
        } catch (err) { console.error(err); }
    };

    const updateItemStatus = async (orderId, itemId, newStatus) => {
        try {
            await axios.put(`http://localhost:5000/api/orders/${orderId}/items/${itemId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
        } catch (err) { console.error(err); }
    };

    const handleCancelAction = async (orderId, arg2, arg3) => {
        try {
            const isItem = arg3 !== undefined;
            const url = isItem
                ? `http://localhost:5000/api/orders/${orderId}/items/${arg2}/cancel`
                : `http://localhost:5000/api/orders/${orderId}/cancel`;
            const reason = isItem ? arg3 : arg2;

            await axios.put(url, { reason }, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
        } catch (err) {
            alert(err.response?.data?.message || "Action failed");
        }
    };

    const counts = {
        pending: orders.filter(o => o.orderStatus === 'pending').length,
        preparing: orders.filter(o => o.orderStatus === 'preparing' || o.orderStatus === 'accepted').length,
        ready: orders.filter(o => o.orderStatus === 'ready').length,
        cancelled: orders.filter(o => o.orderStatus === 'cancelled').length,
    };

    const displayOrders = activeTab === 'active'
        ? orders.filter(o => o.kotStatus === 'Open' && o.orderStatus !== 'cancelled')
        : orders.filter(o => o.orderStatus === 'cancelled');

    return (
        <div className="space-y-5 animate-fade-in pb-10 text-left">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-800/60 rounded-2xl p-4 sm:p-5 border border-gray-700/50">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-glow-orange flex-shrink-0">
                        {settings?.restaurantName?.substring(0, 2).toUpperCase() || 'KT'}
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-white">
                            Kitchen TV
                            <span className="text-gray-400 font-normal ml-2 text-sm md:text-base">Control Center</span>
                        </h1>
                        <p className="text-xs text-gray-500">
                            Watching {orders.filter(o => o.kotStatus === 'Open').length} live tickets
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchOrders}
                        className="p-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Refresh"
                    >
                        <RefreshCw size={17} />
                    </button>
                    <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-bold hidden sm:block">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block mr-1.5 animate-pulse" />
                        Live
                    </div>
                </div>
            </div>

            {/* ── Tabs & Stats ────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 p-1.5 bg-gray-800/50 rounded-2xl border border-gray-700/50 w-full sm:w-fit">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                    >
                        Active KOTs ({counts.pending + counts.preparing + counts.ready})
                    </button>
                    <button
                        onClick={() => setActiveTab('cancelled')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'cancelled' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                    >
                        Cancelled ({counts.cancelled})
                    </button>
                </div>

                {activeTab === 'active' && (
                    <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs text-left">
                        <span className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg font-bold border border-blue-500/20">
                            {counts.pending} Awaiting
                        </span>
                        <span className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-lg font-bold border border-orange-500/20">
                            {counts.preparing} Cooking
                        </span>
                        <span className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg font-bold border border-green-500/20">
                            {counts.ready} Ready
                        </span>
                    </div>
                )}
            </div>

            {/* ── KOT Grid ────────────────────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton rounded-2xl h-64" />)}
                </div>
            ) : displayOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                    {activeTab === 'active' ? (
                        <>
                            <ChefHat size={56} className="mb-4 opacity-20" />
                            <h3 className="text-xl font-bold text-gray-400">Kitchen is clear!</h3>
                            <p className="text-sm mt-1">No open KOTs in the queue</p>
                        </>
                    ) : (
                        <>
                            <ChefHat size={56} className="mb-4 opacity-20" />
                            <h3 className="text-xl font-bold text-gray-400">No cancellations</h3>
                            <p className="text-sm mt-1">Everything is running smoothly</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayOrders.map(order => (
                        <KotTicket
                            key={order._id}
                            order={order}
                            onUpdateStatus={updateStatus}
                            onUpdateItemStatus={updateItemStatus}
                            onCancel={(o) => setCancelModal({ isOpen: true, order: o, item: null })}
                            onCancelItem={(o, i) => setCancelModal({ isOpen: true, order: o, item: i })}
                            userRole={user.role}
                        />
                    ))}
                </div>
            )}

            <CancelOrderModal
                isOpen={cancelModal.isOpen}
                order={cancelModal.order}
                item={cancelModal.item}
                title={cancelModal.item ? "Cancel Item" : "Cancel Order"}
                onClose={() => setCancelModal({ isOpen: false, order: null, item: null })}
                onConfirm={handleCancelAction}
            />
        </div>
    );
};

export default KitchenDashboard;
