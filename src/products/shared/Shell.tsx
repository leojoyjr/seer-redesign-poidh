import { useEffect, useState, type ReactNode } from 'react';
import '../../seer-2026/seer2026.css';
import './shell.css';

const logo = new URL('../../../assets/brand/logo.svg', import.meta.url).href;

export interface ShellNavItem {
  id: string;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

interface ShellProps {
  productLabel: string;
  navItems: ShellNavItem[];
  headerControls: ReactNode;
  onNavigate?: (href: string) => void;
  children: ReactNode;
  footer?: ReactNode;
  pageClassName?: string;
  theme?: 'light' | 'dark';
}

export function Shell({
  productLabel,
  navItems,
  headerControls,
  onNavigate,
  children,
  footer,
  pageClassName = '',
  theme = 'light',
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 820) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const activate = (item: ShellNavItem) => {
    setMobileOpen(false);
    if (item.onClick) {
      item.onClick();
      return;
    }
    if (item.href && onNavigate) onNavigate(item.href);
  };

  return (
    <div className={`s26-page product-shell ${pageClassName}`} data-theme={theme}>
      <a className="product-skip" href="#product-main">Skip to content</a>
      <header className="s26-header is-condensed product-header">
        <a className="s26-brand product-brand" href="/seer-2026" aria-label="Seer home">
          <img src={logo} alt="" width="138" height="64" />
          <span aria-current="page">{productLabel}</span>
        </a>
        <nav className="product-nav" aria-label={`${productLabel} destinations`}>
          {navItems.map((item) =>
            item.href ? (
              <a
                key={item.id}
                href={item.href}
                aria-current={item.active ? 'page' : undefined}
                onClick={(event) => {
                  if (!onNavigate) return;
                  event.preventDefault();
                  activate(item);
                }}
              >
                {item.label}
              </a>
            ) : (
              <button
                key={item.id}
                type="button"
                aria-current={item.active ? 'page' : undefined}
                onClick={() => activate(item)}
              >
                {item.label}
              </button>
            ),
          )}
        </nav>
        <div className="product-header-actions">{headerControls}</div>
        <button
          className="product-menu-toggle"
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="product-mobile-nav"
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span aria-hidden="true">{mobileOpen ? '×' : '☰'}</span>
          <span className="sr-only">{mobileOpen ? 'Close navigation' : 'Open navigation'}</span>
        </button>
        {mobileOpen && (
          <nav id="product-mobile-nav" className="product-mobile-nav" aria-label={`Mobile ${productLabel} destinations`}>
            {navItems.map((item) =>
              item.href ? (
                <a
                  key={item.id}
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  onClick={(event) => {
                    if (!onNavigate) return;
                    event.preventDefault();
                    activate(item);
                  }}
                >
                  {item.label}
                </a>
              ) : (
                <button key={item.id} type="button" aria-current={item.active ? 'page' : undefined} onClick={() => activate(item)}>
                  {item.label}
                </button>
              ),
            )}
          </nav>
        )}
      </header>
      <main id="product-main" className="product-content" tabIndex={-1}>
        {children}
        {footer}
      </main>
    </div>
  );
}
