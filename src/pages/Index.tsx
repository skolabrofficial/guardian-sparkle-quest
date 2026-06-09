import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getRoleSymbol } from '@/lib/roleUtils';

export default function Index() {
  const { user, profile, role } = useAuth();
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
              <h2 className="mt-0 text-[22px]">
                {user ? `Vítejte, ${profile?.display_name || 'studente'}${getRoleSymbol(role)}!` : 'Vítejte na Alíkově Univerzitě!'}
              </h2>
              <p>Vzdělávací platforma plná kurzů, mentorů a zábavy.</p>
              <p className="text-muted-foreground">Začněte výběrem fakulty nebo kurzu.</p>
              <Link to="/kurzy" className="inline-flex items-center gap-1 text-primary font-bold no-underline hover:gap-2 transition-all duration-200">
                Prohlédnout kurzy <span>→</span>
              </Link>
              {user && (
                <Link to="/mezirozprava" className="ml-4 inline-flex items-center gap-1 text-primary font-bold no-underline hover:gap-2 transition-all duration-200">
                  Moje mezirozpravy <span>→</span>
                </Link>
              )}
            </div>
            <div className="grid place-items-center">
              <div className="poster-gradient" />
            </div>
          </article>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { val: stats.courses, label: 'kurzů', color: 'from-blue-400 to-blue-600' },
              { val: stats.faculties, label: 'fakult', color: 'from-purple-400 to-purple-600' },
              { val: '—', label: 'lektorů', color: 'from-amber-400 to-amber-600' },
              { val: '—', label: 'studentů', color: 'from-green-400 to-green-600' },
            ].map((s, i) => (
              <div key={s.label} className={`stat-card animate-slide-up stagger-${i + 1}`}>
                <strong className={`block text-[22px] bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.val}</strong>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>

          {announcements.length > 0 && (
            <div className="panel-card animate-slide-up stagger-5">
              <h3 className="mt-0 mb-2">📢 Oznámení</h3>
              <div className="grid gap-2">
                {announcements.map(a => (
                  <div key={a.id} className="catalog-item-card hover:shadow-sm transition-all duration-200 rounded-xl">
                    <strong>{a.title}</strong>
                    <span className="text-muted-foreground text-xs">{a.content?.slice(0, 50)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card animate-slide-up stagger-2">
            <h4 className="mt-0">🚀 Rychlé odkazy</h4>
            <div className="grid gap-2">
              <Link to="/fakulty" className="btn-alik-outline text-center no-underline block hover:translate-x-1 transition-transform">Fakulty</Link>
              <Link to="/kurzy" className="btn-alik-outline text-center no-underline block hover:translate-x-1 transition-transform">Kurzy</Link>
              <Link to="/doucovani" className="btn-alik-outline text-center no-underline block hover:translate-x-1 transition-transform">Doučování</Link>
              {user && <Link to="/mezirozprava" className="btn-alik-outline text-center no-underline block hover:translate-x-1 transition-transform">Mezirozpravy</Link>}
            </div>
          </div>
          <Link to="/doucovani" className="btn-alik-accent text-center no-underline block hover:brightness-110 transition-all">💬 Položit dotaz</Link>
        </aside>
      </main>
    </AppLayout>
  );
}
