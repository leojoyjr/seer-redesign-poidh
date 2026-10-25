import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { ActiveMilestone } from '../data/milestones';
import { marketSignal } from '../data/signals';

export interface LiveTrade {
  id: number; lane: 'pass' | 'fail'; side: 'buy' | 'sell';
  amount: number; price: number; time: number;
}
export interface LiveFeed {
  yes: number; no: number; trades: LiveTrade[]; clock: number;
}
const watchVisibility = (listener: () => void) => {
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
};
export function useLiveTrades(market?: ActiveMilestone) {
  const sequence = useRef(0);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const host = useRef<HTMLElement>(null);
  const visible = useSyncExternalStore(watchVisibility, () => !document.hidden, () => true);
  const [inView, setInView] = useState(false);
  const [feed, setFeed] = useState<LiveFeed | null>(null);
  const initial = market ? marketSignal(market) : null;
  const point = initial?.points[initial.nowIndex];
  const baseline = { yes: point?.yes ?? 0, no: point?.no ?? 0, trades: [], clock: 0 };
  const identity = useRef(market?.id);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    identity.current = market?.id;
    setFeed(null);
  }, [market?.id]);
  useEffect(() => {
    if (!market || !visible || !inView || reduced) return;
    let seed = market.seed >>> 0;
    const settlements = new Set<number>();
    let cancelled = false;
    let timer = 0;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const next = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const signal = marketSignal(market);
        const current = signal.points[signal.nowIndex];
        const lane = random() > .5 ? 'pass' : 'fail';
        const side = random() > .5 ? 'buy' : 'sell';
        const base = lane === 'pass' ? current.yes : current.no;
        const price = base * (1 + (random() - .5) * .008);
        const trade: LiveTrade = { id: ++sequence.current, lane, side, price, amount: 32 + random() * 560, time: Date.now() };
        setFeed(previous => ({ yes: previous?.yes ?? current.yes, no: previous?.no ?? current.no,
          trades: [trade, ...(previous?.trades ?? [])].slice(0, 5), clock: Date.now() }));
        const settlement = window.setTimeout(() => {
          settlements.delete(settlement);
          setFeed(previous => previous ? { ...previous, [lane === 'pass' ? 'yes' : 'no']: price } : previous);
        }, 960);
        settlements.add(settlement);
        next();
      }, 1200 + random() * 2000);
    };
    next();
    const clock = window.setInterval(() => setFeed(previous => previous ? { ...previous, clock: Date.now() } : previous), 1000);
    return () => { cancelled = true; clearTimeout(timer); clearInterval(clock); settlements.forEach(clearTimeout); };
  }, [market, visible, inView, reduced]);
  return { host, running: visible && inView && !reduced, feed: identity.current === market?.id && feed ? feed : baseline };
}
