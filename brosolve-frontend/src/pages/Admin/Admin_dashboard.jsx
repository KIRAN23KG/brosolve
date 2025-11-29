// src/pages/Admin/AdminDashboard.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { AuthContext } from '../../contexts/AuthContext';
import { fetchCategories } from '../../api/categories';
import NotificationBell from '../../components/NotificationBell';

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    category: '',
    status: '',
    centerType: '',
    q: ''
  });
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err) {
      alert('Failed to load users');
    }
    setLoading(false);
  };

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const fetchComplaints = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.centerType) params.append('centerType', filters.centerType);
      if (filters.q) params.append('q', filters.q);
      
      const res = await api.get(`/complaints?${params.toString()}`);
      const data = res.data.complaints || res.data || [];
      setComplaints(data);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      alert('Failed to load complaints');
    } finally {
      setComplaintsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    loadCategories();
    fetchComplaints();
    // Polling every 20 seconds
    const interval = setInterval(() => {
      fetchComplaints();
    }, 20000);
    return () => clearInterval(interval);
  }, [filters.page, filters.category, filters.status, filters.centerType, filters.q]);

  const handleExport = async () => {
    try {
      const res = await api.get('/exports/complaints', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `complaints-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export complaints');
    }
  };

  const markSolved = async (id) => {
    try {
      await api.patch(`/complaints/${id}/solve`);
      alert('✅ Complaint marked as solved!');
      fetchComplaints(); // refresh list
    } catch (err) {
      alert('Failed to mark solved');
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'closed': return 'text-gray-500';
      case 'resolved': return 'text-green-400';
      case 'in_review': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold">Admin Panel</h1>
          <div className="flex gap-3 items-center">
            <NotificationBell />
            {user?.role === 'superadmin' && (
              <button
                onClick={() => navigate('/admin/create')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition"
              >
                Create Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Complaints</h2>
            <div className="flex gap-3">
              {user?.role === 'superadmin' && (
                <button
                  onClick={() => navigate('/admin/categories')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition"
                >
                  Manage Categories
                </button>
              )}
              <button
                onClick={() => navigate('/admin/analytics')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition"
              >
                Analytics Dashboard
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition"
              >
                Export CSV
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <input
              type="text"
              placeholder="Search..."
              value={filters.q}
              onChange={(e) => setFilters({...filters, q: e.target.value, page: 1})}
              className="p-2 bg-gray-800 rounded text-white"
            />
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value, page: 1})}
              className="p-2 bg-gray-800 rounded text-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
              className="p-2 bg-gray-800 rounded text-white"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_review">In Review</option>
              <option value="resolved">Resolved</option>
            </select>
            <select
              value={filters.centerType}
              onChange={(e) => setFilters({...filters, centerType: e.target.value, page: 1})}
              className="p-2 bg-gray-800 rounded text-white"
            >
              <option value="">All Centers</option>
              <option value="online">Online</option>
              <option value="brocamp">Brocamp</option>
              <option value="hybrid">Hybrid</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          {complaintsLoading ? (
            <p className="text-gray-400">Loading complaints...</p>
          ) : complaints.length === 0 ? (
            <p className="text-gray-400">No complaints found.</p>
          ) : (
            <div className="grid gap-4 mb-8">
              {complaints.map((c) => (
                <div key={c._id} className="bro-card">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-xl font-semibold">{c.title || c.category}</h3>
                      <p className="text-sm text-gray-400">
                        By: {c.raisedBy?.name || 'Unknown'} | {formatDate(c.createdAt)}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ${getStatusColor(c.status)}`}>
                      {c.status?.toUpperCase() || 'OPEN'}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-2">{c.description}</p>
                  <p className="text-sm text-gray-500 mb-2">
                    Category: {c.category} | Contact: {c.contactPreference || 'N/A'}
                  </p>
                  {c.attachments && c.attachments.length > 0 && (
                    <div className="mb-2">
                      {c.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={`http://localhost:4000${att.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#00ffda] underline mr-4"
                        >
                          View Attachment {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex gap-3">
                      <button
                        onClick={() => navigate(`/admin/complaint/${c._id}/chat`)}
                        className="px-4 py-2 bg-[#00ffda] text-black font-semibold rounded hover:opacity-80 transition text-sm"
                      >
                        💬 Chat
                      </button>
                      <a
                        href={`/admin/complaint/${c._id}/replies`}
                        className="text-[#00ffda] underline text-sm inline-block py-2"
                      >
                        View Replies
                      </a>
                    </div>
                    {c.status !== 'resolved' && c.status !== 'closed' && (
                      <button
                        onClick={() => markSolved(c._id)}
                        className="px-4 py-2 bg-[#00ffda] text-black font-bold rounded hover:opacity-80"
                      >
                        Mark as Solved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setFilters({...filters, page: Math.max(1, filters.page - 1)})}
                disabled={filters.page === 1}
                className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setFilters({...filters, page: Math.min(pagination.pages, filters.page + 1)})}
                disabled={filters.page === pagination.pages}
                className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-semibold mb-4">Users</h2>
        {loading ? (
          <p className="text-center text-gray-400">Loading users...</p>
        ) : (
          <div className="grid gap-4">
            {users.length === 0 && (
              <p className="text-center text-gray-400">No users found.</p>
            )}
            {users.map((u) => (
              <div key={u._id || u.id} className="bro-card">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold mb-1">{u.name}</h3>
                    <p className="text-gray-300 text-sm">{u.email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${
                    u.role === 'admin' ? 'bg-purple-600' : 
                    u.role === 'staff' ? 'bg-blue-600' : 
                    'bg-gray-600'
                  }`}>
                    {u.role?.toUpperCase() || 'STUDENT'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}