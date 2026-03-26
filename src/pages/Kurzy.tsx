import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Course { id: string; title: string; description: string | null; day_of_week: string | null; time_slot: string | null; difficulty: string | null; is_active: boolean | null; }

export default function Kurzy() {
  const { user, isStaff } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');

  const load = async () => {
    const { data } = await supabase.from('courses').select('*').eq('is_active', true).order('title');
    if (data) setCourses(data);
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
            <div className="panel-card">
              <button className="btn-alik-primary text-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Zrušit' : '+ Přidat kurz'}</button>
              {showForm && (
                <form onSubmit={handleAdd} className="grid gap-2 mt-3">
                  <input placeholder="Název kurzu" value={title} onChange={e => setTitle(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                  <textarea placeholder="Popis" value={desc} onChange={e => setDesc(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none min-h-[60px]" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Den (Po, Út...)" value={day} onChange={e => setDay(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                    <input placeholder="Čas (15:00)" value={time} onChange={e => setTime(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                  </div>
                  <button type="submit" className="btn-alik-accent text-sm">Uložit</button>
                </form>
              )}
            </div>
          )}

          <div className="catalog-card">
            <h3 className="mt-0 mb-2.5">Nejoblíbenější kurzy</h3>
            <div className="grid gap-2.5">
              {filtered.map(c => (
                <Link key={c.id} to={`/kurzy/${c.id}`} className="catalog-item-card no-underline text-foreground hover:bg-blue-50 transition-colors">
                  <strong>{c.title}</strong>
                  <span style={{ color: '#345b8b', whiteSpace: 'nowrap' }}>{c.day_of_week} {c.time_slot} →</span>
                </Link>
              ))}
              {filtered.length === 0 && <p className="text-muted-foreground text-sm">Žádné kurzy k zobrazení.</p>}
            </div>
          </div>
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card">
            <h4 className="mt-0">Doporučení</h4>
            <ul className="pl-4 text-sm"><li>Začni lehčími kurzy</li><li>Vyber si 2–3 hlavní směry</li><li>Nezapomeň na odpočinek</li></ul>
          </div>
        </aside>
      </main>
    </AppLayout>
  );
}
