import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

type Med = any;
type Msg = { id: string; mediation_id: string; author_id: string; content: string; created_at: string };

const STATUS_COLOR: Record<string, string> = {
  requested: '#f59e0b', open: '#10b981', closed: '#6b7280', archived: '#9ca3af',
};

const STATUS_LABEL: Record<string, string> = {
  requested: 'Čeká na schválení', open: 'Otevřená', closed: 'Uzavřená', archived: 'Archivovaná',
};

export default function RektoratMezirozpravaDetail() {
  const { id } = useParams();
  const { user, isRektor, isSpravce } = useAuth();
  const [med, setMed] = useState<Med | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [text, setText] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [resolution, setResolution] = useState('');
  const [addToNotes, setAddToNotes] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!isRektor && !isSpravce) {
    return <AppLayout><div className="panel-card text-red-600 font-bold">Přístup odepřen. Musíš být rektor nebo správce.</div></AppLayout>;
  }

  const load = useCallback(async () => {
    if (!id) return;
    const { data: m } = await (supabase as any).from('mediations_v2').select('*').eq('id', id).maybeSingle();
    setMed(m);
    setNewStatus(m?.status || 'open');
    
    if (m) {
      const ids = [m.subject_user_id, m.opened_by].filter(Boolean);
      const { data: profs } = await supabase.from('profiles').select('user_id,display_name,username,avatar_url').in('user_id', ids);
      const map: Record<string, any> = {};
      (profs || []).forEach(p => map[p.user_id] = p);
      setProfiles(map);
      
      const { data: ms } = await (supabase as any).from('mediation_messages_v2').select('*').eq('mediation_id', id).order('created_at');
      setMsgs(ms || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <AppLayout><div className="panel-card">Načítání…</div></AppLayout>;
  if (!med) return <AppLayout><div className="panel-card">Mezirozprava nenalezena.</div></AppLayout>;

  const subject = profiles[med.subject_user_id];
  const opener = profiles[med.opened_by];

  const send = async () => {
    if (!text.trim()) return;
    const { error } = await (supabase as any).from('mediation_messages_v2').insert({
      mediation_id: med.id,
      author_id: user!.id,
      content: text,
    });
    if (error) return toast.error(error.message);
    await logAudit('mediation.message.rector', { entityType: 'mediations_v2', entityId: med.id, minRole: 'rektor' });
    setText('');
    toast.success('Zpráva odeslána');
    load();
  };

  const updateStatus = async (newSt: string) => {
    if (newSt === 'closed') return toast.error('Uzavření proveď níže s povinným výstupem.');
    const { error } = await (supabase as any)
      .from('mediations_v2')
      .update({ status: newSt, updated_at: new Date().toISOString() })
      .eq('id', med.id);
    if (error) return toast.error(error.message);
    await logAudit('mediation.status', { entityType: 'mediations_v2', entityId: med.id, details: { newStatus: newSt }, minRole: 'rektor' });
    setNewStatus(newSt);
    toast.success(`Status změněn na "${STATUS_LABEL[newSt]}"`);
    load();
  };

  const close = async () => {
    if (resolution.trim().length < 5) return toast.error('Napiš výstup alespoň pěti znaky.');
    const { error } = await (supabase as any).rpc('close_mediation_with_resolution', {
      _mediation_id: med.id, _resolution: resolution.trim(), _add_to_notes: addToNotes,
    });
    if (error) return toast.error(error.message);
    setResolution(''); setAddToNotes(false);
    toast.success('Mezirozprava byla uzavřena.');
    load();
  };

  return (
    <AppLayout>
      <div className="grid gap-4">
        {/* Header */}
        <div className="panel-card" style={{ borderTop: `5px solid ${STATUS_COLOR[med.status]}` }}>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Link to="/rektorat/mezirozpravy" className="hover:underline">Mezirozpravy</Link>
                <span>›</span>
                <code className="px-1.5 py-0.5 rounded bg-muted">MED-{med.id.slice(0, 8).toUpperCase()}</code>
              </div>
              <h1 className="text-2xl font-extrabold mt-0 mb-2">Mezirozprava s {subject?.display_name || '?'}</h1>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>👤 Subjekt: <strong>{subject?.display_name || med.subject_user_id.slice(0, 8)}</strong></p>
                <p>📝 Otevřena: <strong>{opener?.display_name || med.opened_by.slice(0, 8)}</strong></p>
                <p>📅 Vytvořena: <strong>{new Date(med.created_at).toLocaleString('cs-CZ')}</strong></p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold text-white block" style={{ background: STATUS_COLOR[med.status] }}>
                {STATUS_LABEL[med.status].toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Request reason */}
        {med.request_reason && (
          <div className="panel-card">
            <h3 className="mt-0 text-sm font-extrabold">📨 Důvod</h3>
            <MarkdownRenderer content={med.request_reason} />
          </div>
        )}

        {/* Status change */}
        <div className="panel-card">
          <h3 className="mt-0 text-sm font-extrabold">🔧 Správa</h3>
          <div className="flex gap-2 flex-wrap">
            {['requested', 'open', 'archived'].map(st => (
              <button
                key={st}
                onClick={() => updateStatus(st)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  newStatus === st
                    ? 'text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
                style={newStatus === st ? { background: STATUS_COLOR[st] } : {}}
              >
                {STATUS_LABEL[st]}
              </button>
            ))}
          </div>
          {med.status === 'open' && <div className="mt-4 rounded-xl border border-border p-3 grid gap-3">
            <div><strong className="text-sm">Výstup uzavření</strong><Textarea value={resolution} onChange={e => setResolution(e.target.value)} maxLength={5000} placeholder="Shrnutí rozhodnutí, dohody nebo dalšího postupu…" /></div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={addToNotes} onCheckedChange={v => setAddToNotes(v === true)} /> Přidat do neveřejných poznámek uživatele</label>
            <Button onClick={close} disabled={resolution.trim().length < 5}>Uzavřít s výstupem</Button>
          </div>}
        </div>

        {med.resolution && <div className="panel-card border-l-4 border-primary"><h3 className="mt-0 text-sm font-extrabold">✅ Výstup</h3><MarkdownRenderer content={med.resolution} /><p className="text-xs text-muted-foreground mt-2">{med.resolution_added_to_notes ? 'Přidáno také do poznámek uživatele.' : 'Výstup nebyl přidán do poznámek.'}</p></div>}

        {/* Messages */}
        <div className="panel-card">
          <h3 className="mt-0 text-sm font-extrabold">💬 Konverzace ({msgs.length})</h3>
          <div className="space-y-2 mb-3 max-h-[60vh] overflow-y-auto">
            {msgs.map(m => {
              const p = profiles[m.author_id];
              const isRectorMsg = m.author_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={`border-l-4 pl-3 py-1 rounded ${isRectorMsg ? 'border-blue-500 bg-blue-50' : 'border-primary'}`}
                >
                  <div className="text-xs text-muted-foreground">
                    <span style={{ fontWeight: 700 }}>{p?.display_name || m.author_id.slice(0, 8)}</span>
                    {isRectorMsg && <span className="ml-2 text-blue-600 font-bold">(Ty - rektor)</span>}
                    <span> • {new Date(m.created_at).toLocaleString('cs-CZ')}</span>
                  </div>
                  <div className="text-sm mt-1">
                    <MarkdownRenderer content={m.content} />
                  </div>
                </div>
              );
            })}
            {msgs.length === 0 && <p className="text-xs text-muted-foreground">Zatím žádné zprávy.</p>}
          </div>

          {med.status === 'open' ? (
            <div className="grid gap-2">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Tvá zpráva… (Markdown)"
                className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[80px]"
              />
              <button onClick={send} className="btn-alik-primary text-sm w-full">
                Odeslat zprávu
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Mezirozprava je uzavřena — psaní není možné.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
