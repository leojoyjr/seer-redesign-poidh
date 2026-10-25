import type { Milestone } from '../data/milestones';
import { Avatar } from './Avatar';
export function TokenLogo({ token, chain }: Pick<Milestone, 'token' | 'chain'>) {
  return <Avatar avatar={token} chain={chain} />;
}
