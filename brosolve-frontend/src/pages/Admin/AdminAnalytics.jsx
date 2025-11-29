// src/pages/Admin/AdminAnalytics.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trends7Days, setTrends7Days] = useState([]);
  const [trends30Days, setTrends30Days] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byStatus, setByStatus] = useState([]);
  const [byCenter, setByCenter] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [resolutionTime, setResolutionTime] = useState(null);

  // Color palettes
  const COLORS = ['#00ffda', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  const STATUS_COLORS = {
    open: '#6b7280',
    in_review: '#eab308',
    resolved: '#10b981'
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      const [
        trends7Res,
        trends30Res,
        categoryRes,
        statusRes,
        centerRes,
        heatmapRes,
        topUsersRes,
        resolutionRes
      ] = await Promise.all([
        api.get('/analytics/dashboard/trends/7days'),
        api.get('/analytics/dashboard/trends/30days'),
        api.get('/analytics/dashboard/by-category'),
        api.get('/analytics/dashboard/by-status'),
        api.get('/analytics/dashboard/by-center'),
        api.get('/analytics/dashboard/heatmap'),
        api.get('/analytics/dashboard/top-users'),
        api.get('/analytics/dashboard/resolution-time')
      ]);

      setTrends7Days(trends7Res.data);
      setTrends30Days(trends30Res.data);
      setByCategory(categoryRes.data);
      setByStatus(statusRes.data);
      setByCenter(centerRes.data);
      setHeatmap(heatmapRes.data);
      setTopUsers(topUsersRes.data);
      setResolutionTime(resolutionRes.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      alert('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get heatmap color intensity
  const getHeatmapColor = (count, maxCount) => {
    if (maxCount === 0) return 'bg-gray-900';
    const intensity = count / maxCount;
    if (intensity === 0) return 'bg-gray-900';
    if (intensity < 0.2) return 'bg-gray-800';
    if (intensity < 0.4) return 'bg-gray-700';
    if (intensity < 0.6) return 'bg-gray-600';
    if (intensity < 0.8) return 'bg-gray-500';
    return 'bg-gray-400';
  };

  // Organize heatmap data into 7 columns x 5 rows (30 days)
  const organizeHeatmap = () => {
    const maxCount = Math.max(...heatmap.map(h => h.count), 1);
    const grid = [];
    for (let row = 0; row < 5; row++) {
      const week = [];
      for (let col = 0; col < 7; col++) {
        const index = row * 7 + col;
        if (index < heatmap.length) {
          const item = heatmap[index];
          week.push({
            ...item,
            color: getHeatmapColor(item.count, maxCount)
          });
        } else {
          week.push(null);
        }
      }
      grid.push(week);
    }
    return grid;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Loading Analytics Dashboard...</p>
          <div className="animate-pulse text-[#00ffda]">⏳</div>
        </div>
      </div>
    );
  }

  const heatmapGrid = organizeHeatmap();

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Enterprise Analytics Dashboard</h1>
            <p className="text-gray-400">Comprehensive insights into complaint data</p>
          </div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Resolution Time Stats */}
        {resolutionTime && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm mb-1">Average Resolution</p>
              <p className="text-2xl font-bold text-[#00ffda]">{resolutionTime.avgResolutionHours.toFixed(2)} hrs</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm mb-1">Min Resolution</p>
              <p className="text-2xl font-bold text-green-400">{resolutionTime.minResolutionHours.toFixed(2)} hrs</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm mb-1">Max Resolution</p>
              <p className="text-2xl font-bold text-yellow-400">{resolutionTime.maxResolutionHours.toFixed(2)} hrs</p>
            </div>
          </div>
        )}

        {/* Chart Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* 1. Last 7 Days Trend - Line Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Last 7 Days Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#fff'
                  }}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#00ffda"
                  strokeWidth={2}
                  dot={{ fill: '#00ffda', r: 4 }}
                  name="Complaints"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Last 30 Days Trend - Area Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Last 30 Days Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends30Days}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ffda" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#00ffda" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#9ca3af"
                  style={{ fontSize: '10px' }}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#fff'
                  }}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#00ffda"
                  fill="url(#colorCount)"
                  name="Complaints"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 3. Category Breakdown - Pie Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Category Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {byCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#fff'
                  }}
                />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 4. Status Breakdown - Bar Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Status Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="status" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Bar dataKey="count" name="Complaints">
                  {byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 5. Center Type Distribution - Pie Chart */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Center Type Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byCenter}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ centerType, percent }) => `${centerType}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {byCenter.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#fff'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 6. Complaints Heatmap - 30 Days */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4">Complaints Heatmap – 30 Days</h2>
            <div className="flex flex-col gap-1">
              {heatmapGrid.map((week, rowIndex) => (
                <div key={rowIndex} className="flex gap-1">
                  {week.map((day, colIndex) => (
                    <div
                      key={colIndex}
                      className={`flex-1 aspect-square rounded ${
                        day ? day.color : 'bg-gray-900'
                      } border border-gray-700 flex items-center justify-center text-xs cursor-pointer hover:opacity-80 transition`}
                      title={day ? `${formatDate(day.date)}: ${day.count} complaints` : ''}
                    >
                      {day && day.count > 0 && (
                        <span className="text-white font-semibold">{day.count}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-gray-900 rounded"></div>
                <div className="w-3 h-3 bg-gray-800 rounded"></div>
                <div className="w-3 h-3 bg-gray-700 rounded"></div>
                <div className="w-3 h-3 bg-gray-600 rounded"></div>
                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                <div className="w-3 h-3 bg-gray-400 rounded"></div>
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        {/* 7. Top Users Leaderboard */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Top Users (Leaderboard)</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Rank</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold">Email</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold">Complaints</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-400">
                      No data available
                    </td>
                  </tr>
                ) : (
                  topUsers.map((user, index) => (
                    <tr key={user.userId} className="border-b border-gray-700 hover:bg-gray-700 transition">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                          index === 0 ? 'bg-yellow-500 text-black font-bold' :
                          index === 1 ? 'bg-gray-400 text-black font-bold' :
                          index === 2 ? 'bg-orange-600 text-white font-bold' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">{user.name}</td>
                      <td className="py-3 px-4 text-gray-400">{user.email}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[#00ffda] font-bold">{user.count}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

