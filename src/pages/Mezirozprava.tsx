import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';
import MarkdownRenderer from '@/components/MarkdownRenderer';

type Med = any;
type Msg = { id: string; mediation_id: string; author_id: string; content: string; created_at: string };

const STATUS_META: Record<string, { label: string; color: string; desc: string }> = {
  requested: { label: 'Čeká na schválení', color: '#f59e0b', desc: 'Žádost je odeslaná a čeká na otevření vedením webu.' },
  open: { label: 'Otevřená', color: '#10b981', desc: 'Mezirozprava je otevřená a lze do ní psát.' },
  closed: { label: 'Uzavřená', color: '#6b7280', desc: 'Konverzace byla ukončena.' },
  archived: { label: 'Archivovaná', color: '#9ca3af', desc: 'Konverzace je uložená v archivu.' },
};

export default function Mezirozprava() {
  const { id } = useParams();
  const { user, isRektor, isSpravce, loading: authLoading } = useAuth();
  const isStaff = isRektor || isSpravce;
  const [med, setMed] = useState<Med | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id || authLoading) return;
    setLoading(true);
    const { data: m } = await (supabase as any).from('mediations_v2').select('*').eq('id', id).maybeSingle();
    const { data: ms } = m
      ? await (supabase as any).from('mediation_messages_v2').select('*').eq('mediation_id', id).order('created_at')
      : { data: [] };
    setMed(m);
    setMsgs(ms || []);
    const ids = Array.from(new Set<string>([m?.subject_user_id, m?.opened_by, ...(ms || []).map((x: Msg) => x.author_id)].filter(Boolean) as string[]));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('user_id,display_name,username,avatar_url').in('user_id', ids);
      const map: Record<string, any> = {};
      (profs || []).forEach(p => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  }, [id, authLoading]);

  useEffect(() => { load(); }, [load]);

  if (authLoading || loading) return <AppLayout><div className="panel-card">Načítání…</div></AppLayout>;
  if (!user) return <AppLayout><div className="panel-card">Pro zobrazení mezirozpravy se musíš přihlásit.</div></AppLayout>;
  if (!med) return <AppLayout><div className="panel-card">Mezirozprava nenalezena nebo k ní nemáš přístup.</div></AppLayout>;

  const subject = profiles[med.subject_user_id];
  const opener = profiles[med.opened_by];
  const meta = STATUS_META[med.status] || STATUS_META.requested;
  const canWrite = med.status === 'open' && (isStaff || user.id === med.subject_user_id || user.id === med.opened_by);

  const send = async () => {
    if (!text.trim()) return;
    const { error } = await (supabase as any).from('mediation_messages_v2').insert({ mediation_id: med.id, author_id: user.id, content: text });
    if (error) return toast.error(error.message);
    await logAudit('mediation.message', { entityType: 'mediations_v2', entityId: med.id, minRole: isStaff ? 'spravce' : 'student' });
    setText('');
    load();
  };

  const close = async () => {
    const { error } = await (supabase as any).from('mediations_v2').update({ status: 'closed' }).eq('id', med.id);
    if (error) return toast.error(error.message);
    await logAudit('mediation.close', { entityType: 'mediations_v2', entityId: med.id, details: { status: { from: med.status, to: 'closed' } }, minRole: 'spravce' });
    toast.success('Mezirozprava uzavřena');
    load();
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
              <h1 className="text-2xl font-extrabold mt-1">Mezirozprava s {subject ? <Link to={`/uziv/${subject.username}`} className="hover:underline">{subject.display_name}</Link> : 'uživatelem'}</h1>
              <p className="text-sm text-muted-foreground mt-1">{meta.desc}</p>
              <p className="text-xs text-muted-foreground mt-1">Otevřel: {opener?.display_name || med.opened_by.slice(0, 8)} • Zpráv: {med.message_count ?? msgs.length}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold text-white" style={{ background: meta.color }}>{meta.label}</span>
          </div>
        </div>

        {med.request_reason && (
          <div className="panel-card">
            <h3 className="mt-0 text-sm font-extrabold">📨 Důvod žádosti</h3>
            <MarkdownRenderer content={med.request_reason} />
          </div>
        )}

        <div className="panel-card">
          <h3 className="mt-0 text-sm font-extrabold">💬 Konverzace ({msgs.length})</h3>
          <div className="space-y-2 mb-3 max-h-[60vh] overflow-y-auto pr-1">
            {msgs.map(m => {
              const p = profiles[m.author_id];
              const mine = m.author_id === user.id;
              const staffMsg = m.author_id !== med.subject_user_id;
              return (
                <div key={m.id} className={`rounded-xl border p-3 ${mine ? 'bg-muted/70' : 'bg-card'}`} style={{ borderLeft: `5px solid ${staffMsg ? '#258B25' : '#6b7280'}` }}>
                  <div className="text-xs text-muted-foreground flex justify-between gap-2 flex-wrap">
                    <strong>{p?.display_name || m.author_id.slice(0, 8)}{mine ? ' (ty)' : ''}</strong>
                    <span>{new Date(m.created_at).toLocaleString('cs-CZ')}</span>
                  </div>
                  <div className="text-sm mt-1"><MarkdownRenderer content={m.content} /></div>
                </div>
              );
            })}
            {msgs.length === 0 && <p className="text-xs text-muted-foreground">Zprávy se objeví po schválení a otevření mezirozpravy.</p>}
          </div>
          {canWrite ? (
            <div className="grid gap-2">
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Napiš odpověď… (Markdown)" className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[90px]" />
              <div className="flex justify-between gap-2 flex-wrap">
                {isStaff && <button onClick={close} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-muted">Uzavřít mezirozpravu</button>}
                <button onClick={send} className="btn-alik-primary text-sm ml-auto">Odeslat zprávu</button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Do mezirozpravy teď psát nelze: {meta.label.toLowerCase()}.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
