// src/components/ReplyThread.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../contexts/AuthContext';

export default function ReplyThread() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReplies = async () => {
    try {
      const res = await api.get(`/replies/complaint/${id}`);
      setReplies(res.data.replies || []);
    } catch (err) {
      console.error('Failed to load replies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
    // Polling every 20 seconds
    const interval = setInterval(fetchReplies, 20000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    
    setSubmitting(true);
    try {
      await api.post(`/replies/complaint/${id}`, { text: replyText });
      setReplyText('');
      fetchReplies();
    } catch (err) {
      alert('Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <p className="text-gray-400">Loading replies...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Reply Thread</h2>
        
        <div className="mb-6">
          {replies.length === 0 ? (
            <div className="bro-card">
              <p className="text-gray-300">No replies yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {replies.map((reply) => (
                <div key={reply._id} className="bro-card">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{reply.by?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-400">{formatDate(reply.createdAt)}</p>
                    </div>
                    {reply.by?.role && (
                      <span className="text-xs text-gray-500">{reply.by.role.toUpperCase()}</span>
                    )}
                  </div>
                  <p className="text-gray-300 mb-2">{reply.text}</p>
                  {reply.attachments && reply.attachments.length > 0 && (
                    <div className="mt-2">
                      {reply.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={`http://localhost:4000${att.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#00ffda] underline mr-4 text-sm"
                        >
                          Attachment {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bro-card">
          <h3 className="text-lg font-semibold mb-4">Add Reply</h3>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            rows="4"
            className="w-full p-3 mb-4 bg-gray-800 rounded text-white"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-[#00ffda] text-black font-bold rounded hover:opacity-80 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Reply'}
          </button>
        </form>
      </div>
    </div>
  );
}

