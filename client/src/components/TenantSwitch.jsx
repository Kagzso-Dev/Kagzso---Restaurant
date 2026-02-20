import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { ShieldCheck } from 'lucide-react'; // Using icons that look administrative

const TenantSwitch = () => {
    const { user, isSuperAdmin, selectedTenantId, switchTenant } = useContext(AuthContext);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchTenants();
        }
    }, [isSuperAdmin]);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            // Ensure we don't send x-tenant-id when fetching list of tenants to avoid confusion/errors 
            // although superAdminOnly middleware should handle it. 
            // Note: The global axios instance might have the header set if we already selected one.
            // But getting the list requires superadmin role, which we have.
            const res = await axios.get('http://localhost:5000/api/superadmin/tenants');
            setTenants(res.data);
        } catch (error) {
            console.error("Failed to load tenants", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isSuperAdmin) return null;

    return (
        <div className="relative group">
            <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <ShieldCheck size={18} className="text-blue-400 mr-2" />
                <select
                    value={selectedTenantId || ""}
                    onChange={(e) => switchTenant(e.target.value)}
                    className="bg-transparent text-sm text-gray-200 font-medium focus:outline-none cursor-pointer appearance-none min-w-[150px]"
                    disabled={loading}
                >
                    <option value="" className="bg-gray-800 text-gray-400">Select Tenant Context</option>
                    {tenants.map((tenant) => (
                        <option key={tenant._id} value={tenant._id} className="bg-gray-800 text-white">
                            {tenant.name} {tenant.subdomain ? `(${tenant.subdomain})` : ''}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
            </div>
            {selectedTenantId && (
                <div className="absolute top-full mt-1 left-0 w-full text-center">
                    <span className="text-[10px] uppercase font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                        SuperAdmin Mode
                    </span>
                </div>
            )}
        </div>
    );
};

export default TenantSwitch;
