import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { nameWithRole } from '@/lib/roleUtils';
import { getSpecialUserBadge, SpecialUserBadgeView } from '@/lib/userBadges';

interface UserLinkProps {
  userId?: string | null;
  username?: string | null;
  displayName?: string | null;
  role?: string | null;
  className?: string;
  fallback?: string;
}

// Cache to avoid refetching usernames
const usernameCache: Record<string, string> = {};

/**
 * Renders a user's display name as a link to /uziv/:username.
 * If username isn't passed, it's resolved from userId (cached).
 */
export default function UserLink({ userId, username, displayName, role, className, fallback = 'Uživatel' }: UserLinkProps) {
  const [resolved, setResolved] = useState<string | null>(username || (userId ? usernameCache[userId] : null) || null);

  useEffect(() => {
    if (resolved || !userId || username) return;
    let alive = true;
    supabase.from('profiles').select('username').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (alive && data?.username) {
        usernameCache[userId] = data.username;
        setResolved(data.username);
      }
    });
    return () => { alive = false; };
  }, [userId, username, resolved]);

  const label = nameWithRole(displayName || fallback, role);
  const specialBadge = getSpecialUserBadge({ user_id: userId, username, display_name: displayName });

  if (!resolved) {
    return <span className={className}>{label}<SpecialUserBadgeView badge={specialBadge} compact /></span>;
  }
  return (
    <Link to={`/uziv/${resolved}`} className={`hover:underline focus:underline ${className || ''}`}>
      {label}<SpecialUserBadgeView badge={specialBadge} compact />
    </Link>
  );
}
