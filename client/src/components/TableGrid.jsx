import { useState, useEffect, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { Clock, Users, Lock, Sparkles, AlertTriangle } from 'lucide-react';

// ── Status color map ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    available: {
        bg: 'bg-emerald-900/20',
        border: 'border-emerald-500/50',
        hoverBg: 'hover:bg-emerald-900/30',
        text: 'text-emerald-400',
        dot: 'bg-emerald-500',
        label: 'Available',
        icon: Sparkles,
    },
    reserved: {
        bg: 'bg-yellow-900/20',
        border: 'border-yellow-500/50',
        hoverBg: '',
        text: 'text-yellow-400',
        dot: 'bg-yellow-500',
        label: 'Reserved',
        icon: Lock,
    },
    occupied: {
        bg: 'bg-red-900/20',
        border: 'border-red-500/50',
        hoverBg: '',
        text: 'text-red-400',
        dot: 'bg-red-500',
        label: 'Occupied',
        icon: Users,
    },
    billing: {
        bg: 'bg-orange-900/20',
        border: 'border-orange-500/50',
        hoverBg: '',
        text: 'text-orange-400',
        dot: 'bg-orange-500',
        label: 'Billing',
        icon: AlertTriangle,
    },
    cleaning: {
        bg: 'bg-gray-700/30',
        border: 'border-gray-500/50',
        hoverBg: 'hover:bg-gray-700/50',
        text: 'text-gray-400',
        dot: 'bg-gray-500',
        label: 'Cleaning',
        icon: Clock,
    },
};

const TableGrid = ({ onSelectTable, allowedStatuses = ['available'], showCleanAction = false }) => {
    const [tables, setTables] = useState([]);
    const { user, socket } = useContext(AuthContext);

    useEffect(() => {
        const fetchTables = async () => {
            try {
                const res = await api.get('/api/tables', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setTables(res.data);
            } catch (error) {
                console.error("Error fetching tables", error);
            }
        };

        if (user) fetchTables();

        if (socket) {
            socket.on('table-updated', (data) => {
                setTables(prev => prev.map(t =>
                    t._id === data.tableId
                        ? { ...t, status: data.status, lockedBy: data.lockedBy || null }
                        : t
                ));
            });
        }

        return () => {
            if (socket) socket.off('table-updated');
        };
    }, [user, socket]);

    const handleTableClick = async (table) => {
        // If table is available and we need to reserve it first
        if (table.status === 'available' && user.role === 'waiter') {
            try {
                const res = await api.put(
                    `/api/tables/${table._id}/reserve`,
                    {},
                    { headers: { Authorization: `Bearer ${user.token}` } }
                );
                // Update local state immediately
                setTables(prev => prev.map(t =>
                    t._id === table._id ? res.data : t
                ));
                // Pass the reserved table to parent
                onSelectTable(res.data);
            } catch (error) {
                alert(error.response?.data?.message || 'Failed to reserve table');
            }
            return;
        }

        // For other allowed statuses, just pass through
        if (allowedStatuses.includes(table.status)) {
            onSelectTable(table);
        }
    };

    const handleCleanTable = async (e, table) => {
        e.stopPropagation();
        try {
            await api.put(
                `/api/tables/${table._id}/clean`,
                {},
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setTables(prev => prev.map(t =>
                t._id === table._id ? { ...t, status: 'available', lockedBy: null } : t
            ));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to mark table as clean');
        }
    };

    const isClickable = (table) => {
        if (table.status === 'available') return true;
        if (showCleanAction && table.status === 'cleaning') return true;
        return allowedStatuses.includes(table.status);
    };

    return (
        <div>
            {/* Status Legend */}
            <div className="flex flex-wrap gap-4 mb-6">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    const count = tables.filter(t => t.status === key).length;
                    return (
                        <div key={key} className="flex items-center space-x-2 text-xs">
                            <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`}></span>
                            <span className="text-gray-400 font-medium">{config.label}</span>
                            <span className={`${config.text} font-bold`}>({count})</span>
                        </div>
                    );
                })}
            </div>

            {/* Table Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {tables.map(table => {
                    const config = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
                    const StatusIcon = config.icon;
                    const clickable = isClickable(table);

                    return (
                        <button
                            key={table._id}
                            onClick={() => clickable && handleTableClick(table)}
                            disabled={!clickable}
                            className={`
                                relative py-6 px-4 rounded-xl text-center transition-all shadow-md border-2 group
                                ${config.bg} ${config.border}
                                ${clickable
                                    ? `${config.hoverBg || 'hover:opacity-80'} cursor-pointer active:scale-95`
                                    : 'cursor-not-allowed opacity-60'
                                }
                            `}
                        >
                            {/* Status indicator dot */}
                            <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${config.dot} ${table.status === 'reserved' ? 'animate-pulse' : ''
                                }`} />

                            {/* Table number */}
                            <h3 className={`text-3xl font-bold ${config.text} mb-1`}>
                                {table.number}
                            </h3>

                            {/* Status label */}
                            <div className="flex items-center justify-center space-x-1 mb-2">
                                <StatusIcon size={12} className={config.text} />
                                <p className={`text-[10px] uppercase tracking-wider font-bold ${config.text}`}>
                                    {config.label}
                                </p>
                            </div>

                            {/* Capacity */}
                            <p className="text-xs text-gray-500">
                                <Users size={10} className="inline mr-1" />
                                {table.capacity} seats
                            </p>

                            {/* Clean button for cleaning tables */}
                            {showCleanAction && table.status === 'cleaning' && (
                                <button
                                    onClick={(e) => handleCleanTable(e, table)}
                                    className="mt-3 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    ✓ Mark Clean
                                </button>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TableGrid;

