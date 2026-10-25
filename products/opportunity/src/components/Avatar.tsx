import type { AvatarKey } from '../data/avatars';
export function Avatar({avatar, size = 32}: {avatar: AvatarKey; size?: 20 | 24 | 32 | 44}) {
 return <span className="avatar" data-avatar={avatar} style={{width:size,height:size}} aria-hidden="true">{avatar.slice(0,2).toUpperCase()}</span>;
}
