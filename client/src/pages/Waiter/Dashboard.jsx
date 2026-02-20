import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { PlusCircle, ChefHat, Grid, ShoppingBag, Clock, XCircle, History } from 'lucide-react';
import TableGrid from '../../components/TableGrid';
import CancelOrderModal from '../../components/CancelOrderModal';
import OrderDetailsModal from '../../components/OrderDetailsModal';

/* ── Status colors ───────────────────────────────────────────────────────── */
const statusStyle = {
    ready: { bar: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    preparing: { bar: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    pending: { bar: 'bg-blue-500', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
    accepted: { bar: 'bg-indigo-500', badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25' },
    cancelled: { bar: 'bg-red-500', badge: 'bg-red-500/15 text-red-500 border-red-500/25' },
};

/* ── Order Card ──────────────────────────────────────────────────────────── */
const OrderCard = ({ order, formatPrice, onCancel }) => {
    const s = statusStyle[order.orderStatus] || statusStyle.pending;
    return (
        <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700/50 animate-fade-in hover:shadow-card-hover transition-all duration-300 flex flex-col group">
            <div className={`h-1.5 ${s.bar}`} />
            <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="min-w-0 text-left">
                        <h3 className="font-bold text-white text-base truncate">{order.orderNumber}</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mt-0.5">
                            {order.orderType === 'dine-in' ? `Table ${order.tableId?.number || order.tableId || '?'}` : `Token ${order.tokenNumber}`}
                        </p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold border flex-shrink-0 ${s.badge}`}>
                        {order.orderStatus}
                    </span>
                </div>

                <p className="text-sm text-gray-400 line-clamp-2 flex-1 text-left">
                    {order.items?.map(i => `${i.quantity}× ${i.name}`).join(', ') || 'No items'}
                </p>

                {order.orderStatus === 'cancelled' && (
                    <div className="mt-2 text-[10px] text-red-400/80 italic text-left">
                        Cancelled by {order.cancelledBy}: {order.cancelReason}
                    </div>
                )}

                <div className="flex justify-between items-center border-t border-gray-700/50 mt-3 pt-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={11} />
                        {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-3">
                        {order.orderStatus === 'pending' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCancel(order); }}
                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Cancel Order"
                            >
                                <XCircle size={16} />
                            </button>
                        )}
                        <span className="font-bold text-white">{formatPrice(order.finalAmount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Main Component ───────────────────────────────────────────────────────── */
const WaiterDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'cancelled'
    const [showTables, setShowTables] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null, item: null });
    const { user, socket, formatPrice } = useContext(AuthContext);
    const navigate = useNavigate();

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setOrders(res.data.orders || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchOrders();

        if (socket) {
            const onNew = (o) => setOrders(p => {
                if (p.find(x => x._id === o._id)) return p;
                return [o, ...p];
            });
            const onUpdate = (o) => {
                setOrders(p => p.map(x => x._id === o._id ? o : x));
                if (selectedOrder?._id === o._id) setSelectedOrder(o);
            };

            socket.on('new-order', onNew);
            socket.on('order-updated', onUpdate);
            socket.on('orderCancelled', onUpdate);
            socket.on('itemUpdated', onUpdate); // Listen for item cancellation

            return () => {
                socket.off('new-order', onNew);
                socket.off('order-updated', onUpdate);
                socket.off('orderCancelled', onUpdate);
                socket.off('itemUpdated', onUpdate);
            };
        }
    }, [user, socket, fetchOrders, selectedOrder]);

    const handleCancelAction = async (orderId, arg2, arg3) => {
        try {
            const isItem = arg3 !== undefined;
            const url = isItem
                ? `/api/orders/${orderId}/items/${arg2}/cancel`
                : `/api/orders/${orderId}/cancel`;
            const reason = isItem ? arg3 : arg2;

            await api.put(url, { reason }, {
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

    const filteredOrders = activeTab === 'active'
        ? orders.filter(o => !['completed', 'cancelled'].includes(o.orderStatus))
        : orders.filter(o => o.orderStatus === 'cancelled');

    return (
        <div className="space-y-5 animate-fade-in pb-10 text-left">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-800/60 rounded-2xl p-4 sm:p-5 border border-gray-700/50">
                <div>
                    <h1 className="text-xl font-bold text-white">Waiter Console</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage live service and KOTs</p>
                </div>
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setShowTables(t => !t)}
                        className={`
                            flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all min-h-[44px]
                            ${showTables
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white'
                            }
                        `}
                    >
                        <Grid size={17} />
                        <span>Table Map</span>
                    </button>
                    <button
                        onClick={() => navigate('/waiter/new-order')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm transition-colors shadow-glow-orange min-h-[44px]"
                    >
                        <PlusCircle size={17} />
                        <span>New Order</span>
                    </button>
                </div>
            </div>

            {/* ── Tabs & Counters ─────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 p-1.5 bg-gray-800/50 rounded-2xl border border-gray-700/50 w-full sm:w-fit">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'active' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                    >
                        <ShoppingBag size={16} />
                        Active ({counts.pending + counts.preparing + counts.ready})
                    </button>
                    <button
                        onClick={() => setActiveTab('cancelled')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'cancelled' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                    >
                        <History size={16} />
                        Cancelled ({counts.cancelled})
                    </button>
                </div>

                {activeTab === 'active' && (
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-center">
                            <p className="text-2xl font-black text-blue-400">{counts.pending}</p>
                            <p className="text-[10px] uppercase font-bold text-blue-500 tracking-widest">Pending</p>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-center">
                            <p className="text-2xl font-black text-amber-400">{counts.preparing}</p>
                            <p className="text-[10px] uppercase font-bold text-amber-500 tracking-widest">Cooking</p>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-center">
                            <p className="text-2xl font-black text-emerald-400">{counts.ready}</p>
                            <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest">Ready</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Table Map (collapsible) ──────────────────────────── */}
            {showTables && (
                <div className="bg-gray-800/60 p-4 sm:p-5 rounded-2xl border border-gray-700/50 animate-fade-in">
                    <h2 className="text-base font-bold text-white mb-4">Table Status Overview</h2>
                    <TableGrid
                        allowedStatuses={['available']}
                        showCleanAction={true}
                        onSelectTable={() => navigate('/waiter/new-order')}
                    />
                </div>
            )}

            {/* ── Orders Grid ─────────────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton rounded-2xl h-48" />)}
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    {activeTab === 'active' ? (
                        <>
                            <ShoppingBag size={52} className="mb-3 opacity-20" />
                            <h3 className="text-lg font-bold text-gray-400">No active orders</h3>
                            <p className="text-sm mt-1">Tap "New Order" to create one</p>
                        </>
                    ) : (
                        <>
                            <History size={52} className="mb-3 opacity-20" />
                            <h3 className="text-lg font-bold text-gray-400">No cancelled orders</h3>
                            <p className="text-sm mt-1">Hooray! No wastage today.</p>
                        </>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrders.map(order => (
                        <div key={order._id} onClick={() => setSelectedOrder(order)} className="cursor-pointer">
                            <OrderCard
                                order={order}
                                formatPrice={formatPrice}
                                onCancel={(o) => setCancelModal({ isOpen: true, order: o, item: null })}
                            />
                        </div>
                    ))}
                </div>
            )}

            <OrderDetailsModal
                isOpen={!!selectedOrder}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                formatPrice={formatPrice}
                userRole={user.role}
                onCancelItem={(o, i) => setCancelModal({ isOpen: true, order: o, item: i })}
            />

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

export default WaiterDashboard;

