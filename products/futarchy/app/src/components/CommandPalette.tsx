import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  getActiveMilestones,
  closedMilestones,
  organizations,
} from '../data/milestones';
import {
  IconBolt,
  IconChevronDown,
  IconFork,
  IconHelp,
  IconPlus,
  IconSearch,
  IconSun,
  IconUsers,
} from './icons';
import '../styles/overlays.css';

interface Props {
  onClose: () => void;
  onTour: () => void;
}

type ResultGroup =
  | 'Recent'
  | 'Markets'
  | 'Organizations'
  | 'Commands';

type PaletteResult = {
  group: ResultGroup;
  label: string;
  search: string;
  run: () => void;
};

function resultIcon(group: ResultGroup, label: string): ReactNode {
  if (group === 'Markets' || group === 'Recent') {
    return <IconFork width={24} height={24} />;
  }

  if (group === 'Organizations') {
    return <IconUsers width={24} height={24} />;
  }

  if (
    label === 'Take the tour' ||
    label === 'Open help and shortcuts'
  ) {
    return <IconHelp width={24} height={24} />;
  }

  if (label === 'Create market') {
    return <IconPlus width={24} height={24} />;
  }

  if (label === 'Switch theme') {
    return <IconSun width={24} height={24} />;
  }

  return <IconBolt width={24} height={24} />;
}

function activateControlLater(selector: string, fallbackKey?: string) {
  window.setTimeout(() => {
    const control = document.querySelector<HTMLButtonElement>(selector);

    if (control) {
      control.click();
      return;
    }

    if (fallbackKey) {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: fallbackKey,
          bubbles: true,
        }),
      );
    }
  }, 0);
}

export function CommandPalette({ onClose, onTour }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [settledQuery, setSettledQuery] = useState('');
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSettledQuery(query);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [query]);

  const results = useMemo<PaletteResult[]>(() => {
    const normalizedQuery = settledQuery.trim().toLowerCase();
    const marketGroup = (index: number): ResultGroup =>
      normalizedQuery === '' && index < 4 ? 'Recent' : 'Markets';

    const milestones = [
      ...getActiveMilestones(),
      ...closedMilestones,
    ].map((milestone, index) => ({
      group: marketGroup(index),
      label: `${milestone.token} · ${milestone.proposal}`,
      search: `${milestone.question.pre}${milestone.question.cond} ${milestone.orgSlug}`,
      run: () => {
        location.hash = `/m/${milestone.id}`;
      },
    }));

    const organizationResults: PaletteResult[] = organizations.map(
      organization => ({
        group: 'Organizations',
        label: organization.name,
        search: organization.slug,
        run: () => {
          location.hash = `/org/${organization.slug}`;
        },
      }),
    );

    const commands: PaletteResult[] = [
      {
        group: 'Commands',
        label: 'Create market',
        search: 'new conditional proposal',
        run: () => {
          location.hash = '/create';
        },
      },
      {
        group: 'Commands',
        label: 'Take the tour',
        search: 'guide tutorial',
        run: onTour,
      },
      {
        group: 'Commands',
        label: 'Open help and shortcuts',
        search: 'keyboard commands',
        run: () => {
          activateControlLater(
            '[aria-label="Help and shortcuts"], [aria-label="Help"]',
            '?',
          );
        },
      },
      {
        group: 'Commands',
        label: 'Switch theme',
        search: 'light dark appearance',
        run: () => {
          activateControlLater(
            '[aria-label="Use light theme"], [aria-label="Use dark theme"]',
          );
        },
      },
    ];

    const all: PaletteResult[] = [
      ...milestones,
      ...organizationResults,
      ...commands,
    ];
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) return all;

    return all
      .map(result =>
        result.group === 'Recent'
          ? { ...result, group: 'Markets' as const }
          : result,
      )
      .filter(result =>
        tokens.every(token =>
          `${result.label} ${result.search}`.toLowerCase().includes(token),
        ),
      );
  }, [settledQuery, onTour]);

  const groupedResults = useMemo(() => {
    const order: readonly ResultGroup[] = [
      'Recent',
      'Markets',
      'Organizations',
      'Commands',
    ];

    return order
      .map(group => ({
        group,
        items: results
          .map((result, index) => ({ result, index }))
          .filter(item => item.result.group === group),
      }))
      .filter(group => group.items.length > 0);
  }, [results]);

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();

    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    if (selected >= results.length) setSelected(0);
  }, [results.length, selected]);

  useEffect(() => {
    document
      .getElementById(`palette-${selected}`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const choose = (index: number) => {
    results[index]?.run();
    onClose();
  };

  const createFromQuery = () => {
    const seed = settledQuery.trim();

    if (seed) {
      try {
        window.sessionStorage.setItem('seer:create-market:seed', seed);
      } catch {
        // Session storage is optional.
      }
    }

    location.hash = '/create';
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      className="ov-palette"
      aria-label="Search"
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          setSelected(index =>
            results.length
              ? (index +
                  (event.key === 'ArrowDown' ? 1 : -1) +
                  results.length) %
                results.length
              : 0,
          );
        }

        if (event.key === 'Enter' && results.length > 0) {
          event.preventDefault();
          choose(selected);
        }
      }}
    >
      <div className="ov-palette__surface">
        <div className="ov-palette__search">
          <IconSearch width={24} height={24} />
          <input
            className="ov-palette__input"
            autoFocus
            role="combobox"
            aria-label="Search"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded="true"
            placeholder="Search markets, organizations, and commands"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            aria-controls="palette-results"
            aria-activedescendant={
              results[selected] ? `palette-${selected}` : undefined
            }
          />
          <kbd className="ov-key">/</kbd>
        </div>

        <div
          id="palette-results"
          className="ov-palette__results"
          role="listbox"
          aria-label="Search results"
          aria-busy={query !== settledQuery}
        >
          {results.length > 0 ? (
            groupedResults.map(group => {
              const headingId = `palette-group-${group.group.toLowerCase()}`;

              return (
                <section
                  className="ov-palette__group"
                  role="group"
                  aria-labelledby={headingId}
                  key={group.group}
                >
                  <h2
                    className="ov-palette__group-title"
                    id={headingId}
                  >
                    {group.group}
                  </h2>
                  {group.items.map(({ result, index }) => (
                    <button
                      type="button"
                      className="ov-palette__option"
                      id={`palette-${index}`}
                      role="option"
                      aria-selected={selected === index}
                      key={`${result.group}-${result.label}`}
                      onPointerMove={() => setSelected(index)}
                      onClick={() => choose(index)}
                    >
                      {resultIcon(result.group, result.label)}
                      <span className="ov-palette__option-label">
                        {result.label}
                      </span>
                      <kbd className="ov-key" aria-hidden="true">
                        Enter
                      </kbd>
                    </button>
                  ))}
                </section>
              );
            })
          ) : (
            <div className="ov-state">
              <div className="ov-state__content">
                <IconSearch width={48} height={48} />
                <h2>No results</h2>
                <p>{`No results for "${settledQuery}".`}</p>
                {settledQuery.trim() && (
                  <button
                    type="button"
                    className="ov-button ov-button--secondary"
                    onClick={createFromQuery}
                  >
                    <IconPlus width={16} height={16} />
                    Create market
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <p
          className="ov-sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {settledQuery.trim()
            ? `${results.length} results for ${settledQuery}`
            : `${results.length} available results`}
        </p>

        <footer className="ov-palette__footer">
          <kbd className="ov-key ov-key--up" aria-label="Arrow up">
            <IconChevronDown width={16} height={16} />
          </kbd>
          <kbd className="ov-key" aria-label="Arrow down">
            <IconChevronDown width={16} height={16} />
          </kbd>
          <span className="ov-palette__hint-label">Navigate</span>
          <kbd className="ov-key">Enter</kbd>
          <span className="ov-palette__hint-label">Open</span>
          <kbd className="ov-key">Esc</kbd>
          <span>Close</span>
        </footer>
      </div>
    </dialog>
  );
}
