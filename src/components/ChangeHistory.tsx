import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProtokolFromAudit } from '@/components/Protokol';

interface HistoryEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  action: string;
  changes: Record<string, any>;
  created_at: string;
}

interface Props {
  entityType: string;
  entityId: string;
  authorId?: string;
}

export default function ChangeHistory({ entityType, entityId, authorId }: Props) {
  const { user, isStaff, isRektor } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string; username?: string; avatar_url?: string | null }>>({});
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const canView = user && (user.id === authorId || isStaff || isRektor);

  useEffect(() => {
    if (!open || !canView) return;
    loadHistory();
  }, [open, entityId]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('entity_history')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (data) {
      setHistory(data as HistoryEntry[]);
      const ids = [...new Set(data.map(h => h.user_id))];
      if (ids.length > 0) {
        const [pRes, rRes] = await Promise.all([
          supabase.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', ids),
          supabase.from('user_roles').select('user_id, role').in('user_id', ids),
        ]);
        if (pRes.data) {
          const map: Record<string, any> = {};
          pRes.data.forEach((p: any) => { map[p.user_id] = p; });
          setProfiles(map);
        }
        if (rRes.data) {
          const map: Record<string, string> = {};
          rRes.data.forEach((r: any) => { map[r.user_id] = r.role; });
          setUserRoles(map);
        }
      }
    }
  };

  if (!canView) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:brightness-95"
        style={{ background: '#f0f4ff', color: '#4a5c8a' }}
      >
        📜 {open ? 'Skrýt historii' : 'Historie změn'}
      </button>

      {open && (
        <div className="mt-3 space-y-2 animate-fade-in">
          {history.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">Žádné záznamy.</p>
          )}
          {history.map(entry => (
            <ProtokolFromAudit
              key={entry.id}
              row={entry as any}
              profile={profiles[entry.user_id]}
              role={userRoles[entry.user_id]}
              sourceTable="entity_history"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to record a history entry
export async function recordHistory(
  entityType: string,
  entityId: string,
  userId: string,
  action: string,
  changes: Record<string, any> = {}
) {
  await supabase.from('entity_history').insert({
    entity_type: entityType,
    entity_id: entityId,
    user_id: userId,
    action,
    changes,
  });
}
