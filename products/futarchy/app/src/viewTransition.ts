import { flushSync } from 'react-dom';

let active: { transition: ViewTransition; clear: () => void } | undefined;

export function cancelViewTransition() {
  if (active) {
    active.transition.skipTransition();
    active.clear();
  }
  delete document.documentElement.dataset.transition;
}

// Bound capture/animation lifetime even if the browser never settles finished.
export async function startViewTransition(update: () => void, kind: 'view' | 'theme' = 'view'): Promise<void> {
  cancelViewTransition();
  const root = document.documentElement;
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    flushSync(update);
    return;
  }
  root.dataset.transition = kind;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let applied = false;
  const commit = () => { if (!applied) { applied = true; flushSync(update); } };
  let transition: ViewTransition | undefined;
  let clear = () => { delete root.dataset.transition; };
  try {
    transition = document.startViewTransition(commit);
    const current = transition;
    clear = () => {
      if (active?.transition !== current) return;
      active = undefined;
      delete root.dataset.transition;
    };
    active = { transition, clear };
    void transition.ready.catch(() => undefined);
    await Promise.race([
      transition.finished.catch(() => undefined),
      new Promise<void>(resolve => { timer = setTimeout(() => { current.skipTransition(); resolve(); }, 700); }),
    ]);
  } catch {
    transition?.skipTransition();
    commit();
  } finally {
    clearTimeout(timer);
    clear();
  }
}
