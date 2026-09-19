import { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth-context';
import type { Locale } from './i18n';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevicePage } from './pages/DevicePage';
import { LoginPage } from './pages/LoginPage';
import './styles.css';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ padding: 24 }}>...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const [locale, setLocale] = useState<Locale>('he');
  const toggleLocale = useMemo(
    () => () => setLocale((current) => (current === 'he' ? 'en' : 'he')),
    [],
  );

  return (
    <Routes>
      <Route path="/login" element={<LoginPage locale={locale} onToggleLocale={toggleLocale} />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage locale={locale} onToggleLocale={toggleLocale} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/devices/:deviceId"
        element={
          <ProtectedRoute>
            <DevicePage locale={locale} onToggleLocale={toggleLocale} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminUsersPage locale={locale} onToggleLocale={toggleLocale} />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
