import { X, Clock, User, Utensils, ChefHat, CheckCircle2, CreditCard, Banknote, QrCode, Printer, Wallet, ShoppingBag } from 'lucide-react';

const OrderDetailsModal = ({ order, isOpen, onClose, formatPrice, onProcessPayment, onCancelItem, userRole }) => {
    if (!isOpen || !order) return null;

    const isPaid = order.paymentStatus === 'paid';
    const isCompleted = order.orderStatus === 'completed';
    const isCancelled = order.orderStatus === 'cancelled';

    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'preparing': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'ready': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'pending': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    const canCancelItem = (item) => {
        if (!onCancelItem || isCompleted || isCancelled) return false;
        if (item.status === 'CANCELLED' || item.status === 'Cancelled') return false;
        if (userRole === 'waiter') return item.status?.toUpperCase() === 'PENDING';
        if (userRole === 'kitchen') return ['PENDING', 'PREPARING'].includes(item.status?.toUpperCase());
        if (userRole === 'admin' || userRole === 'cashier') return true;
        return false;
    };

    const getPaymentIcon = (method) => {
        switch (method?.toLowerCase()) {
            case 'cash': return <Banknote size={14} />;
            case 'upi': return <QrCode size={14} />;
            case 'credit_card':
            case 'card': return <CreditCard size={14} />;
            default: return <Wallet size={14} />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-[#0f1115] border border-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300 pointer-events-auto">

                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-800/50 flex justify-between items-center bg-[#161920]/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                            <ShoppingBag className="text-orange-500" size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black text-white tracking-tight">{order.orderNumber}</h2>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${getStatusStyle(order.orderStatus)}`}>
                                    {order.orderStatus}
                                </span>
                                {isCompleted && !isPaid && (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase border border-red-500/20 bg-red-500/10 text-red-500 tracking-widest animate-pulse">
                                        Payment Pending
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-500 text-xs font-bold flex items-center gap-2 mt-1 uppercase tracking-tighter">
                                <Clock size={12} className="text-orange-500" />
                                {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-800/50 hover:bg-red-500/20 hover:text-red-500 rounded-xl text-gray-400 transition-all border border-gray-700/50">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-12 max-h-[75vh] overflow-y-auto custom-scrollbar text-left">

                    {/* LEFT COLUMN: Order Info & Summary */}
                    <div className="md:col-span-5 p-8 border-r border-gray-800/50 bg-[#0c0e12]">
                        <div className="space-y-8">

                            {/* Status Section */}
                            <section className="bg-gray-800/20 p-5 rounded-[2rem] border border-gray-800/50">
                                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Service & Status</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Utensils size={16} className="text-orange-500" />
                                            <span className="text-sm font-bold text-gray-300">Order Method</span>
                                        </div>
                                        <span className="text-sm font-black text-white capitalize">{order.orderType}</span>
                                    </div>
                                    {order.orderType === 'dine-in' && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-orange-500 shadow-glow-orange" />
                                                <span className="text-sm font-bold text-gray-300">Table Number</span>
                                            </div>
                                            <span className="text-sm font-black text-orange-500">Table {order.tableId?.number || order.tableId}</span>
                                        </div>
                                    )}
                                    <div className="h-px bg-gray-800 my-2" />
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-gray-300">
                                            <CreditCard size={16} className={isPaid ? "text-emerald-500" : "text-red-500"} />
                                            <span className="text-sm font-bold">Payment Status</span>
                                        </div>
                                        <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-md border ${isPaid ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                            {isPaid ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </div>
                                    {isPaid && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {getPaymentIcon(order.paymentMethod)}
                                                <span className="text-sm font-bold text-gray-300">Paid Via</span>
                                            </div>
                                            <span className="text-sm font-black text-white uppercase">{order.paymentMethod || 'Cash'}</span>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Amount Summary */}
                            <section className="bg-orange-500/5 p-6 rounded-[2rem] border border-orange-500/10">
                                <h3 className="text-[10px] font-black text-orange-500/70 uppercase tracking-[0.2em] mb-4">Financial Summary</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400 font-bold tracking-tight">Subtotal</span>
                                        <span className="text-white font-black">{formatPrice(order.totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400 font-bold tracking-tight">Tax (GST)</span>
                                        <span className="text-white font-black">{formatPrice(order.tax)}</span>
                                    </div>
                                    {order.discount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-emerald-500 font-bold tracking-tight">Discount</span>
                                            <span className="text-emerald-500 font-black">-{formatPrice(order.discount)}</span>
                                        </div>
                                    )}
                                    <div className="pt-4 border-t border-orange-500/20 mt-2">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] text-orange-500/50 font-black uppercase tracking-tighter">Grand Total</p>
                                                <p className="text-3xl font-black text-white tracking-tighter leading-none mt-1">
                                                    {formatPrice(order.finalAmount)}
                                                </p>
                                            </div>
                                            <div className={`p-2 rounded-xl border ${isPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
                                                <CheckCircle2 size={24} strokeWidth={3} className={isPaid ? "opacity-100" : "opacity-20"} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Ordered Items */}
                    <div className="md:col-span-7 p-8 bg-[#0f1115]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Ordered Items</h3>
                            <span className="px-3 py-1 bg-gray-800 rounded-full text-[10px] font-black text-gray-400 border border-gray-700 uppercase">
                                {order.items.length} Total
                            </span>
                        </div>

                        <div className="space-y-3">
                            {order.items.map((item, idx) => (
                                <div key={idx} className={`
                                    group relative overflow-hidden bg-gray-800/20 border border-gray-800/50 rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-gray-800/40 hover:border-orange-500/30
                                    ${(item.status === 'CANCELLED' || item.status === 'Cancelled') ? 'opacity-40 grayscale' : ''}
                                `}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center font-black text-sm text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                            {item.quantity}x
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white tracking-tight">{item.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase border tracking-widest ${isCompleted ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : getStatusStyle(item.status)}`}>
                                                    {isCompleted ? 'Completed' : (item.status || 'Pending')}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-bold">{formatPrice(item.price)} each</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <p className="text-sm font-black text-white">{formatPrice(item.price * item.quantity)}</p>
                                        {canCancelItem(item) && (
                                            <button
                                                onClick={() => onCancelItem(order, item)}
                                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/10"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary of Items */}
                        <div className="mt-8 pt-6 border-t border-gray-800/50 space-y-4">
                            <div className="flex items-center gap-3 text-gray-500 bg-gray-800/10 p-4 rounded-2xl border border-gray-800/30">
                                <ChefHat size={16} />
                                <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tighter">
                                    {isCompleted
                                        ? `Token was processed & served at ${new Date(order.completedAt || order.updatedAt).toLocaleTimeString()}`
                                        : `Kitchen is processing ${order.items.filter(i => i.status !== 'CANCELLED' && i.status !== 'Cancelled').length} active items for this token.`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-800 bg-[#161920]/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic truncate max-w-[200px]">
                        ID: {order._id}
                    </p>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-black rounded-xl transition-all active:scale-95 text-xs uppercase tracking-widest border border-gray-700"
                        >
                            Close
                        </button>

                        {!isPaid && !isCancelled && (
                            <button
                                onClick={() => onProcessPayment && onProcessPayment(order)}
                                className="flex-1 sm:flex-none px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl shadow-glow-orange transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                            >
                                <Wallet size={16} /> Process Payment
                            </button>
                        )}

                        {!isCancelled && (
                            <button
                                disabled={!isPaid}
                                onClick={() => window.print()}
                                className={`
                                    flex-1 sm:flex-none px-8 py-3 font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-white tracking-[0.1em]
                                    ${isPaid
                                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-glow-green'
                                        : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                    }
                                `}
                            >
                                <Printer size={16} /> Print Bill
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsModal;
