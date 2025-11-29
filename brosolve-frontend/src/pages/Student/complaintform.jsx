// src/pages/Student/ComplaintForm.jsx
import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { fetchCategories } from '../../api/categories';

export default function ComplaintForm() {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [centerType, setCenterType] = useState('online');
  const [contactMethod, setContactMethod] = useState('call');
  const [replyInWeb, setReplyInWeb] = useState(false);
  const [file, setFile] = useState(null);
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title || `${category} Complaint`);
    formData.append('category', category);
    formData.append('description', description);
    formData.append('centerType', centerType);
    formData.append('contactPreference', contactMethod);
    formData.append('allowWebReply', replyInWeb);
    // Also send old field names for backward compatibility
    formData.append('contactMethod', contactMethod);
    formData.append('replyInWeb', replyInWeb);
    if (file) formData.append('file', file);

    try {
      await api.post('/complaints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('✅ Complaint submitted successfully!');
      setCategory('');
      setDescription('');
      setFile(null);
      setTitle('');
      setCenterType('online');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit complaint');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bro-card w-full max-w-lg">
        <h2 className="text-2xl font-semibold mb-6 text-center">Raise Complaint</h2>

        <label className="block mb-2 text-sm text-gray-400">Title (optional)</label>
        <input
          type="text"
          className="w-full p-3 mb-4 bg-[#111] border border-[#333] rounded"
          placeholder="Complaint title (auto-generated if empty)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="block mb-2 text-sm text-gray-400">Center Type</label>
        <select
          className="w-full p-3 mb-4 bg-[#111] border border-[#333] rounded"
          value={centerType}
          onChange={(e) => setCenterType(e.target.value)}
          required
        >
          <option value="online">Online</option>
          <option value="brocamp">Brocamp</option>
        </select>

        <label className="block mb-2 text-sm text-gray-400">Category</label>
        <select
          className="w-full p-3 mb-4 bg-[#111] border border-[#333] rounded"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          disabled={categoriesLoading}
        >
          <option value="">-- Select Category --</option>
          {categories.map((c) => (
            <option key={c._id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <label className="block mb-2 text-sm text-gray-400">Description</label>
        <textarea
          rows="4"
          className="w-full p-3 mb-4 bg-[#111] border border-[#333] rounded"
          placeholder="Explain your issue clearly..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        ></textarea>

        <label className="block mb-2 text-sm text-gray-400">Preferred Contact</label>
        <select
          className="w-full p-3 mb-4 bg-[#111] border border-[#333] rounded"
          value={contactMethod}
          onChange={(e) => setContactMethod(e.target.value)}
        >
          <option value="call">Phone Call</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Gmail</option>
        </select>

        <label className="flex items-center mb-4 text-sm">
          <input
            type="checkbox"
            checked={replyInWeb}
            onChange={(e) => setReplyInWeb(e.target.checked)}
            className="mr-2"
          />
          I prefer reply within the web portal
        </label>

        <label className="block mb-2 text-sm text-gray-400">Attach File (optional)</label>
        <input
          type="file"
          accept="image/*,audio/*"
          className="w-full mb-4 text-gray-300"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button
          type="submit"
          className="w-full py-3 bg-[#00ffda] text-black font-bold rounded hover:opacity-80 transition"
        >
          Submit Complaint
        </button>

        {success && <p className="text-green-400 text-center mt-4">{success}</p>}
      </form>
    </div>
  );
}
