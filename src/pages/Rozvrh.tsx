import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ScheduleItem { id: string; title: string; day_of_week: string; time_slot: string; room: string | null; }

export default function Rozvrh() {
  const { user, isStaff } = useAuth();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [room, setRoom] = useState('');

  const load = async () => {
    const { data } = await supabase.from('schedule_items').select('*').order('day_of_week');
    if (data) setItems(data);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('schedule_items').insert({ title, day_of_week: day, time_slot: time, room: room || null });
    if (error) toast.error(error.message);
    else { toast.success('Přidáno do rozvrhu'); setTitle(''); setDay(''); setTime(''); setRoom(''); setShowForm(false); load(); }
  };

  return (
    <AppLayout searchLabel="Najít blok v rozvrhu" searchPlaceholder="např. animace, sport" searchTags={['dnes', 'tento týden', 'můj plán']}>
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          <article className="feature-card grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 animate-float-in">
            <div>
              <h2 className="mt-0 text-[22px]">Tvůj týdenní rozvrh</h2>
              <p>Jasně, přehledně a bez stresu.</p>
              <p className="text-muted-foreground">Další hodina začíná brzy.</p>
            </div>
            <div className="grid place-items-center"><div className="poster-gradient" /></div>
          </article>

          {isStaff && (
            <div className="panel-card">
              <button className="btn-alik-primary text-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Zrušit' : '+ Přidat do rozvrhu'}</button>
              {showForm && (
                <form onSubmit={handleAdd} className="grid gap-2 mt-3">
                  <input placeholder="Název" value={title} onChange={e => setTitle(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                  <div className="grid grid-cols-3 gap-2">
                    <input placeholder="Den" value={day} onChange={e => setDay(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                    <input placeholder="Čas" value={time} onChange={e => setTime(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                    <input placeholder="Místnost" value={room} onChange={e => setRoom(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                  </div>
                  <button type="submit" className="btn-alik-accent text-sm">Uložit</button>
                </form>
              )}
            </div>
          )}

          <div className="panel-card">
            <h3 className="mt-0 mb-2.5">Rozvrh na tento týden</h3>
            <div className="grid gap-2.5">
              {items.map(item => (
                <div key={item.id} className="schedule-item-card">
                  <strong>{item.title}</strong>
                  <span style={{ color: '#3b547a', whiteSpace: 'nowrap' }}>{item.day_of_week} {item.time_slot}</span>
                </div>
              ))}
              {items.length === 0 && <p className="text-muted-foreground text-sm">Rozvrh je prázdný.</p>}
            </div>
          </div>
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card">
            <h4 className="mt-0">Tipy</h4>
            <ul className="pl-4 text-sm"><li>Nechej si 15 minut rezervu</li><li>Vyber si klidnou místnost</li><li>Připrav si pomůcky</li></ul>
          </div>
          <button className="btn-alik-accent">Upravit rozvrh</button>
        </aside>
      </main>
    </AppLayout>
  );
}
