import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';

const STATUS_COLOR: Record<string, string> = {
  requested: '#f59e0b', approved: '#10b981', open: '#10b981', rejected: '#ef4444', closed: '#6b7280',
};

export default function MezirozpravaSeznam() {
  const { user } = useAuth();
  const [meds, setMeds] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await (supabase as any).from('mediations').select('*').order('created_at', { ascending: false });
    setMeds(data || []);
    const ids = (data || []).map((m: any) => m.subject_user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id,display_name,username').in('user_id', ids);
      const map: Record<string, any> = {};
      (profs || []).forEach(p => map[p.user_id] = p);
      setProfiles(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const request = async () => {
    if (!user) return toast.error('Musíš být přihlášen');
    if (!reason.trim()) return toast.error('Napiš důvod žádosti');
    const { data, error } = await (supabase as any).from('mediations').insert({
      subject_user_id: user.id, opened_by: user.id, status: 'requested', request_reason: reason,
    }).select().single();
    if (error) return toast.error(error.message);
    await logAudit('mediation.request', { entityType: 'mediations', entityId: data.id, minRole: 'student' });
    setReason(''); toast.success('Žádost odeslána'); load();
  };

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="panel-card">
          <h1 className="text-2xl font-extrabold mt-0">📨 Mezirozpravy</h1>
          <p className="text-sm text-muted-foreground mb-3">
            Soukromá konverzace mezi vedením webu a tebou. Žádost musí být schválena, než se otevře.
          </p>
          {user && (
            <div className="grid gap-2">
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Důvod žádosti o mezirozpravu…" className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[80px]" />
              <button onClick={request} className="btn-alik-primary text-sm w-fit">Požádat o mezirozpravu</button>
            </div>
          )}
        </div>

        <div className="panel-card">
          <h3 className="mt-0 text-sm font-extrabold">Seznam ({meds.length})</h3>
          {loading ? <p className="text-xs">Načítání…</p> : meds.length === 0 ? <p className="text-xs text-muted-foreground">Žádné mezirozpravy.</p> : (
            <div className="grid gap-2">
              {meds.map(m => (
                <Link key={m.id} to={`/mezirozprava/${m.id}`} className="block p-3 rounded-xl border-2 border-border hover:border-primary transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <strong className="block text-sm">{profiles[m.subject_user_id]?.display_name || m.subject_user_id.slice(0, 8)}</strong>
                      <code className="text-xs text-muted-foreground">MED-{m.id.slice(0, 8).toUpperCase()}</code>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: STATUS_COLOR[m.status] || '#6b7280' }}>{m.status}</span>
                  </div>
                  {m.request_reason && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.request_reason}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
