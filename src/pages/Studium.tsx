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

  const completedCount = plans.filter(p => p.is_completed).length;
  const progress = plans.length > 0 ? Math.round((completedCount / plans.length) * 100) : 0;

  return (
    <AppLayout searchLabel="Najít v plánu" searchPlaceholder="např. úkoly, milníky" searchTags={['cíle', 'milníky', 'projekty']}>
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          <article className="feature-card grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 animate-float-in">
            <div>
              <h2 className="mt-0 text-[22px]">Studijní plán na míru</h2>
              <p>Postupuj krok za krokem a sleduj svůj pokrok.</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm font-bold text-accent">{progress}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Cílů: {plans.length} | Splněno: {completedCount}</p>
            </div>
            <div className="grid place-items-center"><div className="poster-gradient" /></div>
          </article>

          <div className="panel-card animate-slide-up stagger-1">
            <button className="btn-alik-primary text-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Zrušit' : '+ Přidat cíl'}</button>
            {showForm && (
              <form onSubmit={handleAdd} className="grid gap-2 mt-3">
                <input placeholder="Název cíle" value={title} onChange={e => setTitle(e.target.value)} required className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                <textarea placeholder="Popis" value={desc} onChange={e => setDesc(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[60px] focus:border-secondary transition-colors" />
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                <button type="submit" className="btn-alik-accent text-sm">Uložit</button>
              </form>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <article className="panel-card animate-slide-up stagger-2">
              <h3 className="mt-0 mb-2">🎯 Moje cíle</h3>
              <div className="grid gap-1.5">
                {plans.filter(p => !p.is_completed).map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => toggleComplete(p)}>
                    <div className="w-4 h-4 rounded-md border-2 border-border flex-shrink-0" />
                    <span className="text-sm">{p.title}</span>
                    {p.due_date && <span className="text-[10px] text-muted-foreground ml-auto">{new Date(p.due_date).toLocaleDateString('cs')}</span>}
                  </div>
                ))}
                {plans.filter(p => !p.is_completed).length === 0 && <p className="text-muted-foreground text-sm">Všechny cíle splněny! 🎉</p>}
              </div>
            </article>
            <article className="panel-card animate-slide-up stagger-3">
              <h3 className="mt-0 mb-2">✅ Splněné</h3>
              <div className="grid gap-1.5">
                {plans.filter(p => p.is_completed).map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => toggleComplete(p)}>
                    <div className="w-4 h-4 rounded-md bg-accent flex-shrink-0 flex items-center justify-center text-white text-[10px]">✓</div>
                    <span className="text-sm line-through text-muted-foreground">{p.title}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card animate-slide-up stagger-4">
            <h4 className="mt-0">Tipy ke studiu</h4>
            <ul className="pl-4 text-sm"><li>Uč se po kratších blocích</li><li>Piš si poznámky</li><li>Požádej o pomoc včas</li></ul>
          </div>
        </aside>
      </main>
    </AppLayout>
  );
}
