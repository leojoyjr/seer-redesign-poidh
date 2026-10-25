import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';

interface Position {
  left: number;
  top: number;
  arrowX: number;
  placement: 'top' | 'bottom';
  phase: 'open' | 'closing';
}

type TooltipStyle = CSSProperties & {
  '--c-tip-arrow-x': string;
};

export function Tooltip({
  text,
  children,
}: {
  text: string;
  children: ReactElement<HTMLAttributes<HTMLElement>>;
}) {
  const id = useId();
  const revealTimer = useRef<number | undefined>(undefined);
  const dismissTimer = useRef<number | undefined>(undefined);
  const anchor = useRef<HTMLElement | null>(null);
  const popup = useRef<HTMLDivElement>(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const touchWasOpen = useRef(false);
  const [position, setPosition] = useState<Position | null>(null);

  const hide = useCallback(() => {
    if (revealTimer.current !== undefined) {
      window.clearTimeout(revealTimer.current);
      revealTimer.current = undefined;
    }

    if (dismissTimer.current !== undefined) {
      window.clearTimeout(dismissTimer.current);
      dismissTimer.current = undefined;
    }

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (reduced) {
      anchor.current = null;
      setPosition(null);
      return;
    }

    setPosition(current =>
      current ? { ...current, phase: 'closing' } : null,
    );

    dismissTimer.current = window.setTimeout(() => {
      dismissTimer.current = undefined;
      anchor.current = null;
      setPosition(null);
    }, 120);
  }, []);

  const show = useCallback((element: HTMLElement, delay: number) => {
    if (revealTimer.current !== undefined) {
      window.clearTimeout(revealTimer.current);
    }

    if (dismissTimer.current !== undefined) {
      window.clearTimeout(dismissTimer.current);
      dismissTimer.current = undefined;
    }

    anchor.current = element;

    revealTimer.current = window.setTimeout(() => {
      revealTimer.current = undefined;

      if (!element.isConnected) return;

      const rect = element.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;

      const estimatedWidth = Math.min(320, window.innerWidth - 32);
      const left = Math.max(
        8,
        Math.min(
          window.innerWidth - estimatedWidth - 8,
          rect.left + rect.width / 2 - estimatedWidth / 2,
        ),
      );

      setPosition({
        left,
        top: rect.bottom + 8,
        arrowX: rect.left + rect.width / 2 - left,
        placement: 'bottom',
        phase: 'open',
      });
    }, delay);
  }, []);

  useLayoutEffect(() => {
    if (!position || position.phase !== 'open') return;

    const element = anchor.current;
    const tooltip = popup.current;

    if (!element?.isConnected || !tooltip) return;

    const inset = 16;
    const gap = 8;
    const anchorRect = element.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const roomBelow =
      window.innerHeight - inset - anchorRect.bottom - gap;
    const roomAbove = anchorRect.top - inset - gap;
    const placement =
      roomBelow >= height || roomBelow >= roomAbove ? 'bottom' : 'top';

    const left = Math.round(
      Math.max(
        inset,
        Math.min(
          window.innerWidth - width - inset,
          anchorRect.left + anchorRect.width / 2 - width / 2,
        ),
      ),
    );

    const naturalTop =
      placement === 'bottom'
        ? anchorRect.bottom + gap
        : anchorRect.top - height - gap;

    const top = Math.round(
      Math.max(
        inset,
        Math.min(window.innerHeight - height - inset, naturalTop),
      ),
    );

    const arrowX = Math.round(
      Math.max(
        8,
        Math.min(
          width - 8,
          anchorRect.left + anchorRect.width / 2 - left,
        ),
      ),
    );

    if (
      left !== position.left ||
      top !== position.top ||
      arrowX !== position.arrowX ||
      placement !== position.placement
    ) {
      setPosition(current =>
        current
          ? {
              ...current,
              left,
              top,
              arrowX,
              placement,
            }
          : current,
      );
    }
  }, [position]);

  useEffect(() => {
    const dismiss = () => hide();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };

    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', escape);

    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('keydown', escape);
    };
  }, [hide]);

  useEffect(() => {
    if (!position) return;

    const observer = new MutationObserver(() => {
      if (!anchor.current?.isConnected) hide();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [hide, position]);

  useEffect(
    () => () => {
      if (revealTimer.current !== undefined) {
        window.clearTimeout(revealTimer.current);
      }

      if (dismissTimer.current !== undefined) {
        window.clearTimeout(dismissTimer.current);
      }
    },
    [],
  );

  const describedBy = [
    children.props['aria-describedby'],
    position?.phase === 'open' ? id : undefined,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  const trigger = cloneElement(children, {
    'aria-describedby': describedBy,
    onMouseEnter: (event: MouseEvent<HTMLElement>) => {
      children.props.onMouseEnter?.(event);
      hovered.current = true;
      show(event.currentTarget, 400);
    },
    onMouseLeave: (event: MouseEvent<HTMLElement>) => {
      children.props.onMouseLeave?.(event);
      hovered.current = false;
      if (!focused.current) hide();
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      children.props.onFocus?.(event);
      focused.current = true;
      show(event.currentTarget, 0);
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      children.props.onBlur?.(event);
      focused.current = false;
      if (!hovered.current) hide();
    },
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      children.props.onPointerDown?.(event);

      if (event.pointerType === 'touch') {
        touchWasOpen.current =
          position?.phase === 'open' &&
          anchor.current === event.currentTarget;
      }
    },
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => {
      children.props.onPointerUp?.(event);

      if (event.pointerType !== 'touch') return;

      if (touchWasOpen.current) {
        hide();
      } else {
        show(event.currentTarget, 0);
      }
    },
  });

  const tooltipStyle: TooltipStyle | undefined = position
    ? {
        left: position.left,
        top: position.top,
        '--c-tip-arrow-x': `${position.arrowX}px`,
      }
    : undefined;

  return (
    <>
      {trigger}
      {position &&
        createPortal(
          <div
            ref={popup}
            id={id}
            role="tooltip"
            data-overlay
            data-placement={position.placement}
            data-state={position.phase}
            className="c-tip"
            style={tooltipStyle}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}

export const impactExplanation = (value: number) =>
  `Impact ${value >= 0 ? '+' : '−'}${Math.abs(value * 100).toFixed(2)}% ${
    value > 0.01
      ? 'is above +1%: Include'
      : value < -0.01
        ? 'is below −1%: Exclude'
        : 'is within ±1%: Neutral'
  }`;
