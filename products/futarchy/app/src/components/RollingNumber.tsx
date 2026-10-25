import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import '../styles/detail-core.css';

interface Props {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  signed?: boolean;
  flash?: boolean;
  className?: string;
}

export function RollingNumber({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
  signed = false,
  flash = false,
  className = '',
}: Props) {
  const host = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  const previous = useRef(value);
  const [direction, setDirection] = useState<'up' | 'down' | ''>('');

  useEffect(() => {
    if (value === previous.current) return;
    setDirection(value > previous.current ? 'up' : 'down');
    previous.current = value;
    const timer = window.setTimeout(() => setDirection(''), 500);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (!flash || reduced) return;

    let timer = 0;
    const activity = () => {
      if (!host.current?.closest('.foundation-main') || !visible) return;
      setDirection('up');
      clearTimeout(timer);
      timer = window.setTimeout(() => setDirection(''), 500);
    };

    window.addEventListener('futarchy:activity', activity);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('futarchy:activity', activity);
    };
  }, [flash, reduced, visible]);

  const formatted = `${prefix}${
    signed && value >= 0 ? '+' : ''
  }${value.toFixed(decimals)}${
    suffix.trim()
      ? suffix.trim() === '%'
        ? '%'
        : ` ${suffix.trim()}`
      : ''
  }`;
  const last = useRef(formatted);
  const before = last.current;

  useLayoutEffect(() => {
    last.current = formatted;
  }, [formatted]);

  let animated = 0;
  const decimal = formatted.indexOf('.');
  const tickClass =
    flash && direction ? `dt-rolling-tick-${direction}` : '';

  return (
    <span
      ref={host}
      data-value={formatted}
      data-snap={!visible || !!reduced}
      className={`rolling-number dt-rolling-number ${tickClass} ${className}`.trim()}
      aria-label={formatted}
    >
      <span className="dt-sr-only sr-only">{formatted}</span>
      <span className="dt-rolling-characters rolling-characters" aria-hidden="true">
        {Array.from(formatted).map((char, index) => {
          if (!/\d/.test(char)) {
            return (
              <span
                className="dt-rolling-character"
                key={formatted.length - index}
                data-character={char}
              />
            );
          }

          const old =
            before[before.length - formatted.length + index] ?? char;
          const animate =
            char !== old &&
            /\d/.test(old) &&
            animated++ < 2 &&
            visible &&
            !reduced;

          return (
            <Digit
              key={formatted.length - index}
              char={char}
              animate={animate}
              roll={decimal < 0 || index < decimal + 2}
            />
          );
        })}
      </span>
    </span>
  );
}

function Digit({
  char,
  animate,
  roll,
}: {
  char: string;
  animate: boolean;
  roll: boolean;
}) {
  const reduced = useReducedMotion();
  const reel = useRef<HTMLSpanElement>(null);
  const ghost = useRef<HTMLSpanElement>(null);
  const previous = useRef(char);

  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = char;

    if (
      reduced ||
      !animate ||
      old === char ||
      !reel.current ||
      !ghost.current
    ) {
      return;
    }

    const animations: Animation[] = [];

    if (roll) {
      animations.push(
        reel.current.animate(
          [
            {
              transform: `translateY(calc(-${Number(
                old,
              )} * var(--dt-rn-line)))`,
            },
            {
              transform: `translateY(calc(-${Number(
                char,
              )} * var(--dt-rn-line)))`,
            },
          ],
          {
            duration: 140,
            easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          },
        ),
      );
    } else {
      ghost.current.dataset.oldDigit = old;
      animations.push(
        reel.current.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 120,
        }),
      );
      animations.push(
        ghost.current.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 120,
        }),
      );
    }

    return () => animations.forEach(animation => animation.cancel());
  }, [char, reduced]);

  return (
    <span className="dt-rolling-digit rolling-digit">
      <span
        ref={reel}
        className="dt-rolling-reel rolling-reel"
        style={{
          transform: `translateY(calc(-${Number(
            char,
          )} * var(--dt-rn-line)))`,
        }}
      >
        {Array.from({ length: 10 }, (_, digit) => (
          <span
            className="dt-rolling-reel-digit rolling-reel-digit"
            key={digit}
            data-digit={digit}
          />
        ))}
      </span>
      <span ref={ghost} className="dt-rolling-ghost" />
    </span>
  );
}
