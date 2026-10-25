import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import '../styles/detail-core.css';
import { ForkMark } from './ForkMark';
import { HoverMenu } from './HoverMenu';
import {
  IconArrowRight,
  IconFailLine,
  IconPassLine,
} from './icons';
import { Segmented } from './Segmented';

interface Pair {
  id: number;
  time: number;
  amount: number;
  price: number;
}

const epoch = Date.UTC(2026, 9, 17, 12);

function pair(id: number): Pair {
  return {
    id,
    time: epoch + id * 6000,
    amount: 80 + ((id * 7919 + 24935) % 60000) / 100,
    price: 2430 + Math.sin(id * 1.7) * 1.8,
  };
}

function date(time: number) {
  const value = new Date(time);
  return `${String(value.getUTCMonth() + 1).padStart(2, '0')}/${String(
    value.getUTCDate(),
  ).padStart(2, '0')} ${String(value.getUTCHours()).padStart(2, '0')}:${String(
    value.getUTCMinutes(),
  ).padStart(2, '0')}`;
}

function dateTitle(time: number) {
  return new Date(time).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'long',
    timeZone: 'UTC',
  });
}

export function ActivityTable({ historical = false }: { historical?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const anchor = useRef<{ top: number; height: number } | null>(null);
  const [tab, setTab] = useState('activity');
  const [limit, setLimit] = useState(30);
  const [pairs, setPairs] = useState(() =>
    Array.from({ length: 45 }, (_, index) => pair(44 - index)),
  );
  const [fresh, setFresh] = useState(-1);
  const [loading, setLoading] = useState(true);
  const sequence = useRef(45);
  const reduced = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (reduced || historical) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;

      const element = scroller.current;
      if (element && element.scrollTop > 0) {
        anchor.current = {
          top: element.scrollTop,
          height: element.scrollHeight,
        };
      }

      const next = pair(sequence.current++);
      window.dispatchEvent(new Event('futarchy:activity'));
      setFresh(next.id);
      setPairs(previous => [next, ...previous].slice(0, 45));
    }, 6000);

    return () => clearInterval(timer);
  }, [reduced, historical]);

  useLayoutEffect(() => {
    const element = scroller.current;
    const saved = anchor.current;
    if (element && saved) element.scrollTop = saved.top;
    anchor.current = null;
  }, [pairs]);

  const emptyTitle = tab === 'trades' ? 'No trades yet.' : 'No position';
  const emptyBody =
    tab === 'trades'
      ? 'Connect a wallet to see your trades.'
      : 'You do not have a position in this market.';

  return (
    <section
      data-tour="activity"
      data-align
      className="dt-activity-section activity-section"
      aria-label="Recent Activity"
    >
      <div className="dt-activity-heading">
        <div className="dt-activity-tabs">
          <Segmented
            label="Recent Activity"
            variant="underline"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'activity', label: 'Recent activity' },
              { value: 'trades', label: 'My trades' },
              { value: 'position', label: 'Position' },
            ]}
          />
        </div>

        <span className="dt-activity-count">
          {tab === 'activity' ? limit : 0} trades
        </span>

        {tab === 'activity' && (
          <div className="dt-activity-menu">
            <HoverMenu
              label={`Last ${limit} trades`}
              options={[30, 60, 90].map(number => ({
                value: String(number),
                label: `Last ${number} trades`,
              }))}
              selected={[String(limit)]}
              onChange={values => setLimit(Number(values[0]))}
            />
          </div>
        )}
      </div>

      {tab !== 'activity' ? (
        <div className="dt-activity-empty">
          <ForkMark size={44} />
          <strong>{emptyTitle}</strong>
          <p>{emptyBody}</p>
        </div>
      ) : (
        <div
          ref={scroller}
          tabIndex={0}
          aria-label="Recent Activity"
          className={`activity-table dt-activity-table ${
            loading ? 'dt-is-loading' : ''
          }`}
          aria-busy={loading}
        >
          <table>
            <caption className="dt-sr-only sr-only">Recent Activity</caption>
            <thead>
              <tr>
                <th>Outcome</th>
                <th>Amount</th>
                <th>Price</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {pairs
                .slice(0, limit / 2)
                .flatMap(item =>
                  (['PASS', 'FAIL'] as const).map(outcome => {
                    const isFresh = item.id === fresh;

                    return (
                      <motion.tr
                        layout={reduced ? false : 'position'}
                        initial={
                          isFresh && !reduced
                            ? { opacity: 0, y: -8 }
                            : false
                        }
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration:
                            reduced || anchor.current ? 0 : 0.32,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        key={`${item.id}-${outcome}`}
                        className={isFresh ? 'dt-trade-fresh' : ''}
                      >
                        <td data-label="Outcome">
                          <span
                            className={`dt-activity-outcome dt-activity-outcome--${outcome.toLowerCase()}`}
                          >
                            {outcome === 'PASS' ? (
                              <IconPassLine className="dt-activity-outcome-glyph" />
                            ) : (
                              <IconFailLine className="dt-activity-outcome-glyph" />
                            )}
                            <span className="dt-activity-outcome-name">
                              {outcome}
                            </span>
                            <span className="dt-activity-side">
                              {item.id % 3 === 0 ? 'Sell' : 'Buy'}
                            </span>
                          </span>
                        </td>
                        <td data-label="Amount">
                          <span className="dt-activity-swap-value">
                            {item.amount.toFixed(2)} USDS
                            <span className="dt-sr-only sr-only"> to </span>
                            <IconArrowRight />
                            {(item.amount / item.price).toFixed(4)} WETH
                          </span>
                        </td>
                        <td data-label="Price">
                          {item.price.toFixed(2)}
                        </td>
                        <td
                          data-label="Date"
                          title={dateTitle(item.time)}
                        >
                          {date(item.time)}
                        </td>
                      </motion.tr>
                    );
                  }),
                )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
