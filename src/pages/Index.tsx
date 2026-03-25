import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ courses: 0, faculties: 0, students: 0, mentors: 0 });
  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; content: string | null }>>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('courses').select('id', { count: 'exact', head: true }),
      supabase.from('faculties').select('id', { count: 'exact', head: true }),
      supabase.from('announcements').select('id, title, content').eq('is_active', true).order('created_at', { ascending: false }).limit(3),
    ]).then(([courses, faculties, ann]) => {
      setStats(s => ({ ...s, courses: courses.count || 0, faculties: faculties.count || 0 }));
      if (ann.data) setAnnouncements(ann.data);
    });
  }, [user]);

  return (
    <AppLayout searchLabel="Najít přednášku" searchPlaceholder="např. komiksový výtvarník" searchTags={['katalog kurzů', 'rozvrh', 'knihovna']}>
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          <article className="feature-card grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 animate-float-in">
            <div>
              <h2 className="mt-0 text-[22px]">Vítejte na Alíkově Univerzitě!</h2>
              <p>Vzdělávací platforma plná kurzů, mentorů a zábavy.</p>
              <p className="text-muted-foreground">Začněte výběrem fakulty nebo kurzu.</p>
              <Link to="/kurzy" className="text-blue-600 font-bold no-underline">Prohlédnout kurzy →</Link>
            </div>
            <div className="grid place-items-center">
              <div className="poster-gradient" />
            </div>
          </article>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stat-card"><strong className="block text-[22px]" style={{ color: '#1f3f6b' }}>{stats.courses}</strong><span className="text-xs text-muted-foreground">kurzů</span></div>
            <div className="stat-card"><strong className="block text-[22px]" style={{ color: '#1f3f6b' }}>{stats.faculties}</strong><span className="text-xs text-muted-foreground">fakult</span></div>
            <div className="stat-card"><strong className="block text-[22px]" style={{ color: '#1f3f6b' }}>—</strong><span className="text-xs text-muted-foreground">lektorů</span></div>
            <div className="stat-card"><strong className="block text-[22px]" style={{ color: '#1f3f6b' }}>—</strong><span className="text-xs text-muted-foreground">studentů</span></div>
          </div>

          {announcements.length > 0 && (
            <div className="panel-card">
              <h3 className="mt-0 mb-2">Oznámení</h3>
              <div className="grid gap-2">
                {announcements.map(a => (
                  <div key={a.id} className="catalog-item-card">
                    <strong>{a.title}</strong>
                    <span className="text-muted-foreground text-xs">{a.content?.slice(0, 50)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card">
            <h4 className="mt-0">Rychlé odkazy</h4>
            <div className="grid gap-2">
              <Link to="/fakulty" className="btn-alik-outline text-center no-underline block">Fakulty</Link>
              <Link to="/kurzy" className="btn-alik-outline text-center no-underline block">Kurzy</Link>
              <Link to="/doucovani" className="btn-alik-outline text-center no-underline block">Doučování</Link>
            </div>
          </div>
          <Link to="/doucovani" className="btn-alik-accent text-center no-underline block">Položit dotaz</Link>
        </aside>
      </main>
    </AppLayout>
  );
}
