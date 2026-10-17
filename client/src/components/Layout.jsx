import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const titles = {
  '/':               'Dashboard',
  '/map':            'Map View',
  '/command-center': 'Command Center',
  '/alerts':         'Alerts',
  '/employees':      'Employees',
  '/tasks':          'Tasks',
  '/analytics':      'Analytics',
};

export default function Layout() {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? 'Smart Waste';

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
