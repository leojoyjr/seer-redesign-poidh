import { useLayoutEffect, useRef, useState } from 'react';
import type { LiveFeed } from './useLiveTrades';
import '../styles/live.css';

export function TradeTicker({ feed }: { feed: LiveFeed }) {
  const host = useRef<HTMLDivElement>(null);
  const [capacity, setCapacity] = useState(0);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => setCapacity(Math.min(4, Math.floor(entry.contentRect.height / 32))));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={host} className="lv-tk" aria-label="Sample trades">
    <ul className="lv-tk-list">
      {feed.trades.slice(0, capacity).map((trade, index) => <li key={trade.id} className="lv-tk-row" data-oldest={index === 3}>
        <svg className="lv-tk-arrow" viewBox="0 0 16 16" aria-label={trade.side} role="img"><path d={trade.side === 'buy' ? 'M3 13L13 3M5 3H13V11' : 'M3 3L13 13M5 13H13V5'} /></svg>
        <span className={`lv-tk-tag lv-tk-tag--${trade.lane}`}><i />{trade.lane.toUpperCase()}</span>
        <span>{trade.amount.toFixed(2)} USDS</span>
        <span>{trade.price.toFixed(trade.price < 1 ? 4 : 2)}</span>
        <time dateTime={new Date(trade.time).toISOString()}>{Math.max(0, Math.floor((feed.clock - trade.time) / 1000))}s ago</time>
      </li>)}
    </ul>
  </div>;
}
