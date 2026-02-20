import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { Trash2, Plus, Edit2 } from 'lucide-react';

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const { user } = useContext(AuthContext);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/categories');
            setCategories(res.data);
        } catch (error) {
            console.error("Error fetching categories", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this category?')) return;
        try {
            await axios.delete(`http://localhost:5000/api/categories/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setCategories(categories.filter(c => c._id !== id));
        } catch (error) {
            console.error(error);
            alert("Error deleting category");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                const res = await axios.put(`http://localhost:5000/api/categories/${editingCategory._id}`, formData, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setCategories(categories.map(c => c._id === editingCategory._id ? res.data : c));
            } else {
                const res = await axios.post('http://localhost:5000/api/categories', formData, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setCategories([...categories, res.data]);
            }
            closeModal();
        } catch (error) {
            console.error(error);
            alert("Error saving category");
        }
    };

    const openModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({ name: category.name, description: category.description });
        } else {
            setEditingCategory(null);
            setFormData({ name: '', description: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                <h2 className="text-2xl font-bold text-white">Categories</h2>
                <button
                    onClick={() => openModal()}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={18} />
                    <span>Add Category</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(cat => (
                    <div key={cat._id} className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex justify-between items-start group hover:border-blue-500/50 transition-colors">
                        <div>
                            <h3 className="font-bold text-white text-lg">{cat.name}</h3>
                            <p className="text-gray-400 text-sm mt-1">{cat.description}</p>
                            <span className="inline-block mt-3 text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded border border-blue-500/20">
                                {cat._id.slice(-6)}
                            </span>
                        </div>
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(cat)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                                <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(cat._id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md shadow-2xl border border-gray-700 animate-fade-in">
                        <h3 className="text-xl font-bold text-white mb-6">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Name</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="w-full bg-gray-700 text-white rounded-lg p-2 border border-gray-600 focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-gray-700 text-white rounded-lg p-2 border border-gray-600 focus:border-blue-500" rows="3"></textarea>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCategories;
