import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { useAppBridge } from '../../hooks/useAppBridge';
import { Redirect } from '@shoplinedev/appbridge';
import { useNavigate, useLocation } from 'react-router-dom';

interface Order {
  id: string | number;
  name?: string;
  customer?: { first_name?: string; last_name?: string };
  current_total_price?: string;
  financial_status?: string;
  fulfillment_status?: string | null;
  created_at?: string;
}

const TH = ({ children }: { children: string }) => (
  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#637381', fontWeight: 600, background: '#f6f6f7' }}>
    {children}
  </th>
);

const PAYMENT_LABEL: Record<string, string> = {
  paid: 'Pagado', unpaid: 'Sin pagar', pending: 'Pendiente',
  refunded: 'Reembolsado', authorized: 'Autorizado', partially_paid: 'Pago parcial',
};
const FULFILLMENT_LABEL: Record<string, string> = {
  fulfilled: 'Enviado', partial: 'Parcial', restocked: 'Devuelto',
};

const statusColor = (s?: string | null) => {
  if (!s || s === 'null') return { bg: '#f6f6f7', fg: '#637381' };
  const map: Record<string, { bg: string; fg: string }> = {
    paid:          { bg: '#e3f9e5', fg: '#108043' },
    pending:       { bg: '#fff3e0', fg: '#c05717' },
    refunded:      { bg: '#fff4f4', fg: '#c0392b' },
    authorized:    { bg: '#f0f4ff', fg: '#3a6cca' },
    unpaid:        { bg: '#fff3e0', fg: '#c05717' },
    partially_paid:{ bg: '#fff8e0', fg: '#b07d00' },
  };
  return map[s] ?? { bg: '#f6f6f7', fg: '#637381' };
};

export default function Orders() {
  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/orders')
      .then((r) => r.json())
      .then((d) => {
        const fetched: Order[] = d?.orders ?? [];
        const newOrder: Order | undefined = location.state?.newOrder;
        // Si Shopline aún no tiene la orden en caché, la prependemos localmente
        if (newOrder && !fetched.find((o) => String(o.id) === String(newOrder.id))) {
          setOrders([newOrder, ...fetched]);
        } else {
          setOrders(fetched);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [location.key]);

  const goToAdminOrders = () => Redirect.create(app).ToAdminPage('ORDERS' as any);

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1d23' }}>
            Orders {!loading && <span style={{ color: '#637381', fontSize: 16 }}>({orders.length})</span>}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#637381', fontSize: 13 }}>
            Shopline Admin REST API · límite 50 · todos los estados
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={goToAdminOrders}
            style={{ background: '#fff', border: '1px solid #c4cdd5', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
          >
            Ver en Admin →
          </button>
          <button
            onClick={() => navigate('/orders/new')}
            style={{ background: '#5c6ac4', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}
          >
            + Nueva Orden
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#637381' }}>Loading orders…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH>Order #</TH>
                <TH>Customer</TH>
                <TH>Total</TH>
                <TH>Payment</TH>
                <TH>Fulfillment</TH>
                <TH>Date</TH>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ color: '#637381', marginBottom: 12 }}>
                      No hay pedidos en esta tienda aún.
                    </div>
                    <p style={{ color: '#8c9099', fontSize: 12, margin: '0 0 14px' }}>
                      Los pedidos se crean cuando un cliente compra en tu tienda. Puedes crear un pedido de prueba desde el Admin de Shopline.
                    </p>
                    <button
                      onClick={goToAdminOrders}
                      style={{ background: '#5c6ac4', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
                      Ir al Admin de Shopline →
                    </button>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const pay = statusColor(o.financial_status);
                  return (
                    <tr key={o.id} style={{ borderTop: '1px solid #f1f2f3' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1a1d23' }}>
                        {o.name ?? `#${o.id}`}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        {o.customer
                          ? `${o.customer.first_name ?? ''} ${o.customer.last_name ?? ''}`.trim() || '—'
                          : <span style={{ color: '#637381' }}>Guest</span>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>
                        {o.current_total_price ?? '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {o.financial_status && o.financial_status !== 'null' && (
                          <span style={{ background: pay.bg, color: pay.fg, borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 500 }}>
                            {PAYMENT_LABEL[o.financial_status] ?? o.financial_status}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#637381' }}>
                        {(!o.fulfillment_status || o.fulfillment_status === 'null')
                          ? 'Sin enviar'
                          : (FULFILLMENT_LABEL[o.fulfillment_status] ?? o.fulfillment_status)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#637381' }}>
                        {o.created_at ? new Date(o.created_at).toLocaleDateString('es-MX') : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
