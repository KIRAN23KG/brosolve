// src/pages/Admin/AdminCreate.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { AuthContext } from '../../contexts/AuthContext';

export default function AdminCreate() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user is superadmin
  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-4">Only superadmins can create admin accounts.</p>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2 bg-[#00ffda] text-black font-semibold rounded hover:opacity-80"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/admins/create', formData);
      setSuccess('Admin created successfully!');
      setFormData({ name: '', email: '', password: '' });
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold">Create Admin Account</h1>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="bro-card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-900/50 border border-red-600 rounded text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-900/50 border border-green-600 rounded text-green-200">
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full p-3 bg-gray-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#00ffda]"
                placeholder="Enter admin name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full p-3 bg-gray-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#00ffda]"
                placeholder="Enter admin email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full p-3 bg-gray-800 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#00ffda]"
                placeholder="Enter password (min 6 characters)"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-[#00ffda] text-black font-bold rounded hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Creating...' : 'Create Admin'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

