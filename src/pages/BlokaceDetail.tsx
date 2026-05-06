import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/layout/AppLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { toast } from 'sonner';
import { logAudit } from '@/lib/auditLog';

const TYPE_OPTS = [
  { v: 'warning', l: 'Varování (žluté)', desc: 'Banner, neomezuje přístup', color: '#eab308' },
  { v: 'partial', l: 'Částečná blokace', desc: 'Vybrané sekce', color: '#f97316' },
  { v: 'temporary', l: 'Dočasná blokace', desc: 'Plný přístup zakázán do data', color: '#ef4444' },
  { v: 'full', l: 'Plná blokace', desc: 'Veškerý přístup uzamčen', color: '#dc2626' },
  { v: 'shadow', l: 'Stínová blokace', desc: 'Uživatel nic nepozná, jen mu zmizí příspěvky', color: '#6b7280' },
  { v: 'readonly', l: 'Pouze pro čtení', desc: 'Nemůže psát, jen číst', color: '#a855f7' },
  { v: 'ip_ban', l: 'IP ban', desc: 'Blokace IP adres — zabrání návratu', color: '#7f1d1d' },
];
const SEV_OPTS = [
  { v: 'low', l: 'Nízká', color: '#10b981' },
  { v: 'standard', l: 'Standardní', color: '#f59e0b' },
  { v: 'high', l: 'Vysoká', color: '#ef4444' },
  { v: 'critical', l: 'Kritická', color: '#7f1d1d' },
];
const CATEGORY_OPTS = [
  'spam', 'urážky', 'sprosté výrazy', 'porušení pravidel', 'multiúčet',
  'podvod', 'doxxing / sdílení osobních údajů', 'nevhodný obsah',
  'reklama', 'narušení systému', 'jiné',
];
const AREAS = ['fakulty', 'kurzy', 'rozvrh', 'studium', 'vypisky', 'doucovani', 'profil', 'rektorat', 'forum'];

type Block = any;
type Action = { id: string; actor_id: string; action_type: string; description: string | null; metadata: any; is_public: boolean; created_at: string };

export default function BlokaceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, isRektor, isSpravce } = useAuth();
  const canManage = isRektor || isSpravce;
  const [block, setBlock] = useState<Block | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [ipLog, setIpLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Local form state
  const [actionDesc, setActionDesc] = useState('');
  const [actionPublic, setActionPublic] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [appealReply, setAppealReply] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    const { data: b } = await supabase.from('user_blocks').select('*').eq('id', id).maybeSingle();
    setBlock(b);
    if (b) {
      const ids = [b.user_id, b.blocked_by, b.unblocked_by, b.appeal_reviewed_by, b.assigned_to].filter(Boolean);
      const { data: profs } = await supabase.from('profiles').select('user_id,display_name,username,avatar_url').in('user_id', ids);
      const map: Record<string, any> = {};
      (profs || []).forEach(p => map[p.user_id] = p);
      setProfiles(map);
      const { data: acts } = await supabase.from('block_actions').select('*').eq('block_id', id).order('created_at', { ascending: false });
      setActions(acts || []);
      // Load known IPs of the user (only rektor sees this)
      if (isRektor) {
        const { data: ips } = await supabase.from('user_ip_log').select('ip_address').eq('user_id', b.user_id).order('created_at', { ascending: false }).limit(50);
        setIpLog(Array.from(new Set((ips || []).map(x => x.ip_address))));
      }
    }
    setLoading(false);
  }, [id, isRektor]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <AppLayout><div className="panel-card">Načítání…</div></AppLayout>;
  if (!block) return <AppLayout><div className="panel-card">Blokace nenalezena.</div></AppLayout>;
  if (!canManage) return <AppLayout><div className="panel-card">Nemáš oprávnění.</div></AppLayout>;

  const target = profiles[block.user_id];
  const blocker = profiles[block.blocked_by];
  const protokolKod = `BLK-${block.id.slice(0, 8).toUpperCase()}`;
  const typeMeta = TYPE_OPTS.find(t => t.v === block.block_type) || TYPE_OPTS[3];
  const sevMeta = SEV_OPTS.find(s => s.v === block.severity) || SEV_OPTS[1];

  const addAction = async (action_type: string, description: string, metadata: any = {}, is_public = false) => {
    if (!user) return;
    await supabase.from('block_actions').insert({
      block_id: block.id, actor_id: user.id, action_type, description, metadata, is_public,
    });
    await logAudit('block.action', { entityType: 'user_blocks', entityId: block.id, details: { action_type, description } });
  };

  const update = async (patch: any, log?: { type: string; desc: string; pub?: boolean }) => {
    const { error } = await supabase.from('user_blocks').update(patch as any).eq('id', block.id);
    if (error) return toast.error(error.message);
    if (log) await addAction(log.type, log.desc, patch, log.pub ?? false);
    toast.success('Uloženo');
    load();
  };

  const setType = (v: string) => update({ block_type: v }, { type: 'change_type', desc: `Typ změněn na ${v}`, pub: true });
  const setSev = (v: string) => update({ severity: v }, { type: 'change_severity', desc: `Závažnost změněna na ${v}` });
  const setCat = (v: string) => update({ offense_category: v }, { type: 'change_category', desc: `Kategorie: ${v}` });
  const toggleArea = (area: string) => {
    const cur: string[] = block.affected_areas || [];
    const next = cur.includes(area) ? cur.filter(a => a !== area) : [...cur, area];
    update({ affected_areas: next }, { type: 'areas', desc: `Sekce: ${next.join(', ') || 'žádné'}`, pub: true });
  };
  const extend = (days: number) => {
    const base = block.expires_at ? new Date(block.expires_at) : new Date();
    base.setDate(base.getDate() + days);
    update({ expires_at: base.toISOString(), is_permanent: false }, { type: 'extend', desc: `Prodlouženo o ${days} dní`, pub: true });
  };
  const shorten = (days: number) => {
    const base = block.expires_at ? new Date(block.expires_at) : new Date();
    base.setDate(base.getDate() - days);
    update({ expires_at: base.toISOString() }, { type: 'shorten', desc: `Zkráceno o ${days} dní`, pub: true });
  };
  const setExpiry = (iso: string) => update({ expires_at: iso ? new Date(iso).toISOString() : null }, { type: 'set_expiry', desc: `Konec: ${iso || 'neurčen'}`, pub: true });
  const togglePerm = () => update({ is_permanent: !block.is_permanent, expires_at: block.is_permanent ? block.expires_at : null }, { type: 'permanent', desc: block.is_permanent ? 'Zrušena trvalost' : 'Označeno jako trvalá', pub: true });
  const escalate = () => update({ escalated: true, escalated_to: user!.id }, { type: 'escalate', desc: 'Eskalováno vedení' });
  const unblock = (reason: string) => update({ is_active: false, unblocked_at: new Date().toISOString(), unblocked_by: user!.id, unblock_reason: reason || 'Manuální odblokování' }, { type: 'unblock', desc: `Odblokováno: ${reason || 'manuálně'}`, pub: true });
  const reactivate = () => update({ is_active: true, unblocked_at: null, unblocked_by: null, unblock_reason: null }, { type: 'reactivate', desc: 'Reaktivováno', pub: true });
  const sendWarning = () => update({ warning_count: (block.warning_count || 0) + 1, last_warning_at: new Date().toISOString() }, { type: 'warning', desc: 'Posláno varování', pub: true });
  const addIp = () => {
    if (!newIp.trim()) return;
    const ips = Array.from(new Set([...(block.banned_ips || []), newIp.trim()]));
    update({ banned_ips: ips, ip_ban_active: true }, { type: 'ip_ban', desc: `Přidána IP: ${newIp.trim()}` });
    setNewIp('');
  };
  const removeIp = (ip: string) => {
    const ips = (block.banned_ips || []).filter((x: string) => x !== ip);
    update({ banned_ips: ips, ip_ban_active: ips.length > 0 }, { type: 'ip_unban', desc: `Odebrána IP: ${ip}` });
  };
  const toggleIpBan = () => update({ ip_ban_active: !block.ip_ban_active }, { type: 'ip_toggle', desc: `IP ban ${!block.ip_ban_active ? 'zapnut' : 'vypnut'}` });
  const addEvidence = () => {
    if (!evidenceUrl.trim()) return;
    const list = [...(block.evidence_urls || []), evidenceUrl.trim()];
    update({ evidence_urls: list }, { type: 'evidence', desc: `Důkaz: ${evidenceUrl.trim()}` });
    setEvidenceUrl('');
  };
  const submitAppealReply = (status: 'approved' | 'rejected' | 'reviewing') => {
    const patch: any = { appeal_status: status, appeal_reviewed_by: user!.id, appeal_reviewed_at: new Date().toISOString(), appeal_response: appealReply };
    if (status === 'approved') Object.assign(patch, { is_active: false, unblocked_at: new Date().toISOString(), unblocked_by: user!.id, unblock_reason: 'Schválené odvolání' });
    update(patch, { type: `appeal_${status}`, desc: `Odvolání: ${status} — ${appealReply || '(bez komentáře)'}`, pub: true });
    setAppealReply('');
  };
  const toggleVisibility = () => update({ visible_to_user: !block.visible_to_user }, { type: 'visibility', desc: `Viditelnost pro uživatele: ${!block.visible_to_user ? 'ano' : 'ne (skryté)'}` });
  const submitAction = () => {
    if (!actionDesc.trim()) return;
    addAction('note', actionDesc, {}, actionPublic).then(() => { setActionDesc(''); setActionPublic(false); load(); toast.success('Záznam přidán'); });
  };

  const remaining = (() => {
    if (!block.expires_at) return block.is_permanent ? 'Trvalá' : 'Bez konce';
    const diff = new Date(block.expires_at).getTime() - Date.now();
    if (diff <= 0) return '⚠ Vypršela';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return `${d}d ${h}h`;
  })();

  return (
    <AppLayout>
      <div className="grid gap-4">
        {/* Header */}
        <div className="panel-card" style={{ borderTop: `5px solid ${typeMeta.color}` }}>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link to="/rektorat" className="hover:underline">Rektorát</Link>
                <span>›</span>
                <span>Blokace</span>
                <span>›</span>
                <code className="px-1.5 py-0.5 rounded bg-muted">{protokolKod}</code>
              </div>
              <h1 className="text-2xl font-extrabold mt-1">
                {typeMeta.l} —{' '}
                {target ? (
                  <Link to={`/uziv/${target.username}`} className="hover:underline" style={{ color: typeMeta.color }}>{target.display_name}</Link>
                ) : 'Neznámý uživatel'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{block.reason}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold text-white" style={{ background: block.is_active ? typeMeta.color : '#10b981' }}>
                {block.is_active ? 'AKTIVNÍ' : 'UKONČENA'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: sevMeta.color + '22', color: sevMeta.color }}>
                Závažnost: {sevMeta.l}
              </span>
              {block.ip_ban_active && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-900 text-white">🌐 IP BAN</span>}
              {block.escalated && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">⚠ Eskalováno</span>}
              {!block.visible_to_user && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-900">👁‍🗨 Skryté</span>}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="stat-card text-center"><strong className="block text-lg">{remaining}</strong><span className="text-xs text-muted-foreground">zbývá</span></div>
          <div className="stat-card text-center"><strong className="block text-lg">{block.warning_count || 0}</strong><span className="text-xs text-muted-foreground">varování</span></div>
          <div className="stat-card text-center"><strong className="block text-lg">{block.block_count || 1}.</strong><span className="text-xs text-muted-foreground">blokace</span></div>
          <div className="stat-card text-center"><strong className="block text-lg">{(block.evidence_urls || []).length}</strong><span className="text-xs text-muted-foreground">důkazů</span></div>
          <div className="stat-card text-center"><strong className="block text-lg">{(block.banned_ips || []).length}</strong><span className="text-xs text-muted-foreground">IP</span></div>
        </div>

        {/* Type selector */}
        <div className="panel-card">
          <h3 className="mt-0 text-sm font-extrabold">Typ blokace</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {TYPE_OPTS.map(t => (
              <button key={t.v} onClick={() => setType(t.v)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${block.block_type === t.v ? 'shadow-md scale-[1.01]' : 'opacity-70 hover:opacity-100'}`}
                style={{ borderColor: block.block_type === t.v ? t.color : 'hsl(var(--border))', background: block.block_type === t.v ? t.color + '11' : undefined }}>
                <strong className="block text-sm" style={{ color: t.color }}>{t.l}</strong>
                <span className="text-xs text-muted-foreground">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Severity & category */}
          <div className="panel-card">
            <h3 className="mt-0 text-sm font-extrabold">Závažnost</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SEV_OPTS.map(s => (
                <button key={s.v} onClick={() => setSev(s.v)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border-2"
                  style={{ background: block.severity === s.v ? s.color : 'transparent', color: block.severity === s.v ? '#fff' : s.color, borderColor: s.color }}>
                  {s.l}
                </button>
              ))}
            </div>
            <h3 className="text-sm font-extrabold">Kategorie přestupku</h3>
            <select value={block.offense_category || 'other'} onChange={e => setCat(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm w-full outline-none">
              {CATEGORY_OPTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Time */}
          <div className="panel-card">
            <h3 className="mt-0 text-sm font-extrabold">Trvání</h3>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input type="checkbox" checked={!!block.is_permanent} onChange={togglePerm} /> Trvalá blokace
            </label>
            {!block.is_permanent && (
              <>
                <input type="datetime-local" defaultValue={block.expires_at ? new Date(block.expires_at).toISOString().slice(0, 16) : ''}
                  onBlur={e => setExpiry(e.target.value)}
                  className="border-2 border-border rounded-xl py-2 px-3 text-sm w-full outline-none mb-2" />
                <div className="flex flex-wrap gap-1.5">
                  {[1, 3, 7, 14, 30, 90].map(d => <button key={d} onClick={() => extend(d)} className="text-xs font-bold px-2 py-1 rounded-lg bg-muted hover:bg-muted/70">+{d}d</button>)}
                  {[1, 7].map(d => <button key={'-' + d} onClick={() => shorten(d)} className="text-xs font-bold px-2 py-1 rounded-lg bg-muted hover:bg-muted/70">−{d}d</button>)}
                </div>
              </>
            )}
          </div>

          {/* Affected areas (partial) */}
          {block.block_type === 'partial' && (
            <div className="panel-card lg:col-span-2">
              <h3 className="mt-0 text-sm font-extrabold">Blokované sekce</h3>
              <div className="flex flex-wrap gap-1.5">
                {AREAS.map(a => {
                  const on = (block.affected_areas || []).includes(a);
                  return (
                    <button key={a} onClick={() => toggleArea(a)} className="px-3 py-1.5 rounded-lg text-xs font-bold border-2"
                      style={{ background: on ? '#ef4444' : 'transparent', color: on ? '#fff' : '#ef4444', borderColor: '#ef4444' }}>
                      {on ? '✓ ' : ''}{a}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* IP ban */}
          <div className="panel-card lg:col-span-2" style={{ borderLeft: '4px solid #7f1d1d' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="mt-0 text-sm font-extrabold">🌐 IP ban</h3>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!block.ip_ban_active} onChange={toggleIpBan} /> aktivní</label>
            </div>
            <p className="text-xs text-muted-foreground mb-2">Po přidání IP nebude přihlášení z těchto adres povoleno (kontrola přes přihlašovací logy).</p>
            <div className="flex gap-2 mb-2">
              <input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="např. 88.146.1.23" className="border-2 border-border rounded-xl py-2 px-3 text-sm flex-1 outline-none" />
              <button onClick={addIp} className="btn-alik-primary text-sm">Přidat IP</button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(block.banned_ips || []).map((ip: string) => (
                <span key={ip} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-100 text-red-900 text-xs font-mono">
                  {ip}
                  <button onClick={() => removeIp(ip)} className="ml-1 font-bold">×</button>
                </span>
              ))}
              {(block.banned_ips || []).length === 0 && <span className="text-xs text-muted-foreground">Žádné IP</span>}
            </div>
            {isRektor && ipLog.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer font-bold">Známé IP uživatele ({ipLog.length})</summary>
                <div className="flex flex-wrap gap-1 mt-2">
                  {ipLog.map(ip => (
                    <button key={ip} onClick={() => { setNewIp(ip); }} className="px-2 py-0.5 rounded bg-muted font-mono hover:bg-red-100">+ {ip}</button>
                  ))}
                </div>
              </details>
            )}
          </div>

          {/* Evidence */}
          <div className="panel-card">
            <h3 className="mt-0 text-sm font-extrabold">📎 Důkazy</h3>
            <div className="flex gap-2 mb-2">
              <input value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} placeholder="URL důkazu" className="border-2 border-border rounded-xl py-2 px-3 text-sm flex-1 outline-none" />
              <button onClick={addEvidence} className="btn-alik-outline text-sm">+</button>
            </div>
            <ul className="text-xs space-y-1">
              {(block.evidence_urls || []).map((u: string, i: number) => (
                <li key={i}><a href={u} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{i + 1}. {u}</a></li>
              ))}
              {(block.evidence_urls || []).length === 0 && <li className="text-muted-foreground">Žádné</li>}
            </ul>
          </div>

          {/* Details/reason */}
          <div className="panel-card">
            <h3 className="mt-0 text-sm font-extrabold">Důvod a podrobnosti</h3>
            <p className="text-sm font-bold mb-1">{block.reason}</p>
            {block.details && <div className="text-xs bg-muted/30 p-2 rounded-xl"><MarkdownRenderer content={block.details} /></div>}
          </div>
        </div>

        {/* Appeal */}
        {block.appeal_text && (
          <div className="panel-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <h3 className="mt-0 text-sm font-extrabold">📨 Odvolání uživatele <span className="text-xs font-normal">({block.appeal_status})</span></h3>
            <div className="text-sm bg-amber-50 p-3 rounded-xl mb-2">{block.appeal_text}</div>
            {block.appeal_status !== 'approved' && (
              <>
                <textarea value={appealReply} onChange={e => setAppealReply(e.target.value)} placeholder="Odpověď uživateli…" className="border-2 border-border rounded-xl py-2 px-3 text-sm w-full outline-none min-h-[60px] mb-2" />
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => submitAppealReply('approved')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white">✓ Schválit (odblokovat)</button>
                  <button onClick={() => submitAppealReply('reviewing')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-white">⏳ Přezkoumává se</button>
                  <button onClick={() => submitAppealReply('rejected')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white">✗ Zamítnout</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="panel-card">
          <h3 className="mt-0 text-sm font-extrabold">Rychlé akce</h3>
          <div className="flex flex-wrap gap-1.5">
            {block.is_active ? (
              <>
                <button onClick={sendWarning} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900">⚠ Varování</button>
                <button onClick={escalate} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-100 text-purple-900">⬆ Eskalovat</button>
                <button onClick={toggleVisibility} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-muted">{block.visible_to_user ? '👁 Skrýt uživateli' : '👁 Ukázat uživateli'}</button>
                <button onClick={() => unblock(prompt('Důvod odblokování:') || '')} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white">✓ Odblokovat</button>
              </>
            ) : (
              <button onClick={reactivate} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white">↻ Reaktivovat</button>
            )}
          </div>
        </div>

        {/* History */}
        <div className="panel-card">
          <h3 className="mt-0 text-sm font-extrabold">📜 Historie zásahů ({actions.length})</h3>
          <div className="grid gap-2 mb-3">
            <textarea value={actionDesc} onChange={e => setActionDesc(e.target.value)} placeholder="Vlastní zápis do historie…" className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[60px]" />
            <div className="flex items-center justify-between">
              <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={actionPublic} onChange={e => setActionPublic(e.target.checked)} /> viditelné pro uživatele</label>
              <button onClick={submitAction} className="btn-alik-primary text-sm">Přidat zápis</button>
            </div>
          </div>
          <div className="space-y-2">
            {actions.map(a => (
              <div key={a.id} className="text-sm border-l-4 pl-3 py-1" style={{ borderColor: a.is_public ? '#10b981' : '#94a3b8' }}>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString('cs-CZ')} • <strong>{a.action_type}</strong>
                  {a.is_public && <span className="ml-2 text-green-700">veřejné</span>}
                </div>
                <div>{a.description}</div>
              </div>
            ))}
            {actions.length === 0 && <p className="text-xs text-muted-foreground">Zatím žádné záznamy.</p>}
          </div>
        </div>

        {/* Meta */}
        <div className="panel-card text-xs text-muted-foreground">
          <div className="grid sm:grid-cols-2 gap-1">
            <div>Blokoval: <strong>{blocker?.display_name || '?'}</strong> dne {new Date(block.blocked_at).toLocaleString('cs-CZ')}</div>
            {block.unblocked_at && <div>Odblokoval: <strong>{profiles[block.unblocked_by]?.display_name || '?'}</strong> dne {new Date(block.unblocked_at).toLocaleString('cs-CZ')}</div>}
            <div>Protokol: <code>{protokolKod}</code></div>
            <div>Kód k vložení: <code>[[PRT-{protokolKod}]]</code></div>
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={() => nav('/rektorat')} className="btn-alik-outline text-sm">← Zpět do Rektorátu</button>
        </div>
      </div>
    </AppLayout>
  );
}
