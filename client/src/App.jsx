import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import Alerts from './pages/Alerts';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';
import CommandCenter from './pages/CommandCenter';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected – any authenticated user */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/map"       element={<MapView />} />
          <Route path="/tasks"     element={<Tasks />} />
          <Route path="/analytics" element={<Analytics />} />

          {/* Admin-only */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/alerts"         element={<Alerts />} />
            <Route path="/command-center" element={<CommandCenter />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
