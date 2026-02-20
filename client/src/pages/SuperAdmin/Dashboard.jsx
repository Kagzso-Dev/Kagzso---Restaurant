import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import { Users, Building, AlertCircle } from 'lucide-react';

const SuperAdminDashboard = () => {
    const { user, isSuperAdmin, selectedTenantId, switchTenant } = useContext(AuthContext);
    const [tenants, setTenants] = useState([]);
    const [stats, setStats] = useState({ tenants: 0, branches: 0, users: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchData();
        }
    }, [isSuperAdmin]);

    const fetchData = async () => {
        try {
            const [tenantsRes, statsRes] = await Promise.all([
                api.get('/api/superadmin/tenants'),
                api.get('/api/superadmin/stats')
            ]);
            setTenants(tenantsRes.data);
            setStats(statsRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch superadmin data", error);
            setLoading(false);
        }
    };

    if (loading) return <div className="text-white p-6">Loading SuperAdmin Dashboard...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm uppercase font-bold">Total Tenants</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{stats.tenants}</h3>
                        </div>
                        <Building size={32} className="text-blue-500 opacity-50" />
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm uppercase font-bold">Total Branches</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{stats.branches}</h3>
                        </div>
                        <Building size={32} className="text-green-500 opacity-50" />
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm uppercase font-bold">Total Users</p>
                            <h3 className="text-3xl font-bold text-white mt-1">{stats.users}</h3>
                        </div>
                        <Users size={32} className="text-purple-500 opacity-50" />
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">All Tenants</h2>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Add New Tenant
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-750 text-gray-200 uppercase text-xs font-semibold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Subscription</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Subdomain</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {tenants.map(tenant => (
                                <tr key={tenant._id} className={`hover:bg-gray-700/50 transition-colors ${selectedTenantId === tenant._id ? 'bg-blue-900/10' : ''}`}>
                                    <td className="px-6 py-4 font-medium text-white flex items-center space-x-2">
                                        <span>{tenant.name}</span>
                                        {selectedTenantId === tenant._id && (
                                            <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded uppercase font-bold">Active</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`uppercase font-bold text-xs px-2 py-1 rounded ${tenant.subscriptionPlan === 'enterprise' ? 'bg-purple-900/30 text-purple-400' :
                                                tenant.subscriptionPlan === 'pro' ? 'bg-green-900/30 text-green-400' :
                                                    'bg-gray-700 text-gray-300'
                                            }`}>
                                            {tenant.subscriptionPlan}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {tenant.isActive ? (
                                            <span className="text-green-400 flex items-center text-xs font-bold uppercase tracking-wider">
                                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> Active
                                            </span>
                                        ) : (
                                            <span className="text-red-400 flex items-center text-xs font-bold uppercase tracking-wider">
                                                <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span> Suspended
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{tenant.subdomain || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => switchTenant(tenant._id)}
                                            className="text-blue-400 hover:text-white text-xs font-bold uppercase border border-blue-500/30 px-3 py-1.5 rounded hover:bg-blue-600 transition-all mr-2"
                                        >
                                            Manage
                                        </button>
                                        <button className="text-gray-400 hover:text-white">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* If a tenant is selected, show a quick jump card */}
            {selectedTenantId && (
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <AlertCircle className="text-blue-400" />
                        <div>
                            <p className="text-blue-200 font-medium">You are currently managing a specific tenant.</p>
                            <p className="text-blue-400/60 text-sm">Switch back to global view or navigate to admin dashboard.</p>
                        </div>
                    </div>
                    <a href="/admin" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Go to Tenant Dashboard
                    </a>
                </div>
            )}
        </div>
    );
};

export default SuperAdminDashboard;

