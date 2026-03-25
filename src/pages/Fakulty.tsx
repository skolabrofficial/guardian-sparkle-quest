import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Faculty { id: string; name: string; description: string | null; color: string | null; }

export default function Fakulty() {
  const { user, isStaff } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const load = async () => {
    const { data } = await supabase.from('faculties').select('*').order('sort_order');
    if (data) setFaculties(data);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('faculties').insert({ name, description: desc });
    if (error) toast.error(error.message);
    else { toast.success('Fakulta přidána'); setName(''); setDesc(''); setShowForm(false); load(); }
  };

  return (
    <AppLayout searchLabel="Najít fakultu nebo obor" searchPlaceholder="např. umění, vědy, sport" searchTags={['fakulty', 'obory', 'kurzy']}>
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          <article className="feature-card grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 animate-float-in">
            <div>
              <h2 className="mt-0 text-[22px]">Fakulty a obory podle zájmů</h2>
              <p>Vyber si fakultu, která tě baví, a podívej se na doporučené kurzy a projekty.</p>
              <p className="text-muted-foreground">Aktuálně otevřeno {faculties.length} fakult.</p>
            </div>
            <div className="grid place-items-center"><div className="poster-gradient" /></div>
          </article>

          {isStaff && (
            <div className="panel-card">
              <button className="btn-alik-primary text-sm" onClick={() => setShowForm(!showForm)}>
                {showForm ? 'Zrušit' : '+ Přidat fakultu'}
              </button>
              {showForm && (
                <form onSubmit={handleAdd} className="grid gap-2 mt-3">
                  <input placeholder="Název fakulty" value={name} onChange={e => setName(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                  <textarea placeholder="Popis" value={desc} onChange={e => setDesc(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none min-h-[80px]" />
                  <button type="submit" className="btn-alik-accent text-sm">Uložit</button>
                </form>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {faculties.map(f => (
              <article key={f.id} className="panel-card">
                <h3 className="mt-0 mb-2">{f.name}</h3>
                {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
                <button className="btn-alik-outline text-sm mt-2">Zobrazit kurzy</button>
              </article>
            ))}
            {faculties.length === 0 && <p className="text-muted-foreground col-span-2">Zatím žádné fakulty. Přidejte první!</p>}
          </div>
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card">
            <h4 className="mt-0">Tip pro výběr</h4>
            <ul className="pl-4 text-sm"><li>Začni tím, co tě nejvíc baví</li><li>Zkus si kurz na zkoušku</li><li>Kdykoli můžeš přejít jinam</li></ul>
          </div>
          <button className="btn-alik-accent">Chci si vybrat fakultu</button>
        </aside>
      </main>
    </AppLayout>
  );
}
