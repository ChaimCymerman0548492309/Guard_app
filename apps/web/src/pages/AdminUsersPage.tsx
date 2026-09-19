import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuthUser } from '@guardian/shared';
import { createCustomerUser, listUsers } from '../api';
import { useAuth } from '../auth-context';
import { Layout } from '../components/Layout';
import type { Locale } from '../i18n';
import { t } from '../i18n';

interface AdminUsersPageProps {
  locale: Locale;
  onToggleLocale: () => void;
}

export function AdminUsersPage({ locale, onToggleLocale }: AdminUsersPageProps) {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setUsers(await listUsers());
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <Layout locale={locale} onToggleLocale={onToggleLocale}>
        <p className="error">{t(locale, 'adminOnly')}</p>
        <Link to="/">{t(locale, 'back')}</Link>
      </Layout>
    );
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await createCustomerUser({ email, password, name: name || undefined });
      setEmail('');
      setPassword('');
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'error'));
    }
  }

  return (
    <Layout locale={locale} onToggleLocale={onToggleLocale} onRefresh={() => void load()}>
      <Link className="back-link" to="/">
        ← {t(locale, 'back')}
      </Link>
      <h1>{t(locale, 'adminUsersTitle')}</h1>
      <p className="muted">{t(locale, 'adminUsersSubtitle')}</p>

      <section className="panel">
        <h2>{t(locale, 'createCustomer')}</h2>
        <form className="login-form" onSubmit={(e) => void onCreate(e)}>
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
              minLength={8}
              required
            />
          </label>
          <label>
            {t(locale, 'customerName')}
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="button primary">
            {t(locale, 'createCustomerButton')}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>{t(locale, 'usersList')}</h2>
        <ul className="alert-list">
          {users.map((user) => (
            <li key={user.id}>
              <div>
                <strong>{user.name ?? user.email}</strong>
                <p className="muted">{user.email}</p>
              </div>
              <span className="status-pill">{user.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
}
