import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import NotificationBell from "../../components/NotificationBell";

export default function StudentDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchComplaints = async () => {
    try {
      const res = await api.get('/complaints');
      const data = res.data.complaints || res.data || [];
      setComplaints(data);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    // Polling every 20 seconds
    const interval = setInterval(() => {
      fetchComplaints();
    }, 20000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold">Welcome, {user?.name || "Student"}</h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="mb-6">
          <Link
            to="/student/complaint"
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded font-semibold transition inline-block"
          >
            + Create New Complaint
          </Link>
        </div>

        <h2 className="text-2xl font-semibold mb-4">My Complaints</h2>
        {loading ? (
          <p className="text-gray-400">Loading complaints...</p>
        ) : complaints.length === 0 ? (
          <div className="bro-card">
            <p className="text-gray-300">No complaints yet. Create your first complaint!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {complaints.map((complaint) => (
              <div key={complaint._id} className="bro-card">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-semibold">{complaint.title || complaint.category}</h3>
                    <p className="text-sm text-gray-400">{formatDate(complaint.createdAt)}</p>
                  </div>
                  <span className={`text-sm font-semibold ${getStatusColor(complaint.status)}`}>
                    {complaint.status?.toUpperCase() || 'OPEN'}
                  </span>
                </div>
                <p className="text-gray-300 mb-2">{complaint.description}</p>
                <p className="text-sm text-gray-500">Category: {complaint.category}</p>
                <div className="flex gap-3 mt-3">
                  <Link
                    to={`/student/complaint/${complaint._id}/chat`}
                    className="px-4 py-2 bg-[#00ffda] text-black font-semibold rounded hover:opacity-80 transition text-sm"
                  >
                    💬 Chat
                  </Link>
                  <Link
                    to={`/student/complaint/${complaint._id}/replies`}
                    className="text-[#00ffda] underline text-sm inline-block py-2"
                  >
                    View Replies
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

