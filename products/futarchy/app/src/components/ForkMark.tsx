import type { SVGProps } from 'react';

export function ForkMark({
  size = 32,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) {
  const classes = ['ls-fork-mark', className].filter(Boolean).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
      className={classes}
    >
      <path className="ls-fork-mark__stem" d="M3 16h9" />
      <path className="ls-fork-mark__pass" d="M12 16c5 0 5-8 12-8h5" />
      <path className="ls-fork-mark__fail" d="M12 16c5 0 5 8 12 8h5" />
      <circle className="ls-fork-mark__node" cx="12" cy="16" r="2" />
    </svg>
  );
}
