import { useEffect, useRef, useState } from 'react';
/** Only animates changes to supplied historical values. */
export function AnimatedValue({ value }: { value: string }) {
  const match = value.match(/^(.*?)([−+-]?\d[\d,]*(?:\.\d+)?)(.*?)$/);
  const target = match ? Number(match[2].replaceAll(',', '').replace('−', '-')) : NaN;
  const current = useRef(target), [shown, setShown] = useState(target);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const from = Number.isFinite(current.current) ? current.current : target;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || from === target) { current.current = target; setShown(target); return; }
    const start = performance.now(); let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 420);
      current.current = from + (target - from) * (1 - (1 - progress) ** 3); setShown(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [target]);
  if (!match || !Number.isFinite(shown)) return <>{value}</>;
  const decimals = match[2].split('.')[1]?.length ?? 0;
  return <span aria-label={value}><span aria-hidden="true">{match[1]}{match[2].startsWith('+') && shown >= 0 ? '+' : ''}{shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: match[2].includes(',') })}{match[3]}</span></span>;
}
