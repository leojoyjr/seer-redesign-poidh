import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ActiveMilestone } from '../data/milestones';
import { orgAvatars } from '../data/avatars';
import { useSignalPoint } from '../data/signals';
import { Avatar } from './Avatar';

function MarketToken({ market, selected, onSelect }: {
  market: ActiveMilestone; selected: string; onSelect: (id: string) => void;
}) {
  const point = useSignalPoint(market);
  const gap = (point.yes / point.no - 1) * 100;
  return <button type="button" className="market-marquee__item" aria-label={`Show ${market.proposal}`}
    aria-pressed={selected === market.id} onClick={() => onSelect(market.id)}>
    <span className="market-marquee__logo"><Avatar avatar={orgAvatars[market.orgSlug] ?? market.token} size={44} /></span>
    <span className="market-marquee__label"><strong>{market.proposal}</strong><span>{market.token} · {market.proposal}</span></span>
    <span className="market-marquee__gap" data-negative={gap < 0}>{gap >= 0 ? '+' : '−'}{Math.abs(gap).toFixed(2)}%</span>
  </button>;
}

export function MarketMarquee({ markets, selected, onSelect }: {
  markets: ActiveMilestone[]; selected: string; onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    const element = host.current;
    const hero = element?.closest('.f6-decision');
    let visible = false;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const active = visible && !document.hidden && !media.matches;
      setRunning(active);
      hero?.classList.toggle('hero-motion-paused', !active);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    if (hero) observer.observe(hero);
    document.addEventListener('visibilitychange', update);
    media.addEventListener('change', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); media.removeEventListener('change', update); };
  }, []);
  useEffect(() => {
    const element = host.current;
    const track = element?.querySelector<HTMLElement>('.market-marquee__track');
    if (!element || !track || !running) return;
    let frame = 0;
    let width = 0;
    let half = 0;
    let slots: { button: HTMLElement; x: number; width: number }[] = [];
    const measure = () => {
      width = element.clientWidth;
      half = track.scrollWidth / 2;
      slots = Array.from(track.querySelectorAll<HTMLElement>('.market-marquee__slot')).map(slot => ({
        button: slot.firstElementChild as HTMLElement,
        x: slot.offsetLeft + (slot.parentElement?.offsetLeft ?? 0), width: slot.offsetWidth,
      }));
    };
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    measure();
    const animate = () => {
      const time = Number(track.getAnimations()[0]?.currentTime ?? 0);
      const travel = ((time % 40000) / 40000 - 1) * half;
      for (const slot of slots) {
        const x = slot.x + travel + slot.width / 2;
        const dissolve = Math.max(0, Math.min(1, (x / width - .65) / .35));
        slot.button.style.transform = `scale(${1 - dissolve * .3})`;
        slot.button.style.opacity = String(1 - dissolve * .7);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      slots.forEach(slot => { slot.button.style.transform = ''; slot.button.style.opacity = ''; });
    };
  }, [running, markets]);
  return <div ref={host} className="market-marquee glyph-strip" data-running={running} aria-label="Market proposals">
    <div className="market-marquee__track" style={{ '--market-count': markets.length } as CSSProperties}>
      {[0, 1].map(copy => <div className="market-marquee__set" key={copy} aria-hidden={copy === 1 ? true : undefined} inert={copy === 1 ? true : undefined}>
        {markets.map((market, index) => <div className="market-marquee__slot" key={market.id}
          style={{ '--arrival-delay': `${-40 * (index + 1) / markets.length}s` } as CSSProperties}>
          <MarketToken market={market} selected={selected} onSelect={onSelect} />
        </div>)}
      </div>)}
    </div>
  </div>;
}
