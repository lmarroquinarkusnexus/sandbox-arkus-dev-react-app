import { useState } from 'react';
import Layout from '../../components/Layout';
import { useAppBridge } from '../../hooks/useAppBridge';
import { Message, Modal, Loading, SaveBar, Redirect, ResourcePicker } from '@shoplinedev/appbridge';

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '20px 24px',
      marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)',
    }}>
      <h3 style={{ margin: '0 0 4px', fontSize: 15, color: '#1a1d23', fontWeight: 600 }}>{title}</h3>
      {description && <p style={{ margin: '0 0 14px', fontSize: 13, color: '#637381' }}>{description}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: description ? 0 : 12 }}>{children}</div>
    </div>
  );
}

function Btn({
  label, onClick, variant = 'default',
}: {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}) {
  const styles: Record<string, React.CSSProperties> = {
    default:  { background: '#fff',     border: '1px solid #c4cdd5', color: '#1a1d23' },
    primary:  { background: '#5c6ac4',  border: 'none',              color: '#fff'    },
    danger:   { background: '#de3618',  border: 'none',              color: '#fff'    },
  };
  return (
    <button
      onClick={onClick}
      style={{
        ...styles[variant],
        borderRadius: 6, padding: '8px 16px',
        cursor: 'pointer', fontSize: 13, fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}

export default function AppBridgePlayground() {
  const app = useAppBridge();
  const [saveBarActive, setSaveBarActive] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  // ── Toasts ────────────────────────────────────────────────
  const toast = (type: 'success' | 'error' | 'warn' | 'info') => {
    Message.create(app).open({ messageInfo: `This is a ${type} message!`, type });
    addLog(`Message.open({ type: "${type}" })`);
  };

  // ── Modals ────────────────────────────────────────────────
  const modal = (type: 'confirm' | 'danger' | 'info') => {
    Modal.create(app).open({
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Dialog`,
      content: `This is a ${type} modal triggered from the AppBridge Playground. Click OK or Cancel to dismiss.`,
      onOk: () => {
        Message.create(app).open({ messageInfo: 'You clicked OK ✓', type: 'success' });
        addLog(`Modal ${type} → OK`);
      },
      onCancel: () => {
        Message.create(app).open({ messageInfo: 'Cancelled', type: 'info' });
        addLog(`Modal ${type} → Cancel`);
      },
    });
    addLog(`Modal.open({ type: "${type}" })`);
  };

  // ── Loading ───────────────────────────────────────────────
  const showLoading = () => {
    const l = Loading.create(app);
    l.trigger();
    addLog('Loading.trigger()');
    setTimeout(() => { l.exit(); addLog('Loading.exit()'); }, 2000);
  };

  // ── Save bar ──────────────────────────────────────────────
  const toggleSaveBar = () => {
    const bar = SaveBar.create(app);
    if (!saveBarActive) {
      bar.show({
        saveAction: {
          onAction: () => {
            Message.create(app).open({ messageInfo: 'Changes saved!', type: 'success' });
            setSaveBarActive(false);
            bar.hide();
            addLog('SaveBar → Save clicked');
          },
        },
        discardAction: {
          onAction: () => {
            setSaveBarActive(false);
            bar.hide();
            addLog('SaveBar → Discard clicked');
          },
        },
      });
      setSaveBarActive(true);
      addLog('SaveBar.show()');
    } else {
      bar.hide();
      setSaveBarActive(false);
      addLog('SaveBar.hide()');
    }
  };

  // ── Resource picker ───────────────────────────────────────
  const openPicker = (type: 'Product' | 'Variant') => {
    try {
      ResourcePicker.create(app).open({ type });
      addLog(`ResourcePicker.open({ type: "${type}" })`);
    } catch (_) {
      Message.create(app).open({ messageInfo: 'ResourcePicker requires embedded context', type: 'warn' });
    }
  };

  // ── Admin navigation ──────────────────────────────────────
  const adminSections = [
    { label: 'Products',   section: 'PRODUCTS'   },
    { label: 'Orders',     section: 'ORDERS'     },
    { label: 'Customers',  section: 'CUSTOMER'   },
    { label: 'Categories', section: 'CATEGORIES' },
    { label: 'Sales',      section: 'SALES'      },
  ] as const;

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1d23' }}>
          🧪 AppBridge Playground
        </h1>
        <p style={{ margin: '6px 0 0', color: '#637381', fontSize: 13 }}>
          Interact with every AppBridge capability. Actions are logged in the Activity Log below.
        </p>
      </div>

      {/* Toasts */}
      <Section title="🔔 Message — Toasts" description="Message.create(app).open({ type })">
        {(['success', 'error', 'warn', 'info'] as const).map((t) => (
          <Btn key={t} label={t} onClick={() => toast(t)}
            variant={t === 'success' ? 'primary' : t === 'error' ? 'danger' : 'default'} />
        ))}
      </Section>

      {/* Modals */}
      <Section title="📋 Modal — Dialogs" description="Modal.create(app).open({ type, title, content, onOk, onCancel })">
        {(['confirm', 'danger', 'info'] as const).map((t) => (
          <Btn key={t} label={t} onClick={() => modal(t)}
            variant={t === 'danger' ? 'danger' : 'default'} />
        ))}
      </Section>

      {/* Loading */}
      <Section title="⏳ Loading — Global Overlay" description="Loading.create(app).trigger() / .exit() — auto-exits after 2s">
        <Btn label="Show Loading (2s)" onClick={showLoading} />
      </Section>

      {/* Save Bar */}
      <Section title="💾 SaveBar — Persistent Save/Discard Bar" description="SaveBar.create(app).show({ saveAction, discardAction }) — appears at the top of the admin">
        <Btn
          label={saveBarActive ? 'Hide Save Bar' : 'Show Save Bar'}
          onClick={toggleSaveBar}
          variant={saveBarActive ? 'danger' : 'primary'}
        />
      </Section>

      {/* Resource Picker */}
      <Section title="🗂 ResourcePicker — Product / Variant Selector" description="ResourcePicker.create(app).open({ type }) — opens a Shopline modal to pick items">
        <Btn label="Pick Product"  onClick={() => openPicker('Product')} />
        <Btn label="Pick Variant"  onClick={() => openPicker('Variant')} />
      </Section>

      {/* Admin Nav */}
      <Section title="🧭 Redirect — Navigate to Shopline Admin Sections" description="Redirect.create(app).ToAdminPage(section)">
        {adminSections.map(({ label, section }) => (
          <Btn key={section} label={`→ ${label}`}
            onClick={() => {
              Redirect.create(app).ToAdminPage(section as any);
              addLog(`Redirect.ToAdminPage("${section}")`);
            }}
          />
        ))}
      </Section>

      {/* Activity log */}
      <div style={{ background: '#1a1d23', borderRadius: 10, padding: '16px 20px', marginTop: 8 }}>
        <div style={{ color: '#5c6ac4', fontSize: 12, fontWeight: 600, marginBottom: 10, letterSpacing: '0.05em' }}>
          ACTIVITY LOG
        </div>
        {log.length === 0 ? (
          <div style={{ color: '#4a5060', fontSize: 13 }}>No actions yet. Click a button above.</div>
        ) : (
          log.map((entry, i) => (
            <div key={i} style={{ fontFamily: 'monospace', fontSize: 12, color: i === 0 ? '#47c1bf' : '#8c9099', marginBottom: 4 }}>
              {entry}
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
