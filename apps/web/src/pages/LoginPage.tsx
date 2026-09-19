import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import type { Locale } from '../i18n';
import { t } from '../i18n';
import '../styles.css';

interface LoginPageProps {
  locale: Locale;
  onToggleLocale: () => void;
}

export function LoginPage({ locale, onToggleLocale }: LoginPageProps) {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('admin@guardian.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'loginError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell" dir={locale === 'he' ? 'rtl' : 'ltr'} lang={locale}>
      <div className="login-card panel">
        <button type="button" className="button ghost locale-toggle" onClick={onToggleLocale}>
          {t(locale, 'language')}
        </button>
        <h1>{t(locale, 'loginTitle')}</h1>
        <p className="muted">{t(locale, 'loginSubtitle')}</p>
        <form onSubmit={(e) => void onSubmit(e)} className="login-form">
          <label>
            {t(locale, 'email')}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            {t(locale, 'password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="button primary" disabled={submitting}>
            {t(locale, 'loginButton')}
          </button>
        </form>
        <p className="hint">{t(locale, 'loginHint')}</p>
      </div>
    </div>
  );
}
