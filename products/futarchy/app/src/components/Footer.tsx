const products = ['Explorer', 'Deep', 'Futarchy', 'Opportunity', 'Risk'] as const;

export function Footer() {
  return (
    <footer className="s-footer">
      <div className="page s-footer__inner">
        <div className="s-footer__product">
          <strong className="s-footer__title">Futarchy at Seer</strong>
          <p className="s-footer__statement">
            Market forecasts inform proposals. The DAO still decides.
          </p>
          <span className="s-footer__seer">Seer. Information Finance.</span>
        </div>

        <div className="s-footer__secondary">
          <nav className="s-footer__links" aria-label="Seer products">
            {products.map(name => (
              <a
                key={name}
                className="c-link"
                href={`/${name.toLowerCase()}/`}
                aria-current={name === 'Futarchy' ? 'page' : undefined}
              >
                {name}
              </a>
            ))}
          </nav>

          <span className="s-footer__theme">
            <span className="s-footer__theme-dark">Dark theme</span>
            <span className="s-footer__theme-light">Light theme</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
