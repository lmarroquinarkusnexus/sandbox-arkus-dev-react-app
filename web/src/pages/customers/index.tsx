import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { useAppBridge } from '../../hooks/useAppBridge';
import { Message, Redirect } from '@shoplinedev/appbridge';

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

// ── Shared styles ─────────────────────────────────────────────────────────────
const TH = ({ children }: { children: string }) => (
  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, color: '#637381', fontWeight: 600, background: '#f6f6f7' }}>
    {children}
  </th>
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

// ── Customer Form Modal (create & edit) ───────────────────────────────────────
interface CustomerForm { first_name: string; last_name: string; email: string; phone: string }

function CustomerModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Customer;
  onClose: () => void;
  onSaved: (saved: Customer) => void;
}) {
  const fetch = useAuthenticatedFetch();
  const app = useAppBridge();
  const isEdit = !!initial;

  const [form, setForm] = useState<CustomerForm>({
    first_name: initial?.first_name ?? '',
    last_name: initial?.last_name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof CustomerForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      Message.create(app).open({ messageInfo: 'Nombre, apellido y email son requeridos', type: 'warn' });
      return;
    }
    setSaving(true);

    const payload: any = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
    };
    if (form.phone.trim()) payload.phone = form.phone.trim();

    let res: Response;
    if (isEdit) {
      res = await fetch(`/api/customers/${initial!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch('/api/customers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    setSaving(false);

    if (data.success) {
      Message.create(app).open({
        messageInfo: isEdit ? '✅ Cliente actualizado' : '✅ Cliente creado correctamente',
        type: 'success',
      });
      const saved: Customer = data.data?.customer ?? { ...initial, ...payload, id: initial?.id ?? data.data?.id };
      onSaved(saved);
    } else {
      const msg = data.data?.errors?.email?.[0] ?? data.data?.errors ?? data.error ?? 'No se pudo guardar el cliente';
      Message.create(app).open({ messageInfo: `❌ ${msg}`, type: 'error' });
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>
          {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Nombre <span style={{ color: '#de3618' }}>*</span></label>
              <input style={inputStyle} value={form.first_name} onChange={set('first_name')} placeholder="Luis" autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Apellido <span style={{ color: '#de3618' }}>*</span></label>
              <input style={inputStyle} value={form.last_name} onChange={set('last_name')} placeholder="Marroquin" />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email <span style={{ color: '#de3618' }}>*</span></label>
            <input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="cliente@ejemplo.com" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Teléfono <span style={{ color: '#637381', fontWeight: 400 }}>(opcional)</span></label>
            <input style={inputStyle} type="tel" value={form.phone} onChange={set('phone')} placeholder="+521234567890" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Customers() {
  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // modal: null = closed, { mode: 'create' } or { mode: 'edit', customer }
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; customer: Customer }>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    setLoading(true);
    fetch('/api/customers')
      .then((r) => r.json())
      .then((d) => setCustomers(d?.customers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const handleDelete = async (id: string | number) => {
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      Message.create(app).open({ messageInfo: '🗑 Cliente eliminado', type: 'success' });
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setDeletingId(null);
    } else {
      const msg = data.data?.errors ?? data.error ?? 'No se pudo eliminar el cliente';
      Message.create(app).open({ messageInfo: `❌ ${msg}`, type: 'error' });
      setDeletingId(null);
    }
  };

  const handleSaved = (saved: Customer) => {
    setCustomers((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      if (exists) return prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c));
      return [saved, ...prev]; // nuevo cliente: agregar al inicio
    });
    setModal(null);
  };

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
      {modal && (
        <CustomerModal
          initial={modal.mode === 'edit' ? modal.customer : undefined}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1d23' }}>
            Clientes {!loading && <span style={{ color: '#637381', fontSize: 16 }}>({customers.length})</span>}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#637381', fontSize: 13 }}>
            Shopline Admin REST API · límite 50
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={goToAdminCustomers} style={btnSecondary}>Ver en Admin →</button>
          <button onClick={() => setModal({ mode: 'create' })} style={btnPrimary}>+ Nuevo Cliente</button>
        </div>
      </div>

      {/* Search */}
      {!loading && customers.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nombre o email…"
            style={{ border: '1px solid #c4cdd5', borderRadius: 6, padding: '8px 12px', fontSize: 14, width: 280, outline: 'none', background: '#fff', color: '#1a1d23' }}
          />
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#637381' }}>Cargando clientes…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH>Nombre</TH><TH>Email</TH><TH>Teléfono</TH>
                <TH>Pedidos</TH><TH>Total gastado</TH><TH>Desde</TH><TH>Acciones</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ color: '#637381', marginBottom: 12 }}>
                      {search ? 'Ningún cliente coincide con tu búsqueda.' : 'No hay clientes en esta tienda aún.'}
                    </div>
                    {!search && (
                      <button onClick={() => setModal({ mode: 'create' })} style={btnPrimary}>
                        + Crear primer cliente
                      </button>
                    )}
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
                      {c.verified_email && <span style={{ marginLeft: 6, fontSize: 11, color: '#108043' }}>✓</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#637381' }}>{c.phone ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center' }}>{c.orders_count ?? 0}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{c.total_spent ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#637381' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}>
                      {deletingId === c.id ? (
                        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: '#de3618' }}>¿Eliminar?</span>
                          <button
                            onClick={() => handleDelete(c.id)}
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
                            onClick={() => setModal({ mode: 'edit', customer: c })}
                            style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #c4cdd5', background: '#fff', fontSize: 12, cursor: 'pointer' }}>
                            Editar
                          </button>
                          <button
                            onClick={() => setDeletingId(c.id)}
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
