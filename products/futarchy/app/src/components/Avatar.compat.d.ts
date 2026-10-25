import type { ReactElement } from 'react';

declare module './Avatar' {
  export function Avatar(props: {
    avatar: string;
    size?: 16 | 20 | 24 | 32 | 44 | 48;
    chain?: string;
    className?: string;
  }): ReactElement;
}

export {};
