import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/',               label: 'Dashboard',      icon: '📊' },
  { to: '/map',            label: 'Map View',        icon: '🗺️' },
  { to: '/command-center', label: 'Command Center',  icon: '🎛️' },
  { to: '/alerts',         label: 'Alerts',          icon: '🔔' },
  { to: '/employees',      label: 'Employees',       icon: '👥' },
  { to: '/tasks',          label: 'Tasks',           icon: '✅' },
  { to: '/analytics',      label: 'Analytics',       icon: '📈' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-xl font-bold text-primary-500">♻️ SmartWaste</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-xs text-gray-400 mb-1">{user?.role?.toUpperCase()}</p>
        <p className="text-sm font-medium truncate">{user?.name}</p>
        <button
          onClick={logout}
          className="mt-3 w-full text-left text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          ← Sign out
        </button>
      </div>
    </aside>
  );
}
