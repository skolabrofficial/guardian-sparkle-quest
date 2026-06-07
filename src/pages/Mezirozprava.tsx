import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { ROLE_COLORS, ROLE_LABELS } from '@/lib/roleUtils';

type Med = any;
type Msg = { id: string; mediation_id: string; author_id: string; author_role: string | null; content: string; created_at: string };

const STATUS_META: Record<string, { l: string; color: string; desc: string }> = {
  requested:  { l: 'Žádost',       color: '#f59e0b', desc: 'Uživatel požádal o mezirozpravu, čeká na schválení.' },
  approved:   { l: 'Schválená',    color: '#10b981', desc: 'Mezirozprava byla schválena a otevřena.' },
  open:       { l: 'Otevřená',     color: '#10b981', desc: 'Probíhá konverzace.' },
  rejected:   { l: 'Zamítnutá',    color: '#ef4444', desc: 'Vedení žádost zamítlo.' },
  closed:     { l: 'Uzavřená',     color: '#6b7280', desc: 'Konverzace byla ukončena.' },
};

export default function Mezirozprava() {
  const { id } = useParams();
  const { user, role, isRektor, isSpravce } = useAuth();
  const isStaff = isRektor || isSpravce;
  const [med, setMed] = useState<Med | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [text, setText] = useState('');
  const [decision, setDecision] = useState('');
  const [inviteId, setInviteId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    const { data: m } = await (supabase as any).from('mediations').select('*').eq('id', id).maybeSingle();
    setMed(m);
    if (m) {
      const ids = [m.subject_user_id, m.opened_by, m.decided_by, m.closed_by, ...(m.invited_lektors || [])].filter(Boolean);
      const { data: profs } = await supabase.from('profiles').select('user_id,display_name,username,avatar_url').in('user_id', ids);
      const map: Record<string, any> = {};
      (profs || []).forEach(p => map[p.user_id] = p);
      setProfiles(map);
      const { data: ms } = await (supabase as any).from('mediation_messages').select('*').eq('mediation_id', id).order('created_at');
      setMsgs(ms || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <AppLayout><div className="panel-card">Načítání…</div></AppLayout>;
  if (!med)    return <AppLayout><div className="panel-card">Mezirozprava nenalezena nebo k ní nemáš přístup.</div></AppLayout>;

  const subject = profiles[med.subject_user_id];
  const meta = STATUS_META[med.status] || STATUS_META.requested;
  const canWrite = (med.status === 'approved' || med.status === 'open') &&
    (isStaff || user?.id === med.subject_user_id || (med.invited_lektors || []).includes(user?.id));

  const decide = async (next: 'approved' | 'rejected') => {
    const patch: any = { status: next, decision_reason: decision || null, decided_by: user!.id, decided_at: new Date().toISOString() };
    const { error } = await (supabase as any).from('mediations').update(patch).eq('id', med.id);
    if (error) return toast.error(error.message);
    await logAudit(`mediation.${next === 'approved' ? 'approve' : 'reject'}`, {
      entityType: 'mediations', entityId: med.id, details: { reason: decision, subject: med.subject_user_id },
      minRole: 'rektor',
    });
    setDecision(''); toast.success(next === 'approved' ? 'Mezirozprava schválena' : 'Mezirozprava zamítnuta'); load();
  };

  const close = async () => {
    const { error } = await (supabase as any).from('mediations').update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: user!.id }).eq('id', med.id);
    if (error) return toast.error(error.message);
    await logAudit('mediation.close', { entityType: 'mediations', entityId: med.id, minRole: 'spravce' });
    toast.success('Uzavřeno'); load();
  };

  const invite = async () => {
    if (!inviteId.trim()) return;
    const next = Array.from(new Set([...(med.invited_lektors || []), inviteId.trim()]));
    const { error } = await (supabase as any).from('mediations').update({ invited_lektors: next }).eq('id', med.id);
    if (error) return toast.error(error.message);
    await logAudit('mediation.invite_lektor', { entityType: 'mediations', entityId: med.id, details: { lektor: inviteId.trim() }, minRole: 'rektor' });
    setInviteId(''); toast.success('Lektor přizván'); load();
  };

  const send = async () => {
    if (!text.trim()) return;
    const { error } = await (supabase as any).from('mediation_messages').insert({
      mediation_id: med.id, author_id: user!.id, author_role: role, content: text,
    });
    if (error) return toast.error(error.message);
    await logAudit('mediation.message', { entityType: 'mediations', entityId: med.id, minRole: 'spravce' });
    if (med.status === 'approved') {
      await (supabase as any).from('mediations').update({ status: 'open' }).eq('id', med.id);
    }
    setText(''); load();
  };

  return (
    <AppLayout>
      <div className="grid gap-4">
        <div className="panel-card" style={{ borderTop: `5px solid ${meta.color}` }}>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link to="/mezirozprava" className="hover:underline">Mezirozpravy</Link>
                <span>›</span>
                <code className="px-1.5 py-0.5 rounded bg-muted">MED-{med.id.slice(0, 8).toUpperCase()}</code>
              </div>
              <h1 className="text-2xl font-extrabold mt-1" style={{ color: meta.color }}>
                Mezirozprava s {subject ? <Link to={`/uziv/${subject.username}`} className="hover:underline">{subject.display_name}</Link> : '?'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{meta.desc}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold text-white" style={{ background: meta.color }}>{meta.l.toUpperCase()}</span>
          </div>
        </div>

        {med.request_reason && (
          <div className="panel-card">
            <h3 className="mt-0 text-sm font-extrabold">📨 Důvod žádosti</h3>
            <MarkdownRenderer content={med.request_reason} />
          </div>
        )}

        {med.status === 'requested' && isStaff && (
          <div className="panel-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <h3 className="mt-0 text-sm font-extrabold">Rozhodnutí o žádosti</h3>
            <textarea value={decision} onChange={e => setDecision(e.target.value)} placeholder="Volitelné odůvodnění…" className="border-2 border-border rounded-xl py-2 px-3 text-sm w-full outline-none min-h-[60px] mb-2" />
            <div className="flex gap-2">
              <button onClick={() => decide('approved')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white">✓ Schválit a otevřít</button>
              <button onClick={() => decide('rejected')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white">✗ Zamítnout</button>
            </div>
          </div>
        )}

        {isRektor && (med.status === 'approved' || med.status === 'open') && (
          <div className="panel-card">
            <h3 className="mt-0 text-sm font-extrabold">✦ Přizvat lektora</h3>
            <div className="flex gap-2">
              <input value={inviteId} onChange={e => setInviteId(e.target.value)} placeholder="user_id lektora" className="border-2 border-border rounded-xl py-2 px-3 text-sm flex-1 outline-none" />
              <button onClick={invite} className="btn-alik-primary text-sm">Přizvat</button>
            </div>
            {(med.invited_lektors || []).length > 0 && (
              <div className="text-xs mt-2">Přizvaní: {(med.invited_lektors).map((u: string) => profiles[u]?.display_name || u.slice(0, 8)).join(', ')}</div>
            )}
          </div>
        )}

        <div className="panel-card">
          <h3 className="mt-0 text-sm font-extrabold">💬 Konverzace ({msgs.length})</h3>
          <div className="space-y-2 mb-3">
            {msgs.map(m => {
              const p = profiles[m.author_id];
              const c = ROLE_COLORS[m.author_role || ''] || '#6b7280';
              return (
                <div key={m.id} className="border-l-4 pl-3 py-1" style={{ borderColor: c }}>
                  <div className="text-xs text-muted-foreground">
                    <span style={{ color: c, fontWeight: 700 }}>{ROLE_LABELS[m.author_role || ''] || 'uživatel'}</span>{' '}
                    {p?.display_name || m.author_id.slice(0, 8)} • {new Date(m.created_at).toLocaleString('cs-CZ')}
                  </div>
                  <div className="text-sm"><MarkdownRenderer content={m.content} /></div>
                </div>
              );
            })}
            {msgs.length === 0 && <p className="text-xs text-muted-foreground">Zatím žádné zprávy.</p>}
          </div>
          {canWrite ? (
            <div className="grid gap-2">
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Tvá zpráva… (Markdown)" className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[80px]" />
              <div className="flex justify-between">
                {isStaff && <button onClick={close} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-muted">Uzavřít mezirozpravu</button>}
                <button onClick={send} className="btn-alik-primary text-sm ml-auto">Odeslat</button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Konverzace je {meta.l.toLowerCase()} — psát nelze.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
