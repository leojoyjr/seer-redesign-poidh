import { useSyncExternalStore } from 'react';
import type { ActiveMilestone } from './milestones';
import { verdictPresets } from './milestones';
import { buildSeries, type Series } from '../math/series';
const signals = new Map<string, Series>();
const listeners = new Set<() => void>();
export function marketSignal(market: ActiveMilestone): Series {
  let signal = signals.get(market.id);
  if (!signal) {
    signal = buildSeries(market.seed, { theta: verdictPresets[market.preset], spot: market.spot });
    signals.set(market.id, signal);
  }
  return signal;
}
export function publishSignal(id: string, signal: Series) {
  if (signals.get(id) === signal) return;
  signals.set(id, signal);
  listeners.forEach(listener => listener());
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function useSignalPoint(market: ActiveMilestone) {
  const signal = useSyncExternalStore(subscribe, () => marketSignal(market));
  return signal.points[signal.nowIndex];
}
