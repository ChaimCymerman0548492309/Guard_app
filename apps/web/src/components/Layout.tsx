import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth-context';
import type { Locale } from '../i18n';
import { t } from '../i18n';

interface LayoutProps {
  locale: Locale;
  onToggleLocale: () => void;
  onRefresh?: () => void;
  children: ReactNode;
}

export function Layout({ locale, onToggleLocale, onRefresh, children }: LayoutProps) {
  const { user, isAdmin, logout } = useAuth();

  return (
    <div className="app-shell" dir={locale === 'he' ? 'rtl' : 'ltr'} lang={locale}>
      <header className="topbar">
        <div>
          <Link to="/" className="brand">
            {t(locale, 'title')}
          </Link>
          <p>
            {t(locale, 'subtitle')}
            {user && (
              <span className="muted">
                {' '}
                · {user.email} ({isAdmin ? t(locale, 'roleAdmin') : t(locale, 'roleCustomer')})
              </span>
            )}
          </p>
        </div>
        <div className="topbar-actions">
          {isAdmin && (
            <Link className="button ghost" to="/admin/users">
              {t(locale, 'adminUsers')}
            </Link>
          )}
          {onRefresh && (
            <button type="button" className="button ghost" onClick={onRefresh}>
              {t(locale, 'refresh')}
            </button>
          )}
          <button type="button" className="button ghost" onClick={onToggleLocale}>
            {t(locale, 'language')}
          </button>
          <button type="button" className="button ghost" onClick={logout}>
            {t(locale, 'logout')}
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
