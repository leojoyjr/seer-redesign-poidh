import { useEffect, useState } from 'react';
import { findMilestone, organizations } from './data/milestones';
import { cancelViewTransition, startViewTransition } from './viewTransition';
let internalNavigation = false;
export type Route = { kind: 'list'; org?: string } | { kind: 'detail'; id: string } | { kind: 'create' };
function readRoute(): Route {
  const path = location.hash.slice(1).split('?')[0];
  if (path === '/create') return { kind: 'create' };
  const detail = /^\/m\/([^/]+)$/.exec(path);
  if (detail && findMilestone(detail[1])) return { kind: 'detail', id: detail[1] };
  const org = /^\/org\/([^/]+)$/.exec(path);
  if (org && organizations.some(o => o.slug === org[1])) return { kind: 'list', org: org[1] };
  return { kind: 'list' };
}
function scrollToOrganization() {
  const section = document.getElementById('milestones');
  if (!section) return;
  const offset = (document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 64) + 16;
  window.scrollTo({ top: section.getBoundingClientRect().top + scrollY - offset, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
export function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const positions = new Map<string, number>();
    let previous = location.hash;
    let current = readRoute();
    if (readRoute().kind === 'list' && /^#\/org\//.test(location.hash)) requestAnimationFrame(scrollToOrganization);
    const update = () => {
      const leavingOrg = previous.startsWith('#/org/');
      positions.set(previous, scrollY);
      internalNavigation = true;
      previous = location.hash;
      const next = readRoute(), destination = location.hash;
      cancelViewTransition();
      const changesView = current.kind !== next.kind;
      current = next;
      const commit = () => { if (location.hash === destination) setRoute(next); };
      const transition = changesView ? startViewTransition(commit) : undefined;
      if (!changesView) setRoute(next);
      const restore = () => requestAnimationFrame(() => {
        if (location.hash !== destination) return;
        if (next.kind === 'list' && next.org) scrollToOrganization();
        else window.scrollTo(0, next.kind === 'list' && leavingOrg ? 0 : positions.get(destination) ?? 0);
      });
      if (transition) void transition.then(restore, restore); else restore();
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}
export function backToLanding() { if (internalNavigation) history.back(); else location.hash = '/'; }
