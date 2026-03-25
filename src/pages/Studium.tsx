import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Plan { id: string; title: string; description: string | null; due_date: string | null; is_completed: boolean | null; }

export default function Studium() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('study_plans').select('*').eq('user_id', user.id).order('sort_order');
    if (data) setPlans(data);
  };
  useEffect(() => { load(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('study_plans').insert({ user_id: user.id, title, description: desc, due_date: dueDate || null });
    if (error) toast.error(error.message);
    else { toast.success('Cíl přidán'); setTitle(''); setDesc(''); setDueDate(''); setShowForm(false); load(); }
  };

  const toggleComplete = async (plan: Plan) => {
    await supabase.from('study_plans').update({ is_completed: !plan.is_completed }).eq('id', plan.id);
    load();
  };

  return (
    <AppLayout searchLabel="Najít v plánu" searchPlaceholder="např. úkoly, milníky" searchTags={['cíle', 'milníky', 'projekty']}>
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          <article className="feature-card grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 animate-float-in">
            <div>
              <h2 className="mt-0 text-[22px]">Studijní plán na míru</h2>
              <p>Postupuj krok za krokem a sleduj svůj pokrok.</p>
              <p className="text-muted-foreground">Cílů: {plans.length} | Splněno: {plans.filter(p => p.is_completed).length}</p>
            </div>
            <div className="grid place-items-center"><div className="poster-gradient" /></div>
          </article>

          <div className="panel-card">
            <button className="btn-alik-primary text-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Zrušit' : '+ Přidat cíl'}</button>
            {showForm && (
              <form onSubmit={handleAdd} className="grid gap-2 mt-3">
                <input placeholder="Název cíle" value={title} onChange={e => setTitle(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                <textarea placeholder="Popis" value={desc} onChange={e => setDesc(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none min-h-[60px]" />
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                <button type="submit" className="btn-alik-accent text-sm">Uložit</button>
              </form>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <article className="panel-card">
              <h3 className="mt-0 mb-2">Moje cíle</h3>
              <ul className="pl-4 text-sm">
                {plans.filter(p => !p.is_completed).map(p => (
                  <li key={p.id} className="cursor-pointer hover:text-primary" onClick={() => toggleComplete(p)}>{p.title}</li>
                ))}
                {plans.filter(p => !p.is_completed).length === 0 && <li className="text-muted-foreground">Všechny cíle splněny!</li>}
              </ul>
            </article>
            <article className="panel-card">
              <h3 className="mt-0 mb-2">Splněné</h3>
              <ul className="pl-4 text-sm">
                {plans.filter(p => p.is_completed).map(p => (
                  <li key={p.id} className="line-through text-muted-foreground cursor-pointer" onClick={() => toggleComplete(p)}>{p.title}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card">
            <h4 className="mt-0">Tipy ke studiu</h4>
            <ul className="pl-4 text-sm"><li>Uč se po kratších blocích</li><li>Piš si poznámky</li><li>Požádej o pomoc včas</li></ul>
          </div>
          <button className="btn-alik-accent">Upravit plán</button>
        </aside>
      </main>
    </AppLayout>
  );
}
