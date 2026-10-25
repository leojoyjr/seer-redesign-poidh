import { useId, type ReactNode } from 'react';

export type IconName =
  | 'search'
  | 'filter'
  | 'sort'
  | 'table'
  | 'tiles'
  | 'matrix'
  | 'line-chart'
  | 'play'
  | 'pause'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'shield'
  | 'flag'
  | 'wallet'
  | 'check'
  | 'close'
  | 'info'
  | 'external'
  | 'copy'
  | 'sun'
  | 'moon'
  | 'help'
  | 'layers'
  | 'clock'
  | 'trend'
  | 'sliders'
  | 'user'
  | 'plus'
  | 'minus'
  | 'download'
  | 'upload'
  | 'diamond'
  | 'circle'
  | 'square'
  | 'hexagon'
  | 'mail'
  | 'book'
  | 'triangle';

const paths: Record<IconName, ReactNode> = {
  search: <><circle cx="10.5" cy="10.5" r="6.1" /><path d="m15 15 4.6 4.6" /></>,
  filter: <path d="M4 5h16l-6.3 7.2v5.2l-3.4 1.7v-6.9L4 5Z" />,
  sort: <><path d="M8 4.5v15M4.8 7.8 8 4.5l3.2 3.3" /><path d="M16 19.5v-15m-3.2 11.7 3.2 3.3 3.2-3.3" /></>,
  table: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M9 9.5v10m6-10v10" /></>,
  tiles: <><rect x="4" y="4" width="6.5" height="7" rx="1.4" /><rect x="13.5" y="4" width="6.5" height="5" rx="1.4" /><rect x="4" y="14" width="6.5" height="6" rx="1.4" /><rect x="13.5" y="12" width="6.5" height="8" rx="1.4" /></>,
  matrix: <path d="M4 4h3v3H4zM10.5 4h3v3h-3zM17 4h3v3h-3zM4 10.5h3v3H4zM10.5 10.5h3v3h-3zM17 10.5h3v3h-3zM4 17h3v3H4zM10.5 17h3v3h-3zM17 17h3v3h-3z" />,
  'line-chart': <><path d="M4 4.5v15h16" /><path d="m6.5 15 3.2-3.5 3.1 2 4.7-6" /><circle cx="6.5" cy="15" r=".7" /><circle cx="17.5" cy="7.5" r=".7" /></>,
  play: <path d="M8 5.8c0-.8.9-1.2 1.5-.8l9 5.5c.6.4.6 1.2 0 1.6l-9 5.8c-.7.4-1.5 0-1.5-.8V5.8Z" />,
  pause: <path d="M8 6v12m8-12v12" />,
  'chevron-left': <path d="m14.5 5.5-6.5 6.5 6.5 6.5" />,
  'chevron-right': <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  'chevron-down': <path d="m5.5 9 6.5 6.5L18.5 9" />,
  'chevron-up': <path d="M5.5 15 12 8.5l6.5 6.5" />,
  'arrow-up': <path d="M12 19V5m-5 5 5-5 5 5" />,
  'arrow-down': <path d="M12 5v14m-5-5 5 5 5-5" />,
  'arrow-right': <path d="M5 12h14m-5-5 5 5-5 5" />,
  'arrow-up-right': <path d="M5.5 18.5 18.5 5.5m-8 0h8v8" />,
  shield: <><path d="M12 3.5 19 6v5.3c0 4.2-2.7 7.4-7 9.2-4.3-1.8-7-5-7-9.2V6l7-2.5Z" /><path d="M12 6.8v9.7" /></>,
  flag: <path d="M5 20V5m.2.3c4-2.5 7 2 13-.4v8c-6 2.4-9-2.1-13 .4" />,
  wallet: <><rect x="3.5" y="6" width="17" height="13" rx="2.5" /><path d="M4 9h12M16 11h4.5v4H16a2 2 0 0 1 0-4Z" /></>,
  check: <path d="m5 12.5 4.2 4.2L19 6.8" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5m0-8h.01" /></>,
  external: <><path d="M11 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5V13" /><path d="M13 5h6v6m0-6-8 8" /></>,
  copy: <><rect x="8" y="8" width="11.5" height="11.5" rx="2" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" /></>,
  sun: <><circle cx="12" cy="12" r="3.7" /><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4m10.2 10.2 1.4 1.4m0-13-1.4 1.4M6.9 17.1l-1.4 1.4" /></>,
  moon: <path d="M19.4 15.6A8.4 8.4 0 0 1 8.5 4.7a8.4 8.4 0 1 0 10.9 10.9Z" />,
  help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9.5a2.6 2.6 0 1 1 3.3 2.5c-.8.3-.8 1-.8 1.8m0 2.7h.01" /></>,
  layers: <><path d="m12 4 8 4.5-8 4.5-8-4.5L12 4Z" /><path d="m5 12 7 4 7-4M5 15.5l7 4 7-4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
  trend: <path d="m4 17.5 5.2-5.3 3.5 3.2L20 7.8m-5.5 0H20v5.5" />,
  sliders: <><path d="M4 6h5m4 0h7M4 12h10m4 0h2M4 18h3m4 0h9" /><circle cx="11" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="9" cy="18" r="2" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-4 3.3-6 7-6s6.3 2 7 6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  download: <><path d="M12 4v10m-4-4 4 4 4-4" /><path d="M5 17v2h14v-2" /></>,
  upload: <><path d="M12 15V5m-4 4 4-4 4 4" /><path d="M5 17v2h14v-2" /></>,
  diamond: <path d="m12 3.5 8.5 8.5-8.5 8.5L3.5 12 12 3.5Z" />,
  circle: <circle cx="12" cy="12" r="8" />,
  square: <rect x="5" y="5" width="14" height="14" rx="2" />,
  triangle: <path d="M12 4.5 20 19H4L12 4.5Z" />,
  hexagon: <path d="m8 4.2 8-.1 4.2 7.8-4.1 7.9H8l-4.2-7.7L8 4.2Z" />,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7 7.5 6 7.5-6" /></>,
  book: <><path d="M4 5.5c3.1-.8 5.7-.3 8 1.3v12c-2.3-1.6-4.9-2.1-8-1.3v-12Z" /><path d="M20 5.5c-3.1-.8-5.7-.3-8 1.3v12c2.3-1.6 4.9-2.1 8-1.3v-12Z" /></>,
};

export function Icon({
  name,
  size = 20,
  className,
  title,
}: {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}) {
  const titleId = useId();

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
      className={className}
      fill="none"
      focusable="false"
      height={size}
      role={title ? 'img' : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}
