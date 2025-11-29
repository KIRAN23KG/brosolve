// src/pages/Admin/AdminCategories.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { fetchCategories, createCategory, updateCategory, deleteCategory, restoreCategory } from '../../api/categories';

export default function AdminCategories() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [includeInactive, setIncludeInactive] = useState(false);

  // Check if user is superadmin
  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchCategories(includeInactive);
      setCategories(data);
    } catch (err) {
      alert('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [includeInactive]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Category name is required');
      return;
    }

    try {
      await createCategory(formData.name, formData.description);
      alert('✅ Category created successfully!');
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleUpdate = async (id) => {
    if (!formData.name.trim()) {
      alert('Category name is required');
      return;
    }

    try {
      await updateCategory(id, formData);
      alert('✅ Category updated successfully!');
      setFormData({ name: '', description: '' });
      setEditingId(null);
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update category');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await deleteCategory(id);
      alert('✅ Category deleted successfully!');
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleRestore = async (id) => {
    try {
      await restoreCategory(id);
      alert('✅ Category restored successfully!');
      loadCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to restore category');
    }
  };

  const startEdit = (category) => {
    setEditingId(category._id);
    setFormData({ name: category.name, description: category.description || '' });
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">403 Forbidden</h2>
          <p className="text-gray-400">You don't have permission to access this page.</p>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold">Category Manager</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold transition"
            >
              Back to Dashboard
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Toggle inactive categories */}
        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="mr-2"
            />
            Show inactive categories
          </label>
        </div>

        {/* Create Category Button */}
        {!showCreateForm && !editingId && (
          <button
            onClick={() => {
              setShowCreateForm(true);
              setFormData({ name: '', description: '' });
            }}
            className="mb-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition"
          >
            + Create Category
          </button>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bro-card mb-6 p-6">
            <h2 className="text-xl font-semibold mb-4">Create New Category</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block mb-2 text-sm text-gray-400">Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 bg-[#111] border border-[#333] rounded text-white"
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 text-sm text-gray-400">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 bg-[#111] border border-[#333] rounded text-white"
                  rows="3"
                  placeholder="Enter description (optional)"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ name: '', description: '' });
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        {loading ? (
          <p className="text-gray-400">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="text-gray-400">No categories found.</p>
        ) : (
          <div className="grid gap-4">
            {categories.map((category) => (
              <div key={category._id} className="bro-card">
                {editingId === category._id ? (
                  <div className="p-4">
                    <h3 className="text-xl font-semibold mb-4">Edit Category</h3>
                    <div className="mb-4">
                      <label className="block mb-2 text-sm text-gray-400">Category Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-3 bg-[#111] border border-[#333] rounded text-white"
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block mb-2 text-sm text-gray-400">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full p-3 bg-[#111] border border-[#333] rounded text-white"
                        rows="3"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleUpdate(category._id)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{category.name}</h3>
                        {category.description && (
                          <p className="text-gray-300 mt-1">{category.description}</p>
                        )}
                        <p className="text-sm text-gray-400 mt-2">
                          Slug: {category.slug} | Created: {formatDate(category.createdAt)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm font-semibold ${
                        category.isActive ? 'bg-green-600' : 'bg-gray-600'
                      }`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => startEdit(category)}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition"
                      >
                        Edit
                      </button>
                      {category.isActive ? (
                        <button
                          onClick={() => handleDelete(category._id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition"
                        >
                          Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(category._id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

