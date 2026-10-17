import { useEffect, useState } from 'react';
import { getAllBins } from '../services/binService';
import { getAllTasks } from '../services/taskService';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import FillBar from '../components/FillBar';
import Spinner from '../components/Spinner';

export default function Dashboard() {
  const [bins, setBins]     = useState([]);
  const [tasks, setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    Promise.all([getAllBins(), getAllTasks()])
      .then(([binsRes, tasksRes]) => {
        setBins(binsRes.data);
        setTasks(tasksRes.data);
      })
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error) return <p className="text-red-500">{error}</p>;

  const critical  = bins.filter((b) => b.status === 'Critical').length;
  const warning   = bins.filter((b) => b.status === 'Warning').length;
  const normal    = bins.filter((b) => b.status === 'Normal').length;
  const pending   = tasks.filter((t) => t.status === 'Pending').length;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Bins"     value={bins.length} icon="🗑️"  bg="bg-blue-50"   color="text-blue-600" />
        <StatCard title="Critical Bins"  value={critical}    icon="🔴"  bg="bg-red-50"    color="text-red-600" />
        <StatCard title="Warning Bins"   value={warning}     icon="🟡"  bg="bg-yellow-50" color="text-yellow-600" />
        <StatCard title="Pending Tasks"  value={pending}     icon="📋"  bg="bg-purple-50" color="text-purple-600" />
      </div>

      {/* Bin list */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4">All Bins</h2>
        {bins.length === 0 ? (
          <p className="text-sm text-gray-400">No bins registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 pr-4 font-medium">Bin ID</th>
                  <th className="pb-3 pr-4 font-medium">Location</th>
                  <th className="pb-3 pr-4 font-medium">Fill Level</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bins.map((bin) => (
                  <tr key={bin._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-mono font-medium">{bin.binId}</td>
                    <td className="py-3 pr-4 text-gray-500">
                      {bin.location.lat.toFixed(4)}, {bin.location.lng.toFixed(4)}
                    </td>
                    <td className="py-3 pr-4 w-48">
                      <FillBar percentage={bin.fillPercentage} />
                    </td>
                    <td className="py-3">
                      <StatusBadge status={bin.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent tasks */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Recent Tasks</h2>
        {tasks.slice(0, 5).length === 0 ? (
          <p className="text-sm text-gray-400">No tasks yet.</p>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <div key={task._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{task.taskId}</p>
                  <p className="text-xs text-gray-400">Bin: {task.binId}</p>
                </div>
                <StatusBadge status={task.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
