import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { useAppBridge } from '../../hooks/useAppBridge';
import { Redirect } from '@shoplinedev/appbridge';

interface Customer {
  id: string | number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  orders_count?: number;
  total_spent?: string;
  created_at?: string;
  verified_email?: boolean;
}

const TH = ({ children }: { children: string }) => (
  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#637381', fontWeight: 600, background: '#f6f6f7' }}>
    {children}
  </th>
);

export default function Customers() {
  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((d) => setCustomers(d?.customers ?? []))
      .finally(() => setLoading(false));
  }, []);

  const goToAdminCustomers = () => Redirect.create(app).ToAdminPage('CUSTOMER' as any);

  const filtered = search.trim()
    ? customers.filter((c) => {
        const q = search.toLowerCase();
        return (
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q)
        );
      })
    : customers;

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1d23' }}>
            Customers {!loading && <span style={{ color: '#637381', fontSize: 16 }}>({customers.length})</span>}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#637381', fontSize: 13 }}>
            Fetched from Shopline Admin REST API · limit 50
          </p>
        </div>
        <button
          onClick={goToAdminCustomers}
          style={{ background: '#fff', border: '1px solid #c4cdd5', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
        >
          Open in Shopline Admin →
        </button>
      </div>

      {/* Search */}
      {!loading && customers.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name or email…"
            style={{
              border: '1px solid #c4cdd5', borderRadius: 6, padding: '8px 12px',
              fontSize: 14, width: 280, outline: 'none',
            }}
          />
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#637381' }}>Loading customers…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Phone</TH>
                <TH>Orders</TH>
                <TH>Total Spent</TH>
                <TH>Since</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#637381' }}>
                    {search ? 'No customers match your search.' : 'No customers found in this store.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f1f2f3' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13 }}>
                      {c.email ?? '—'}
                      {c.verified_email && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: '#108043' }}>✓</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#637381' }}>
                      {c.phone ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center' }}>
                      {c.orders_count ?? 0}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>
                      {c.total_spent ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#637381' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
