import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { STATUS_INFO, ArticleStatus } from '@/lib/articleStatus';
import { toast } from 'sonner';

interface Article {
  id: string; title: string; perex: string | null; status: ArticleStatus;
  author_id: string | null; author_override: string | null;
  topic_id: string | null; published_at: string | null; created_at: string;
  scheduled_for: string | null;
}
interface Topic { id: string; slug: string; name: string; symbol: string; color: string; }
interface Profile { user_id: string; display_name: string; username: string; avatar_url: string | null; }

type Tab = 'vydane' | 'moje' | 'redakce';

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

  useEffect(() => { load(); }, [tab, user?.id, topicFilter]);

  async function load() {
    setLoading(true);
    const sb: any = supabase;
    const [topRes, edRes] = await Promise.all([
      sb.from('article_topics').select('*').order('name'),
      user ? sb.from('article_editors').select('id').eq('user_id', user.id).limit(1) : Promise.resolve({ data: [] }),
    ]);
    setTopics(topRes.data || []);
    setIsEditor((edRes.data?.length ?? 0) > 0 || isRektor);

    let q = sb.from('articles').select('*').order('created_at', { ascending: false });
    if (tab === 'vydane') q = q.eq('status', 'published');
    else if (tab === 'moje' && user) q = q.eq('author_id', user.id);
    else if (tab === 'redakce') q = q.not('status', 'in', '(published,deleted)');
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
    setLoading(false);
  }

  async function createNew() {
    if (!user) return;
    const sb: any = supabase;
    const { data, error } = await sb.from('articles').insert({
      author_id: user.id, title: 'Nový článek', status: 'draft_author', topic_id: topics[0]?.id ?? null,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    await sb.from('article_status_log').insert({ article_id: data.id, actor_id: user.id, to_status: 'draft_author', reason: 'Vznik článku' });
    navigate(`/nauctura/${data.id}?edit=1`);
  }

  const filtered = articles.filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.perex || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout searchLabel="Hledat v Naučtuře" searchPlaceholder="název, perex…" onSearch={setSearch}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,500&family=JetBrains+Mono:wght@400;600&display=swap');
        .nau-hero h1 { font-family: 'Cormorant Garamond', serif; font-weight: 700; }
        .nau-card { transition: transform .15s, box-shadow .15s; }
        .nau-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px -10px rgba(0,0,0,.18); }
        .nau-card h3 { font-family: 'Cormorant Garamond', serif; font-weight: 700; }
        .nau-tab { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: .08em; }
      `}</style>

      <div className="panel-card nau-hero mb-5" style={{ background: 'linear-gradient(135deg, #fff7e8 0%, #f3e6c8 100%)', border: '2px solid #c9b27a' }}>
        <div className="text-xs nau-tab uppercase" style={{ color: '#7a5a2a' }}>§ Naučná literatura</div>
        <h1 className="text-4xl mt-1 mb-2" style={{ color: '#2a1e0a' }}>Naučtura</h1>
        <p className="text-sm" style={{ color: '#5a4a2a', maxWidth: 720 }}>
          Univerzitní redakce naučných článků. Každý článek prochází posouzením, redakční úpravou a dolaďováním. Pod článkem vzniká <strong>Kvalitárka</strong> — rozprava mezi autorem a redakcí.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {([['vydane','Vydané'],['moje','Moje články'],['redakce','Redakce']] as [Tab, string][]).map(([k, l]) => (
          (k === 'moje' ? !!user : k === 'redakce' ? (isEditor || isLektor) : true) && (
            <button key={k} onClick={() => setTab(k)} className={`nau-tab px-4 py-2 rounded-full border-2 ${tab === k ? 'bg-foreground text-background border-foreground' : 'bg-card border-border hover:border-foreground/40'}`}>
              {l.toUpperCase()}
            </button>
          )
        ))}
        <div className="flex-1" />
        <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm bg-card">
          <option value="">Všechna témata</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.symbol} {t.name}</option>)}
        </select>
        {user && (
          <button onClick={createNew} className="btn-alik-primary text-sm">+ Napsat článek</button>
        )}
      </div>

      {isRektor && tab === 'redakce' && <RedakceAdmin topics={topics} onChanged={load} />}

      {loading && <p className="text-muted-foreground">Načítání…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(a => {
          const topic = topics.find(t => t.id === a.topic_id);
          const author = a.author_override || (a.author_id ? profiles[a.author_id]?.display_name : null) || 'Neznámý';
          const info = STATUS_INFO[a.status];
          return (
            <Link key={a.id} to={`/nauctura/${a.id}`} className="nau-card panel-card block">
              {topic && (
                <div className="text-xs nau-tab uppercase mb-1" style={{ color: topic.color }}>
                  {topic.symbol} {topic.name}
                </div>
              )}
              <h3 className="text-2xl mb-2">{a.title}</h3>
              {a.perex && <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{a.perex}</p>}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold">— {author}</span>
                <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: info.bg, color: info.color }}>
                  {info.short}
                </span>
              </div>
              {a.scheduled_for && a.status === 'scheduled' && (
                <div className="text-xs mt-2 text-muted-foreground">Vyjde: {new Date(a.scheduled_for).toLocaleString('cs')}</div>
              )}
            </Link>
          );
        })}
      </div>
      {!loading && filtered.length === 0 && (
        <div className="panel-card text-center text-muted-foreground">Žádné články v této sekci.</div>
      )}
    </AppLayout>
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

  useEffect(() => { loadEditors(); }, []);
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
    <details className="panel-card mb-4" style={{ borderColor: '#c9b27a' }}>
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
            <button onClick={addEditor} className="btn-alik-primary text-xs">+ Přidat</button>
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
          <button onClick={addTopic} className="btn-alik-primary text-xs mt-2">+ Přidat téma</button>
        </div>
      </div>
    </details>
  );
}
