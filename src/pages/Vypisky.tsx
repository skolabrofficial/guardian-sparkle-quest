import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Note { id: string; title: string; content: string | null; is_public: boolean | null; created_at: string; }

export default function Vypisky() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('study_notes').select('*').order('created_at', { ascending: false });
    if (data) setNotes(data);
  };
  useEffect(() => { load(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('study_notes').insert({ user_id: user.id, title, content, is_public: isPublic });
    if (error) toast.error(error.message);
    else { toast.success('Výpisky uloženy'); setTitle(''); setContent(''); setIsPublic(false); setShowForm(false); load(); }
  };

  return (
    <AppLayout searchLabel="Najít výpisky" searchPlaceholder="např. historie, fyzika" searchTags={['shrnutí', 'poznámky', 'prezentace']}>
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          <article className="feature-card grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 animate-float-in">
            <div>
              <h2 className="mt-0 text-[22px]">Výpisky, které dávají smysl</h2>
              <p>Stručné, přehledné a barevné shrnutí hodin.</p>
              <p className="text-muted-foreground">Celkem {notes.length} výpisků.</p>
            </div>
            <div className="grid place-items-center"><div className="poster-gradient" /></div>
          </article>

          <div className="panel-card">
            <button className="btn-alik-primary text-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Zrušit' : '+ Nahrát výpisky'}</button>
            {showForm && (
              <form onSubmit={handleAdd} className="grid gap-2 mt-3">
                <input placeholder="Název" value={title} onChange={e => setTitle(e.target.value)} required className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                <textarea placeholder="Obsah výpisků... (podporuje Markdown a $\LaTeX$)" value={content} onChange={e => setContent(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none min-h-[120px] font-mono" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} /> Veřejné výpisky</label>
                <button type="submit" className="btn-alik-accent text-sm">Uložit</button>
              </form>
            )}
          </div>

          <div className="catalog-card">
            <h3 className="mt-0 mb-2.5">Nejnovější výpisky</h3>
            <div className="grid gap-2.5">
              {notes.map(n => (
                <div key={n.id} className="catalog-item-card flex-col">
                  <div className="flex justify-between w-full">
                    <strong>{n.title}</strong>
                    <span style={{ color: '#345b8b', whiteSpace: 'nowrap' }}>{n.is_public ? '🌐' : '🔒'} {new Date(n.created_at).toLocaleDateString('cs')}</span>
                  </div>
                  {n.content && <div className="mt-1 w-full"><MarkdownRenderer content={n.content} className="text-xs" /></div>}
                </div>
              ))}
              {notes.length === 0 && <p className="text-muted-foreground text-sm">Zatím žádné výpisky.</p>}
            </div>
          </div>
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card">
            <h4 className="mt-0">Tipy na výpisky</h4>
            <ul className="pl-4 text-sm"><li>Piš si klíčová slova</li><li>Používej barvy</li><li>Doplň si obrázky</li></ul>
          </div>
          <button className="btn-alik-accent" onClick={() => setShowForm(true)}>Nahrát výpisky</button>
        </aside>
      </main>
    </AppLayout>
  );
}
