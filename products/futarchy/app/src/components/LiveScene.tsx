import { useEffect, useRef, useState } from 'react';
import type { ActiveMilestone } from '../data/milestones';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Avatar } from './Avatar';
import { orgAvatars } from '../data/avatars';
import { RollingNumber } from './RollingNumber';
import type { LiveFeed } from './useLiveTrades';
import '../styles/live.css';

export function LiveScene({ market, feed, markets = [market] }: { market: ActiveMilestone; feed: LiveFeed; markets?: ActiveMilestone[] }) {
  const reduced = useReducedMotion();
  const host = useRef<HTMLDivElement>(null);
  const dots = useRef<SVGGElement>(null);
  const [running, setRunning] = useState(false);
  const gap = feed.no ? (feed.yes / feed.no - 1) * 100 : 0;
  useEffect(() => {
    let intersecting = false;
    const update = () => setRunning(intersecting && !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches);
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update(); });
    if (host.current) observer.observe(host.current);
    document.addEventListener('visibilitychange', update);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    media.addEventListener('change', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); media.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = 0;
    const animate = (now: number) => {
      if (now - last >= 1000 / 30) {
        last = now;
        dots.current?.querySelectorAll<SVGCircleElement>('circle').forEach(dot => {
          // React can replace circle nodes before this effect restarts. Match identities, not positions.
          const trade = feed.trades.find(item => String(item.id) === dot.dataset.tradeId);
          if (!trade) { dot.style.opacity = '0'; return; }
          const progress = Math.min(1, Math.max(0, (Date.now() - trade.time) / 960));
          const x = 152 + (trade.side === 'buy' ? progress : 1 - progress) * 144;
          dot.style.transform = `translate(${x}px, ${trade.lane === 'pass' ? 56 : 136}px)`;
          dot.style.opacity = progress < 1 ? '1' : '0';
        });
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [running, feed.trades]);
  return <>
    <span className="f6-sr-only sr-only">{market.proposal}: PASS and FAIL conditional forecasts split from one proposal. The sample feed gap is {gap.toFixed(2)} percent. The DAO still decides.</span>
    <div ref={host} className="lv-scene" aria-hidden="true" data-running={running}>
      <svg viewBox="0 0 460 300" focusable="false">
        <path d="M0 252H56" className="lv-feeder" />
        {markets.slice(0, 5).map((item, index) => <foreignObject key={item.id} x="0" y="244" width="16" height="16" className="lv-feeder-token" style={{ animationDelay: `${-index * 1.2}s` }}>
          <Avatar avatar={orgAvatars[item.orgSlug] ?? item.token} size={16} />
        </foreignObject>)}
        <circle cx="88" cy="252" r="32" className="lv-proposal" />
        <circle cx="88" cy="252" r="32" className="lv-proposal-ring" />
        <foreignObject x="66" y="230" width="44" height="44">
          <span className="lv-logo-stage"><AnimatePresence initial={false}>
            <motion.span className="lv-logo-crossfade" key={market.id} initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .24 }}>
              <Avatar avatar={orgAvatars[market.orgSlug] ?? market.token} size={44} />
            </motion.span>
          </AnimatePresence></span>
        </foreignObject>
        <text x="88" y="204" textAnchor="middle">{market.proposal}</text>
        <path d="M120 252Q132 252 136 132H296" className="lv-pass" />
        <path d="M120 252Q132 252 136 212H296" className="lv-fail" />
        <g transform="translate(0 76)">
        <text x="152" y="40" className="lv-pass-label">PASS</text>
        <text x="152" y="120">FAIL</text>
        <g ref={dots}>{feed.trades.map(trade => <circle key={trade.id} data-trade-id={trade.id} r={2 + trade.amount / 160} className={`lv-dot lv-dot--${trade.lane}`} />)}</g>
        {(['pass', 'fail'] as const).map((lane, index) => <g key={lane}>
          <circle key={index ? feed.no : feed.yes} className="lv-node-pulse" cx="296" cy={56 + index * 80} r="8" style={{ transformOrigin: `296px ${56 + index * 80}px` }} />
          <g className="lv-coins" transform={`translate(272 ${40 + index * 80})`}>
            {[0, 1, 2].map(level => {
              const volume = feed.trades.filter(trade => trade.lane === lane).reduce((sum, trade) => sum + trade.amount, 0);
              return <g key={level} className="lv-coin-level" style={{ transform: `translateY(${-level * 5}px) scaleY(${volume >= level * 400 ? 1 : 0})` }}>
                <path d="M-8 0v4c0 5 16 5 16 0V0" fill="var(--color-violet)" />
                <ellipse rx="8" ry="3" fill="var(--color-fail-line)" />
              </g>;
            })}
          </g>
          <circle cx="296" cy={56 + index * 80} r="4" className={`lv-dot--${lane}`} />
          <foreignObject x="308" y={44 + index * 80} width="144" height="32">
            <Price value={index ? feed.no : feed.yes} />
          </foreignObject>
        </g>)}
        {feed.trades[0] && <foreignObject x="152" y={feed.trades[0].lane === 'pass' ? 4 : 84} width="280" height="32">
          <span key={feed.trades[0].id} className="lv-receipt">{feed.trades[0].side === 'buy' ? 'Buy' : 'Sell'} {Math.round(feed.trades[0].amount)} USDS {feed.trades[0].lane.toUpperCase()}</span>
        </foreignObject>}
        <g transform="translate(304 96)"><g className="lv-bracket" style={{ transform: `scaleY(${.3 + Math.min(Math.abs(gap) / 4, .7)})` }}><path d="M-8 -32H0V32H-8" /></g></g>
        <text x="320" y="92" className="lv-gap-label">GAP</text>
        <text x="320" y="108">{gap >= 0 ? '+' : ''}{gap.toFixed(2)}%</text>
        <path d="M120 184H408" className="lv-verdict-track" />
        <g className="lv-needle" style={{ transform: `translateX(${Math.max(-1, Math.min(1, gap / 3)) * 128}px)` }}><path d="M264 176V192" /></g>
        <text x="120" y="208">Exclude</text><text x="264" y="208" textAnchor="middle">Neutral</text><text x="408" y="208" textAnchor="end">Include</text>

        </g>
      </svg>
      <span className="lv-caption">Sample feed</span>
    </div>
  </>;
}
function Price({ value }: { value: number }) {
  const previous = useRef(value);
  const [direction, setDirection] = useState('');
  useEffect(() => {
    if (previous.current === value) return;
    setDirection(value > previous.current ? 'up' : 'down');
    previous.current = value;
    const timer = window.setTimeout(() => setDirection(''), 600);
    return () => clearTimeout(timer);
  }, [value]);
  return <span className="lv-price" data-direction={direction}>
    <RollingNumber value={value} decimals={value < 1 ? 4 : 2} />
    {direction && <i key={value} className="lv-price-flash" />}
  </span>;
}
