import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActiveBlock {
  block_type: string;
  affected_areas: string[] | null;
  severity: string;
  reason: string;
}

const SECTION_MAP: Record<string, string> = {
  '/fakulty': 'fakulty', '/kurzy': 'kurzy', '/rozvrh': 'rozvrh',
  '/studium': 'studium', '/vypisky': 'vypisky', '/doucovani': 'doucovani',
  '/rektorat': 'rektorat', '/profil': 'profil',
};

export default function BlockGuard({ children }: { children: ReactNode }) {
  const { user, isBlocked, loading } = useAuth();
  const location = useLocation();
  const [block, setBlock] = useState<ActiveBlock | null>(null);
  const [checked, setChecked] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);

  useEffect(() => {
    if (!user || !isBlocked) { setChecked(true); return; }
    (async () => {
      const { data } = await supabase
        .from('user_blocks')
        .select('block_type, affected_areas, severity, reason, visible_to_user')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('blocked_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setBlock(data as any);
      setChecked(true);
    })();
  }, [user, isBlocked]);

  if (loading || !checked) return null;

  if (!isBlocked) return <>{children}</>;
  if (!block) return <Navigate to="/blocked" replace />;

  // Warning type — show a dismissible banner, don't block
  if (block.block_type === 'warning') {
    return (
      <>
        {!warningDismissed && (
          <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white px-4 py-3 text-sm font-bold flex items-center justify-between animate-slide-down">
            <span>⚠️ Varování: {block.reason}</span>
            <button onClick={() => setWarningDismissed(true)} className="ml-4 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs">
              Rozumím
            </button>
          </div>
        )}
        <div className={warningDismissed ? '' : 'pt-12'}>{children}</div>
      </>
    );
  }

  // Area-specific block — check if current section is blocked
  if (block.block_type === 'partial' && block.affected_areas && block.affected_areas.length > 0) {
    const currentSection = Object.entries(SECTION_MAP).find(([path]) => location.pathname.startsWith(path))?.[1];
    if (!currentSection || !block.affected_areas.includes(currentSection)) {
      return <>{children}</>;
    }
    // This section is blocked
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="panel-card max-w-md text-center">
          <div className="text-4xl mb-3">🚧</div>
          <h2 className="text-lg font-extrabold text-destructive">Přístup omezen</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Nemáte přístup do sekce <strong>{currentSection}</strong> z důvodu: {block.reason}
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Omezení se vztahuje na: {block.affected_areas.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  // Full block
  return <Navigate to="/blocked" replace />;
}
