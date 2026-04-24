import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { useAppBridge } from '../../hooks/useAppBridge';
import { Message, ResourcePicker } from '@shoplinedev/appbridge';

interface Product {
  id: string | number;
  title: string;
  status?: string;
  created_at?: string;
}

const TH = ({ children }: { children: string }) => (
  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#637381', fontWeight: 600, background: '#f6f6f7' }}>
    {children}
  </th>
);

const TD = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <td style={{ padding: '12px 16px', fontSize: 13, color: muted ? '#637381' : '#1a1d23' }}>
    {children}
  </td>
);

export default function Products() {
  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d?.products ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const createProduct = async () => {
    setCreating(true);
    const res = await fetch('/api/products/create');
    const data = await res.json();
    const msg = Message.create(app);
    if (data.success) {
      msg.open({ messageInfo: '✅ Test product created!', type: 'success' });
      load();
    } else {
      msg.open({ messageInfo: '❌ Failed to create product', type: 'error' });
    }
    setCreating(false);
  };

  const openPicker = () => {
    try {
      ResourcePicker.create(app).open({ type: 'Product' });
    } catch (_) {
      Message.create(app).open({ messageInfo: 'ResourcePicker requires embedded context', type: 'warn' });
    }
  };

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1d23' }}>
            Products {!loading && <span style={{ color: '#637381', fontSize: 16 }}>({products.length})</span>}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#637381', fontSize: 13 }}>
            Fetched from Shopline Admin REST API · limit 50
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={openPicker}
            style={{ background: '#fff', border: '1px solid #c4cdd5', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
          >
            🗂 Resource Picker
          </button>
          <button
            onClick={createProduct}
            disabled={creating}
            style={{ background: '#5c6ac4', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: creating ? 'not-allowed' : 'pointer', fontSize: 13, opacity: creating ? 0.7 : 1 }}
          >
            {creating ? 'Creating…' : '+ Create Test Product'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#637381' }}>Loading products…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH>ID</TH>
                <TH>Title</TH>
                <TH>Status</TH>
                <TH>Created</TH>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#637381' }}>
                    No products found. Click "+ Create Test Product" to add one.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} style={{ borderTop: '1px solid #f1f2f3' }}>
                    <TD muted>{p.id}</TD>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.title}</td>
                    <TD>
                      {p.status && (
                        <span style={{
                          background: p.status === 'active' ? '#e3f9e5' : '#f6f6f7',
                          color: p.status === 'active' ? '#108043' : '#637381',
                          borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 500,
                        }}>
                          {p.status}
                        </span>
                      )}
                    </TD>
                    <TD muted>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </TD>
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
