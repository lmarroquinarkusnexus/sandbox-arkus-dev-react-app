import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { useAppBridge } from '../../hooks/useAppBridge';
import { Message } from '@shoplinedev/appbridge';

interface Product {
  id: string | number;
  title: string;
  body_html?: string;
  status?: string;
  created_at?: string;
  variants?: { price?: string; inventory_quantity?: number }[];
}

// ── Shared styles ─────────────────────────────────────────────────────────────
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
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: '28px 32px',
  width: 480, boxShadow: '0 8px 32px rgba(0,0,0,.18)',
};
const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #c4cdd5', borderRadius: 6,
  padding: '8px 12px', fontSize: 14, boxSizing: 'border-box', outline: 'none',
  background: '#fff', color: '#1a1d23',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#1a1d23', marginBottom: 4,
};
const btnPrimary: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 6, border: 'none',
  background: '#5c6ac4', color: '#fff', cursor: 'pointer', fontSize: 13,
};
const btnSecondary: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 6, border: '1px solid #c4cdd5',
  background: '#fff', cursor: 'pointer', fontSize: 13,
};

// ── Product Form Modal (create & edit) ────────────────────────────────────────
type ProductStatus = 'active' | 'draft' | 'archived';
const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: 'active',   label: 'Activo — visible en tienda' },
  { value: 'draft',    label: 'Borrador — no visible' },
  { value: 'archived', label: 'Archivado' },
];

interface ProductForm { title: string; body_html: string; price: string; inventory_quantity: string; status: ProductStatus }

function ProductModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Product;
  onClose: () => void;
  onSaved: (saved: Product) => void;
}) {
  const fetch = useAuthenticatedFetch();
  const app = useAppBridge();
  const isEdit = !!initial;

  const [form, setForm] = useState<ProductForm>({
    title: initial?.title ?? '',
    body_html: initial?.body_html ?? '',
    price: initial?.variants?.[0]?.price ?? '',
    inventory_quantity: initial?.variants?.[0]?.inventory_quantity != null
      ? String(initial.variants[0].inventory_quantity)
      : '',
    status: (initial?.status as ProductStatus) ?? 'active',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof ProductForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      Message.create(app).open({ messageInfo: 'El título es requerido', type: 'warn' });
      return;
    }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      body_html: form.body_html.trim(),
      price: form.price || '0.00',
      inventory_quantity: form.inventory_quantity ? parseInt(form.inventory_quantity) : 0,
      status: form.status,
    };

    let res: Response;
    if (isEdit) {
      res = await fetch(`/api/products/${initial!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch('/api/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    setSaving(false);

    if (data.success) {
      Message.create(app).open({
        messageInfo: isEdit ? '✅ Producto actualizado' : '✅ Producto creado correctamente',
        type: 'success',
      });
      const saved: Product = data.data?.product ?? { ...initial, ...payload, id: initial?.id ?? data.data?.id };
      onSaved(saved);
    } else {
      const msg = data.data?.errors ?? data.error ?? 'No se pudo guardar el producto';
      Message.create(app).open({ messageInfo: `❌ ${msg}`, type: 'error' });
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
          {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
        </h2>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Título <span style={{ color: '#de3618' }}>*</span></label>
            <input style={inputStyle} value={form.title} onChange={set('title')} placeholder="Nombre del producto" autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Descripción</label>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
              value={form.body_html}
              onChange={set('body_html')}
              placeholder="Descripción del producto (opcional)"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Precio ($)</label>
              <input style={inputStyle} type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="0.00" />
            </div>
            <div>
              <label style={labelStyle}>Inventario (uds.)</label>
              <input style={inputStyle} type="number" min="0" value={form.inventory_quantity} onChange={set('inventory_quantity')} placeholder="0" />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Estado <span style={{ color: '#de3618' }}>*</span></label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProductStatus }))}
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' as any }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Products() {
  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; product: Product }>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    setLoading(true);
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d?.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = async (id: string | number) => {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      Message.create(app).open({ messageInfo: '🗑 Producto eliminado', type: 'success' });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setDeletingId(null);
    } else {
      const msg = data.data?.errors ?? data.error ?? 'No se pudo eliminar el producto';
      Message.create(app).open({ messageInfo: `❌ ${msg}`, type: 'error' });
      setDeletingId(null);
    }
  };

  const handleSaved = (saved: Product) => {
    setProducts((prev) => {
      const exists = prev.find((p) => p.id === saved.id);
      if (exists) return prev.map((p) => (p.id === saved.id ? { ...p, ...saved } : p));
      return [saved, ...prev];
    });
    setModal(null);
  };

  const filtered = products.filter((p) => {
    const matchesSearch = !search.trim() || p.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      {modal && (
        <ProductModal
          initial={modal.mode === 'edit' ? modal.product : undefined}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1d23' }}>
            Productos {!loading && <span style={{ color: '#637381', fontSize: 16 }}>({products.length})</span>}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#637381', fontSize: 13 }}>
            Shopline Admin REST API · límite 50
          </p>
        </div>
        <button onClick={() => setModal({ mode: 'create' })} style={btnPrimary}>+ Nuevo Producto</button>
      </div>

      {/* Filters */}
      {!loading && products.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            style={{
              border: '1px solid #c4cdd5', borderRadius: 6, padding: '8px 12px',
              fontSize: 14, width: 240, outline: 'none',
              background: '#fff', color: '#1a1d23',
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              border: '1px solid #c4cdd5', borderRadius: 6, padding: '8px 12px',
              fontSize: 14, outline: 'none', cursor: 'pointer',
              background: '#fff', color: '#1a1d23', appearance: 'auto' as any,
            }}
          >
            <option value="all">Todos los estados</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label.split(' —')[0]}</option>
            ))}
          </select>
        </div>
      )}

      {/* Products table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden', marginBottom: 16 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#637381' }}>Cargando productos…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><TH>Título</TH><TH>Precio</TH><TH>Estado</TH><TH>Creado</TH><TH>Acciones</TH></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#637381' }}>
                    {products.length === 0
                      ? <>Sin productos. Haz clic en <strong>"+ Nuevo Producto"</strong> para agregar uno.</>
                      : 'Ningún producto coincide con los filtros.'}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} style={{ borderTop: '1px solid #f1f2f3' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.title}</td>
                    <TD muted>{p.variants?.[0]?.price ? `$${p.variants[0].price}` : '—'}</TD>
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
                    <TD muted>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</TD>
                    <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
                      {deletingId === p.id ? (
                        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: '#de3618' }}>¿Eliminar?</span>
                          <button
                            onClick={() => handleDelete(p.id)}
                            style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: '#de3618', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
                            Sí
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #c4cdd5', background: '#fff', fontSize: 12, cursor: 'pointer' }}>
                            No
                          </button>
                        </span>
                      ) : (
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => setModal({ mode: 'edit', product: p })}
                            style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #c4cdd5', background: '#fff', fontSize: 12, cursor: 'pointer' }}>
                            Editar
                          </button>
                          <button
                            onClick={() => setDeletingId(p.id)}
                            style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #ffc1c1', background: '#fff5f5', color: '#de3618', fontSize: 12, cursor: 'pointer' }}>
                            Eliminar
                          </button>
                        </span>
                      )}
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
