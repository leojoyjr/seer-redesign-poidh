import { useEffect, useRef, useState } from 'react';
import {
  closedMilestones,
  getActiveMilestones,
  organizations,
  type Milestone,
} from '../data/milestones';
import { orgAvatars, type AvatarKey } from '../data/avatars';
import { ClosedStrip } from './ClosedStrip';
import { HoverMenu } from './HoverMenu';
import { MarketMarquee } from './MarketMarquee';
import { LiveScene } from './LiveScene';
import { MilestoneHero } from './MilestoneHero';
import { OrgTable } from './OrgTable';
import { Segmented } from './Segmented';
import {
  IconFilter,
  IconFork,
  IconPlus,
  IconSearch,
  IconX,
} from './icons';
import '../styles/landing-hero.css';

const defaults = {
  q: '',
  org: '',
  token: '',
  status: 'All',
  sort: 'Closing soon',
};

type Filters = typeof defaults;
type MultiFilterKey = 'org' | 'token';

function readFilters(org?: string): Filters {
  const query = new URLSearchParams(location.search);
  const status = query.get('status') ?? 'All';
  const sort = query.get('sort') ?? 'Closing soon';

  return {
    q: query.get('q') ?? '',
    org: org ?? query.get('org') ?? '',
    token: query.get('token') ?? '',
    status: ['All', 'Active', 'Awaiting', 'Resolved'].includes(status)
      ? status
      : 'All',
    sort: ['Closing soon', 'Volume', 'Impact'].includes(sort)
      ? sort
      : 'Closing soon',
  };
}

export function Landing({ org, loading }: { org?: string; loading: boolean }) {
  const [filters, setFilters] = useState(() => readFilters(org));
  const [appliedExpanded, setAppliedExpanded] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileFilterTriggerRef = useRef<HTMLButtonElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [active] = useState(() => getActiveMilestones());

  useEffect(() => {
    setFilters(readFilters(org));
    setMobileFiltersOpen(false);
  }, [org]);

  useEffect(() => {
    const onPop = () => setFilters(readFilters(org));

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [org]);

  useEffect(() => {
    if (!mobileFiltersOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      setMobileFiltersOpen(false);
      requestAnimationFrame(() => mobileFilterTriggerRef.current?.focus());
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileFiltersOpen]);

  const update = (next: Filters) => {
    setFilters(next);

    const url = new URL(location.href);

    for (const key of Object.keys(defaults) as (keyof Filters)[]) {
      if (next[key] === defaults[key]) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, next[key]);
      }
    }

    if (org && next.org !== org) url.hash = '/';
    history.replaceState(null, '', url);

    if (org && next.org !== org) {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  };

  const set = (key: keyof Filters, value: string) => {
    update({ ...filters, [key]: value });

    if (key === 'org' && value && !value.includes(',')) {
      location.hash = `/org/${value}`;
    }
  };

  const matches = (milestone: Milestone) => {
    const name =
      organizations.find(
        organization => organization.slug === milestone.orgSlug,
      )?.name ?? '';

    return (
      (!filters.org ||
        filters.org.split(',').includes(milestone.orgSlug)) &&
      (!filters.token ||
        filters.token.split(',').includes(milestone.token)) &&
      (filters.status === 'All' || milestone.status === filters.status) &&
      `${milestone.question.pre}${milestone.question.cond} ${milestone.token} ${name} ${milestone.id} ${milestone.proposal}`
        .toLowerCase()
        .includes(filters.q.toLowerCase().trim())
    );
  };

  const visible = active
    .filter(matches)
    .sort((a, b) =>
      filters.sort === 'Volume'
        ? b.volume - a.volume
        : filters.sort === 'Impact'
          ? b.impact - a.impact
          : a.endTimestamp - b.endTimestamp,
    );

  const closed = closedMilestones
    .filter(matches)
    .sort((a, b) =>
      filters.sort === 'Impact' ? b.impact - a.impact : 0,
    );

  const filtered = Object.keys(defaults).some(
    key => filters[key as keyof Filters] !== defaults[key as keyof Filters],
  );

  const clear = () => {
    update({ ...defaults });
    setAppliedExpanded(false);
    setMobileFiltersOpen(false);
    location.hash = '/';

    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  };

  const closeMobileFilters = () => {
    setMobileFiltersOpen(false);
    requestAnimationFrame(() => mobileFilterTriggerRef.current?.focus());
  };

  const appliedFilters = (['org', 'token'] as const).flatMap(key =>
    filters[key]
      .split(',')
      .filter(Boolean)
      .map(value => ({
        key,
        value,
        label:
          key === 'org'
            ? organizations.find(
                organization => organization.slug === value,
              )?.name ?? value
            : value,
      })),
  );

  useEffect(() => {
    if (appliedFilters.length <= 3) setAppliedExpanded(false);
  }, [appliedFilters.length]);

  const visibleAppliedFilters = appliedExpanded
    ? appliedFilters
    : appliedFilters.slice(0, 3);
  const hiddenAppliedCount =
    appliedFilters.length - visibleAppliedFilters.length;
  const mobileFilterCount =
    appliedFilters.length + (filters.status === 'All' ? 0 : 1);

  const removeFilter = (key: MultiFilterKey, value: string) => {
    set(
      key,
      filters[key]
        .split(',')
        .filter(item => item && item !== value)
        .join(','),
    );
  };

  const controls = (
    <section
      className="f6-filter landing-controls"
      data-align
      data-tour="controls"
      aria-label="Filters"
    >
      <div className="f6-filter__row">
        <label className="f6-filter__search-field filter-search">
          <IconSearch />
          <span className="f6-sr-only sr-only">Search milestones</span>
          <input
            className="f6-filter__search-input"
            aria-label="Search milestones"
            placeholder="Search milestones"
            value={filters.q}
            onChange={event => set('q', event.target.value)}
          />
        </label>

        <button
          ref={mobileFilterTriggerRef}
          type="button"
          className="f6-filter__mobile-trigger"
          aria-expanded={mobileFiltersOpen}
          aria-controls="landing-filter-sheet"
          onClick={() => setMobileFiltersOpen(true)}
        >
          <IconFilter />
          <span>Filters</span>
          {mobileFilterCount > 0 && (
            <span className="f6-filter__count-badge" aria-hidden="true">
              {mobileFilterCount}
            </span>
          )}
        </button>

        {mobileFiltersOpen && (
          <button
            type="button"
            className="f6-filter__backdrop"
            data-open="true"
            aria-label="Close filters"
            onClick={closeMobileFilters}
          />
        )}

        <div
          id="landing-filter-sheet"
          className="f6-filter__controls controls-menus"
          data-open={mobileFiltersOpen ? 'true' : 'false'}
        >
          <div className="f6-filter__sheet-header">
            <span className="f6-filter__sheet-title">Filters</span>
            <button
              type="button"
              className="f6-filter__sheet-close"
              aria-label="Close filters"
              onClick={closeMobileFilters}
            >
              <IconX />
            </button>
          </div>

          <div className="f6-filter__menu f6-filter__menu--organization">
            <HoverMenu
              label="Organizations"
              multiple
              selected={filters.org.split(',').filter(Boolean)}
              onChange={values => set('org', values.join(','))}
              options={organizations.map(organization => ({
                value: organization.slug,
                label: organization.name,
                avatar: orgAvatars[organization.slug],
                count: [...active, ...closedMilestones].filter(
                  milestone => milestone.orgSlug === organization.slug,
                ).length,
              }))}
            />
          </div>

          <div className="f6-filter__menu f6-filter__menu--token">
            <HoverMenu
              label="Token"
              multiple
              selected={filters.token.split(',').filter(Boolean)}
              onChange={values => set('token', values.join(','))}
              options={(['ETH', 'GNO', 'PNK', 'AAVE'] as AvatarKey[]).map(
                value => ({
                  value,
                  label: value,
                  avatar: value,
                  count: [...active, ...closedMilestones].filter(
                    milestone => milestone.token === value,
                  ).length,
                }),
              )}
            />
          </div>

          <div className="f6-filter__status">
            <Segmented
              label="Status"
              options={['All', 'Active', 'Awaiting', 'Resolved'].map(
                value => ({
                  value,
                  label: value,
                }),
              )}
              value={filters.status}
              onChange={value => set('status', value)}
            />
          </div>

          <div className="f6-filter__menu f6-filter__menu--sort">
            <HoverMenu
              label={filters.sort}
              options={['Closing soon', 'Volume', 'Impact'].map(value => ({
                value,
                label: value,
              }))}
              selected={[filters.sort]}
              onChange={values => {
                const nextSort = values[0];

                if (nextSort) set('sort', nextSort);
              }}
            />
          </div>
        </div>

        {filtered && (
          <button
            type="button"
            className="f6-filter__clear"
            onClick={clear}
          >
            <IconX />
            Clear filters
          </button>
        )}

        <output
          key={`${visible.length}-${closed.length}`}
          className="f6-filter__results"
          aria-live="polite"
          aria-atomic="true"
        >
          {visible.length} active, {closed.length} closed
        </output>
      </div>

      {appliedFilters.length > 0 && (
        <div className="f6-filter__applied" aria-label="Applied filters">
          {visibleAppliedFilters.map(({ key, value, label }) => (
            <button
              type="button"
              className="f6-filter__token"
              key={`${key}-${value}`}
              aria-label={`Remove ${label}`}
              onClick={() => removeFilter(key, value)}
            >
              {label}
              <IconX />
            </button>
          ))}

          {hiddenAppliedCount > 0 && (
            <button
              type="button"
              className="f6-filter__more"
              onClick={() => setAppliedExpanded(true)}
            >
              Show {hiddenAppliedCount} more
            </button>
          )}
        </div>
      )}
    </section>
  );

  const empty = (
    <div className="f6-empty">
      <IconFork className="f6-empty__mark" />
      <h3 className="f6-empty__title">
        {filtered
          ? 'No milestones match these filters.'
          : 'No active milestones yet.'}
      </h3>
      <p className="f6-empty__body">
        {filtered
          ? 'Change or clear the current filters.'
          : 'Create a conditional market to begin forecasting a proposal.'}
      </p>

      {filtered ? (
        <button
          type="button"
          className="f6-empty__action"
          onClick={clear}
        >
          <IconX width={16} height={16} />
          Clear filters
        </button>
      ) : (
        <a className="f6-empty__action" href="#/create">
          <IconPlus width={16} height={16} />
          Create market
        </a>
      )}
    </div>
  );

  return (
    <>
      <div className="f9-hero-host" ref={heroRef}>
        <MilestoneHero
          scene={(market, feed) => (
            <>
            <MarketMarquee markets={visible} selected={market.id} onSelect={id => {
              const index = visible.findIndex(item => item.id === id);
              heroRef.current?.querySelectorAll<HTMLButtonElement>('.f6-lane__select')[index]?.click();
            }} />
            <div className="f9-hero__scene">
              <LiveScene
                market={market}
                feed={feed}
                markets={visible}
              />
            </div>
            </>
          )}
          markets={visible}
          controls={controls}
          empty={empty}
          loading={loading}
        />
      </div>
      <ClosedStrip markets={closed} />
      <OrgTable loading={loading} selectedOrg={filters.org} />
    </>
  );
}
