import { useMemo, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { orgAvatars } from '../data/avatars';
import { organizations } from '../data/milestones';
import { Avatar } from './Avatar';
import { MiniFork } from './ClosedStrip';
import {
  IconArrowRight,
  IconChevronDown,
  IconSearch,
} from './icons';

type Organization = (typeof organizations)[number];
type SortKey =
  | 'name'
  | 'market'
  | 'active'
  | 'proposals'
  | 'chain'
  | 'liquidity';
type SortDirection = 'ascending' | 'descending';

const sortColumns: ReadonlyArray<{
  key: SortKey;
  label: string;
  numeric?: boolean;
}> = [
  { key: 'name', label: 'Name' },
  { key: 'market', label: 'Market' },
  { key: 'active', label: 'Active', numeric: true },
  { key: 'proposals', label: 'Proposals', numeric: true },
  { key: 'chain', label: 'Chain' },
  { key: 'liquidity', label: 'Liquidity', numeric: true },
];

const liquidityFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const maximumLiquidity = Math.max(
  1,
  ...organizations.map(organization => organization.liquidity ?? 0),
);

function chainName(chain: string): string {
  return chain === 'ETH' ? 'Ethereum' : chain;
}

function sortValue(
  organization: Organization,
  key: SortKey,
): string | number {
  switch (key) {
    case 'name':
      return organization.name;
    case 'market':
      return organization.activeMarket ? 1 : 0;
    case 'active':
      return organization.active;
    case 'proposals':
      return organization.proposals;
    case 'chain':
      return chainName(organization.chain);
    case 'liquidity':
      return organization.liquidity ?? -1;
  }
}

export function OrgTable({
  loading,
  selectedOrg,
}: {
  loading: boolean;
  selectedOrg?: string;
}) {
  const [sortState, setSortState] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: 'proposals',
    direction: 'descending',
  });
  const [query, setQuery] = useState('');
  const reduced = useReducedMotion();

  const selectedOrganizations = useMemo(
    () => new Set(selectedOrg?.split(',').filter(Boolean) ?? []),
    [selectedOrg],
  );

  const sorted = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return organizations
      .filter(organization =>
        organization.name
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      )
      .sort((left, right) => {
        const leftValue = sortValue(left, sortState.key);
        const rightValue = sortValue(right, sortState.key);

        const comparison =
          typeof leftValue === 'string' &&
          typeof rightValue === 'string'
            ? leftValue.localeCompare(rightValue)
            : Number(leftValue) - Number(rightValue);

        if (comparison === 0) {
          return left.name.localeCompare(right.name);
        }

        return sortState.direction === 'descending'
          ? -comparison
          : comparison;
      });
  }, [query, sortState]);

  const toggleSort = (key: SortKey) => {
    setSortState(current => {
      if (current.key === key) {
        return {
          key,
          direction:
            current.direction === 'descending'
              ? 'ascending'
              : 'descending',
        };
      }

      return {
        key,
        direction:
          key === 'name' || key === 'chain'
            ? 'ascending'
            : 'descending',
      };
    });
  };

  const ariaSort = (
    key: SortKey,
  ): SortDirection | 'none' =>
    sortState.key === key ? sortState.direction : 'none';

  return (
    <section
      data-align
      id="organizations"
      className="f6-organizations"
      aria-labelledby="org-title"
    >
      <div className="f6-list-heading f6-organizations__heading">
        <div className="f6-list-heading__title-group">
          <h2 id="org-title">Organizations</h2>
        </div>

        <label className="f6-organizations__search-field">
          <IconSearch />
          <span className="f6-list-sr-only sr-only">
            Search organizations
          </span>
          <input
            className="f6-organizations__search"
            aria-label="Search organizations"
            placeholder="Search organizations"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div
        className="f6-organizations__surface"
        aria-busy={loading}
      >
        {loading && (
          <span
            className="f6-list-sr-only sr-only"
            role="status"
          >
            Loading organizations
          </span>
        )}

        <table className="f6-organizations__table">
          <caption className="f6-list-sr-only sr-only">
            Organizations and their active markets, proposals, chains,
            and liquidity
          </caption>

          <colgroup>
            <col className="f6-organizations__col-name" />
            <col className="f6-organizations__col-market" />
            <col className="f6-organizations__col-active" />
            <col className="f6-organizations__col-proposals" />
            <col className="f6-organizations__col-chain" />
            <col className="f6-organizations__col-liquidity" />
          </colgroup>

          <thead className="f6-organizations__table-head">
            <tr className="organization-head">
              {sortColumns.map(column => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort(column.key)}
                  data-numeric={
                    column.numeric ? 'true' : undefined
                  }
                >
                  <button
                    type="button"
                    className="f6-organizations__sort"
                    aria-label={`Sort ${column.label.toLowerCase()}`}
                    data-active={
                      sortState.key === column.key
                        ? 'true'
                        : 'false'
                    }
                    data-direction={
                      sortState.key === column.key
                        ? sortState.direction
                        : undefined
                    }
                    onClick={() => toggleSort(column.key)}
                  >
                    {column.label}
                    <IconChevronDown className="f6-organizations__sort-icon" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <tr
                  className="f6-organizations__loading-row"
                  key={`loading-${index}`}
                  aria-hidden="true"
                >
                  <td>
                    <span className="f6-list-skeleton f6-list-skeleton--name" />
                  </td>
                  <td>
                    <span className="f6-list-skeleton f6-list-skeleton--market" />
                  </td>
                  <td>
                    <span className="f6-list-skeleton f6-list-skeleton--small" />
                  </td>
                  <td>
                    <span className="f6-list-skeleton f6-list-skeleton--small" />
                  </td>
                  <td>
                    <span className="f6-list-skeleton f6-list-skeleton--chain" />
                  </td>
                  <td>
                    <span className="f6-list-skeleton f6-list-skeleton--liquidity" />
                  </td>
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td
                  className="f6-organizations__empty-cell"
                  colSpan={6}
                >
                  <div className="f6-organizations__empty">
                    <p>No organizations match this search.</p>
                    <button
                      type="button"
                      className="f6-organizations__empty-action"
                      onClick={() => setQuery('')}
                    >
                      Clear search
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((organization, index) => {
                const selected = selectedOrganizations.has(
                  organization.slug,
                );
                const liquidityText =
                  organization.liquidity === null
                    ? 'Not available'
                    : liquidityFormatter.format(
                        organization.liquidity,
                      );
                const liquidityScale =
                  organization.liquidity === null
                    ? 0
                    : Math.min(
                        1,
                        organization.liquidity /
                          maximumLiquidity,
                      );
                const rowStyle = {
                  '--f6-list-row-delay': `${
                    Math.min(index, 5) * 40
                  }ms`,
                } as CSSProperties;
                const liquidityStyle = {
                  '--f6-liquidity-scale': `${liquidityScale}`,
                } as CSSProperties;
                const readableChain = chainName(
                  organization.chain,
                );

                return (
                  <motion.tr
                    key={organization.slug}
                    className={[
                      'f6-organizations__row organization-row',
                      selected
                        ? 'f6-organizations__row--selected'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-current={selected ? 'true' : undefined}
                    onClick={event => { if (!(event.target as HTMLElement).closest('a,button')) location.hash = `/org/${organization.slug}`; }}
                    data-org={organization.slug}
                    data-avatar={orgAvatars[organization.slug]}
                    layout={!reduced}
                    style={rowStyle}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : {
                            duration: 0.32,
                            ease: [0.16, 1, 0.3, 1],
                          }
                    }
                  >
                    <td data-label="Name">
                      <span className="f6-organizations__name">
                        <a
                          href={`#/org/${organization.slug}`}
                          className="f6-organizations__primary-link"
                          aria-current={
                            selected ? 'true' : undefined
                          }
                          aria-label={`${organization.name}, ${organization.active} active, ${organization.proposals} proposals, ${readableChain}, liquidity ${liquidityText}`}
                          data-org={organization.slug}
                          data-avatar={
                            orgAvatars[organization.slug]
                          }
                        >
                          <span
                            className="f6-organizations__avatar"
                            aria-hidden="true"
                          >
                            <Avatar
                              avatar={
                                orgAvatars[organization.slug]
                              }
                              size={32}
                            />
                          </span>
                          <span className={`f6-organizations__name-text identity-name${/\s/.test(organization.name) ? "" : " identity-name--single"}`}
                            title={/\s/.test(organization.name) ? undefined : organization.name}>
                            {organization.name}
                          </span>
                          <IconArrowRight
                            className="f6-organizations__chevron"
                            aria-hidden="true"
                          />
                        </a>
                      </span>
                    </td>

                    <td data-label="Market">
                      <span className="f6-organizations__market organization-market">
                        <MiniFork />
                        {organization.activeMarket && (
                          <span className="f6-organizations__active-market active-market">
                            <span
                              className="f6-organizations__active-dot"
                              aria-hidden="true"
                            />
                            <span>Active market</span>
                          </span>
                        )}
                      </span>
                    </td>

                    <td
                      className="f6-organizations__number"
                      data-label="Active"
                    >
                      {organization.active}
                    </td>

                    <td
                      className="f6-organizations__number"
                      data-label="Proposals"
                    >
                      {organization.proposals}
                    </td>

                    <td data-label="Chain">
                      <span className="f6-organizations__chain">
                        <span
                          className="f6-organizations__chain-avatar"
                          aria-hidden="true"
                        >
                          <Avatar
                            avatar={
                              organization.chain === 'Gnosis'
                                ? 'GNO'
                                : 'ETH'
                            }
                            size={16}
                          />
                        </span>
                        {readableChain}
                      </span>
                    </td>

                    <td
                      className="f6-organizations__liquidity"
                      data-label="Liquidity"
                    >
                      {organization.liquidity === null ? (
                        <span className="f6-organizations__liquidity-value">
                          Not available
                        </span>
                      ) : (
                        <>
                          <span
                            className="f6-organizations__liquidity-rail"
                            aria-hidden="true"
                            style={liquidityStyle}
                          >
                            <span className="f6-organizations__liquidity-fill" />
                          </span>
                          <span className="f6-organizations__liquidity-value">
                            {liquidityText}
                          </span>
                        </>
                      )}
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>

        <output
          className="f6-organizations__count"
          aria-live="polite"
          aria-atomic="true"
        >
          {loading
            ? 'Loading organizations'
            : `${sorted.length} organizations`}
        </output>
      </div>
    </section>
  );
}
