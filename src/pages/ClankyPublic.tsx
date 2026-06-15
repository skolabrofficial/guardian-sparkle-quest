import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { Button } from '@/components/ui/button';

interface Article {
  id: string;
  title: string;
  perex: string | null;
  content: string | null;
  status: string;
  author_override: string | null;
  author_id: string | null;
  topic_id: string | null;
  published_at: string | null;
  created_at: string;
  is_featured: boolean;
  featured_until: string | null;
  rating: number | null;
  cover_image: string | null;
}

interface Topic {
  id: string;
  slug: string;
  name: string;
  symbol: string;
  color: string;
}

interface Profile {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

export default function ClankyPublic() {
  const { user } = useAuth();
  const { id } = useParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [topics, setTopics] = useState<Record<string, Topic>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(!id);
  const [detailLoading, setDetailLoading] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  async function loadArticles() {
    setLoading(true);
    try {
      const sb: any = supabase;

      // Načti témata
      const { data: topicsData } = await sb
        .from('article_topics')
        .select('*')
        .order('name');

      const topicsMap: Record<string, Topic> = {};
      topicsData?.forEach((t: Topic) => {
        topicsMap[t.id] = t;
      });
      setTopics(topicsMap);

      // Načti pouze vydané články
      let query = sb
        .from('articles')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (topicFilter) {
        query = query.eq('topic_id', topicFilter);
      }

      const { data: articlesData } = await query;

      if (articlesData) {
        // Filtruj podle search
        const filtered = articlesData.filter((a: Article) => {
          if (!search) return true;
          return (
            a.title.toLowerCase().includes(search.toLowerCase()) ||
            a.perex?.toLowerCase().includes(search.toLowerCase())
          );
        });

        setArticles(filtered);

        // Načti profily autorů
        const authorIds = new Set<string>();
        filtered.forEach((a: Article) => {
          if (a.author_id) authorIds.add(a.author_id);
        });

        if (authorIds.size > 0) {
          const { data: profilesData } = await sb
            .from('profiles')
            .select('user_id, display_name, username, avatar_url')
            .in('user_id', Array.from(authorIds));

          const profilesMap: Record<string, Profile> = {};
          profilesData?.forEach((p: Profile) => {
            profilesMap[p.user_id] = p;
          });
          setProfiles(profilesMap);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadArticleDetail(articleId: string) {
    setDetailLoading(true);
    try {
      const sb: any = supabase;
      const { data } = await sb
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .eq('status', 'published')
        .maybeSingle();

      if (data) {
        setArticle(data);

        // Načti autora
        if (data.author_id && !profiles[data.author_id]) {
          const { data: profileData } = await sb
            .from('profiles')
            .select('user_id, display_name, username, avatar_url')
            .eq('user_id', data.author_id)
            .maybeSingle();

          if (profileData) {
            setProfiles(p => ({ ...p, [profileData.user_id]: profileData }));
          }
        }
      } else {
        toast.error('Článek nenalezen nebo není publikován');
        setArticle(null);
      }
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadArticleDetail(id);
    } else {
      loadArticles();
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      loadArticles();
    }
  }, [topicFilter, search]);

  if (id && detailLoading) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">Načítám článek...</div>
      </AppLayout>
    );
  }

  if (id && !article) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Článek nenalezen nebo není publikován.</p>
          <Link to="/clanky" className="text-primary font-bold hover:underline">
            ← Zpět na články
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (id && article) {
    const topic = article.topic_id ? topics[article.topic_id] : null;
    const author = article.author_id ? profiles[article.author_id] : null;

    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto">
          <Link to="/clanky" className="inline-flex items-center gap-1 text-primary font-bold mb-6 hover:gap-2 transition-all">
            ← Zpět na články
          </Link>

          <article className="panel-card border-l-4" style={{ borderLeftColor: topic?.color || '#7A1F2B' }}>
            {article.cover_image && (
              <img
                src={article.cover_image}
                alt={article.title}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
            )}

            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <h1 className="text-3xl font-bold m-0">{article.title}</h1>
                {topic && (
                  <div className="flex items-center gap-2 mt-2">
                    <span style={{ color: topic.color }} className="text-2xl">
                      {topic.symbol}
                    </span>
                    <span className="text-sm text-muted-foreground">{topic.name}</span>
                  </div>
                )}
              </div>
              {article.is_featured && (
                <div className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold">
                  ⭐ Doporučeno
                </div>
              )}
            </div>

            {article.perex && (
              <p className="text-lg text-muted-foreground italic mb-4 border-l-4 border-secondary pl-4">
                {article.perex}
              </p>
            )}

            <div className="flex items-center gap-4 py-4 border-t border-b border-border">
              {author && (
                <div className="flex items-center gap-2">
                  {author.avatar_url ? (
                    <img
                      src={author.avatar_url}
                      alt={author.display_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
                      {author.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm">{author.display_name}</div>
                    <div className="text-xs text-muted-foreground">@{author.username}</div>
                  </div>
                </div>
              )}
              <div className="ml-auto text-xs text-muted-foreground">
                Publikováno: {new Date(article.published_at || article.created_at).toLocaleDateString('cs')}
              </div>
            </div>

            {article.content && (
              <div className="prose prose-sm max-w-none mt-6">
                <MarkdownRenderer content={article.content} />
              </div>
            )}

            {article.rating !== null && (
              <div className="mt-6 p-4 rounded-lg bg-muted text-center">
                <div className="text-sm text-muted-foreground">Hodnocení redakce</div>
                <div className="text-2xl font-bold mt-1">
                  {'⭐'.repeat(Math.max(1, Math.min(5, article.rating)))}
                </div>
              </div>
            )}
          </article>

          {!user && (
            <div className="mt-6 p-4 rounded-lg border border-border bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                Chceš psát články?{' '}
                <Link to="/register" className="text-primary font-bold hover:underline">
                  Zaregistruj se
                </Link>
              </p>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  const topicsList = Object.values(topics);

  return (
    <AppLayout searchLabel="Hledat články" searchPlaceholder="např. učení, tipy">
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          <article className="feature-card grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 animate-float-in">
            <div>
              <h2 className="mt-0 text-[22px]">📚 Publikované články</h2>
              <p>Čtení od nejlepších učitelů a studentů Alíkovy Univerzity.</p>
              <p className="text-muted-foreground">Celkem {articles.length} článků k přečtení.</p>
            </div>
            <div className="grid place-items-center"><div className="poster-gradient" /></div>
          </article>

          {/* Filtry */}
          <div className="panel-card animate-slide-up stagger-1">
            <div className="grid gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Témata
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTopicFilter('')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      !topicFilter
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    Všechna
                  </button>
                  {topicsList.map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => setTopicFilter(topic.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        topicFilter === topic.id
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      style={topicFilter === topic.id ? { backgroundColor: topic.color, color: '#fff' } : undefined}
                    >
                      {topic.symbol} {topic.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                  Hledej
                </label>
                <input
                  type="text"
                  placeholder="Název, téma, autor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors w-full"
                />
              </div>
            </div>
          </div>

          {/* Seznam článků */}
          <div className="grid gap-3">
            {loading ? (
              <p className="text-muted-foreground text-sm">Načítám články...</p>
            ) : articles.length === 0 ? (
              <div className="panel-card text-center">
                <p className="text-muted-foreground">Žádné články dle vašeho vyhledávání.</p>
              </div>
            ) : (
              articles.map((a, i) => {
                const topic = a.topic_id ? topics[a.topic_id] : null;
                const author = a.author_id ? profiles[a.author_id] : null;

                return (
                  <Link
                    key={a.id}
                    to={`/clanky/${a.id}`}
                    className={`panel-card animate-slide-up stagger-${(i % 3) + 2} hover:shadow-md transition-shadow border-l-4 cursor-pointer`}
                    style={{ borderLeftColor: topic?.color || '#7A1F2B' }}
                  >
                    <div className="flex gap-4">
                      {a.cover_image && (
                        <img
                          src={a.cover_image}
                          alt={a.title}
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <h3 className="font-bold text-base m-0 hover:text-primary transition-colors">
                            {a.title}
                          </h3>
                          {a.is_featured && <span className="text-xs">⭐</span>}
                        </div>
                        {a.perex && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.perex}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {topic && (
                            <span style={{ color: topic.color }} className="font-bold">
                              {topic.symbol} {topic.name}
                            </span>
                          )}
                          {author && <span>od {author.display_name}</span>}
                          <span>
                            {new Date(a.published_at || a.created_at).toLocaleDateString('cs')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="grid gap-[18px]">
          <div className="panel-card animate-slide-up stagger-2">
            <h4 className="mt-0">Počty článků</h4>
            <div className="space-y-2">
              {topicsList.map(topic => {
                const count = articles.filter(a => a.topic_id === topic.id).length;
                return (
                  <div key={topic.id} className="flex items-center justify-between text-xs">
                    <span style={{ color: topic.color }} className="font-bold">
                      {topic.symbol} {topic.name}
                    </span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {!user && (
            <div className="panel-card animate-slide-up stagger-3 text-center">
              <p className="text-sm mb-3">Chceš psát články?</p>
              <Link to="/register" className="btn-alik-primary w-full block text-center text-xs">
                Zaregistruj se
              </Link>
              <p className="text-xs text-muted-foreground mt-2">
                nebo se <Link to="/login" className="text-primary hover:underline">přihlas</Link>
              </p>
            </div>
          )}
        </aside>
      </main>
    </AppLayout>
  );
}
