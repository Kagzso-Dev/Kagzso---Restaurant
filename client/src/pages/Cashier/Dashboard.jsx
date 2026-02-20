import { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import {
    Printer, Banknote, ChefHat, CheckCircle,
    ShoppingBag, RefreshCw, ArrowLeft, X
} from 'lucide-react';

/* ── Order status badge ──────────────────────────────────────────────────── */
const statusStyle = {
    ready: 'text-green-400 bg-green-500/10 border-green-500/20',
    preparing: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    pending: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    completed: 'text-gray-400 bg-gray-600/20 border-gray-600/20',
};

/* ── Order List Item ──────────────────────────────────────────────────────── */
const OrderItem = ({ order, selected, onClick, formatPrice }) => (
    <button
        onClick={onClick}
        className={`
            w-full text-left p-4 rounded-xl border transition-all duration-200 group
            ${selected
                ? 'bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/5'
                : 'bg-gray-800/60 border-gray-700/40 hover:bg-gray-700/40 hover:border-gray-600/60'
            }
        `}
    >
        <div className="flex justify-between items-start mb-1.5">
            <h3 className="font-bold text-white text-sm truncate pr-2">{order.orderNumber}</h3>
            <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold border flex-shrink-0 ${statusStyle[order.orderStatus] || statusStyle.pending}`}>
                {order.orderStatus}
            </span>
        </div>
        <div className="flex justify-between items-end mt-1">
            <p className="text-xs text-gray-400">
                {order.orderType === 'dine-in' ? `Table ${order.tableId?.number || order.tableId || '?'}` : `Token ${order.tokenNumber}`}
            </p>
            <p className="font-bold text-white text-sm">{formatPrice(order.finalAmount)}</p>
        </div>
        <p className="text-[10px] text-gray-600 mt-1">
            {order.items?.length || 0} items • {new Date(order.createdAt).toLocaleTimeString()}
        </p>
    </button>
);

/* ── Receipt ──────────────────────────────────────────────────────────────── */
const Receipt = ({ order, formatPrice, settings }) => (
    <div id="printable-receipt" className="w-full max-w-sm mx-auto bg-white text-black px-6 py-6 relative shadow-2xl">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <span className="text-[100px] font-black uppercase rotate-45">
                {settings?.restaurantName?.substring(0, 2).toUpperCase()}
            </span>
        </div>

        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4 relative z-10">
            <h1 className="text-2xl font-extrabold tracking-tight">{settings?.restaurantName}</h1>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-0.5">Main Branch</p>
            <p className="text-[10px] text-gray-400 mt-1">123 Culinary Ave, Food City</p>
            <p className="text-[10px] text-gray-400">GSTIN: 29ABCDE1234F1Z5</p>
        </div>

        {/* Meta */}
        <div className="flex justify-between text-[11px] mb-4 relative z-10">
            <div>
                <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                <p><strong>Time:</strong> {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="text-right">
                <p><strong>Invoice:</strong> #INV-{order.orderNumber?.split('-')[1]}</p>
                <p><strong>Order:</strong> {order.orderNumber}</p>
            </div>
        </div>

        {/* Items table */}
        <table className="w-full text-[11px] mb-4 relative z-10">
            <thead>
                <tr className="border-b border-gray-900">
                    <th className="py-1.5 text-left font-bold">Item</th>
                    <th className="py-1.5 text-center font-bold w-8">Qty</th>
                    <th className="py-1.5 text-right font-bold">Price</th>
                </tr>
            </thead>
            <tbody>
                {order.items?.map((item, i) => (
                    <tr key={i} className="border-b border-dashed border-gray-200">
                        <td className="py-2">{item.name}</td>
                        <td className="py-2 text-center">{item.quantity}</td>
                        <td className="py-2 text-right">{formatPrice(item.price * item.quantity)}</td>
                    </tr>
                ))}
            </tbody>
        </table>

        {/* Totals */}
        <div className="border-t-2 border-gray-900 pt-2 space-y-1 text-right relative z-10 mb-5">
            <div className="flex justify-between text-[11px]">
                <span>Subtotal:</span><span>{formatPrice(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
                <span>Tax:</span><span>{formatPrice(order.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-black border-t border-dashed border-gray-300 pt-2 mt-1">
                <span>Total:</span><span>{formatPrice(order.finalAmount)}</span>
            </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[9px] text-gray-400 border-t border-gray-200 pt-3 relative z-10">
            <p className="font-bold uppercase mb-1">Thank you for choosing {settings?.restaurantName}</p>
            <p>Powered by {settings?.restaurantName} Management System</p>
        </div>
    </div>
);

/* ── Main POS Component ──────────────────────────────────────────────────── */
const CashierDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showInvoice, setShowInvoice] = useState(false); // mobile panel toggle
    const { user, formatPrice, settings } = useContext(AuthContext);
    const navigate = useNavigate();

    /* ── Fetch Orders ────────────────────────────────────────────────── */
    const fetchOrders = useCallback(async () => {
        try {
            const res = await api.get('/api/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            // Update: data is now paginated object
            const unpaid = (res.data.orders || []).filter(o => o.paymentStatus !== 'paid');
            setOrders(unpaid);
            // Refresh selected
            if (selectedOrder) {
                const updated = unpaid.find(o => o._id === selectedOrder._id);
                setSelectedOrder(updated || null);
            }
        } catch (err) {
            console.error('Error fetching orders', err);
        } finally {
            setLoading(false);
        }
    }, [user, selectedOrder]);

    useEffect(() => {
        if (!user) return;
        fetchOrders();
        const id = setInterval(fetchOrders, 5000);
        return () => clearInterval(id);
    }, [user]);

    /* ── Select Order ────────────────────────────────────────────────── */
    const handleSelect = (order) => {
        setSelectedOrder(order);
        setPaymentSuccess(false);
        setShowInvoice(true); // on mobile, switch to invoice panel
    };

    /* ── Process Payment ─────────────────────────────────────────────── */
    const handleProcessPayment = async () => {
        if (!selectedOrder || paymentProcessing || paymentSuccess) return;
        if (selectedOrder.paymentStatus === 'paid') return;
        if (!window.confirm(`Confirm payment of ${formatPrice(selectedOrder.finalAmount)}?`)) return;

        setPaymentProcessing(true);
        try {
            await api.put(
                `/api/orders/${selectedOrder._id}/payment`,
                { paymentMethod: 'cash', amountPaid: selectedOrder.finalAmount },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setPaymentSuccess(true);
            setOrders(p => p.filter(o => o._id !== selectedOrder._id));
            setTimeout(() => {
                setSelectedOrder(null);
                setPaymentSuccess(false);
                setShowInvoice(false);
            }, 2500);
        } catch (err) {
            alert('Payment failed: ' + (err.response?.data?.message || 'Unknown error'));
        } finally {
            setPaymentProcessing(false);
        }
    };

    const isPayDisabled = !selectedOrder || paymentProcessing || paymentSuccess || selectedOrder?.paymentStatus === 'paid';

    /* ── Layout ─────────────────────────────────────────────────────── */
    return (
        <div className="flex flex-col gap-5 animate-fade-in">

            {/* Print styles injected via CSS global, not inline */}

            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-800/60 rounded-2xl p-4 sm:p-5 border border-gray-700/50">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-glow-orange flex-shrink-0">
                        {settings?.restaurantName?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">{settings?.restaurantName} POS</h1>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Cashier Terminal</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/cashier/kitchen-view')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors min-h-[44px]"
                    >
                        <ChefHat size={16} />
                        <span className="hidden sm:inline">Kitchen View</span>
                    </button>
                    <button
                        onClick={fetchOrders}
                        className="p-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 font-bold">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block mr-1.5 animate-pulse" />
                        Connected
                    </div>
                </div>
            </div>

            {/* ── POS Layout ────────────────────────────────────── */}
            {/*
             * Mobile (<768): Full-width stacked. List shown first; tap order → invoice slides in.
             * Tablet (768-1024): 2-panel (orders | invoice)
             * Desktop (1025+): Same 2-panel but in more spacious layout
             */}
            <div className="relative">

                {/* Mobile: Orders List Panel */}
                <div className={`
                    ${showInvoice ? 'hidden md:block' : 'block'}
                    md:float-none
                `}>
                    {/* Mobile back button */}
                    {showInvoice && (
                        <button
                            onClick={() => setShowInvoice(false)}
                            className="md:hidden flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-3 min-h-[44px]"
                        >
                            <ArrowLeft size={16} /> Back to orders
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-5 md:h-[calc(100vh-260px)]">

                    {/* ── Left: Order List ──────────────── */}
                    <div className={`
                        md:col-span-2 bg-gray-800 rounded-2xl border border-gray-700/50
                        overflow-hidden flex flex-col
                        ${showInvoice ? 'hidden md:flex' : 'flex'}
                    `}>
                        <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h2 className="text-base font-bold text-white">Pending Orders</h2>
                                <p className="text-xs text-gray-500">{orders.length} awaiting payment</p>
                            </div>
                            <span className="bg-orange-500/20 text-orange-400 text-xs px-2.5 py-1 rounded-full font-bold border border-orange-500/20">
                                {orders.length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
                            {loading ? (
                                Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)
                            ) : orders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-600">
                                    <ShoppingBag size={40} className="mb-2 opacity-30" />
                                    <p className="text-sm font-medium">No pending orders</p>
                                </div>
                            ) : (
                                orders.map(order => (
                                    <OrderItem
                                        key={order._id}
                                        order={order}
                                        selected={selectedOrder?._id === order._id}
                                        onClick={() => handleSelect(order)}
                                        formatPrice={formatPrice}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* ── Right: Invoice Panel ──────────── */}
                    <div className={`
                        md:col-span-3 bg-gray-800 rounded-2xl border border-gray-700/50
                        flex flex-col overflow-hidden relative
                        ${showInvoice ? 'flex' : 'hidden md:flex'}
                    `}>
                        {/* Mobile back */}
                        {showInvoice && (
                            <button
                                onClick={() => { setShowInvoice(false); }}
                                className="md:hidden flex items-center gap-2 p-3 text-sm text-gray-400 hover:text-white border-b border-gray-700/40 flex-shrink-0"
                            >
                                <ArrowLeft size={16} /> Back to order list
                            </button>
                        )}

                        {selectedOrder ? (
                            <div className="flex flex-col h-full overflow-hidden">
                                {/* Receipt Scroll Area */}
                                <div className="flex-1 overflow-y-auto bg-[#111827] relative custom-scrollbar">
                                    {/* Payment Success Overlay */}
                                    {paymentSuccess && (
                                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0f172a]/95 backdrop-blur-sm animate-scale-in">
                                            <div className="bg-emerald-500 rounded-full p-5 mb-4 shadow-glow-green animate-bounce">
                                                <CheckCircle size={44} className="text-white" />
                                            </div>
                                            <h3 className="text-2xl font-black text-white mb-1">Payment Successful!</h3>
                                            <p className="text-emerald-400 text-sm font-medium">Token closed • Order completed</p>
                                        </div>
                                    )}
                                    <div className="p-4 md:p-8 flex justify-center">
                                        <Receipt order={selectedOrder} formatPrice={formatPrice} settings={settings} />
                                    </div>
                                </div>

                                {/* Actions Bar */}
                                <div className="flex-shrink-0 p-4 md:p-5 bg-gray-800 border-t border-gray-700/50">
                                    <div className="flex items-center justify-between gap-4 flex-wrap">
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Amount Due</p>
                                            <p className="text-2xl md:text-3xl font-black text-white">
                                                {formatPrice(selectedOrder.finalAmount)}
                                            </p>
                                        </div>
                                        <div className="flex gap-3 flex-wrap">
                                            <button
                                                onClick={() => window.print()}
                                                className="flex items-center gap-2 px-4 md:px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold text-sm transition-colors min-h-[44px]"
                                            >
                                                <Printer size={17} />
                                                Print
                                            </button>
                                            <button
                                                onClick={handleProcessPayment}
                                                disabled={isPayDisabled}
                                                className={`
                                                    flex items-center gap-2 px-5 md:px-7 py-3 rounded-xl font-black text-sm
                                                    shadow-lg transition-all duration-200 min-h-[44px]
                                                    ${isPayDisabled
                                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                        : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-glow-green active:scale-95'
                                                    }
                                                `}
                                            >
                                                {paymentProcessing ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                        Processing...
                                                    </>
                                                ) : paymentSuccess ? (
                                                    <><CheckCircle size={17} /> Paid ✓</>
                                                ) : (
                                                    <><Banknote size={17} /> Pay Cash</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Empty state */
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center border-2 border-gray-700 mb-5 shadow-xl">
                                    <span className="text-3xl font-black bg-gradient-to-br from-orange-500 to-red-600 bg-clip-text text-transparent">
                                        {settings?.restaurantName?.substring(0, 2).toUpperCase()}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">No Order Selected</h3>
                                <p className="text-gray-500 text-sm max-w-xs">
                                    Select a pending order from the list to view the invoice and process payment.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashierDashboard;

