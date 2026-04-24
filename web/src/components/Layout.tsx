import { Link, useLocation } from 'react-router-dom';
import { useAppBridge } from '../hooks/useAppBridge';
import { shared } from '@shoplinedev/appbridge';
import { useEffect, useState } from 'react';
import styles from './Layout.module.css';

const NAV = [
  { path: '/',            label: '🏠 Dashboard' },
  { path: '/products',    label: '📦 Products' },
  { path: '/orders',      label: '🛒 Orders' },
  { path: '/customers',   label: '👥 Customers' },
  { path: '/appbridge',   label: '🧪 AppBridge Playground' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const app = useAppBridge();
  const [handle, setHandle] = useState('');

  useEffect(() => {
    shared.getAppstate(app)
      .then((state: any) => setHandle(state?.handle ?? ''))
      .catch(() => {});
  }, [app]);

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo}>SL</span>
          <div>
            <div className={styles.appName}>Demo App</div>
            {handle && <div className={styles.handle}>{handle}</div>}
          </div>
        </div>
        <nav className={styles.nav}>
          {NAV.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`${styles.navItem} ${
                location.pathname === path ? styles.active : ''
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.footer}>Shopline Dev Demo</div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
