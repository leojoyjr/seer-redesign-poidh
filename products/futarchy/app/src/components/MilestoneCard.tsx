import { useEffect, useId, useState } from 'react';
import {
  organizations,
  type ActiveMilestone,
} from '../data/milestones';
import { MarketSignal } from './MarketSignal';
import { TokenLogo } from './TokenLogo';
import { IconClock, IconOrg, IconToken } from './icons';

export interface MilestoneCardProps {
  milestone: ActiveMilestone;
  loading?: boolean;
  wide?: boolean;
}

function durationPart(
  value: number,
  singular: string,
  plural: string,
) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function CountdownChip({
  end,
  compact = false,
}: {
  end: number;
  compact?: boolean;
}) {
  const descriptionId = useId();
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let timer: number | undefined;
    const update = () => {
      clearInterval(timer);
      if (!media.matches) timer = window.setInterval(() => setNow(Date.now()), 1000);
    };
    update();
    media.addEventListener('change', update);
    return () => { clearInterval(timer); media.removeEventListener('change', update); };
  }, []);

  const seconds = Math.max(0, Math.floor((end - now) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds / 3600) % 24;
  const minutes = Math.floor(seconds / 60) % 60;
  const remainingSeconds = seconds % 60;
  const detailed = `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`;
  const concise =
    days > 0
      ? `${days}d ${hours}h`
      : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m ${remainingSeconds}s`;
  const accessible = [
    durationPart(days, 'day', 'days'),
    durationPart(hours, 'hour', 'hours'),
    durationPart(minutes, 'minute', 'minutes'),
    durationPart(remainingSeconds, 'second', 'seconds'),
    'remaining',
  ].join(', ');

  return (
    <span
      className="f6-countdown countdown-chip"
      aria-label="Remaining Time"
      aria-describedby={descriptionId}
      title={detailed}
    >
      <IconClock aria-hidden="true" />
      <span aria-hidden="true">{compact ? concise : detailed}</span>
      <span id={descriptionId} className="f6-sr-only sr-only">
        {accessible}
      </span>
    </span>
  );
}

export function MilestoneCard({
  milestone: m,
  loading = false,
  wide = false,
}: MilestoneCardProps) {
  const name =
    organizations.find(
      organization => organization.slug === m.orgSlug,
    )?.name ?? m.orgSlug;

  return (
    <a
      href={`#/m/${m.id}`}
      className={[
        'f6-card milestone-card',
        wide ? 'f6-card--wide' : '',
        loading ? 'f6-card--loading' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-busy={loading}
      data-tour="milestone"
      data-avatar={m.token}
      data-org={m.orgSlug}
    >
      <div className="f6-card__identity market-identity">
        <span className="f6-card__token">
          <TokenLogo token={m.token} chain={m.chain} />
        </span>

        <span className="f6-card__meta">
          <IconOrg />
          <span className={/\s/.test(name) ? "identity-name" : "identity-name identity-name--single"} title={/\s/.test(name) ? undefined : name}>{name}</span>
        </span>

        <span className="f6-card__meta">
          <IconToken />
          <span className={/\s/.test(m.chain) ? "identity-name" : "identity-name identity-name--single"} title={/\s/.test(m.chain) ? undefined : m.chain}>{m.chain}</span>
        </span>

        <CountdownChip end={m.endTimestamp} />
      </div>

      <h3 className="f6-card__question" title={`${m.question.pre}${m.question.cond}`}>
        {m.question.pre}
        <span className="f6-card__condition">{m.question.cond}</span>
      </h3>

      <MarketSignal market={m} mini />
    </a>
  );
}
