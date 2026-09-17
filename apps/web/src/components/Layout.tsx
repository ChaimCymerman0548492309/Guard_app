import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Locale } from '../i18n';
import { t } from '../i18n';

interface LayoutProps {
  locale: Locale;
  onToggleLocale: () => void;
  onRefresh?: () => void;
  children: ReactNode;
}

export function Layout({ locale, onToggleLocale, onRefresh, children }: LayoutProps) {
  return (
    <div className="app-shell" dir={locale === 'he' ? 'rtl' : 'ltr'} lang={locale}>
      <header className="topbar">
        <div>
          <Link to="/" className="brand">
            {t(locale, 'title')}
          </Link>
          <p>{t(locale, 'subtitle')}</p>
        </div>
        <div className="topbar-actions">
          {onRefresh && (
            <button type="button" className="button ghost" onClick={onRefresh}>
              {t(locale, 'refresh')}
            </button>
          )}
          <button type="button" className="button ghost" onClick={onToggleLocale}>
            {t(locale, 'language')}
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
