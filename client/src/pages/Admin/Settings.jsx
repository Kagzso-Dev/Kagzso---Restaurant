import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Save, Lock, Settings as SettingsIcon, DollarSign } from 'lucide-react';

const Settings = () => {
    const { user, settings, fetchSettings } = useContext(AuthContext);
    const [generalConfig, setGeneralConfig] = useState({
        restaurantName: '',
        currency: 'USD',
        currencySymbol: '$',
        taxRate: 5,
        gstNumber: ''
    });

    const [passwordData, setPasswordData] = useState({
        role: 'admin',
        newPassword: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (settings) {
            setGeneralConfig({
                restaurantName: settings.restaurantName || '',
                currency: settings.currency || 'USD',
                currencySymbol: settings.currencySymbol || '$',
                taxRate: settings.taxRate || 0,
                gstNumber: settings.gstNumber || ''
            });
        }
    }, [settings]);

    const handleConfigChange = (e) => {
        const { name, value } = e.target;
        setGeneralConfig(prev => ({ ...prev, [name]: value }));

        // Auto-set symbol based on currency selection
        if (name === 'currency') {
            let symbol = '$';
            if (value === 'INR') symbol = '₹';
            if (value === 'EUR') symbol = '€';
            setGeneralConfig(prev => ({ ...prev, [name]: value, currencySymbol: symbol }));
        }
    };

    const handleConfigSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.put('http://localhost:5000/api/settings', generalConfig, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            await fetchSettings(); // Refresh context
            setMessage({ type: 'success', text: 'Settings updated successfully!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to update settings.' });
        }
        setLoading(false);
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match!' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }

        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/settings/change-password',
                {
                    role: passwordData.role,
                    newPassword: passwordData.newPassword
                },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setMessage({ type: 'success', text: `Password for ${passwordData.role} updated successfully!` });
            setPasswordData({ role: 'admin', newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to change password.' });
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <SettingsIcon className="text-gray-400" />
                System Settings
            </h2>

            {message && (
                <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-900/30 border-green-500/50 text-green-400' : 'bg-red-900/30 border-red-500/50 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            {/* General Configuration */}
            <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <DollarSign size={20} className="text-blue-400" />
                    General Configuration
                </h3>
                <form onSubmit={handleConfigSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Restaurant Name</label>
                        <input
                            type="text"
                            name="restaurantName"
                            value={generalConfig.restaurantName}
                            onChange={handleConfigChange}
                            className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Currency</label>
                        <select
                            name="currency"
                            value={generalConfig.currency}
                            onChange={handleConfigChange}
                            className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 transition-colors"
                        >
                            <option value="USD">USD ($)</option>
                            <option value="INR">INR (₹)</option>
                            <option value="EUR">EUR (€)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Tax Rate (%)</label>
                        <input
                            type="number"
                            name="taxRate"
                            value={generalConfig.taxRate}
                            onChange={handleConfigChange}
                            className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">GST/VAT Number</label>
                        <input
                            type="text"
                            name="gstNumber"
                            value={generalConfig.gstNumber}
                            onChange={handleConfigChange}
                            className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 transition-colors"
                            placeholder="e.g. 29ABCDE1234F1Z5"
                        />
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            <span>Save Configuration</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Security Settings */}
            <div className="bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Lock size={20} className="text-orange-400" />
                    Security Settings
                </h3>
                <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Select Staff Role</label>
                        <select
                            value={passwordData.role}
                            onChange={(e) => setPasswordData({ ...passwordData, role: e.target.value })}
                            className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 transition-colors"
                        >
                            <option value="admin">admin</option>
                            <option value="waiter">waiter</option>
                            <option value="kitchen">kitchen</option>
                            <option value="cashier">cashier</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">New Password</label>
                        <input
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 transition-colors"
                            placeholder="Min 6 characters"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Confirm New Password</label>
                        <input
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full bg-gray-700 text-white rounded-lg p-3 border border-gray-600 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center space-x-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Save size={18} />
                            <span>Update Password</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
