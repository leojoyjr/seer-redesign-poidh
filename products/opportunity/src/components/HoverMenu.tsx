import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {motion, useReducedMotion} from 'motion/react';
import { Avatar } from './Avatar';
import type { AvatarKey } from '../data/avatars';
export interface MenuOption { value: string; label: string; avatar?: AvatarKey; count?: number }
export function HoverMenu({ label, options, selected, onChange, multiple = false, children }: { label: string; options: MenuOption[]; selected: string[]; onChange: (values: string[]) => void; multiple?: boolean; children?: React.ReactNode }) {
  const reduced=useReducedMotion();
  const [open, setOpen] = useState(false), [index, setIndex] = useState(0);
  const [position, setPosition] = useState({ left: 8, top: 0, maxHeight: 320 });
  const restoring = useRef(false), pointerInside = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined), search = useRef(''), typedAt = useRef(0), id = useId();
  const cancel = () => clearTimeout(timer.current);
  const close = () => { cancel(); setOpen(false); };
  const show = () => { cancel(); window.dispatchEvent(new CustomEvent('opportunity:menu-open', { detail: id })); setOpen(true); };
  useEffect(() => {
    const other = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) close(); };
    window.addEventListener('opportunity:menu-open', other);
    return () => window.removeEventListener('opportunity:menu-open', other);
  }, [id]);
  const restore = () => { cancel(); restoring.current = true; trigger.current?.focus(); restoring.current = false; };
  const leave = () => { cancel(); timer.current = setTimeout(close, 220); };
  const focusItem = (next: number) => { setIndex(next); panel.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[next]?.focus(); };
  const select = (value: string) => { onChange(multiple ? selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value] : [value]); if (!multiple) { close(); restore(); } };
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = trigger.current, popup = panel.current;
      if (!anchor || !popup) return;
      const r = anchor.getBoundingClientRect(), gap = 8, inset = 8;
      if (r.bottom <= inset || r.top >= innerHeight - inset) { close(); return; }
      // Measure the full border box, including padding, before choosing a side.
      const style = getComputedStyle(popup);
      const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const desired = Math.min(360, popup.scrollHeight + border);
      const below = Math.max(0, innerHeight - inset - r.bottom - gap);
      const above = Math.max(0, r.top - inset - gap);
      const flip = desired > below && above > below;
      const height = Math.min(desired, flip ? above : below);
      setPosition({
        left: Math.max(inset, Math.min(r.left, innerWidth - popup.offsetWidth - inset)),
        top: flip ? r.top - gap - height : r.bottom + gap,
        maxHeight: height,
      });
    };
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, selected.length]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close(); };
    document.addEventListener('pointerdown', outside); return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const keyboard = (event: React.KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); restore(); }
    else if (options.length && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); show(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (event.target === trigger.current ? (event.key === 'ArrowUp' ? options.length - 1 : 0) : (index + (event.key === 'ArrowUp' ? -1 : 1) + options.length) % options.length); setIndex(next); requestAnimationFrame(() => focusItem(next)); }
    else if (event.key === 'Enter' && (event.target as HTMLElement).closest('[role=option]') && options[index]) { event.preventDefault(); select(options[index].value); }
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') { search.current = Date.now() - typedAt.current > 600 ? event.key : search.current + event.key; typedAt.current = Date.now(); const next = options.findIndex(o => o.label.toLowerCase().startsWith(search.current.toLowerCase())); if (next >= 0) { event.preventDefault(); setIndex(next); requestAnimationFrame(() => focusItem(next)); } }
  };
  return <div className="hover-menu" onPointerEnter={event => { pointerInside.current = true; if (event.pointerType !== 'touch') { cancel(); timer.current = setTimeout(() => { if (pointerInside.current) show(); }, 90); } }} onPointerLeave={() => { pointerInside.current = false; leave(); }} onKeyDown={keyboard} onBlur={event => { if (!panel.current?.contains(event.relatedTarget) && !event.currentTarget.contains(event.relatedTarget)) leave(); }}>
    <button ref={trigger} className="filter-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} onFocus={() => { if (!restoring.current) { cancel(); show(); } }} onPointerDown={event => { event.preventDefault(); }} onClick={event => { if (event.detail === 0) show(); else { cancel(); open ? close() : show(); } }} onKeyDown={event => { if (['Enter', ' '].includes(event.key)) { event.preventDefault(); show(); requestAnimationFrame(() => focusItem(index)); } }}><span className="menu-trigger-label">{label}</span>{multiple && selected.length > 0 && <span className="filter-badge">{selected.length}</span>}<svg className={open ? 'menu-chevron open' : 'menu-chevron'} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" aria-hidden="true"><path d="m3 4 3 3 3-3" /></svg></button>
    {open && createPortal(<motion.div initial={reduced?{opacity:0}:{opacity:0,scale:.96,y:6}} animate={{opacity:1,scale:1,y:0}} transition={reduced?{duration:0}:{duration:.2,ease:[.16,1,.3,1]}} ref={panel} id={id} data-entering={open} className="hover-panel" style={position} role="listbox" aria-label={label} aria-multiselectable={multiple || undefined} onKeyDown={keyboard} onPointerEnter={cancel} onPointerLeave={leave} onBlur={event => { if (!panel.current?.contains(event.relatedTarget) && event.relatedTarget !== trigger.current) leave(); }}>
      {children}{options.map((option, i) => <motion.button initial={{opacity:reduced?1:0}} animate={{opacity:1}} transition={{delay:reduced?0:i*.018,duration:.14}} className="menu-option" key={option.value} role="option" aria-label={option.label} aria-selected={selected.includes(option.value)} tabIndex={i === index ? 0 : -1} onFocus={() => { cancel(); setIndex(i); }} onClick={() => select(option.value)}>{option.avatar && <Avatar avatar={option.avatar} size={24} />}<span>{option.label}</span>{option.count !== undefined && <span className="menu-count">{option.count}</span>}<span className="menu-check" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 16 16"><path d="m3 8 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="18" strokeDashoffset={selected.includes(option.value)?0:18}/></svg></span></motion.button>)}
      {multiple && selected.length > 0 && <button className="menu-clear" onClick={() => onChange([])}>Clear</button>}
    </motion.div>, trigger.current?.closest('dialog') ?? document.body)}
  </div>;
}
