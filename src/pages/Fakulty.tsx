import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Faculty { id: string; name: string; description: string | null; color: string | null; dean_id: string | null; }

export default function Fakulty() {
  const { user, isStaff, isDeveloper } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [lektors, setLektors] = useState<{ user_id: string; display_name: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [assignDeanFacultyId, setAssignDeanFacultyId] = useState<string | null>(null);
  const [selectedDean, setSelectedDean] = useState('');

  const load = async () => {
    const [fRes, pRes, rRes] = await Promise.all([
      supabase.from('faculties').select('*').order('sort_order'),
      supabase.from('profiles').select('user_id, display_name'),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    if (fRes.data) setFaculties(fRes.data);
    if (pRes.data) {
      const map: Record<string, string> = {};
      pRes.data.forEach(p => { map[p.user_id] = p.display_name; });
      setProfiles(map);
      // Lektors = anyone who is lektor, dohledci or developer
      if (rRes.data) {
        const staffIds = rRes.data.filter(r => ['lektor', 'dohledci', 'developer'].includes(r.role)).map(r => r.user_id);
        setLektors(pRes.data.filter(p => staffIds.includes(p.user_id)));
      }
    }
  };
  useEffect(() => { if (user) load(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('faculties').insert({ name, description: desc });
    if (error) toast.error(error.message);
    else { toast.success('Fakulta přidána'); setName(''); setDesc(''); setShowForm(false); load(); }
  };

  const assignDean = async () => {
    if (!assignDeanFacultyId || !selectedDean) return;
    const { error } = await supabase.from('faculties').update({ dean_id: selectedDean }).eq('id', assignDeanFacultyId);
    if (error) toast.error(error.message);
    else { toast.success('Děkan přiřazen'); setAssignDeanFacultyId(null); setSelectedDean(''); load(); }
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
                <h3 className="mt-0 mb-1">{f.name}</h3>
                {f.description && <p className="text-sm text-muted-foreground mb-2">{f.description}</p>}
                {f.dean_id && (
                  <p className="text-xs font-bold mb-2" style={{ color: '#8b6914' }}>
                    🎓 Děkan: {profiles[f.dean_id] || '—'}
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button className="btn-alik-outline text-sm">Zobrazit kurzy</button>
                  {isDeveloper && (
                    <button className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#fff8e0', color: '#8b6914' }} onClick={() => { setAssignDeanFacultyId(f.id); setSelectedDean(f.dean_id || ''); }}>
                      {f.dean_id ? 'Změnit děkana' : 'Přiřadit děkana'}
                    </button>
                  )}
                </div>
                {assignDeanFacultyId === f.id && (
                  <div className="grid gap-2 mt-3 p-2 rounded-lg" style={{ background: '#fffbe8' }}>
                    <select value={selectedDean} onChange={e => setSelectedDean(e.target.value)} className="border-2 border-yellow-200 rounded-xl py-2 px-3 text-sm outline-none">
                      <option value="">Vyberte děkana</option>
                      {lektors.map(l => <option key={l.user_id} value={l.user_id}>{l.display_name}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={assignDean} className="btn-alik-primary text-xs">Přiřadit</button>
                      <button onClick={() => setAssignDeanFacultyId(null)} className="btn-alik-outline text-xs">Zrušit</button>
                    </div>
                  </div>
                )}
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
        </aside>
      </main>
    </AppLayout>
  );
}
