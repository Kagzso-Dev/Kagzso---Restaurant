import { X, Clock, User, MessageCircle, Utensils, ChefHat, CheckCircle2, XCircle } from 'lucide-react';

const OrderDetailsModal = ({ order, isOpen, onClose, formatPrice, onCancelItem, userRole }) => {
    if (!isOpen || !order) return null;

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'cancelled': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'preparing':
            case 'PREPARING': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'ready':
            case 'READY': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'PENDING': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'CANCELLED': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'SERVED': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    const canCancelItem = (item) => {
        if (!onCancelItem) return false;
        if (item.status === 'CANCELLED') return false;

        if (userRole === 'waiter') {
            return item.status === 'PENDING';
        }
        if (userRole === 'kitchen') {
            return ['PENDING', 'PREPARING'].includes(item.status);
        }
        return false;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-white">{order.orderNumber}</h2>
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${getStatusColor(order.orderStatus)}`}>
                                {order.orderStatus}
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm flex items-center gap-2">
                            <Clock size={14} />
                            {new Date(order.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Left: Info */}
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Order Details</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-gray-300">
                                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                                        {order.orderType === 'dine-in' ? <Utensils size={16} /> : <ChefHat size={16} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Type</p>
                                        <p className="text-sm font-semibold capitalize">
                                            {order.orderType} {order.orderType === 'dine-in' && `• Table ${order.tableId?.number || order.tableId}`}
                                        </p>
                                    </div>
                                </div>
                                {order.customerInfo?.name && (
                                    <div className="flex items-center gap-3 text-gray-300">
                                        <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Customer</p>
                                            <p className="text-sm font-semibold">{order.customerInfo.name}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Order-level Cancellation Info */}
                        {order.orderStatus === 'cancelled' && (
                            <section className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 space-y-3">
                                <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                                    <XCircle size={14} /> Order Cancelled
                                </h3>
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-300">
                                        <span className="text-gray-500 font-medium">By:</span> {order.cancelledBy || 'System'}
                                    </p>
                                    <p className="text-sm text-gray-300">
                                        <span className="text-gray-500 font-medium">Reason:</span> {order.cancelReason || 'No reason specified'}
                                    </p>
                                </div>
                            </section>
                        )}

                        <section>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Amount Summary</h3>
                            <div className="bg-gray-800/40 rounded-2xl p-4 space-y-2 border border-gray-700/50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Subtotal</span>
                                    <span className="text-white font-medium">{formatPrice(order.totalAmount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Tax</span>
                                    <span className="text-white font-medium">{formatPrice(order.tax)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-700/50 mt-1">
                                    <span className="text-white font-bold">Total</span>
                                    <span className="text-orange-500 text-lg font-black">{formatPrice(order.finalAmount)}</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right: Items */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ordered Items ({order.items.length})</h3>
                        <div className="space-y-2.5">
                            {order.items.map((item, idx) => (
                                <div key={idx} className={`
                                    bg-gray-800/30 border rounded-2xl p-3 flex flex-col gap-2 transition-all
                                    ${item.status === 'CANCELLED' ? 'border-red-500/20 bg-red-500/5 opacity-80' : 'border-gray-800 hover:bg-gray-800/50'}
                                `}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm
                                                ${item.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-white'}
                                            `}>
                                                {item.quantity}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold leading-tight ${item.status === 'CANCELLED' ? 'text-gray-500 line-through' : 'text-white'}`}>
                                                    {item.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase border ${getStatusColor(item.status)}`}>
                                                        {item.status || 'PENDING'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500">{formatPrice(item.price)} each</span>
                                                </div>
                                            </div>
                                        </div>

                                        {canCancelItem(item) ? (
                                            <button
                                                onClick={() => onCancelItem(order, item)}
                                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
                                                title="Cancel Item"
                                            >
                                                <XCircle size={14} />
                                            </button>
                                        ) : (
                                            item.status !== 'CANCELLED' && (
                                                <CheckCircle2 size={16} className={`flex-shrink-0 ${item.status === 'READY' || item.status === 'ready' ? 'text-emerald-500' : 'text-gray-700'}`} />
                                            )
                                        )}
                                    </div>

                                    {item.notes && !item.cancelReason && (
                                        <p className="text-[10px] text-orange-400 font-medium italic flex items-center gap-1 ml-12">
                                            <MessageCircle size={10} /> "{item.notes}"
                                        </p>
                                    )}

                                    {item.status === 'CANCELLED' && (
                                        <div className="ml-12 mt-1 p-2 bg-red-500/10 rounded-lg border border-red-500/10">
                                            <p className="text-[10px] text-red-400 font-medium italic">
                                                Cancelled by {item.cancelledBy}: "{item.cancelReason}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all active:scale-95 text-sm"
                    >
                        Close
                    </button>
                    {order.orderStatus === 'completed' && (
                        <button className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-glow-green transition-all active:scale-95 flex items-center gap-2 text-sm">
                            <ChefHat size={16} /> Print Bill
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderDetailsModal;
