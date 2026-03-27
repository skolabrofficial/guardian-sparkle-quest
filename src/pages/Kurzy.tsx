import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { nameWithRole } from '@/lib/roleUtils';

interface Course { id: string; title: string; description: string | null; day_of_week: string | null; time_slot: string | null; difficulty: string | null; is_active: boolean | null; lektor_id: string | null; }

export default function Kurzy() {
  const { user, isStaff } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lektorNames, setLektorNames] = useState<Record<string, string>>({});
  const [lektorRoles, setLektorRoles] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');

  const load = async () => {
    const { data } = await supabase.from('courses').select('*').eq('is_active', true).order('title');
    if (data) {
      setCourses(data);
      const lektorIds = [...new Set(data.filter(c => c.lektor_id).map(c => c.lektor_id!))];
      if (lektorIds.length > 0) {
        const [pRes, rRes] = await Promise.all([
          supabase.from('profiles').select('user_id, display_name').in('user_id', lektorIds),
          supabase.from('user_roles').select('user_id, role').in('user_id', lektorIds),
        ]);
        if (pRes.data) {
          const m: Record<string, string> = {};
          pRes.data.forEach(p => { m[p.user_id] = p.display_name; });
          setLektorNames(m);
        }
        if (rRes.data) {
          const m: Record<string, string> = {};
          rRes.data.forEach(r => { m[r.user_id] = r.role; });
          setLektorRoles(m);
        }
      }
    }
  };
  useEffect(() => { if (user) load(); }, [user]);

  const filtered = courses.filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('courses').insert({ title, description: desc, day_of_week: day, time_slot: time });
    if (error) toast.error(error.message);
    else { toast.success('Kurz přidán'); setTitle(''); setDesc(''); setDay(''); setTime(''); setShowForm(false); load(); }
  };

  return (
    <AppLayout searchLabel="Najít kurz" searchPlaceholder="např. logika, kreslení" searchTags={['oblíbené', 'nové', 'doporučené']} onSearch={setSearch}>
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          <article className="feature-card grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 animate-float-in">
            <div>
              <h2 className="mt-0 text-[22px]">Kurzy pro všechny typy studentů</h2>
              <p>Vyber si podle tématu, času nebo obtížnosti.</p>
              <p className="text-muted-foreground">Aktuálně otevřeno {courses.length} kurzů.</p>
            </div>
            <div className="grid place-items-center"><div className="poster-gradient" /></div>
          </article>

          {isStaff && (
            <div className="panel-card animate-slide-up stagger-1">
              <button className="btn-alik-primary text-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Zrušit' : '+ Přidat kurz'}</button>
              {showForm && (
                <form onSubmit={handleAdd} className="grid gap-2 mt-3">
                  <input placeholder="Název kurzu" value={title} onChange={e => setTitle(e.target.value)} required className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                  <textarea placeholder="Popis" value={desc} onChange={e => setDesc(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[60px] focus:border-secondary transition-colors" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Den (Po, Út...)" value={day} onChange={e => setDay(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                    <input placeholder="Čas (15:00)" value={time} onChange={e => setTime(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                  </div>
                  <button type="submit" className="btn-alik-accent text-sm">Uložit</button>
                </form>
              )}
            </div>
          )}

          <div className="catalog-card animate-slide-up stagger-2">
            <h3 className="mt-0 mb-2.5">Nejoblíbenější kurzy</h3>
            <div className="grid gap-2.5">
              {filtered.map(c => (
                <Link key={c.id} to={`/kurzy/${c.id}`} className="catalog-item-card no-underline text-foreground hover:shadow-sm transition-all duration-200">
                  <div>
                    <strong>{c.title}</strong>
                    {c.lektor_id && lektorNames[c.lektor_id] && (
                      <span className="block text-xs text-muted-foreground">👨‍🏫 {nameWithRole(lektorNames[c.lektor_id], lektorRoles[c.lektor_id])}</span>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-xs" style={{ color: 'hsl(var(--ring))' }}>{c.day_of_week} {c.time_slot} →</span>
                </Link>
              ))}
              {filtered.length === 0 && <p className="text-muted-foreground text-sm">Žádné kurzy k zobrazení.</p>}
            </div>
          </div>
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card animate-slide-up stagger-3">
            <h4 className="mt-0">Doporučení</h4>
            <ul className="pl-4 text-sm"><li>Začni lehčími kurzy</li><li>Vyber si 2–3 hlavní směry</li><li>Nezapomeň na odpočinek</li></ul>
          </div>
        </aside>
      </main>
    </AppLayout>
  );
}
