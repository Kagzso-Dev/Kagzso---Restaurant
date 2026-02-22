import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import { Search, Eye, ShoppingBag } from 'lucide-react';
import OrderDetailsModal from '../../components/OrderDetailsModal';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const { user, formatPrice, socket } = useContext(AuthContext);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await api.get('/api/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setOrders(res.data.orders || []);
        } catch (error) {
            console.error("Error fetching orders", error);
        }
    }, [user]);

    useEffect(() => {
        fetchOrders();

        if (socket) {
            const handleUpdate = (o) => setOrders(prev => prev.map(x => x._id === o._id ? o : x));
            const handleNew = (o) => setOrders(prev => [o, ...prev]);

            socket.on('new-order', handleNew);
            socket.on('order-updated', handleUpdate);
            socket.on('orderCancelled', handleUpdate);

            return () => {
                socket.off('new-order', handleNew);
                socket.off('order-updated', handleUpdate);
                socket.off('orderCancelled', handleUpdate);
            };
        }
    }, [user, socket, fetchOrders]);

    useEffect(() => {
        let temp = [...orders];

        if (filterStatus !== 'all') {
            temp = temp.filter(o => o.orderStatus === filterStatus);
        }

        if (searchQuery) {
            temp = temp.filter(o =>
                o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.customerInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredOrders(temp);
    }, [orders, filterStatus, searchQuery]);

    const handleProcessPayment = async (order) => {
        if (!window.confirm(`Process payment of ${formatPrice(order.finalAmount)} for ${order.orderNumber}?`)) return;

        try {
            const res = await api.put(`/api/orders/${order._id}/payment`, {
                paymentMethod: 'cash',
                amountPaid: order.finalAmount
            });

            if (res.data.success) {
                const updatedOrder = res.data.order;
                setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
                setSelectedOrder(updatedOrder);
            }
        } catch (error) {
            console.error("Payment error:", error);
            alert("Failed to process payment");
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'preparing': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'ready': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-gray-700/50 text-gray-400 border-gray-600';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gray-800 p-6 rounded-3xl shadow-xl border border-gray-700/50">
                <div>
                    <h2 className="text-2xl font-black text-white">Order History</h2>
                    <p className="text-sm text-gray-500 mt-1">Real-time performance overview</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search Order #..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 w-full md:w-64 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-gray-900/50 p-1.5 rounded-2xl border border-gray-700">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-transparent px-4 py-1.5 text-sm text-gray-300 font-bold focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 rounded-3xl shadow-xl border border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-900/50 text-gray-400 uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                <th className="px-6 py-5">Order ID</th>
                                <th className="px-6 py-5">Service</th>
                                <th className="px-6 py-5 text-center">Items</th>
                                <th className="px-6 py-5">Amount</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5 text-right pr-10">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map(order => (
                                    <tr key={order._id} className="group hover:bg-gray-700/30 transition-all duration-200">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white mb-0.5">{order.orderNumber}</span>
                                                <span className="text-[10px] text-gray-500 font-mono italic">
                                                    {new Date(order.createdAt).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-gray-300 capitalize">
                                                    {order.orderType}
                                                </span>
                                                <span className="text-[10px] text-orange-500/80 font-bold uppercase tracking-wider">
                                                    {order.orderType === 'dine-in' ? `Table ${order.tableId?.number || order.tableId}` : 'Takeaway'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-3 py-1 bg-gray-900/50 rounded-lg text-xs font-bold text-gray-400 border border-gray-700/50">
                                                {order.items.length}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-black text-white">{formatPrice(order.finalAmount)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border shadow-sm ${getStatusStyle(order.orderStatus)}`}>
                                                {order.orderStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right pr-10">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="p-2.5 bg-gray-900/50 hover:bg-orange-500 text-gray-400 hover:text-white rounded-xl transition-all duration-200 border border-gray-700 group-hover:border-orange-500/50 active:scale-95"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-500 opacity-50">
                                            <ShoppingBag size={48} className="mb-4" />
                                            <p className="text-lg font-bold">No orders found</p>
                                            <p className="text-sm">Try adjusting your filters or search terms</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <OrderDetailsModal
                isOpen={!!selectedOrder}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                formatPrice={formatPrice}
                onProcessPayment={handleProcessPayment}
            />
        </div>
    );
};

export default AdminOrders;
