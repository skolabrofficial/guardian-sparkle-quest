import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { nameWithRole } from '@/lib/roleUtils';
import { toast } from 'sonner';

interface Faculty {
  id: string; name: string; description: string | null; color: string | null;
  icon: string | null; dean_id: string | null;
}
interface Course {
  id: string; title: string; description: string | null; day_of_week: string | null;
  time_slot: string | null; difficulty: string | null; lektor_id: string | null;
}

export default function FakultyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isDeveloper, isStaff } = useAuth();
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [boardContent, setBoardContent] = useState('');
  const [editingBoard, setEditingBoard] = useState(false);
  const [boardDraft, setBoardDraft] = useState('');

  const isDean = user?.id === faculty?.dean_id;
  const canManageBoard = isDean || isStaff || isDeveloper;

  useEffect(() => {
    if (user && id) load();
  }, [user, id]);

  const load = async () => {
    if (!id) return;
    const [fRes, cRes, pRes, rRes, settRes] = await Promise.all([
      supabase.from('faculties').select('*').eq('id', id).single(),
      supabase.from('courses').select('*').eq('faculty_id', id).eq('is_active', true).order('title'),
      supabase.from('profiles').select('user_id, display_name'),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('system_settings').select('value').eq('key', `faculty_board_${id}`).maybeSingle(),
    ]);
    if (fRes.data) setFaculty(fRes.data);
    if (cRes.data) setCourses(cRes.data);
    if (pRes.data) {
      const map: Record<string, string> = {};
      pRes.data.forEach(p => { map[p.user_id] = p.display_name; });
      setProfiles(map);
    }
    if (rRes.data) {
      const map: Record<string, string> = {};
      rRes.data.forEach(r => { map[r.user_id] = r.role; });
      setUserRoles(map);
    }
    if (settRes.data?.value) {
      const val = typeof settRes.data.value === 'string' ? settRes.data.value : JSON.stringify(settRes.data.value);
      setBoardContent(val.replace(/^"|"$/g, ''));
    }
  };

  const saveBoard = async () => {
    if (!user || !id) return;
    const key = `faculty_board_${id}`;
    const existing = await supabase.from('system_settings').select('id').eq('key', key).maybeSingle();
    if (existing.data) {
      await supabase.from('system_settings').update({ value: JSON.stringify(boardDraft), updated_by: user.id }).eq('key', key);
    } else {
      await supabase.from('system_settings').insert({ key, value: JSON.stringify(boardDraft), updated_by: user.id });
    }
    setBoardContent(boardDraft);
    setEditingBoard(false);
    toast.success('Nástěnka uložena');
  };

  if (!faculty) return <AppLayout><div className="panel-card"><p>Načítání fakulty...</p></div></AppLayout>;

  return (
    <AppLayout searchLabel="Fakulta" searchPlaceholder="Hledat v fakultě...">
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          {/* Faculty header */}
          <article className="feature-card animate-float-in" style={{ borderTop: `4px solid ${faculty.color || 'hsl(var(--primary))'}` }}>
            <Link to="/fakulty" className="text-xs text-muted-foreground no-underline mb-2 block hover:text-primary transition-colors">← Zpět na fakulty</Link>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{faculty.icon || '🏛'}</span>
              <div>
                <h2 className="mt-0 text-[22px]">{faculty.name}</h2>
                {faculty.dean_id && (
                  <p className="text-sm font-bold" style={{ color: '#8b6914' }}>
                    🎓 Děkan: {nameWithRole(profiles[faculty.dean_id] || '—', userRoles[faculty.dean_id])}
                  </p>
                )}
              </div>
            </div>
            {faculty.description && <p className="mt-3 text-muted-foreground">{faculty.description}</p>}
          </article>

          {/* Board */}
          <div className="panel-card animate-slide-up stagger-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="mt-0 text-base font-extrabold">📋 Nástěnka</h3>
              {canManageBoard && (
                <button
                  onClick={() => { setEditingBoard(!editingBoard); setBoardDraft(boardContent); }}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  {editingBoard ? '✕ Zrušit' : '✏ Upravit'}
                </button>
              )}
            </div>
            {editingBoard ? (
              <div className="grid gap-2">
                <textarea
                  value={boardDraft}
                  onChange={e => setBoardDraft(e.target.value)}
                  className="border-2 border-border rounded-xl py-2.5 px-3 text-sm outline-none bg-card focus:border-secondary min-h-[150px] resize-y font-mono transition-colors"
                  placeholder="Obsah nástěnky (podporuje Markdown a LaTeX)..."
                />
                <button onClick={saveBoard} className="btn-alik-primary text-sm w-fit">💾 Uložit nástěnku</button>
              </div>
            ) : boardContent ? (
              <MarkdownRenderer content={boardContent} />
            ) : (
              <p className="text-sm text-muted-foreground">Nástěnka je prázdná. {canManageBoard ? 'Klikněte na ✏ pro přidání obsahu.' : ''}</p>
            )}
          </div>

          {/* Courses */}
          <div className="panel-card animate-slide-up stagger-2">
            <h3 className="mt-0 text-base font-extrabold">📚 Kurzy fakulty ({courses.length})</h3>
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Zatím žádné kurzy přiřazeny k této fakultě.</p>
            ) : (
              <div className="grid gap-2 mt-3">
                {courses.map(c => (
                  <Link key={c.id} to={`/kurzy/${c.id}`} className="no-underline">
                    <div className="catalog-item-card hover:shadow-md transition-all items-center">
                      <div className="flex-1">
                        <strong className="text-sm">{c.title}</strong>
                        {c.day_of_week && <span className="text-xs text-muted-foreground ml-2">{c.day_of_week} {c.time_slot}</span>}
                        {c.lektor_id && <span className="text-xs ml-2" style={{ color: '#8b6914' }}>👨‍🏫 {nameWithRole(profiles[c.lektor_id] || '—', userRoles[c.lektor_id])}</span>}
                      </div>
                      {c.difficulty && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-accent/10 text-accent">{c.difficulty}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card animate-slide-up stagger-1">
            <h4 className="mt-0">Informace o fakultě</h4>
            <ul className="pl-4 text-sm">
              <li>Kurzů: {courses.length}</li>
              <li>Děkan: {faculty.dean_id ? nameWithRole(profiles[faculty.dean_id] || '—', userRoles[faculty.dean_id]) : '—'}</li>
            </ul>
          </div>
        </aside>
      </main>
    </AppLayout>
  );
}
