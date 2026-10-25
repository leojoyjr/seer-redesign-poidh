import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from './Avatar';
import type { AvatarKey } from '../data/avatars';
import {
  IconCheck,
  IconChevronDown,
  IconSearch,
} from './icons';

export interface MenuOption {
  value: string;
  label: string;
  avatar?: AvatarKey;
  count?: number;
}

interface HoverMenuProps {
  label: string;
  options: MenuOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
}

interface MenuPosition {
  left: number;
  top: number;
  maxHeight: number;
  placement: 'top' | 'bottom';
}

export function HoverMenu({
  label,
  options,
  selected,
  onChange,
  multiple = false,
}: HoverMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<MenuPosition>({
    left: 8,
    top: 0,
    maxHeight: 320,
    placement: 'bottom',
  });

  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const animationFrame = useRef<number | undefined>(undefined);
  const search = useRef('');
  const typedAt = useRef(0);
  const id = useId();

  const visibleOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return options;

    return options.filter(option =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  const selectedLabels = selected
    .map(value => options.find(option => option.value === value)?.label ?? value)
    .filter(Boolean);

  const summary =
    selectedLabels.length === 0
      ? label
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : selectedLabels.length === 2
          ? selectedLabels.join(', ')
          : `${selectedLabels[0]} and ${selectedLabels.length - 1} more`;

  const searchLabel = label.toLowerCase().includes('token')
    ? 'Search tokens'
    : 'Search organizations';

  const cancelClose = () => {
    if (closeTimer.current !== undefined) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = undefined;
    }
  };

  const close = (returnFocus = false) => {
    clearTimeout(hoverTimer.current);
    cancelClose();

    if (animationFrame.current !== undefined) {
      window.cancelAnimationFrame(animationFrame.current);
      animationFrame.current = undefined;
    }

    setOpen(false);

    const finish = () => {
      closeTimer.current = undefined;
      setMounted(false);
      setQuery('');
    };

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      finish();
    } else {
      closeTimer.current = window.setTimeout(finish, 120);
    }

    if (returnFocus) {
      requestAnimationFrame(() => trigger.current?.focus());
    }
  };

  const show = () => {
    clearTimeout(hoverTimer.current);
    cancelClose();

    window.dispatchEvent(
      new CustomEvent('futarchy:menu-open', { detail: id }),
    );

    setMounted(true);

    if (animationFrame.current !== undefined) {
      window.cancelAnimationFrame(animationFrame.current);
    }

    animationFrame.current = window.requestAnimationFrame(() => {
      animationFrame.current = undefined;
      setOpen(true);
    });
  };

  const leave = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => close(false), 220);
  };
  const enterPanel = () => {
    clearTimeout(hoverTimer.current);
    cancelClose();
  };

  const focusItem = (next: number) => {
    setIndex(next);
    panel.current
      ?.querySelectorAll<HTMLButtonElement>('[role="option"]')
      [next]?.focus();
  };

  const select = (value: string) => {
    onChange(
      multiple
        ? selected.includes(value)
          ? selected.filter(item => item !== value)
          : [...selected, value]
        : [value],
    );

    if (!multiple) {
      close(true);
    }
  };

  useEffect(() => {
    const closeOtherMenu = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) {
        close(false);
      }
    };

    window.addEventListener('futarchy:menu-open', closeOtherMenu);
    return () => {
      window.removeEventListener('futarchy:menu-open', closeOtherMenu);
    };
  }, [id]);

  useEffect(() => {
    setIndex(current =>
      visibleOptions.length === 0
        ? 0
        : Math.min(current, visibleOptions.length - 1),
    );
  }, [visibleOptions.length]);

  useLayoutEffect(() => {
    if (!mounted) return;

    const place = () => {
      const anchor = trigger.current;
      const popup = panel.current;

      if (!anchor || !popup) return;

      const anchorRect = anchor.getBoundingClientRect();
      const gap = 8;
      const inset = 16;

      if (
        anchorRect.bottom <= inset ||
        anchorRect.top >= window.innerHeight - inset
      ) {
        close(false);
        return;
      }

      const desired = Math.min(320, popup.scrollHeight);
      const below = Math.max(
        0,
        window.innerHeight - inset - anchorRect.bottom - gap,
      );
      const above = Math.max(0, anchorRect.top - inset - gap);
      const placement =
        desired > below && above > below ? 'top' : 'bottom';
      const maxHeight = Math.min(
        desired,
        placement === 'top' ? above : below,
      );

      setPosition({
        left: Math.max(
          inset,
          Math.min(
            anchorRect.left,
            window.innerWidth - popup.offsetWidth - inset,
          ),
        ),
        top:
          placement === 'top'
            ? anchorRect.top - gap - maxHeight
            : anchorRect.bottom + gap,
        maxHeight,
        placement,
      });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [mounted, visibleOptions.length]);

  useEffect(() => {
    if (!mounted) return;

    const outside = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !panel.current?.contains(target) &&
        !trigger.current?.contains(target)
      ) {
        close(false);
      }
    };

    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [mounted]);

  useEffect(() => {
    const dismissForRoute = () => close(false);

    window.addEventListener('hashchange', dismissForRoute);
    window.addEventListener('popstate', dismissForRoute);

    return () => {
      window.removeEventListener('hashchange', dismissForRoute);
      window.removeEventListener('popstate', dismissForRoute);
    };
  }, []);

  useEffect(
    () => () => {
      clearTimeout(hoverTimer.current);
      cancelClose();

      if (animationFrame.current !== undefined) {
        window.cancelAnimationFrame(animationFrame.current);
      }
    },
    [],
  );

  const keyboard = (event: ReactKeyboardEvent<HTMLElement>) => {
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const fromTrigger = target === trigger.current;
    const fromSearch = target instanceof HTMLInputElement;
    const optionTarget = target.closest<HTMLButtonElement>(
      '[role="option"]',
    );

    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }

    if (
      fromSearch &&
      (event.key === 'Home' || event.key === 'End')
    ) {
      return;
    }

    if (
      ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
    ) {
      if (visibleOptions.length === 0) return;

      event.preventDefault();
      show();

      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? visibleOptions.length - 1
            : fromTrigger
              ? event.key === 'ArrowUp'
                ? visibleOptions.length - 1
                : 0
              : (
                  index +
                  (event.key === 'ArrowUp' ? -1 : 1) +
                  visibleOptions.length
                ) % visibleOptions.length;

      setIndex(next);
      requestAnimationFrame(() => focusItem(next));
      return;
    }

    if (
      event.key === 'Enter' &&
      optionTarget &&
      panel.current?.contains(optionTarget)
    ) {
      event.preventDefault();
      const value = optionTarget.dataset.value;
      if (value) select(value);
      return;
    }

    if (
      !fromSearch &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.key !== ' '
    ) {
      search.current =
        Date.now() - typedAt.current > 600
          ? event.key
          : search.current + event.key;
      typedAt.current = Date.now();

      const next = visibleOptions.findIndex(option =>
        option.label
          .toLowerCase()
          .startsWith(search.current.toLowerCase()),
      );

      if (next >= 0) {
        event.preventDefault();
        setIndex(next);
        requestAnimationFrame(() => focusItem(next));
      }
    }
  };

  return (
    <div
      className="c-menu-wrap"
      onPointerEnter={event => {
        if (event.pointerType === 'touch') return;
        clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(show, 90);
      }}
      onPointerLeave={leave}
      onKeyDown={keyboard}
      onBlur={event => {
        const relatedTarget = event.relatedTarget;

        if (
          !panel.current?.contains(relatedTarget) &&
          !event.currentTarget.contains(relatedTarget)
        ) {
          close(false);
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="c-btn c-btn--utility c-menu-trigger filter-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={event => {
          if (event.detail === 0) {
            show();
          } else if (open) {
            close(false);
          } else {
            show();
          }
        }}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            show();
            requestAnimationFrame(() => focusItem(index));
          }
        }}
      >
        <span className="c-menu-trigger__label">{summary}</span>
        <IconChevronDown className="c-menu-trigger__chevron" />
      </button>

      {mounted &&
        createPortal(
          <>
            <div
              className="c-menu__scrim"
              data-state={open ? 'open' : 'closed'}
              aria-hidden="true"
              onPointerDown={() => close(false)}
            />

            <div
              ref={panel}
              id={id}
              className={`c-menu${open ? ' hover-panel' : ''}`}
              role={open ? 'listbox' : undefined}
              aria-label={label}
              aria-multiselectable={multiple || undefined}
              onPointerEnter={enterPanel}
              onPointerLeave={leave}
              style={{
                left: position.left,
                top: position.top,
                maxHeight: position.maxHeight,
              }}
              data-overlay
              data-placement={position.placement}
              data-state={open ? 'open' : 'closed'}
              aria-hidden={open ? undefined : true}
              onKeyDown={keyboard}
              onBlur={event => {
                const relatedTarget = event.relatedTarget;

                if (
                  !panel.current?.contains(relatedTarget) &&
                  relatedTarget !== trigger.current
                ) {
                  close(false);
                }
              }}
            >
              {options.length > 8 && (
                <label className="c-menu__search-field">
                  <span className="sr-only">{searchLabel}</span>
                  <IconSearch />
                  <input
                    className="c-field c-menu__search"
                    type="search"
                    aria-label={searchLabel}
                    placeholder={searchLabel}
                    value={query}
                    onChange={event => {
                      setQuery(event.currentTarget.value);
                      setIndex(0);
                    }}
                  />
                </label>
              )}

              <div
                className="c-menu__list"
              >
                {visibleOptions.map((option, optionIndex) => {
                  const isSelected = selected.includes(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className="c-menu__option"
                      role="option"
                      data-value={option.value}
                      aria-selected={isSelected}
                      tabIndex={optionIndex === index ? 0 : -1}
                      onFocus={() => setIndex(optionIndex)}
                      onClick={() => select(option.value)}
                    >
                      {option.avatar && (
                        <Avatar avatar={option.avatar} size={24} />
                      )}
                      <span className={`c-menu__option-label identity-name${/\s/.test(option.label) ? "" : " identity-name--single"}`} title={/\s/.test(option.label) ? undefined : option.label}>
                        {option.label}
                      </span>
                      {option.count !== undefined && (
                        <span
                          className="c-menu__count"
                          aria-hidden="true"
                        >
                          {option.count}
                        </span>
                      )}
                      <IconCheck
                        className={`c-menu__check${
                          isSelected ? ' is-visible' : ''
                        }`}
                      />
                    </button>
                  );
                })}

                {visibleOptions.length === 0 && (
                  <div className="c-menu__empty" role="status">
                    No options match.
                  </div>
                )}
              </div>

              {multiple && selected.length > 0 && (
                <button
                  type="button"
                  className="c-menu__clear"
                  onClick={() => onChange([])}
                >
                  Clear
                </button>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
