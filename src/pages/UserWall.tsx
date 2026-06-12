import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import OnlineIndicator from '@/components/OnlineIndicator';
import RoleBadge from '@/components/RoleBadge';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roleUtils';
import { logAudit } from '@/lib/auditLog';
import { ProtokolFromAudit } from '@/components/Protokol';
import { PoznamkaText } from '@/components/ProtokolByCode';
import { getSpecialUserBadge, SpecialUserBadgeView } from '@/lib/userBadges';
import AccountAccessControl from '@/components/AccountAccessControl';

const db = () => supabase as any;

interface ProfileRow {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  last_seen: string | null;
}

interface UserNote {
  id: string;
  target_user_id: string;
  author_id: string;
  occurred_at: string;
  ip_address: string | null;
  public_description: string | null;
  private_description: string | null;
  punishment: string | null;
  created_at: string;
}

type SectionKey = 'overview' | 'activity' | 'notes' | 'searches' | 'interventions' | 'blocks' | 'signout' | 'access';

const BLOCK_PRESETS: { label: string; minutes: number | 'permanent' }[] = [
  { label: 'Deset minut', minutes: 10 },
  { label: 'Čtvrt hodiny', minutes: 15 },
  { label: 'Hodina', minutes: 60 },
  { label: '12 hodin', minutes: 12 * 60 },
  { label: 'Den', minutes: 24 * 60 },
  { label: 'Týden', minutes: 7 * 24 * 60 },
  { label: 'Měsíc', minutes: 30 * 24 * 60 },
  { label: 'Rok', minutes: 365 * 24 * 60 },
  { label: 'Trvalá', minutes: 'permanent' },
];

export default function UserWall() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: me, role: myRole, isDeveloper, isDohledci, isStaff } = useAuth();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [targetRole, setTargetRole] = useState<string | null>(null);
  const [section, setSection] = useState<SectionKey>('overview');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [access, setAccess] = useState({ wall: false, searches: false, account_actions: false });

  const loadAccess = async (targetUserId: string) => {
    if (!me || !isStaff) return setAccess({ wall: false, searches: false, account_actions: false });
    const [wall, searches, actions] = await Promise.all([
      db().rpc('has_account_access', { _staff_id: me.id, _target_user_id: targetUserId, _scope: 'wall' }),
      db().rpc('has_account_access', { _staff_id: me.id, _target_user_id: targetUserId, _scope: 'searches' }),
      db().rpc('has_account_access', { _staff_id: me.id, _target_user_id: targetUserId, _scope: 'account_actions' }),
    ]);
    setAccess({ wall: wall.data === true, searches: searches.data === true, account_actions: actions.data === true });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data, error } = await db()
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, bio, last_seen')
        .eq('username', username)
        .maybeSingle();
      if (!alive) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(data);
      loadAccess(data.user_id);
      const { data: r } = await db()
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user_id);
      const { pickHighestRole } = await import('@/lib/rolePriority');
      setTargetRole(pickHighestRole((r || []).map((x: any) => x.role)) ?? 'student');
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [username]);

  const menu = useMemo(() => {
    const items: { key: SectionKey; label: string; icon: string }[] = [
      { key: 'overview', label: 'Přehled', icon: '👤' },
    ];
    if (isStaff) {
      items.push({ key: 'activity', label: 'Veškerá aktivita', icon: '📝' });
      items.push({ key: 'notes', label: 'Poznámky', icon: '📓' });
      items.push({ key: 'interventions', label: access.account_actions ? 'Zásahy v účtu' : '🔒 Zásahy v účtu', icon: '🛡' });
      items.push({ key: 'searches', label: access.searches ? 'Vyhledávání' : '🔒 Vyhledávání', icon: '🔍' });
      items.push({ key: 'access', label: 'Odemknout sekce', icon: '🔐' });
    }
    if (isDeveloper) {
      items.push({ key: 'blocks', label: 'Blokace', icon: '🚫' });
      items.push({ key: 'signout', label: 'Odhlásit', icon: '⏻' });
    }
    return items;
  }, [isStaff, isDeveloper, access]);

  if (loading) {
    return <AppLayout><div className="p-8 text-center text-muted-foreground">Načítám…</div></AppLayout>;
  }
  if (notFound || !profile) {
    return <AppLayout><div className="p-8 text-center">Uživatel <code>{username}</code> nenalezen.</div></AppLayout>;
  }

  const isMe = me?.id === profile.user_id;
  const specialBadge = getSpecialUserBadge(profile);

  return (
    <AppLayout>
      <div className="grid grid-cols-12 gap-5 mt-4">
        {/* LEFT MENU */}
        <aside className="col-span-12 md:col-span-3">
          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4 shadow-sm sticky top-4">
            <div className="flex flex-col items-center text-center pb-4 border-b border-border">
              <div className="relative">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.display_name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-secondary/50" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
                    {profile.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-0 -right-0">
                  <OnlineIndicator lastSeen={profile.last_seen} size="lg" />
                </div>
              </div>
              <div className="mt-3 font-semibold text-base flex items-center gap-1 justify-center">
                {profile.display_name}
                <RoleBadge role={targetRole} />
              </div>
              <SpecialUserBadgeView badge={specialBadge} />
              {targetRole && targetRole !== 'student' && (
                <div className="text-xs mt-1" style={{ color: ROLE_COLORS[targetRole] }}>
                  {ROLE_LABELS[targetRole]}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground mt-1">@{profile.username}</div>
            </div>

            <nav className="mt-3 flex flex-col gap-1">
              {menu.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSection(m.key)}
                  className={`text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    section === m.key
                      ? 'bg-secondary/20 text-foreground font-medium'
                      : 'hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <span className="w-5 text-center">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
              {isMe && (
                <Link to="/profil" className="text-left text-sm px-3 py-2 rounded-lg hover:bg-muted/50 text-muted-foreground flex items-center gap-2">
                  <span className="w-5 text-center">⚙</span><span>Upravit profil</span>
                </Link>
              )}
            </nav>
          </div>
        </aside>

        {/* MAIN */}
        <main className="col-span-12 md:col-span-9 space-y-4">
          {section === 'overview' && <OverviewSection profile={profile} role={targetRole} isMe={isMe} canStaffEdit={access.wall} onUpdated={() => { setProfile(null); window.location.reload(); }} />}
          {section === 'activity' && isStaff && <ActivitySection userId={profile.user_id} />}
          {section === 'notes' && isStaff && <NotesSection target={profile} canSeePrivate={isDeveloper} />}
          {section === 'searches' && isStaff && (access.searches ? <SearchesSection userId={profile.user_id} /> : <LockedSection label="historii vyhledávání" />)}
          {section === 'interventions' && isStaff && (access.account_actions ? <InterventionsSection userId={profile.user_id} /> : <LockedSection label="zásahy v účtu" />)}
          {section === 'access' && isStaff && <AccountAccessControl targetUserId={profile.user_id} onAccessChanged={() => loadAccess(profile.user_id)} />}
          {section === 'blocks' && isDeveloper && <BlocksSection target={profile} />}
          {section === 'signout' && isDeveloper && <SignoutSection target={profile} />}
        </main>
      </div>
    </AppLayout>
  );
}

/* ───────── Overview ───────── */
function OverviewSection({ profile, role, isMe, canStaffEdit, onUpdated }: { profile: ProfileRow; role: string | null; isMe?: boolean; canStaffEdit?: boolean; onUpdated?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(profile.bio || '');
  const saveWall = async () => {
    const { error } = await db().rpc('update_user_wall_with_access', { _target_user_id: profile.user_id, _bio: bio });
    if (error) return toast.error(error.message);
    toast.success('Zeď byla upravena a změna zaprotokolována.');
    setEditing(false); onUpdated?.();
  };
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2 m-0">
          Zeď uživatele <span className="text-secondary">{profile.display_name}</span>
          <RoleBadge role={role} />
        </h1>
        {isMe && (
          <Link to="/profil" className="btn-alik-primary text-xs flex items-center gap-1.5">
            ⚙ Upravit profil
          </Link>
        )}
        {canStaffEdit && <Button size="sm" variant="outline" onClick={() => setEditing(v => !v)}>🛡 Upravit zeď jako vedení</Button>}
      </div>
      {editing && <div className="mt-4 grid gap-2 rounded-xl border border-border p-3"><Label>Text uživatelské zdi</Label><Textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={5000} rows={8} /><div className="flex gap-2 justify-end"><Button variant="ghost" onClick={() => setEditing(false)}>Zrušit</Button><Button onClick={saveWall}>Uložit a zaprotokolovat</Button></div></div>}
      {profile.bio ? (
        <div className="mt-4 prose prose-sm max-w-none">
          <MarkdownRenderer content={profile.bio} />
        </div>
      ) : (
        <p className="mt-3 text-muted-foreground italic">
          {isMe ? 'Zatím jsi o sobě nic nenapsal — klikni na „Upravit profil" a doplň své bio.' : 'Uživatel zatím nic o sobě nenapsal.'}
        </p>
      )}
    </div>
  );
}

function LockedSection({ label }: { label: string }) {
  return <div className="rounded-2xl border border-border bg-card/70 p-6 text-center"><div className="text-3xl mb-2">🔒</div><h2 className="font-semibold">Sekce je zamčená</h2><p className="text-sm text-muted-foreground">Pro {label} nejprve použij „Odemknout sekce“ a schválený speciální kód.</p></div>;
}

/* ───────── Activity (forum + tutoring + notes) ───────── */
function ActivitySection({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [posts, qs, ns] = await Promise.all([
        db().from('forum_posts').select('id, content, course_id, created_at, is_deleted').eq('author_id', userId).order('created_at', { ascending: false }).limit(50),
        db().from('tutoring_questions').select('id, topic, question, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        db().from('study_notes').select('id, title, created_at, is_public').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      ]);
      const merged = [
        ...(posts.data ?? []).map((p: any) => ({ kind: 'forum', id: p.id, when: p.created_at, label: p.is_deleted ? '(smazáno) Příspěvek ve fóru' : 'Příspěvek ve fóru', preview: p.content?.slice(0, 200), link: `/kurzy/${p.course_id}` })),
        ...(qs.data ?? []).map((q: any) => ({ kind: 'q', id: q.id, when: q.created_at, label: `Dotaz na doučování — ${q.topic}`, preview: q.question?.slice(0, 200), link: `/doucovani` })),
        ...(ns.data ?? []).map((n: any) => ({ kind: 'note', id: n.id, when: n.created_at, label: `Výpisek — ${n.title}${n.is_public ? '' : ' (soukromý)'}`, preview: '', link: `/vypisky` })),
      ].sort((a, b) => +new Date(b.when) - +new Date(a.when));
      setItems(merged);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="p-6 text-muted-foreground">Načítám aktivitu…</div>;
  if (!items.length) return <div className="p-6 rounded-2xl border bg-card/70">Žádná aktivita.</div>;

  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-5 shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Veškerá aktivita</h2>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={`${i.kind}-${i.id}`} className="p-3 rounded-lg border border-border hover:border-secondary/60 transition">
            <Link to={i.link} className="block">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{i.label}</span>
                <span>{new Date(i.when).toLocaleString('cs')}</span>
              </div>
              {i.preview && <p className="text-sm mt-1 text-muted-foreground line-clamp-2">{i.preview}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────── Notes ───────── */
function NotesSection({ target, canSeePrivate }: { target: ProfileRow; canSeePrivate: boolean }) {
  const { user: me } = useAuth();
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [ipAddress, setIpAddress] = useState('');
  const [pubDesc, setPubDesc] = useState('');
  const [privDesc, setPrivDesc] = useState('');
  const [punishment, setPunishment] = useState('');
  const [recentIps, setRecentIps] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await db()
      .from('user_notes')
      .select('*')
      .eq('target_user_id', target.user_id)
      .order('occurred_at', { ascending: false });
    setNotes(data ?? []);
    if (canSeePrivate) {
      const { data: ips } = await db()
        .from('user_ip_log')
        .select('ip_address')
        .eq('user_id', target.user_id)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentIps(Array.from(new Set((ips ?? []).map((x: any) => x.ip_address))));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [target.user_id, canSeePrivate]);

  const submit = async () => {
    if (!me) return;
    if (!pubDesc.trim() && !privDesc.trim()) {
      toast.error('Vyplňte alespoň jeden popis.'); return;
    }
    const { error } = await db().from('user_notes').insert({
      target_user_id: target.user_id,
      author_id: me.id,
      occurred_at: new Date(occurredAt).toISOString(),
      ip_address: ipAddress.trim() || null,
      public_description: pubDesc.trim() || null,
      private_description: privDesc.trim() || null,
      punishment: punishment.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Poznámka uložena.');
    setShowForm(false);
    setIpAddress(''); setPubDesc(''); setPrivDesc(''); setPunishment('');
    setOccurredAt(new Date().toISOString().slice(0, 16));
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Smazat poznámku?')) return;
    const { error } = await db().from('user_notes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Smazáno.');
    load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Poznámky o uživateli</h2>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Zavřít' : '+ Nová poznámka'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded-xl border border-secondary/40 bg-background/60 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Datum a čas</Label>
              <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
            </div>
            <div>
              <Label>Uživatel</Label>
              <Input value={`${target.display_name} (@${target.username})`} disabled />
            </div>
            {canSeePrivate && (
              <div className="md:col-span-2">
                <Label>IP adresa (volitelná)</Label>
                <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} placeholder="např. 192.168.1.10" />
                {recentIps.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">Naposledy viděné:</span>
                    {recentIps.map((ip) => (
                      <button key={ip} type="button" onClick={() => setIpAddress(ip)}
                        className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-secondary/30 transition">
                        {ip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="md:col-span-2">
              <Label>Popis (veřejný — pro Dohledčí)</Label>
              <Textarea rows={3} value={pubDesc} onChange={(e) => setPubDesc(e.target.value)}
                placeholder="Pokud necháte prázdné, Dohledčí poznámku neuvidí." />
            </div>
            <div className="md:col-span-2">
              <Label>Popis (neveřejný — jen Vývojáři)</Label>
              <Textarea rows={3} value={privDesc} onChange={(e) => setPrivDesc(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Trest (je-li)</Label>
              <Input value={punishment} onChange={(e) => setPunishment(e.target.value)}
                placeholder={'např. „Blokace na týden", „Napomenutí"…'} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Zrušit</Button>
            <Button onClick={submit}>Uložit poznámku</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-muted-foreground">Načítám…</div>
      ) : notes.length === 0 ? (
        <div className="text-muted-foreground italic">Žádné poznámky.</div>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="p-3 rounded-lg border border-border bg-background/40">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>📅 {new Date(n.occurred_at).toLocaleString('cs')}</span>
                <div className="flex items-center gap-2">
                  {n.ip_address && canSeePrivate && (
                    <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">{n.ip_address}</code>
                  )}
                  {canSeePrivate && (
                    <button onClick={() => remove(n.id)} className="text-destructive hover:underline text-xs">smazat</button>
                  )}
                </div>
              </div>
              {n.public_description && (
                <div className="mt-1.5 text-sm"><strong>📢 Veřejný popis:</strong> <PoznamkaText text={n.public_description} /></div>
              )}
              {canSeePrivate && n.private_description && (
                <div className="mt-1.5 text-sm bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                  <strong>🔒 Neveřejný popis:</strong> <PoznamkaText text={n.private_description} />
                </div>
              )}
              {n.punishment && (
                <div className="mt-1.5 text-sm"><strong>⚖ Trest:</strong> <PoznamkaText text={n.punishment} /></div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────── Searches log (developer) ───────── */
function SearchesSection({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await db()
        .from('user_search_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      setRows(data ?? []);
      setLoading(false);
    })();
  }, [userId]);
  if (loading) return <div className="p-6">Načítám…</div>;
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-5 shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Historie vyhledávání</h2>
      {rows.length === 0 ? <div className="text-muted-foreground italic">Žádné záznamy.</div> : (
        <div>
          {rows.map((r) => <div key={r.id} className="rounded-lg border border-border p-3 mb-2"><strong className="text-sm">🔍 {r.query}</strong><div className="text-xs text-muted-foreground mt-1">{r.context} • {new Date(r.created_at).toLocaleString('cs-CZ')}</div></div>)}
        </div>
      )}
    </div>
  );
}

/* ───────── Account interventions (NFP — Protokol format) ───────── */
function InterventionsSection({ userId }: { userId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [actors, setActors] = useState<Record<string, { profile: any; role: string | null }>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: audit }, { data: blocks }, { data: mediations }, { data: histories }] = await Promise.all([
        db().from('audit_log').select('*').or(`entity_id.eq.${userId},details->>target_user_id.eq.${userId}`).order('created_at', { ascending: false }).limit(200),
        db().from('user_blocks').select('id,user_id,reason,is_active,is_permanent,expires_at,blocked_at,blocked_by,unblocked_at,unblocked_by').eq('user_id', userId).order('blocked_at', { ascending: false }),
        db().from('mediations_v2').select('*').eq('subject_user_id', userId).order('created_at', { ascending: false }),
        db().from('entity_history').select('*').eq('entity_id', userId).order('created_at', { ascending: false }),
      ]);

      const synthetic: any[] = [];
      // audit_log rows (already in shape)
      (audit || []).forEach((x: any) => {
        const a = (x.action || '').toLowerCase();
        if (a.startsWith('user.') || a.startsWith('block.') || a.startsWith('mediation.') || a.startsWith('wall.') || a.startsWith('role.') || a.startsWith('account_access.') || a.startsWith('appeal.') || a.startsWith('note.')) {
          synthetic.push({ ...x, __source: 'audit_log' });
        }
      });
      // blocks → synthesise block + unblock entries
      (blocks || []).forEach((b: any) => {
        synthetic.push({
          id: `block-${b.id}`, user_id: b.blocked_by, action: b.is_permanent ? 'block.permanent' : 'user.block',
          entity_type: 'user_blocks', entity_id: b.id, created_at: b.blocked_at,
          details: { target_user_id: userId, reason: b.reason, is_permanent: b.is_permanent, expires_at: b.expires_at },
          __source: 'audit_log',
        });
        if (b.unblocked_at) {
          synthetic.push({
            id: `unblock-${b.id}`, user_id: b.unblocked_by, action: 'user.unblock',
            entity_type: 'user_blocks', entity_id: b.id, created_at: b.unblocked_at,
            details: { target_user_id: userId, reason: b.reason },
            __source: 'audit_log',
          });
        }
      });
      // mediations
      (mediations || []).forEach((m: any) => {
        synthetic.push({
          id: `med-open-${m.id}`, user_id: m.opened_by, action: 'mediation.open',
          entity_type: 'mediations_v2', entity_id: m.id, created_at: m.created_at,
          details: { target_user_id: userId, reason: m.request_reason, status: m.status },
          __source: 'audit_log',
        });
        if (m.resolved_at) {
          synthetic.push({
            id: `med-close-${m.id}`, user_id: m.resolved_by, action: 'mediation.close',
            entity_type: 'mediations_v2', entity_id: m.id, created_at: m.resolved_at,
            details: { target_user_id: userId, resolution: m.resolution },
            __source: 'audit_log',
          });
        }
      });
      // entity_history
      (histories || []).forEach((h: any) => {
        synthetic.push({ ...h, action: h.action || 'history.change', details: h.changes, __source: 'entity_history' });
      });

      synthetic.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setRows(synthetic);

      // Fetch actor profiles & roles
      const actorIds = Array.from(new Set(synthetic.map(r => r.user_id).filter(Boolean)));
      if (actorIds.length) {
        const [{ data: profs }, { data: roles }] = await Promise.all([
          db().from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', actorIds),
          db().from('user_roles').select('user_id, role').in('user_id', actorIds),
        ]);
        const map: Record<string, { profile: any; role: string | null }> = {};
        actorIds.forEach((id: string) => {
          map[id] = {
            profile: (profs || []).find((p: any) => p.user_id === id) || null,
            role: (roles || []).find((r: any) => r.user_id === id)?.role || null,
          };
        });
        setActors(map);
      }
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div className="p-6 text-muted-foreground">Načítám zásahy…</div>;
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm">
      <h2 className="text-lg font-semibold mb-1">🛡 Zásahy v účtu (NFP)</h2>
      <p className="text-xs text-muted-foreground mb-4">Blokace, odblokování, úpravy blokací, úpravy zdí, mezirozpravy, přiřazení pravomocí a odemykání.</p>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Žádné zásahy.</p> : (
        <div className="grid gap-2">
          {rows.map((r) => {
            const a = r.user_id ? actors[r.user_id] : null;
            return (
              <ProtokolFromAudit
                key={`${r.__source}-${r.id}`}
                row={r}
                profile={a?.profile}
                role={a?.role}
                sourceTable={r.__source}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────── Staff: open mediation about this user ───────── */
function OpenMediationCard({ target }: { target: ProfileRow }) {
  const { user: me } = useAuth();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const open = async () => {
    if (!me) return;
    if (reason.trim().length < 5) return toast.error('Napiš stručný důvod (alespoň 5 znaků).');
    setBusy(true);
    const { data, error } = await db().from('mediations_v2').insert({
      subject_user_id: target.user_id, opened_by: me.id, status: 'open', request_reason: reason.trim(),
    }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    await logAudit('mediation.open', { entityType: 'mediations_v2', entityId: data.id, details: { target_user_id: target.user_id, target_username: target.username, reason: reason.trim() } });
    toast.success('Mezirozprava otevřena.');
    window.location.href = `/mezirozprava/${data.id}`;
  };
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm">
      <h2 className="text-lg font-semibold mb-1">💬 Otevřít mezirozpravu s uživatelem</h2>
      <p className="text-xs text-muted-foreground mb-3">Soukromá konverzace mezi vedením a uživatelem <strong>{target.display_name}</strong>. Otevření se zaprotokoluje.</p>
      <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} maxLength={2000} placeholder="Téma a důvod mezirozpravy…" />
      <div className="flex justify-end mt-2"><Button onClick={open} disabled={busy}>Otevřít mezirozpravu</Button></div>
    </div>
  );
}

/* ───────── Blocks (developer) ───────── */
function BlocksSection({ target }: { target: ProfileRow }) {
  const { user: me } = useAuth();
  const [active, setActive] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [reason, setReason] = useState('');

  const load = async () => {
    const { data } = await db()
      .from('user_blocks')
      .select('*')
      .eq('user_id', target.user_id)
      .order('blocked_at', { ascending: false });
    setActive((data ?? []).filter((b: any) => b.is_active));
    setHistory((data ?? []).filter((b: any) => !b.is_active));
  };
  useEffect(() => { load(); }, [target.user_id]);

  const block = async (preset: typeof BLOCK_PRESETS[number]) => {
    if (!me) return;
    if (!reason.trim()) { toast.error('Vyplňte důvod blokace.'); return; }
    const isPerm = preset.minutes === 'permanent';
    const expires_at = isPerm ? null : new Date(Date.now() + (preset.minutes as number) * 60_000).toISOString();
    const { data: blk, error } = await db().from('user_blocks').insert({
      user_id: target.user_id,
      blocked_by: me.id,
      reason: reason.trim(),
      block_type: 'full',
      severity: 'standard',
      is_permanent: isPerm,
      expires_at,
      is_active: true,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    // Auto-create note about it
    await db().from('user_notes').insert({
      target_user_id: target.user_id,
      author_id: me.id,
      occurred_at: new Date().toISOString(),
      public_description: `Blokace: ${preset.label} — ${reason.trim()}`,
      punishment: `Blokace na ${preset.label.toLowerCase()}`,
      block_id: blk?.id,
    });
    await logAudit('user.block', {
      entityType: 'user_block', entityId: blk?.id,
      details: { target_user_id: target.user_id, target_username: target.username, preset: preset.label, reason: reason.trim(), permanent: isPerm, expires_at },
    });
    toast.success(`Zablokováno: ${preset.label}`);
    setReason('');
    load();
  };

  const unblock = async (id: string) => {
    if (!me) return;
    const { error } = await db().from('user_blocks').update({
      is_active: false, unblocked_by: me.id, unblocked_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    await logAudit('user.unblock', { entityType: 'user_block', entityId: id, details: { target_user_id: target.user_id, target_username: target.username } });
    toast.success('Odblokováno.');
    load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-5 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold">Blokace</h2>

      {active.length > 0 && (
        <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10">
          <div className="font-medium text-destructive mb-2">⚠ Aktivní blokace</div>
          <ul className="space-y-1 text-sm">
            {active.map((b) => (
              <li key={b.id} className="flex items-center justify-between">
                <span>{b.is_permanent ? 'Trvalá' : `do ${new Date(b.expires_at).toLocaleString('cs')}`} — {b.reason}</span>
                <button onClick={() => unblock(b.id)} className="text-xs underline">odblokovat</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Label>Důvod blokace</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Např. spam, urážky…" />
        <div className="mt-3 flex flex-wrap gap-2">
          {BLOCK_PRESETS.map((p) => (
            <Button key={p.label} size="sm" variant="outline" onClick={() => block(p)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 text-muted-foreground">Historie</h3>
          <ul className="space-y-1 text-xs">
            {history.slice(0, 20).map((b) => (
              <li key={b.id} className="flex justify-between p-1.5 border-b border-border/50">
                <span>{b.reason}</span>
                <span className="text-muted-foreground">{new Date(b.blocked_at).toLocaleDateString('cs')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ───────── Force signout (developer) ───────── */
function SignoutSection({ target }: { target: ProfileRow }) {
  const [loading, setLoading] = useState(false);
  const run = async () => {
    if (!confirm(`Skutečně odhlásit uživatele ${target.display_name} ze všech zařízení?`)) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('force-signout', {
      body: { target_user_id: target.user_id },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast.error(`Nepodařilo se: ${error?.message || (data as any)?.error}`);
      return;
    }
    await logAudit('user.force_signout', {
      entityType: 'profile', entityId: target.user_id,
      details: { target_username: target.username, target_display_name: target.display_name },
    });
    toast.success('Uživatel byl odhlášen ze všech zařízení.');
  };
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-5 shadow-sm">
      <h2 className="text-lg font-semibold mb-2">Odhlásit uživatele</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Zneplatní všechny aktivní přihlašovací tokeny uživatele <strong>{target.display_name}</strong>. Bude se muset přihlásit znovu.
      </p>
      <Button variant="destructive" onClick={run} disabled={loading}>
        {loading ? 'Odhlašuji…' : 'Odhlásit ze všech zařízení'}
      </Button>
    </div>
  );
}
