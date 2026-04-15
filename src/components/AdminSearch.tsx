import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import OnlineIndicator from '@/components/OnlineIndicator';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  detail?: string;
  date?: string;
  userId?: string;
  lastSeen?: string | null;
  avatarUrl?: string | null;
  link?: string;
}

const CATEGORIES = [
  { key: 'all', label: 'Vše', icon: '🔍' },
  { key: 'users', label: 'Uživatelé', icon: '👥' },
  { key: 'courses', label: 'Kurzy', icon: '📚' },
  { key: 'faculties', label: 'Fakulty', icon: '🏛' },
  { key: 'forum', label: 'Fórum', icon: '💬' },
  { key: 'tutoring', label: 'Doučování', icon: '❓' },
  { key: 'notes', label: 'Výpisky', icon: '📝' },
  { key: 'announcements', label: 'Oznámení', icon: '📢' },
  { key: 'blocks', label: 'Blokace', icon: '🚫' },
  { key: 'reports', label: 'Hlášení', icon: '⚠' },
  { key: 'audit', label: 'Audit', icon: '📋' },
  { key: 'images', label: 'Obrázky', icon: '🖼️' },
];

export default function AdminSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) { toast.error('Zadejte hledaný výraz'); return; }
    setLoading(true);
    setSearched(true);
    const q = query.trim().toLowerCase();
    const allResults: SearchResult[] = [];

    try {
      const shouldSearch = (cat: string) => category === 'all' || category === cat;

      // Users
      if (shouldSearch('users')) {
        const { data } = await supabase.from('profiles').select('user_id, display_name, bio, last_seen, avatar_url');
        if (data) {
          data.filter(p => p.display_name.toLowerCase().includes(q) || p.bio?.toLowerCase().includes(q))
            .forEach(p => allResults.push({
              type: '👥 Uživatel', id: p.user_id, title: p.display_name,
              subtitle: p.bio?.slice(0, 100) || '', lastSeen: p.last_seen, userId: p.user_id,
              link: `/profil/${p.user_id}`,
            }));
        }
      }

      // Courses
      if (shouldSearch('courses')) {
        const { data } = await supabase.from('courses').select('id, title, description, difficulty, semester, building, room');
        if (data) {
          data.filter(c => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q) || c.building?.toLowerCase().includes(q) || c.room?.toLowerCase().includes(q))
            .forEach(c => allResults.push({
              type: '📚 Kurz', id: c.id, title: c.title,
              subtitle: c.description?.slice(0, 120) || '',
              detail: [c.difficulty, c.semester, c.building, c.room].filter(Boolean).join(' • '),
              link: `/kurz/${c.id}`,
            }));
        }
      }

      // Faculties
      if (shouldSearch('faculties')) {
        const { data } = await supabase.from('faculties').select('id, name, description');
        if (data) {
          data.filter(f => f.name.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q))
            .forEach(f => allResults.push({ type: '🏛 Fakulta', id: f.id, title: f.name, subtitle: f.description?.slice(0, 100) || '', link: `/fakulty/${f.id}` }));
        }
      }

      // Forum posts
      if (shouldSearch('forum')) {
        const { data } = await supabase.from('forum_posts').select('id, content, author_id, created_at, label, is_deleted, course_id').limit(500);
        if (data) {
          data.filter(p => !p.is_deleted && p.content.toLowerCase().includes(q))
            .forEach(p => allResults.push({
              type: '💬 Fórum', id: p.id, title: p.content.slice(0, 80) + (p.content.length > 80 ? '...' : ''),
              subtitle: p.label ? `Štítek: ${p.label}` : undefined,
              date: p.created_at, userId: p.author_id,
              link: `/kurz/${p.course_id}`,
            }));
        }
      }

      // Tutoring questions
      if (shouldSearch('tutoring')) {
        const { data } = await supabase.from('tutoring_questions').select('id, question, topic, status, created_at, user_id');
        if (data) {
          data.filter(t => t.question.toLowerCase().includes(q) || t.topic.toLowerCase().includes(q))
            .forEach(t => allResults.push({
              type: '❓ Dotaz', id: t.id, title: t.question.slice(0, 80),
              subtitle: `${t.topic} • ${t.status === 'answered' ? '✅' : '⏳'}`,
              date: t.created_at, userId: t.user_id,
              link: '/doucovani',
            }));
        }
        const { data: ans } = await supabase.from('tutoring_answers').select('id, answer, mentor_id, created_at');
        if (ans) {
          ans.filter(a => a.answer.toLowerCase().includes(q))
            .forEach(a => allResults.push({
              type: '💡 Odpověď', id: a.id, title: a.answer.slice(0, 80),
              date: a.created_at, userId: a.mentor_id,
              link: '/doucovani',
            }));
        }
      }

      // Study notes
      if (shouldSearch('notes')) {
        const { data } = await supabase.from('study_notes').select('id, title, content, user_id, created_at, tags');
        if (data) {
          data.filter(n => n.title.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q) || n.tags?.some((t: string) => t.toLowerCase().includes(q)))
            .forEach(n => allResults.push({
              type: '📝 Výpisek', id: n.id, title: n.title,
              subtitle: n.content?.slice(0, 100) || '',
              detail: n.tags?.join(', ') || undefined,
              date: n.created_at, userId: n.user_id,
              link: '/vypisky',
            }));
        }
      }

      // Announcements
      if (shouldSearch('announcements')) {
        const { data } = await supabase.from('announcements').select('id, title, content, created_at, priority');
        if (data) {
          data.filter(a => a.title.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q))
            .forEach(a => allResults.push({
              type: '📢 Oznámení', id: a.id, title: a.title,
              subtitle: a.content?.slice(0, 100) || '',
              detail: `Priorita: ${a.priority}`, date: a.created_at,
            }));
        }
      }

      // Blocks
      if (shouldSearch('blocks')) {
        const { data } = await supabase.from('user_blocks').select('id, reason, details, user_id, blocked_at, severity, block_type');
        if (data) {
          data.filter(b => b.reason.toLowerCase().includes(q) || b.details?.toLowerCase().includes(q))
            .forEach(b => allResults.push({
              type: '🚫 Blokace', id: b.id, title: b.reason,
              subtitle: b.details?.slice(0, 100) || '',
              detail: `${b.severity} • ${b.block_type}`,
              date: b.blocked_at, userId: b.user_id,
            }));
        }
      }

      // Reports
      if (shouldSearch('reports')) {
        const { data } = await supabase.from('reports').select('id, reason, entity_type, status, created_at');
        if (data) {
          data.filter(r => r.reason.toLowerCase().includes(q) || r.entity_type.toLowerCase().includes(q))
            .forEach(r => allResults.push({
              type: '⚠ Hlášení', id: r.id, title: r.reason.slice(0, 80),
              subtitle: `${r.entity_type} • ${r.status}`, date: r.created_at,
            }));
        }
      }

      // Audit log
      if (shouldSearch('audit')) {
        const { data } = await supabase.from('audit_log').select('id, action, entity_type, created_at, user_id').limit(300);
        if (data) {
          data.filter(a => a.action.toLowerCase().includes(q) || a.entity_type?.toLowerCase().includes(q))
            .forEach(a => allResults.push({
              type: '📋 Audit', id: a.id, title: a.action,
              subtitle: a.entity_type || '', date: a.created_at, userId: a.user_id || undefined,
            }));
        }
      }

      // Images
      if (shouldSearch('images')) {
        const { data } = await supabase.from('uploaded_images').select('id, file_name, status, license_type, author_name, created_at, user_id');
        if (data) {
          data.filter(i => i.file_name.toLowerCase().includes(q) || i.author_name?.toLowerCase().includes(q))
            .forEach(i => allResults.push({
              type: '🖼️ Obrázek', id: i.id, title: i.file_name,
              subtitle: `${i.status} • ${i.license_type}`,
              detail: i.author_name || undefined,
              date: i.created_at, userId: i.user_id,
            }));
        }
      }

      setResults(allResults);
      if (allResults.length === 0) toast.info('Nic nebylo nalezeno');
    } catch (err) {
      toast.error('Chyba při hledání');
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); search(); };

  // Load profiles for results that have userId
  const [profileCache, setProfileCache] = useState<Record<string, { name: string; lastSeen: string | null; avatarUrl: string | null }>>({});
  const loadProfilesForResults = async (res: SearchResult[]) => {
    const ids = [...new Set(res.filter(r => r.userId).map(r => r.userId!))].filter(id => !profileCache[id]);
    if (ids.length === 0) return;
    const { data } = await supabase.from('profiles').select('user_id, display_name, last_seen, avatar_url').in('user_id', ids);
    if (data) {
      const newCache = { ...profileCache };
      data.forEach(p => { newCache[p.user_id] = { name: p.display_name, lastSeen: p.last_seen, avatarUrl: p.avatar_url }; });
      setProfileCache(newCache);
    }
  };

  // Load profiles when results change
  if (results.length > 0 && results.some(r => r.userId && !profileCache[r.userId!])) {
    loadProfilesForResults(results);
  }

  return (
    <div className="grid gap-4">
      <div className="panel-card">
        <h3 className="mt-0 mb-3 text-lg font-bold">🔍 Generální vyhledávání</h3>
        <p className="text-sm text-muted-foreground mb-4">Prohledá celou databázi — uživatele, kurzy, fórum, dotazy, výpisky, oznámení, blokace, hlášení, audit a obrázky.</p>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Hledaný výraz..."
              className="flex-1 border-2 border-border rounded-xl py-2.5 px-4 text-sm outline-none focus:border-secondary transition-colors bg-card"
            />
            <button type="submit" disabled={loading} className="btn-alik-primary whitespace-nowrap">
              {loading ? '⏳ Hledám...' : '🔍 Hledat'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
                style={{
                  background: category === cat.key ? 'hsl(var(--secondary))' : 'hsl(var(--muted))',
                  color: category === cat.key ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--foreground))',
                  borderColor: category === cat.key ? 'hsl(var(--secondary))' : 'hsl(var(--border))',
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      {searched && (
        <div className="panel-card">
          <div className="flex justify-between items-center mb-3">
            <h4 className="mt-0 mb-0 font-bold">Výsledky ({results.length})</h4>
            {results.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {[...new Set(results.map(r => r.type))].join(' | ')}
              </span>
            )}
          </div>

          {results.length === 0 && !loading && (
            <p className="text-muted-foreground text-sm text-center py-8">Žádné výsledky pro „{query}"</p>
          )}

          <div className="grid gap-2">
            {results.map((r, i) => (
              <div
                key={`${r.type}-${r.id}-${i}`}
                className={`catalog-item-card hover:shadow-sm transition-all ${r.link ? 'cursor-pointer hover:border-secondary' : ''}`}
                onClick={() => r.link && navigate(r.link)}
                role={r.link ? 'link' : undefined}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">{r.type}</span>
                    {r.userId && profileCache[r.userId] && (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="relative flex-shrink-0">
                          {profileCache[r.userId].avatarUrl ? (
                            <img src={profileCache[r.userId].avatarUrl!} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-border" />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold">{profileCache[r.userId].name.charAt(0)}</span>
                          )}
                          <OnlineIndicator lastSeen={profileCache[r.userId].lastSeen} size="sm" className="absolute -bottom-0.5 -right-0.5" />
                        </span>
                        {profileCache[r.userId].name}
                      </span>
                    )}
                  </div>
                  <strong className="text-sm block truncate">{r.title}</strong>
                  {r.subtitle && <span className="text-xs text-muted-foreground block truncate">{r.subtitle}</span>}
                  {r.detail && <span className="text-xs block truncate" style={{ color: 'hsl(var(--ring))' }}>{r.detail}</span>}
                </div>
                <div className="flex items-center gap-2">
                  {r.date && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString('cs')}
                    </span>
                  )}
                  {r.link && <span className="text-xs text-secondary">→</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}