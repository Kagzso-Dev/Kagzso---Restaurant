import { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import {
    Trash2, Plus, RotateCcw, Users, Lock, Clock,
    Sparkles, AlertTriangle, X, Table2
} from 'lucide-react';

/* ── Status Config ────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
    available: { color: 'bg-emerald-500', ring: 'ring-emerald-500/30', text: 'text-emerald-400', label: 'Available', icon: Sparkles, border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
    reserved: { color: 'bg-yellow-500', ring: 'ring-yellow-500/30', text: 'text-yellow-400', label: 'Reserved', icon: Lock, border: 'border-yellow-500/20', glow: 'shadow-yellow-500/10' },
    occupied: { color: 'bg-red-500', ring: 'ring-red-500/30', text: 'text-red-400', label: 'Occupied', icon: Users, border: 'border-red-500/20', glow: 'shadow-red-500/10' },
    billing: { color: 'bg-orange-500', ring: 'ring-orange-500/30', text: 'text-orange-400', label: 'Billing', icon: AlertTriangle, border: 'border-orange-500/20', glow: 'shadow-orange-500/10' },
    cleaning: { color: 'bg-gray-500', ring: 'ring-gray-500/30', text: 'text-gray-400', label: 'Cleaning', icon: Clock, border: 'border-gray-500/20', glow: 'shadow-gray-500/10' },
};

/* ── Table Card ───────────────────────────────────────────────────────────── */
const TableCard = ({ table, onDelete, onReset }) => {
    const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
    const StatusIcon = config.icon;
    const isActive = table.status !== 'available';

    return (
        <div className={`
            relative bg-gray-800 rounded-2xl border overflow-hidden
            flex flex-col items-center justify-between
            p-4 min-h-[140px] sm:min-h-[160px]
            transition-all duration-300 group
            hover:shadow-xl
            ${config.border}
        `}>
            {/* Top color bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />

            {/* Actions (visible on hover) */}
            <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                {isActive && (
                    <button
                        onClick={() => onReset(table._id)}
                        title="Force Reset"
                        className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                        <RotateCcw size={14} />
                    </button>
                )}
                <button
                    onClick={() => onDelete(table._id)}
                    title="Delete"
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Table Number */}
            <div className="text-center mt-2 flex-1 flex flex-col items-center justify-center">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Table</span>
                <span className="text-4xl sm:text-5xl font-black text-white leading-none mt-1">{table.number}</span>
            </div>

            {/* Footer: capacity + status */}
            <div className="w-full border-t border-gray-700/50 pt-2.5 mt-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-gray-500">
                    <Users size={12} />
                    {table.capacity}
                </span>
                <div className="flex items-center gap-1.5">
                    <StatusIcon size={11} className={config.text} />
                    <span className={`font-bold uppercase text-[10px] ${config.text}`}>{config.label}</span>
                    <span className={`w-2 h-2 rounded-full ${config.color} ${table.status === 'reserved' ? 'animate-pulse' : ''}`} />
                </div>
            </div>
        </div>
    );
};

/* ── Add Table Modal ─────────────────────────────────────────────────────── */
const AddTableModal = ({ defaultNumber, onClose, onSubmit }) => {
    const [form, setForm] = useState({ number: defaultNumber, capacity: 4 });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-[#1e293b] rounded-2xl w-full max-w-sm shadow-2xl border border-gray-700/50 animate-slide-up overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
                    <h3 className="text-lg font-bold text-white">Add New Table</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <form
                    onSubmit={e => { e.preventDefault(); onSubmit(form); }}
                    className="p-6 space-y-4"
                >
                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-medium">Table Number</label>
                        <input
                            type="number"
                            value={form.number}
                            onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                            required
                            className="w-full bg-gray-900/60 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-orange-500 text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-medium">Seating Capacity</label>
                        <input
                            type="number"
                            value={form.capacity}
                            onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                            required min="1" max="20"
                            className="w-full bg-gray-900/60 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-orange-500 text-base"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-colors font-medium text-sm">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm transition-colors">
                            Add Table
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── Main Component ───────────────────────────────────────────────────────── */
const AdminTables = () => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const { user, socket } = useContext(AuthContext);

    useEffect(() => {
        fetchTables();
        if (socket) {
            const handler = (data) => {
                setTables(prev => prev.map(t =>
                    t._id === data.tableId
                        ? { ...t, status: data.status, lockedBy: data.lockedBy || null }
                        : t
                ));
            };
            socket.on('table-updated', handler);
            return () => socket.off('table-updated', handler);
        }
    }, [socket]);

    const fetchTables = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/tables', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setTables(res.data.sort((a, b) => parseInt(a.number) - parseInt(b.number)));
        } catch (err) {
            console.error('Error fetching tables', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this table?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/tables/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setTables(p => p.filter(t => t._id !== id));
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting table');
        }
    };

    const handleForceReset = async (id) => {
        if (!window.confirm('Force reset this table to Available?')) return;
        try {
            const res = await axios.put(`http://localhost:5000/api/tables/${id}/force-reset`, {}, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setTables(p => p.map(t => t._id === id ? res.data.table : t));
        } catch (err) {
            alert(err.response?.data?.message || 'Error resetting table');
        }
    };

    const handleAddTable = async (formData) => {
        try {
            const res = await axios.post('http://localhost:5000/api/tables', formData, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setTables(p => [...p, res.data].sort((a, b) => parseInt(a.number) - parseInt(b.number)));
            setIsModalOpen(false);
        } catch (err) {
            alert('Error creating table: ' + (err.response?.data?.message || err.message));
        }
    };

    /* ── Derived ─────────────────────────────────────────────────────── */
    const statusCounts = useMemo(() => {
        const counts = {};
        Object.keys(STATUS_CONFIG).forEach(s => { counts[s] = tables.filter(t => t.status === s).length; });
        return counts;
    }, [tables]);

    const filteredTables = useMemo(() =>
        statusFilter === 'all' ? tables : tables.filter(t => t.status === statusFilter)
        , [tables, statusFilter]);

    const nextTableNum = tables.length > 0
        ? Math.max(...tables.map(t => parseInt(t.number))) + 1
        : 1;

    return (
        <div className="space-y-5 animate-fade-in">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-800/60 rounded-2xl p-5 border border-gray-700/50">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-white">Table Management</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{tables.length} tables configured</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm transition-colors shadow-glow-orange min-h-[44px]"
                >
                    <Plus size={18} />
                    Add Table
                </button>
            </div>

            {/* ── Status Strip ────────────────────────────────────────── */}
            {/* Mobile: 2-col, sm: 3-col, lg: 5-col */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                        key={key}
                        onClick={() => setStatusFilter(k => k === key ? 'all' : key)}
                        className={`
                            flex items-center gap-3 p-4 rounded-xl border transition-all text-left
                            ${statusFilter === key
                                ? `bg-gray-700 ${config.border}`
                                : 'bg-gray-800/60 border-gray-700/40 hover:border-gray-600'
                            }
                        `}
                    >
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${config.color}`} />
                        <div className="min-w-0">
                            <p className="text-[10px] text-gray-500 uppercase font-bold truncate">{config.label}</p>
                            <p className={`text-2xl font-black ${config.text}`}>{statusCounts[key] || 0}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* ── Tables Grid ─────────────────────────────────────────── */}
            {/* Mobile: 2-col, sm: 3-col, md: 4-col, lg: 5-col, xl: 6-col */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {Array(12).fill(0).map((_, i) => (
                        <div key={i} className="skeleton rounded-2xl min-h-[140px]" />
                    ))}
                </div>
            ) : filteredTables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Table2 size={52} className="mb-3 opacity-20" />
                    <p className="font-semibold text-lg">No tables found</p>
                    <p className="text-sm mt-1">
                        {statusFilter !== 'all' ? `No ${statusFilter} tables` : 'Add your first table to get started'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredTables.map(table => (
                        <TableCard
                            key={table._id}
                            table={table}
                            onDelete={handleDelete}
                            onReset={handleForceReset}
                        />
                    ))}
                </div>
            )}

            {/* ── Modal ───────────────────────────────────────────────── */}
            {isModalOpen && (
                <AddTableModal
                    defaultNumber={nextTableNum}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleAddTable}
                />
            )}
        </div>
    );
};

export default AdminTables;
