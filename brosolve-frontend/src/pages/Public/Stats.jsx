// src/pages/Public/Stats.jsx
import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import api from '../../api/axios';
import 'chart.js/auto';

export default function Stats() {
  const [stats, setStats] = useState({ total: 0, solved: 0, today: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/public/stats');
        setStats(res.data);
      } catch (err) {
        alert('Failed to load stats');
      }
      setLoading(false);
    };
    fetchStats();
  }, []);

  const data = {
    labels: ['Solved', 'Pending'],
    datasets: [
      {
        data: [stats.solved, stats.total - stats.solved],
        backgroundColor: ['#00ffda', '#222'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">
      <h1 className="text-3xl font-semibold mb-8">BRO Solve Statistics</h1>

      {loading ? (
        <p className="text-gray-400">Loading chart...</p>
      ) : (
        <div className="w-64 h-64">
          <Doughnut
            data={data}
            options={{
              cutout: '70%',
              plugins: {
                legend: { display: false },
                tooltip: { enabled: true },
              },
            }}
          />
          <div className="text-center mt-6">
            <p className="text-xl">
              Total Complaints: <span className="text-[#00ffda]">{stats.total}</span>
            </p>
            <p className="text-xl">
              Solved: <span className="text-green-400">{stats.solved}</span>
            </p>
            <p className="text-xl">
              Today: <span className="text-blue-400">{stats.today}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
