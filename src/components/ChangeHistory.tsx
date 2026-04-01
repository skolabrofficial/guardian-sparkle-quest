import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { nameWithRole } from '@/lib/roleUtils';

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

const ACTION_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  create: { bg: '#e8fde8', border: '#22c55e', label: 'Vytvoření' },
  update: { bg: '#fff7ed', border: '#f97316', label: 'Úprava' },
  delete: { bg: '#fde8e8', border: '#ef4444', label: 'Smazání' },
  publish: { bg: '#e8fde8', border: '#16a34a', label: 'Zveřejnění' },
  unpublish: { bg: '#fefce8', border: '#eab308', label: 'Odzvěřejnění' },
  approve: { bg: '#e8fde8', border: '#22c55e', label: 'Schválení' },
  reject: { bg: '#fde8e8', border: '#ef4444', label: 'Zamítnutí' },
  move: { bg: '#f0eaff', border: '#8b5cf6', label: 'Přesun' },
  pin: { bg: '#fffbe8', border: '#eab308', label: 'Připnutí' },
  lock: { bg: '#f0f4ff', border: '#6366f1', label: 'Zamčení' },
  label: { bg: '#f0f4ff', border: '#3b82f6', label: 'Štítek' },
  enroll: { bg: '#e8fde8', border: '#22c55e', label: 'Zápis' },
  unenroll: { bg: '#fde8e8', border: '#ef4444', label: 'Odhlášení' },
  answer: { bg: '#e8f4ff', border: '#3b82f6', label: 'Odpověď' },
};

export default function ChangeHistory({ entityType, entityId, authorId }: Props) {
  const { user, isStaff, isDeveloper } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  const canView = user && (user.id === authorId || isStaff || isDeveloper);

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
          supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', ids),
          supabase.from('user_roles').select('user_id, role').in('user_id', ids),
        ]);
        if (pRes.data) {
          const map: Record<string, string> = {};
          pRes.data.forEach((p: any) => { map[p.user_id] = p.display_name; });
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

  const renderChanges = (changes: Record<string, any>) => {
    const entries = Object.entries(changes);
    if (entries.length === 0) return null;
    return (
      <div className="mt-1.5 space-y-1">
        {entries.map(([key, val]) => {
          if (typeof val === 'object' && val !== null && 'from' in val && 'to' in val) {
            return (
              <div key={key} className="text-xs">
                <strong>{key}:</strong>{' '}
                <span className="line-through text-red-500">{String(val.from ?? '—')}</span>
                {' → '}
                <span className="text-green-600 font-semibold">{String(val.to ?? '—')}</span>
              </div>
            );
          }
          return (
            <div key={key} className="text-xs">
              <strong>{key}:</strong> {String(val)}
            </div>
          );
        })}
      </div>
    );
  };

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
        <div className="mt-2 space-y-0 animate-fade-in">
          {history.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">Žádné záznamy.</p>
          )}
          {history.map(entry => {
            const style = ACTION_STYLES[entry.action] || ACTION_STYLES.update;
            return (
              <div
                key={entry.id}
                className="flex gap-0 relative"
              >
                {/* Action label on the left */}
                <div
                  className="w-[90px] shrink-0 text-xs font-bold py-2.5 px-2 text-center flex items-center justify-center"
                  style={{
                    background: style.bg,
                    color: style.border,
                    borderLeft: `4px solid ${style.border}`,
                  }}
                >
                  {style.label}
                </div>

                {/* Content */}
                <div
                  className="flex-1 py-2.5 px-3 border-b border-border"
                  style={{ background: style.bg + '40' }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-xs">
                      {nameWithRole(profiles[entry.user_id] || 'Uživatel', userRoles[entry.user_id])}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString('cs')}
                    </span>
                  </div>
                  {renderChanges(entry.changes)}
                </div>
              </div>
            );
          })}
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
