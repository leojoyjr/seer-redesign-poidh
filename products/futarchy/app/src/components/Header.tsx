import { useEffect, useState } from 'react';
import { IconHelp, IconSearch } from './icons';

interface Props {
  onSearch: () => void;
  onTour: () => void;
}

export function Header({ onSearch, onTour }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('#root main');

    if (!main) return;
    if (!main.id) main.id = 'main-content';
    if (!main.hasAttribute('tabindex')) main.tabIndex = -1;
  }, []);

  return (
    <header className={`s-header s-subbar${scrolled ? ' is-scrolled' : ''}`}>
      <a
        className="s-skip"
        href="#main-content"
        onClick={() => {
          requestAnimationFrame(() => {
            document
              .getElementById('main-content')
              ?.focus({ preventScroll: true });
          });
        }}
      >
        Skip to main content
      </a>

      <div className="page s-subbar__inner" data-align>
        <nav className="s-subbar__nav" aria-label="Sections">
          <a
            className="s-subbar__tab"
            href="#/"
            onClick={() =>
              requestAnimationFrame(() =>
                document.getElementById('milestones')?.scrollIntoView(),
              )
            }
          >
            Milestones
          </a>
          <a
            className="s-subbar__tab"
            href="#/"
            onClick={() =>
              requestAnimationFrame(() =>
                document.getElementById('organizations')?.scrollIntoView(),
              )
            }
          >
            Organizations
          </a>
        </nav>

        <div className="s-subbar__utilities">
          <button
            type="button"
            className="c-btn c-btn--utility s-subbar__search"
            aria-label="Search"
            onClick={onSearch}
          >
            <IconSearch />
            <span className="s-subbar__search-label">Search</span>
            <kbd className="c-kbd">/</kbd>
          </button>

          <button
            type="button"
            className="c-icon-btn s-subbar__help"
            aria-label="Tour"
            title="Help and shortcuts"
            onClick={onTour}
          >
            <IconHelp />
          </button>
        </div>
      </div>
    </header>
  );
}
