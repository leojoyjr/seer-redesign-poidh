import type * as React from 'react';

const iconProps = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} satisfies React.SVGProps<SVGSVGElement>;

export const IconArrowRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const IconArrowLeft = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </svg>
);

export const IconArrowUpRight = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

export const IconChevronDown = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconCheck = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const IconX = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M6 6 18 18" />
    <path d="M18 6 6 18" />
  </svg>
);

export const IconSearch = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 4.5 4.5" />
  </svg>
);

export const IconSun = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2" />
    <path d="M12 19v2" />
    <path d="M3 12h2" />
    <path d="M19 12h2" />
    <path d="m5.64 5.64 1.42 1.42" />
    <path d="m16.94 16.94 1.42 1.42" />
    <path d="m5.64 18.36 1.42-1.42" />
    <path d="m16.94 7.06 1.42-1.42" />
  </svg>
);

export const IconMoon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />
  </svg>
);

export const IconWallet = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M4 7.5V6a2 2 0 0 1 2-2h11" />
    <rect x="3" y="7.5" width="18" height="12.5" rx="3" />
    <path d="M16.5 12H21v4h-4.5a2 2 0 0 1 0-4Z" />
    <path d="M17 14h.01" />
  </svg>
);

export const IconPlus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

export const IconMinus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M5 12h14" />
  </svg>
);

export const IconInfo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6" />
    <path d="M12 7h.01" />
  </svg>
);

export const IconHelp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.75 9a2.5 2.5 0 1 1 3.5 2.29C12.4 11.7 12 12.25 12 13.5" />
    <path d="M12 17h.01" />
  </svg>
);

export const IconPlay = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="m9 7 8 5-8 5Z" />
  </svg>
);

export const IconPause = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M9 7v10" />
    <path d="M15 7v10" />
  </svg>
);

export const IconClock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

export const IconFlag = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M5 3v18" />
    <path d="M5 5h10l-1.5 3L15 11H5" />
  </svg>
);

export const IconUsers = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19" />
    <circle cx="16" cy="8" r="2.5" />
    <path d="M16 13a4.5 4.5 0 0 1 4.5 4.5V19" />
  </svg>
);

export const IconLayers = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="m12 3 9 5-9 5-9-5Z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 16 9 5 9-5" />
  </svg>
);

export const IconLink = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="m9.5 14.5 5-5" />
    <path d="M9.5 16.5 8 18a3.54 3.54 0 0 1-5-5l3-3a3.54 3.54 0 0 1 5 0" />
    <path d="M14.5 7.5 16 6a3.54 3.54 0 0 1 5 5l-3 3a3.54 3.54 0 0 1-5 0" />
  </svg>
);

export const IconExternal = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M11 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />
    <path d="M13 5h6v6" />
    <path d="m11 13 8-8" />
  </svg>
);

export const IconCopy = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <rect x="4" y="4" width="12" height="12" rx="2" />
    <rect x="8" y="8" width="11" height="11" rx="2" />
  </svg>
);

export const IconFilter = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M4 5h16l-6 7v5l-4 2v-7Z" />
  </svg>
);

export const IconBolt = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="m13.5 2-8 12h6l-1 8 8-12h-6Z" />
  </svg>
);

export const IconLock = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <rect x="5" y="10" width="14" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    <path d="M12 14v3" />
  </svg>
);

export const IconGauge = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M4 18a8 8 0 1 1 16 0" />
    <path d="m12 18 4-5" />
    <circle cx="12" cy="18" r="1" />
  </svg>
);

export const IconFork = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M3 12h6" />
    <path d="M9 12c4 0 4-6 10-6h2" />
    <path d="M9 12c4 0 4 6 10 6h2" strokeDasharray="6 4" />
  </svg>
);

export const IconGapBracket = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M5 7v10" />
    <path d="M19 7v10" />
    <path d="M5 12h14" />
    <path d="M12 9v6" />
  </svg>
);

export const IconVerdictNeedle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M4 18h16" />
    <path d="M12 18V6" />
    <path d="m10 8 2-2 2 2" />
  </svg>
);

export const IconPassLine = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M3 12h18" />
  </svg>
);

export const IconFailLine = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M3 12h18" strokeDasharray="6 4" />
  </svg>
);

export const IconOrg = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="8" r="3" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </svg>
);

export const IconToken = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" strokeDasharray="7 3" />
  </svg>
);

export const IconLiquidity = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M4 8h16" />
    <path d="M7 12h10" />
    <path d="M4 16h16" />
  </svg>
);

export const IconResolve = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M5 3v18" />
    <path d="M5 5h13l-2 4 2 4H5" />
    <path d="m9 9 1.5 1.5L14 7.5" />
  </svg>
);

export const IconTrade = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M4 8h14" />
    <path d="m15 5 3 3-3 3" />
    <path d="M20 16H6" />
    <path d="m9 13-3 3 3 3" />
  </svg>
);

export const IconReplay = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <path d="M19 8a8 8 0 1 0-12 10" />
    <path d="M9 8H5V4" />
    <path d="m10 9 6 3-6 3Z" />
  </svg>
);

export const IconMore = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...iconProps} {...props}>
    <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
);
