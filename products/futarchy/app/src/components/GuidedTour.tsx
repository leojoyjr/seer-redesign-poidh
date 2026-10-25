import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { activeMilestone } from '../data/milestones';
import { IconArrowLeft, IconArrowRight, IconX } from './icons';
import '../styles/overlays.css';

type TourStep = {
  target: string;
  title: string;
  body: string;
};

const steps: readonly TourStep[] = [
  {
    target: 'board',
    title: 'The question',
    body: 'This DAO is asking what happens to the token if the proposal passes.',
  },
  {
    target: 'switcher',
    title: 'PASS and FAIL',
    body: 'PASS and FAIL are separate conditional price forecasts. Pick a milestone to compare them.',
  },
  {
    target: 'impact',
    title: 'The GAP',
    body: 'The difference between those forecasts is the market signal.',
  },
  {
    target: 'controls',
    title: 'Find a market',
    body: 'Filter by organization, token, or status.',
  },
  {
    target: 'milestone',
    title: 'Open a milestone',
    body: 'Open any milestone to inspect its complete conditional market.',
  },
  {
    target: 'chart',
    title: 'Conditional price history',
    body: 'The chart shows the solid PASS forecast and dashed FAIL forecast together.',
  },
  {
    target: 'chart',
    title: 'Decision thresholds',
    body: 'Above +1% is Include. Below -1% is Exclude. The range between is Neutral.',
  },
  {
    target: 'gauge',
    title: 'The verdict',
    body: 'The five-day average GAP maps to Include, Neutral, or Exclude. The DAO still decides.',
  },
  {
    target: 'trade',
    title: 'Trade',
    body: 'Trade the conditional market when your forecast differs from its price.',
  },
  {
    target: 'activity',
    title: 'Activity',
    body: 'Every trade appears here.',
  },
];

export function GuidedTour({
  initialStep,
  onClose,
}: {
  initialStep: number;
  onClose: () => void;
}) {
  const [step, setStep] = useState(() =>
    Math.max(0, Math.min(steps.length - 1, initialStep)),
  );
  const [rect, setRect] = useState({
    x: 16,
    y: 80,
    width: 0,
    height: 0,
  });
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const dialog = useRef<HTMLDialogElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const mask = useId();

  const finish = () => {
    location.hash = '/';
    onClose();
  };

  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    const root = document.querySelector<HTMLElement>('.app-shell');
    root?.setAttribute('data-touring', 'true');

    return () => {
      root?.removeAttribute('data-touring');
      requestAnimationFrame(() => {
        if (previous instanceof HTMLElement && previous.isConnected) {
          previous.focus({ preventScroll: true });
        } else {
          document
            .querySelector<HTMLButtonElement>('[aria-label="Tour"]')
            ?.focus({ preventScroll: true });
        }
      });
    };
  }, []);

  useEffect(() => {
    location.hash = step < 5 ? '/' : `/m/${activeMilestone.id}`;
    next.current?.focus({ preventScroll: true });

    let frame = 0;
    let settle = 0;
    let target: HTMLElement | null = null;

    const measure = () => {
      const element =
        document.querySelector<HTMLElement>(
          `[data-tour="${steps[step].target}"]`,
        ) ??
        document.querySelector<HTMLElement>(
          step === 1 ? '[data-tour="board"]' : '.milestone-empty',
        );

      if (!element) {
        frame = requestAnimationFrame(measure);
        return;
      }

      if (element !== target) {
        target = element;
        element.scrollIntoView({ block: 'center', behavior: 'instant' });
        frame = requestAnimationFrame(() => {
          settle = requestAnimationFrame(measure);
        });
        return;
      }

      const box = element.getBoundingClientRect();
      setRect({
        x: box.left - 8,
        y: box.top - 8,
        width: box.width + 16,
        height: box.height + 16,
      });
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);

    const observer = new ResizeObserver(schedule);
    const main = document.querySelector('main');
    if (main) observer.observe(main);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settle);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [step]);

  const width = Math.min(320, viewport.width - 32);
  const estimatedHeight = 280;
  const targetGap = 8;
  const below = rect.y + rect.height + targetGap;
  const side = rect.x - width - targetGap >= 16;
  const flipped = below + estimatedHeight > viewport.height - 16;
  const top = side
    ? Math.max(16, Math.min(rect.y, viewport.height - estimatedHeight - 16))
    : flipped
      ? Math.max(16, rect.y - estimatedHeight - targetGap)
      : below;
  const left = side
    ? rect.x - width - targetGap
    : Math.max(16, Math.min(rect.x, viewport.width - width - 16));

  const cardStyle = {
    '--ov-tour-card-width': `${width}px`,
    '--ov-tour-x': `${left}px`,
    '--ov-tour-y': `${top}px`,
  } as CSSProperties;

  const spotlightStyle = {
    '--ov-tour-target-x': `${rect.x}px`,
    '--ov-tour-target-y': `${rect.y}px`,
    '--ov-tour-target-width': `${rect.width}px`,
    '--ov-tour-target-height': `${rect.height}px`,
  } as CSSProperties;

  const currentStep = steps[step];

  return (
    <dialog
      ref={dialog}
      className="ov-tour guided-tour"
      aria-labelledby="tour-message"
      aria-describedby="tour-progress"
      onCancel={event => {
        event.preventDefault();
        finish();
      }}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key !== 'Tab') return;

        const buttons = Array.from(
          dialog.current?.querySelectorAll<HTMLButtonElement>(
            'button:not(:disabled)',
          ) ?? [],
        );
        const first = buttons[0];
        const last = buttons[buttons.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <svg
        className="ov-tour__shade"
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        <defs>
          <mask id={mask}>
            <rect width="100%" height="100%" fill="white" />
            <rect
              data-tour-cutout
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              rx="16"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          className="ov-tour__dim"
          mask={`url(#${mask})`}
        />
      </svg>

      <div
        className="ov-tour__spotlight"
        style={spotlightStyle}
        aria-hidden="true"
      />

      <section
        className="ov-tour__card"
        data-placement={side ? 'left' : flipped ? 'above' : 'below'}
        style={cardStyle}
      >
        <div className="ov-tour__progress" id="tour-progress">
          <span>
            {step + 1} / {steps.length}
          </span>
          <div className="ov-tour__dots" aria-hidden="true">
            {steps.map((tourStep, index) => (
              <span
                key={`${tourStep.target}-${index}`}
                className="ov-tour__dot"
                data-current={index === step}
              />
            ))}
          </div>
          <kbd className="ov-key">Esc</kbd>
        </div>

        <div
          className="ov-tour__content"
          key={step}
          aria-live="polite"
          aria-atomic="true"
        >
          <h2 id="tour-message">{currentStep.title}</h2>
          <p>{currentStep.body}</p>
        </div>

        <div className="ov-tour__actions">
          <button
            type="button"
            className="ov-button ov-button--ghost"
            onClick={finish}
          >
            <IconX width={16} height={16} />
            Close
          </button>
          <button
            type="button"
            className="ov-button ov-button--ghost"
            disabled={step === 0}
            onClick={() => setStep(current => current - 1)}
          >
            <IconArrowLeft width={16} height={16} />
            Back
          </button>
          <button
            type="button"
            ref={next}
            className="ov-button ov-button--primary"
            onClick={() =>
              step === steps.length - 1
                ? finish()
                : setStep(current => current + 1)
            }
          >
            Next
            <IconArrowRight width={16} height={16} />
          </button>
        </div>
      </section>
    </dialog>
  );
}
