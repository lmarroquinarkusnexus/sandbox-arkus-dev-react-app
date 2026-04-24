import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import { useAppBridge } from '../hooks/useAppBridge';
import { shared } from '@shoplinedev/appbridge';

interface Stats {
  products: number;
  orders: number;
  customers: number;
}

interface Merchant {
  handle: string;
  email: string;
  lang: string;
}

export default function Dashboard() {
  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats>({ products: 0, orders: 0, customers: 0 });
  const [merchant, setMerchant] = useState<Merchant>({ handle: '', email: '', lang: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    shared.getAppstate(app)
      .then((s: any) => setMerchant(s ?? {}))
      .catch(() => {});

    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => setError('Could not load stats. Check that scopes are re-authorized.'))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Products',  value: stats.products,  path: '/products',  color: '#5c6ac4' },
    { label: 'Orders',    value: stats.orders,    path: '/orders',    color: '#47c1bf' },
    { label: 'Customers', value: stats.customers, path: '/customers', color: '#f49342' },
  ];

  const quickActions = [
    { label: '📦 Products',             path: '/products' },
    { label: '🛒 Orders',               path: '/orders' },
    { label: '👥 Customers',            path: '/customers' },
    { label: '🧪 AppBridge Playground', path: '/appbridge' },
  ];

  return (
    <Layout>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1d23' }}>
          Dashboard
        </h1>
        {merchant.handle && (
          <p style={{ margin: '6px 0 0', color: '#637381', fontSize: 14 }}>
            Store: <strong>{merchant.handle}</strong>
            {merchant.email && <> &middot; {merchant.email}</>}
            {merchant.lang && <> &middot; Lang: {merchant.lang}</>}
          </p>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: '#fff4f4', border: '1px solid #ffc1c1', borderRadius: 8,
          padding: '12px 16px', marginBottom: 24, color: '#c0392b', fontSize: 14,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stats cards */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{
          fontSize: 13, color: '#637381', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px',
        }}>
          Store Overview
        </h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 10, padding: '20px 28px',
                  minWidth: 160, boxShadow: '0 1px 3px rgba(0,0,0,.06)', opacity: 0.4,
                }}>
                  <div style={{ height: 36, background: '#e8e8e8', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 14, background: '#e8e8e8', borderRadius: 4, width: '50%' }} />
                </div>
              ))
            : statCards.map((c) => (
                <div
                  key={c.label}
                  onClick={() => navigate(c.path)}
                  style={{
                    background: '#fff', borderRadius: 10, padding: '20px 28px',
                    cursor: 'pointer', minWidth: 160,
                    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                    borderTop: `4px solid ${c.color}`,
                    transition: 'box-shadow 0.15s, transform 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,.12)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,.06)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: 34, fontWeight: 700, color: c.color, lineHeight: 1 }}>
                    {c.value}
                  </div>
                  <div style={{ color: '#637381', marginTop: 6, fontSize: 14 }}>{c.label}</div>
                </div>
              ))}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 style={{
          fontSize: 13, color: '#637381', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px',
        }}>
          Navigate
        </h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {quickActions.map((a) => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              style={{
                background: '#fff', border: '1px solid #e1e3e5', borderRadius: 8,
                padding: '10px 18px', cursor: 'pointer', fontSize: 14,
                color: '#1a1d23', fontWeight: 500,
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </section>
    </Layout>
  );
}
