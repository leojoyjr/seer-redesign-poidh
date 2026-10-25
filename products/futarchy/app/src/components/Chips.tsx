import { organizations } from '../data/milestones';
import { IconOrg, IconVerdictNeedle } from './icons';
import { Tooltip, impactExplanation } from './Tooltip';

export function LeanChip({ value }: { value: number }) {
  const lean = value > 0.01 ? 'Include' : value < -0.01 ? 'Exclude' : 'Neutral';
  const className = lean.toLowerCase();

  return (
    <Tooltip text={impactExplanation(value)}>
      <span
        tabIndex={0}
        className={`c-verdict c-verdict--${className}`}
      >
        <IconVerdictNeedle className="c-verdict__icon" />
        <span>{lean}</span>
      </span>
    </Tooltip>
  );
}

export function OrgChip({
  slug,
  linked = false,
}: {
  slug: string;
  linked?: boolean;
}) {
  const label = organizations.find(org => org.slug === slug)?.name ?? slug;

  return linked ? (
    <a className="c-org c-link" href={`#/org/${slug}`}>
      <IconOrg />
      <span>{label}</span>
    </a>
  ) : (
    <span className="c-org">
      <IconOrg />
      <span>{label}</span>
    </span>
  );
}
