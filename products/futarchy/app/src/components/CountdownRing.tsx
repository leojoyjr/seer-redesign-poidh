import { useEffect, useState, type CSSProperties } from 'react';

interface Props {
  endTimestamp: number;
  duration?: number;
}

export function CountdownRing({
  endTimestamp,
  duration = ((6 * 24 + 15) * 60 + 58) * 60000,
}: Props) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = Math.max(0, endTimestamp - now);
  const minutes = Math.floor(remaining / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes / 60) % 24;
  const remainingMinutes = minutes % 60;
  const fraction = duration > 0
    ? Math.max(0, Math.min(1, 1 - remaining / duration))
    : 1;
  const detailed = `${days}d ${hours}h ${remainingMinutes}m`;
  const handStyle = {
    '--ln-countdown-rotation': `${fraction}turn`,
  } as CSSProperties;

  return (
    <div className="ln-countdown-dial">
      <span>Open until</span>

      <div className="ln-countdown-dial__body">
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            className="ln-countdown-dial__track"
            cx="60"
            cy="60"
            r="54"
          />
          <circle
            className="ln-countdown-dial__face"
            cx="60"
            cy="60"
            r="48"
          />
          <g className="ln-countdown-dial__hand" style={handStyle}>
            <line x1="60" y1="60" x2="60" y2="20" />
            <circle cx="60" cy="60" r="4" />
          </g>
        </svg>

        <output
          className="ln-countdown-dial__output"
          aria-label="Remaining Time"
          title={detailed}
        >
          <strong>{days} d</strong>
          <span>{hours} h {remainingMinutes} m</span>
        </output>
      </div>
    </div>
  );
}
