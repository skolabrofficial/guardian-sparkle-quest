import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { STATUS_INFO, ArticleStatus } from '@/lib/articleStatus';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Article {
  id: string; title: string; perex: string | null; status: ArticleStatus;
  author_id: string | null; author_override: string | null;
  topic_id: string | null; published_at: string | null; created_at: string;
  scheduled_for: string | null; is_featured: boolean; featured_until: string | null;
  taken_by: string | null; rating: number | null;
}
interface Topic { id: string; slug: string; name: string; symbol: string; color: string; }
interface Profile { user_id: string; display_name: string; username: string; avatar_url: string | null; }

type Tab = 'vydane' | 'moje' | 'redakce' | 'naplanovane' | 'neohodnocene' | 'kos' | 'valna-hromada';

const TAB_LABELS: Record<Tab, string> = {
  vydane: 'Vydané',
  moje: 'Moje články',
  redakce: 'V redakci',
  naplanovane: 'Naplánované',
  neohodnocene: 'Neohodnocené',
  kos: 'Smetiště',
  'valna-hromada': 'Valná hromada',
};

export default function Nauctura() {
  const { user, isRektor, isLektor } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'vydane';
  const setTab = (t: Tab) => setParams({ tab: t });

  const [topics, setTopics] = useState<Topic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [isEditor, setIsEditor] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [warnNoTomorrow, setWarnNoTomorrow] = useState(false);
  const [unratedCount, setUnratedCount] = useState(0);

  useEffect(() => {
    // auto-publish overdue scheduled articles every load
    Promise.resolve((supabase as any).rpc('publish_due_articles')).catch(() => {});
  }, []);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, user?.id, topicFilter]);

  async function load() {
    setLoading(true);
    const sb: any = supabase;
    const [topRes, edRes] = await Promise.all([
      sb.from('article_topics').select('*').order('name'),
      user ? sb.from('article_editors').select('id').eq('user_id', user.id).limit(1) : Promise.resolve({ data: [] }),
    ]);
    setTopics(topRes.data || []);
    const editorAccess = (edRes.data?.length ?? 0) > 0 || isRektor;
    setIsEditor(editorAccess);

    let q = sb.from('articles').select('*').order('created_at', { ascending: false });
    if (tab === 'vydane') q = q.eq('status', 'published');
    else if (tab === 'moje' && user) q = q.eq('author_id', user.id);
    else if (tab === 'redakce') q = q.in('status', ['awaiting_review', 'in_editing', 'polishing', 'returned_to_author']);
    else if (tab === 'valna-hromada') q = q.in('status', ['awaiting_review', 'in_editing', 'polishing', 'returned_to_author', 'scheduled', 'ready_to_publish', 'draft_author']);
    else if (tab === 'naplanovane') q = q.in('status', ['scheduled', 'ready_to_publish']);
    else if (tab === 'neohodnocene') q = q.eq('status', 'published').is('rating', null);
    else if (tab === 'kos') q = q.in('status', ['deleted', 'rejected', 'flagged_stolen']);
    if (topicFilter) q = q.eq('topic_id', topicFilter);
    const { data } = await q;
    const list = (data || []) as Article[];
    setArticles(list);

    const authorIds = [...new Set(list.map(a => a.author_id).filter(Boolean) as string[])];
    if (authorIds.length) {
      const { data: ps } = await sb.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', authorIds);
      const map: Record<string, Profile> = {};
      (ps || []).forEach((p: Profile) => { map[p.user_id] = p; });
      setProfiles(map);
    }

    // Editorial warning: is tomorrow empty?
    if (editorAccess) {
      const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
      const dayAfter = new Date(tomorrow.getTime() + 86400000);
      const { count } = await sb.from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'scheduled')
        .gte('scheduled_for', tomorrow.toISOString())
        .lt('scheduled_for', dayAfter.toISOString());
      setWarnNoTomorrow((count ?? 0) === 0);

      const { count: uc } = await sb.from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published').is('rating', null);
      setUnratedCount(uc ?? 0);
    }

    setLoading(false);
  }

  const filtered = articles.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.perex || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout searchLabel="Hledat v Naučtuře" searchPlaceholder="název, perex…" onSearch={setSearch}>
      <div className="panel-card mb-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground">§ Naučná literatura</div>
            <h1 className="text-3xl mt-1 mb-1">Naučtura</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Redakce naučných články. Každý článek prochází posouzením, redakční úpravou a doladěním. Pod články vzniká <strong>Kvalitárka</strong> — rozprava mezi autorem a redakcí.
            </p>
          </div>
          {user && (
            <Button onClick={() => setCreateOpen(true)} className="shrink-0">✒ Napsat článek</Button>
          )}
        </div>

        {isEditor && (warnNoTomorrow || unratedCount > 0) && (
          <div className="mt-3 grid gap-2">
            {warnNoTomorrow && (
              <div className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm">
                <strong>⚠ Pozor:</strong> Na zítřek není naplánovaný žádný články k vydání.
              </div>
            )}
            {unratedCount > 0 && (
              <button onClick={() => setTab('neohodnocene')} className="text-left rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm hover:bg-muted">
                <strong>{unratedCount}</strong> neohodnocených vydaných články čeká na redakční verdikt.
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {(Object.keys(TAB_LABELS) as Tab[]).map(k => {
          const visible =
            k === 'moje' ? !!user :
            (k === 'redakce' || k === 'naplanovane' || k === 'neohodnocene' || k === 'kos' || k === 'valna-hromada') ? isEditor :
            true;
          if (!visible) return null;
          const badge = k === 'neohodnocene' && unratedCount > 0 ? unratedCount : null;
          return (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-full border-2 text-xs font-bold uppercase tracking-wider ${tab === k ? 'bg-foreground text-background border-foreground' : 'bg-card border-border hover:border-foreground'}`}
            >
              {TAB_LABELS[k]} {badge != null && <span className="ml-1 inline-block px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px]">{badge}</span>}
            </button>
          );
        })}
        <div className="flex-1" />
        <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm bg-card">
          <option value="">Všechna témata</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.symbol} {t.name}</option>)}
        </select>
      </div>

      {isRektor && tab === 'redakce' && <RedakceAdmin topics={topics} onChanged={load} />}

      {loading && <p className="text-muted-foreground">Načítání…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => {
          const topic = topics.find(t => t.id === a.topic_id);
          const authorProfile = a.author_id ? profiles[a.author_id] : null;
          const authorName = a.author_override || authorProfile?.display_name || 'Neznámý';
          const info = STATUS_INFO[a.status];
          return (
            <article key={a.id} className="panel-card flex flex-col gap-2 hover:-translate-y-0.5 hover:shadow-lg transition">
              <div className="flex items-center justify-between gap-2 text-xs">
                {topic && (
                  <span className="font-bold uppercase tracking-wider" style={{ color: topic.color }}>{topic.symbol} {topic.name}</span>
                )}
                <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: info.bg, color: info.color }}>{info.short}</span>
              </div>
              <Link to={`/nauctura/${a.id}`} className="no-underline text-foreground">
                <h3 className="text-xl font-bold leading-tight mb-1 flex items-center gap-1">
                  {a.is_featured && <span title="Významný" className="text-amber-500">★</span>}
                  {a.title}
                </h3>
              </Link>
              {a.perex && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.perex}</p>}
              <div className="flex items-center justify-between text-xs mt-auto pt-2 border-t border-border">
                <span>
                  — {authorProfile?.username
                    ? <Link to={`/uziv/${authorProfile.username}`} className="font-bold hover:underline">{authorName}</Link>
                    : <strong>{authorName}</strong>}
                </span>
                {a.rating != null && <span className="text-amber-600 font-bold">{'★'.repeat(a.rating)}</span>}
              </div>
              {a.scheduled_for && a.status === 'scheduled' && (
                <div className="text-xs text-muted-foreground">Vyjde: {new Date(a.scheduled_for).toLocaleString('cs')}</div>
              )}
              {a.taken_by && isEditor && a.status !== 'published' && (
                <div className="text-xs text-blue-700 dark:text-blue-400">Posuzuje: <strong>{profiles[a.taken_by]?.display_name || 'redaktor'}</strong></div>
              )}
            </article>
          );
        })}
      </div>
      {!loading && filtered.length === 0 && (
        <div className="panel-card text-center text-muted-foreground">Žádné články v této sekci.</div>
      )}

      <CreateArticleDialog
        open={createOpen} onClose={() => setCreateOpen(false)} topics={topics}
        onCreated={(id) => { setCreateOpen(false); navigate(`/nauctura/${id}?edit=1`); }}
      />
    </AppLayout>
  );
}

/* ----- Dialog: zbrusu nové vytvoření článku ----- */
function CreateArticleDialog({ open, onClose, topics, onCreated }: { open: boolean; onClose: () => void; topics: Topic[]; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [perex, setPerex] = useState('');
  const [topicId, setTopicId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setTitle(''); setPerex(''); setTopicId(topics[0]?.id ?? ''); } }, [open, topics]);

  async function create() {
    if (!user || !title.trim()) { toast.error('Vyplň název článku'); return; }
    setSaving(true);
    const sb: any = supabase;
    const { data, error } = await sb.from('articles').insert({
      author_id: user.id, title: title.trim(), perex: perex.trim() || null,
      topic_id: topicId || null, status: 'draft_author',
    }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await sb.from('article_status_log').insert({ article_id: data.id, actor_id: user.id, to_status: 'draft_author', reason: 'Vznik články' });
    toast.success('Články založen — pokračuj v psaní');
    onCreated(data.id);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">✒ Nový články do Naučtury</DialogTitle>
          <DialogDescription>
            Založíš si rozpracovaný články. Pak ho dopíšeš a odešleš redakci k posouzení.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Pracovní název</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="např. Jak vznikla písmena řecké abecedy" maxLength={200} autoFocus />
          </div>
          <div>
            <Label>Téma</Label>
            <select value={topicId} onChange={e => setTopicId(e.target.value)} className="w-full border-2 border-border rounded-md py-2 px-3 text-sm bg-background">
              <option value="">— bez tématu —</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.symbol} {t.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Krátký perex (volitelné)</Label>
            <Textarea value={perex} onChange={e => setPerex(e.target.value)} rows={3} placeholder="Pár vět, které články uvedou…" />
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <strong>Pracovní postup:</strong> Rozpracovaný → odeslat k posouzení → redakce přebírá → úpravy a doladění → vydání (ihned, naplánované nebo významné s automatickým upozorněním na titulku)
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zrušit</Button>
          <Button onClick={create} disabled={saving}>{saving ? 'Zakládám…' : 'Založit články'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----- Admin: spravovat témata a redaktory ----- */
function RedakceAdmin({ topics, onChanged }: { topics: Topic[]; onChanged: () => void }) {
  const { user } = useAuth();
  const sb: any = supabase;
  const [editors, setEditors] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [newEditorUsername, setNewEditorUsername] = useState('');
  const [newEditorTopic, setNewEditorTopic] = useState('');
  const [newTopic, setNewTopic] = useState({ name: '', slug: '', symbol: '📰', color: '#4a5c8a' });

  useEffect(() => { loadEditors(); /* eslint-disable-next-line */ }, []);
  async function loadEditors() {
    const { data } = await sb.from('article_editors').select('*');
    setEditors(data || []);
    const ids = [...new Set((data || []).map((e: any) => e.user_id))];
    if (ids.length) {
      const { data: ps } = await sb.from('profiles').select('user_id, display_name, username, avatar_url').in('user_id', ids);
      const m: Record<string, Profile> = {};
      (ps || []).forEach((p: any) => { m[p.user_id] = p; });
      setProfiles(m);
    }
  }

  async function addEditor() {
    if (!newEditorUsername.trim()) return;
    const { data: p } = await sb.from('profiles').select('user_id').eq('username', newEditorUsername.trim()).maybeSingle();
    if (!p) { toast.error('Uživatel nenalezen'); return; }
    const { error } = await sb.from('article_editors').insert({ user_id: p.user_id, topic_id: newEditorTopic || null, granted_by: user?.id });
    if (error) toast.error(error.message); else { toast.success('Redaktor přidán'); setNewEditorUsername(''); loadEditors(); }
  }
  async function removeEditor(id: string) {
    await sb.from('article_editors').delete().eq('id', id);
    loadEditors();
  }
  async function addTopic() {
    if (!newTopic.name || !newTopic.slug) return;
    const { error } = await sb.from('article_topics').insert(newTopic);
    if (error) toast.error(error.message); else { toast.success('Téma přidáno'); setNewTopic({ name: '', slug: '', symbol: '📰', color: '#4a5c8a' }); onChanged(); }
  }

  return (
    <details className="panel-card mb-4">
      <summary className="cursor-pointer font-extrabold">⚙️ Správa redakce (jen rektor)</summary>
      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-bold mb-2">Redaktoři</h4>
          <div className="space-y-1 mb-3">
            {editors.map(e => (
              <div key={e.id} className="flex items-center justify-between text-sm border border-border rounded-lg px-3 py-1.5">
                <span><strong>{profiles[e.user_id]?.display_name || e.user_id.slice(0, 8)}</strong> — {e.topic_id ? topics.find(t => t.id === e.topic_id)?.name : <em>všechna témata</em>}</span>
                <button onClick={() => removeEditor(e.id)} className="text-xs text-destructive">odebrat</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newEditorUsername} onChange={e => setNewEditorUsername(e.target.value)} placeholder="username" className="border-2 border-border rounded-lg py-1.5 px-2 text-sm flex-1" />
            <select value={newEditorTopic} onChange={e => setNewEditorTopic(e.target.value)} className="border-2 border-border rounded-lg py-1.5 px-2 text-sm">
              <option value="">Všechna témata</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Button size="sm" onClick={addEditor}>+ Přidat</Button>
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-2">Témata</h4>
          <div className="space-y-1 mb-3 text-sm">
            {topics.map(t => <div key={t.id} className="border border-border rounded-lg px-3 py-1.5">{t.symbol} {t.name} <span className="text-xs text-muted-foreground">/{t.slug}/</span></div>)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={newTopic.name} onChange={e => setNewTopic({ ...newTopic, name: e.target.value })} placeholder="Název" className="border-2 border-border rounded-lg py-1.5 px-2 text-sm" />
            <input value={newTopic.slug} onChange={e => setNewTopic({ ...newTopic, slug: e.target.value })} placeholder="slug" className="border-2 border-border rounded-lg py-1.5 px-2 text-sm" />
            <input value={newTopic.symbol} onChange={e => setNewTopic({ ...newTopic, symbol: e.target.value })} placeholder="📰" className="border-2 border-border rounded-lg py-1.5 px-2 text-sm" />
            <input type="color" value={newTopic.color} onChange={e => setNewTopic({ ...newTopic, color: e.target.value })} className="border-2 border-border rounded-lg h-9" />
          </div>
          <Button size="sm" className="mt-2" onClick={addTopic}>+ Přidat téma</Button>
        </div>
      </div>
    </details>
  );
}
