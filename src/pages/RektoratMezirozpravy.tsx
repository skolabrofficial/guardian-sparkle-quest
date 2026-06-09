import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';

const STATUS_COLOR: Record<string, string> = {
  open: '#10b981', closed: '#6b7280', archived: '#9ca3af',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Otevřená', closed: 'Uzavřená', archived: 'Archivovaná',
};

export default function RektoratMezirozpravy() {
  const { user, isRektor } = useAuth();
  const [meds, setMeds] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [selectedStatus, setSelectedStatus] = useState<string>('open');
  const [loading, setLoading] = useState(true);

  if (!isRektor) {
    return <AppLayout><div className="panel-card text-red-600 font-bold">Přístup odepřen. Musíš být rektor.</div></AppLayout>;
  }

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from('mediations_v2').select('*').order('created_at', { ascending: false });
    const filtered = (data || []).filter((m: any) => selectedStatus === 'all' || m.status === selectedStatus);
    setMeds(filtered);
    
    const ids = (filtered || []).flatMap((m: any) => [m.subject_user_id, m.opened_by]).filter(Boolean) as string[];
    const uniqueIds = Array.from(new Set<string>(ids));
    if (uniqueIds.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id,display_name,username').in('user_id', uniqueIds);
      const map: Record<string, any> = {};
      (profs || []).forEach(p => map[p.user_id] = p);
      setProfiles(map);
    }
    setLoading(false);
  }, [selectedStatus]);

  useEffect(() => { load(); }, [load]);

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="panel-card">
          <h1 className="text-2xl font-extrabold mt-0">📨 Správa mezirozprav</h1>
          <p className="text-sm text-muted-foreground mb-4">Správa všech mezirozprav uživatelů</p>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {['open', 'closed', 'archived', 'all'].map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  selectedStatus === status
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {status === 'all' ? 'Všechny' : STATUS_LABEL[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <h3 className="mt-0 text-sm font-extrabold">Seznam ({meds.length})</h3>
          {loading ? (
            <p className="text-xs">Načítání…</p>
          ) : meds.length === 0 ? (
            <p className="text-xs text-muted-foreground">Žádné mezirozpravy v tomto filtru.</p>
          ) : (
            <div className="grid gap-2">
              {meds.map(m => (
                <Link
                  key={m.id}
                  to={`/rektorat/mezirozprava/${m.id}`}
                  className="block p-3 rounded-xl border-2 border-border hover:border-primary transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm">{profiles[m.subject_user_id]?.display_name || m.subject_user_id.slice(0, 8)}</strong>
                        <span className="text-xs text-muted-foreground">({profiles[m.opened_by]?.display_name || 'neznámý'})</span>
                      </div>
                      <code className="text-xs text-muted-foreground">MED-{m.id.slice(0, 8).toUpperCase()}</code>
                      {m.request_reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{m.request_reason}</p>}
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white block" style={{ background: STATUS_COLOR[m.status] || '#6b7280' }}>
                        {m.status}
                      </span>
                      <span className="text-xs text-muted-foreground block mt-1">
                        {new Date(m.created_at).toLocaleDateString('cs-CZ')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
