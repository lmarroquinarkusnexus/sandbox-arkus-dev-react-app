import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { useAppBridge } from '../../hooks/useAppBridge';
import { Message } from '@shoplinedev/appbridge';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product { id: string | number; title: string; variants?: { id?: string; price?: string }[] }
interface Customer { id: string | number; first_name?: string; last_name?: string; email?: string }
interface LineItem { title: string; price: string; quantity: number; product_id: string; variant_id: string }

// ── Styles ────────────────────────────────────────────────────────────────────
const fieldStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #c4cdd5', borderRadius: 6,
  padding: '8px 12px', fontSize: 14, boxSizing: 'border-box',
  outline: 'none', background: '#fff', color: '#1a1d23',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#1a1d23', marginBottom: 4,
};
const sectionCard: React.CSSProperties = {
  background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  padding: '20px 24px', marginBottom: 20,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 16px',
};

// ── Empty line item ───────────────────────────────────────────────────────────
const emptyLine = (): LineItem => ({ title: '', price: '', quantity: 1, product_id: '', variant_id: '' });

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NewOrder() {
  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);
  const [customerId, setCustomerId] = useState('');
  const [shippingPrice, setShippingPrice] = useState('0.00');
  const [discount, setDiscount] = useState('0.00');
  const [financialStatus, setFinancialStatus] = useState<'unpaid' | 'paid'>('unpaid');
  const [orderNote, setOrderNote] = useState('');
  const [addr, setAddr] = useState({ first_name: '', last_name: '', address1: '', city: '', country_code: 'MX', zip: '', phone: '' });

  useEffect(() => {
    fetch('/api/products').then((r) => r.json()).then((d) => setProducts(d?.products ?? [])).catch(() => {});
    fetch('/api/customers').then((r) => r.json()).then((d) => setCustomers(d?.customers ?? [])).catch(() => {});
  }, []);

  // ── Line item helpers ───────────────────────────────────────────────────────
  const setLine = (i: number, patch: Partial<LineItem>) =>
    setLineItems((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const selectProduct = (i: number, productId: string) => {
    const p = products.find((x) => String(x.id) === productId);
    if (!p) { setLine(i, { product_id: '', variant_id: '', title: '', price: '' }); return; }
    const variant = p.variants?.[0];
    setLine(i, {
      product_id: String(p.id),
      variant_id: String(variant?.id ?? ''),
      title: p.title,
      price: variant?.price ?? '0.00',
    });
  };

  const addLine = () => setLineItems((prev) => [...prev, emptyLine()]);
  const removeLine = (i: number) => setLineItems((prev) => prev.filter((_, idx) => idx !== i));

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = lineItems.filter((l) => l.title.trim() && l.price && Number(l.quantity) > 0);
    if (validLines.length === 0) {
      Message.create(app).open({ messageInfo: 'Agrega al menos un producto con título, precio y cantidad', type: 'warn' });
      return;
    }
    if (!addr.first_name.trim() || !addr.address1.trim() || !addr.city.trim() || !addr.country_code.trim()) {
      Message.create(app).open({ messageInfo: 'La dirección de envío requiere nombre, dirección, ciudad y país', type: 'warn' });
      return;
    }

    setSaving(true);

    const payload: any = {
      line_items: validLines.map((l) => ({
        title: l.title.trim(),
        price: l.price,
        quantity: Number(l.quantity),
        ...(l.product_id ? { product_id: l.product_id } : {}),
        ...(l.variant_id ? { variant_id: l.variant_id } : {}),
      })),
      shipping_price: shippingPrice || '0.00',
      discount: discount || '0.00',
      financial_status: financialStatus,
    };

    if (customerId) {
      const c = customers.find((x) => String(x.id) === customerId);
      if (c) payload.customer = { id: String(c.id), first_name: c.first_name, last_name: c.last_name, email: c.email };
    }

    payload.shipping_address = {
      first_name: addr.first_name.trim(),
      last_name: addr.last_name.trim(),
      address1: addr.address1.trim(),
      city: addr.city.trim(),
      country_code: addr.country_code.trim(),
      zip: addr.zip.trim(),
      ...(addr.phone.trim() ? { phone: addr.phone.trim() } : {}),
    };

    if (orderNote.trim()) payload.order_note = orderNote.trim();

    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);

    if (data.success) {
      Message.create(app).open({ messageInfo: '✅ Orden creada correctamente', type: 'success' });
      navigate('/orders', { state: { newOrder: data.data?.order } });
    } else {
      const msg = data.data?.errors ?? data.error ?? 'No se pudo crear la orden';
      Message.create(app).open({ messageInfo: `❌ ${msg}`, type: 'error' });
    }
  };

  // ── Total preview ───────────────────────────────────────────────────────────
  const subtotal = lineItems.reduce((sum, l) => sum + (parseFloat(l.price) || 0) * (Number(l.quantity) || 0), 0);
  const total = subtotal + (parseFloat(shippingPrice) || 0) - (parseFloat(discount) || 0);

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button
          onClick={() => navigate('/orders')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#637381', padding: 0, lineHeight: 1 }}
        >←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1d23' }}>Nueva Orden</h1>
          <p style={{ margin: '4px 0 0', color: '#637381', fontSize: 13 }}>Orden manual via Shopline API</p>
        </div>
      </div>

      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

          {/* ── Left column ─────────────────────────────────────────────────── */}
          <div>
            {/* Line items */}
            <div style={sectionCard}>
              <p style={sectionTitle}>Productos</p>

              {lineItems.map((line, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 32px', gap: 8, marginBottom: 12, alignItems: 'end' }}>
                  <div>
                    {i === 0 && <label style={labelStyle}>Producto <span style={{ color: '#de3618' }}>*</span></label>}
                    <select
                      value={line.product_id}
                      onChange={(e) => selectProduct(i, e.target.value)}
                      style={{ ...fieldStyle, appearance: 'auto' as any }}
                    >
                      <option value="">— Seleccionar producto —</option>
                      {products.map((p) => (
                        <option key={p.id} value={String(p.id)}>{p.title}</option>
                      ))}
                    </select>
                    {!line.product_id && (
                      <input
                        style={{ ...fieldStyle, marginTop: 6 }}
                        value={line.title}
                        onChange={(e) => setLine(i, { title: e.target.value })}
                        placeholder="O escribe el nombre manualmente"
                      />
                    )}
                  </div>
                  <div>
                    {i === 0 && <label style={labelStyle}>Precio ($)</label>}
                    <input
                      style={fieldStyle}
                      type="number" min="0" step="0.01"
                      value={line.price}
                      onChange={(e) => setLine(i, { price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    {i === 0 && <label style={labelStyle}>Cantidad</label>}
                    <input
                      style={fieldStyle}
                      type="number" min="1"
                      value={line.quantity}
                      onChange={(e) => setLine(i, { quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#637381', padding: '8px 0', lineHeight: 1 }}
                      >✕</button>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addLine}
                style={{ background: 'none', border: '1px dashed #c4cdd5', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#5c6ac4', width: '100%', marginTop: 4 }}
              >
                + Agregar otro producto
              </button>
            </div>

            {/* Note */}
            <div style={sectionCard}>
              <p style={sectionTitle}>Notas</p>
              <textarea
                style={{ ...fieldStyle, minHeight: 80, resize: 'vertical' }}
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Notas internas de la orden (máx. 50 caracteres)"
                maxLength={50}
              />
            </div>
          </div>

          {/* ── Right column ────────────────────────────────────────────────── */}
          <div>
            {/* Customer */}
            <div style={sectionCard}>
              <p style={sectionTitle}>Cliente</p>
              <label style={labelStyle}>Asignar cliente <span style={{ color: '#637381', fontWeight: 400 }}>(opcional)</span></label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                style={{ ...fieldStyle, appearance: 'auto' as any }}
              >
                <option value="">— Sin cliente (guest) —</option>
                {customers.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email || String(c.id)}
                  </option>
                ))}
              </select>
            </div>

            {/* Shipping address */}
            <div style={sectionCard}>
              <p style={sectionTitle}>Dirección de envío <span style={{ color: '#de3618', fontSize: 12 }}>*</span></p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Nombre</label>
                  <input style={fieldStyle} value={addr.first_name} onChange={(e) => setAddr((a) => ({ ...a, first_name: e.target.value }))} placeholder="Luis" />
                </div>
                <div>
                  <label style={labelStyle}>Apellido</label>
                  <input style={fieldStyle} value={addr.last_name} onChange={(e) => setAddr((a) => ({ ...a, last_name: e.target.value }))} placeholder="Marroquin" />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Dirección</label>
                <input style={fieldStyle} value={addr.address1} onChange={(e) => setAddr((a) => ({ ...a, address1: e.target.value }))} placeholder="Calle y número" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Ciudad</label>
                  <input style={fieldStyle} value={addr.city} onChange={(e) => setAddr((a) => ({ ...a, city: e.target.value }))} placeholder="Guadalajara" />
                </div>
                <div>
                  <label style={labelStyle}>CP</label>
                  <input style={fieldStyle} value={addr.zip} onChange={(e) => setAddr((a) => ({ ...a, zip: e.target.value }))} placeholder="44100" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>País (código)</label>
                  <input style={fieldStyle} value={addr.country_code} onChange={(e) => setAddr((a) => ({ ...a, country_code: e.target.value.toUpperCase() }))} placeholder="MX" maxLength={2} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input style={fieldStyle} value={addr.phone} onChange={(e) => setAddr((a) => ({ ...a, phone: e.target.value }))} placeholder="+521234567890" />
                </div>
              </div>
            </div>

            {/* Payment & Shipping */}
            <div style={sectionCard}>
              <p style={sectionTitle}>Pago y envío</p>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Estado de pago</label>
                <select
                  value={financialStatus}
                  onChange={(e) => setFinancialStatus(e.target.value as any)}
                  style={{ ...fieldStyle, appearance: 'auto' as any }}
                >
                  <option value="unpaid">Sin pagar</option>
                  <option value="paid">Pagado</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Costo de envío ($)</label>
                <input style={fieldStyle} type="number" min="0" step="0.01" value={shippingPrice} onChange={(e) => setShippingPrice(e.target.value)} placeholder="0.00" />
              </div>

              <div style={{ marginBottom: 0 }}>
                <label style={labelStyle}>Descuento ($)</label>
                <input style={fieldStyle} type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            {/* Total preview */}
            <div style={{ ...sectionCard, background: '#f6f7ff', border: '1px solid #e0e4ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#637381', marginBottom: 6 }}>
                <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#637381', marginBottom: 6 }}>
                <span>Envío</span><span>+${(parseFloat(shippingPrice) || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#637381', marginBottom: 12 }}>
                <span>Descuento</span><span>-${(parseFloat(discount) || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#1a1d23', borderTop: '1px solid #d0d5ff', paddingTop: 10 }}>
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                background: saving ? '#9ca3af' : '#5c6ac4', color: '#fff',
                fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Creando orden…' : 'Crear Orden'}
            </button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
