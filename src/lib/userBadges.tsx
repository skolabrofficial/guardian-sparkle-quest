export type SpecialUserBadge = {
  label: string;
  icon: string;
  title: string;
};

const BADGES_BY_USER_ID: Record<string, SpecialUserBadge> = {
  '71664158-2307-4649-bdfe-529afc9881b8': {
    label: 'Symbol univerzity',
    icon: '🐿️',
    title: 'Veverka Renata — univerzitní zvířátko a symbol vedení univerzity',
  },
};

export function getSpecialUserBadge(profile?: { user_id?: string | null; username?: string | null; display_name?: string | null } | null) {
  if (!profile) return null;
  if (profile.user_id && BADGES_BY_USER_ID[profile.user_id]) return BADGES_BY_USER_ID[profile.user_id];
  if ((profile.username || '').toLowerCase() === 'renata') return BADGES_BY_USER_ID['71664158-2307-4649-bdfe-529afc9881b8'];
  return null;
}

export function SpecialUserBadgeView({ badge, compact = false }: { badge: SpecialUserBadge | null; compact?: boolean }) {
  if (!badge) return null;
  return (
    <span className={`special-user-badge ${compact ? 'special-user-badge-compact' : ''}`} title={badge.title} aria-label={badge.title}>
      <span aria-hidden>{badge.icon}</span>
      {!compact && <span>{badge.label}</span>}
    </span>
  );
}