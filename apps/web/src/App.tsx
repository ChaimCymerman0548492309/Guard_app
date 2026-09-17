import { useMemo, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import type { Locale } from './i18n';
import { DashboardPage } from './pages/DashboardPage';
import { DevicePage } from './pages/DevicePage';
import './styles.css';

export function App() {
  const [locale, setLocale] = useState<Locale>('he');
  const toggleLocale = useMemo(
    () => () => setLocale((current) => (current === 'he' ? 'en' : 'he')),
    [],
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage locale={locale} onToggleLocale={toggleLocale} />} />
        <Route
          path="/devices/:deviceId"
          element={<DevicePage locale={locale} onToggleLocale={toggleLocale} />}
        />
      </Routes>
    </BrowserRouter>
  );
}
