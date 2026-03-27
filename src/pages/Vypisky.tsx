import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { nameWithRole } from '@/lib/roleUtils';

interface Note { id: string; title: string; content: string | null; is_public: boolean | null; created_at: string; user_id: string; }

export default function Vypisky() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('study_notes').select('*').order('created_at', { ascending: false });
    if (data) {
      setNotes(data);
      const ids = [...new Set(data.map(n => n.user_id))];
      if (ids.length > 0) {
        const [pRes, rRes] = await Promise.all([
          supabase.from('profiles').select('user_id, display_name').in('user_id', ids),
          supabase.from('user_roles').select('user_id, role').in('user_id', ids),
        ]);
        if (pRes.data) {
          const m: Record<string, string> = {};
          pRes.data.forEach(p => { m[p.user_id] = p.display_name; });
          setProfiles(m);
        }
        if (rRes.data) {
          const m: Record<string, string> = {};
          rRes.data.forEach(r => { m[r.user_id] = r.role; });
          setUserRoles(m);
        }
      }
    }
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

          <div className="panel-card animate-slide-up stagger-1">
            <button className="btn-alik-primary text-sm" onClick={() => setShowForm(!showForm)}>{showForm ? 'Zrušit' : '+ Nahrát výpisky'}</button>
            {showForm && (
              <form onSubmit={handleAdd} className="grid gap-2 mt-3">
                <input placeholder="Název" value={title} onChange={e => setTitle(e.target.value)} required className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                <textarea placeholder="Obsah výpisků... (podporuje Markdown a $\LaTeX$)" value={content} onChange={e => setContent(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[120px] font-mono focus:border-secondary transition-colors" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} /> Veřejné výpisky</label>
                <button type="submit" className="btn-alik-accent text-sm">Uložit</button>
              </form>
            )}
          </div>

          <div className="catalog-card animate-slide-up stagger-2">
            <h3 className="mt-0 mb-2.5">Nejnovější výpisky</h3>
            <div className="grid gap-2.5">
              {notes.map(n => (
                <div key={n.id} className="catalog-item-card flex-col hover:shadow-sm transition-all duration-200">
                  <div className="flex justify-between w-full items-center">
                    <div>
                      <strong>{n.title}</strong>
                      <span className="block text-xs text-muted-foreground">{nameWithRole(profiles[n.user_id] || 'Uživatel', userRoles[n.user_id])}</span>
                    </div>
                    <span className="text-xs whitespace-nowrap" style={{ color: 'hsl(var(--ring))' }}>{n.is_public ? '🌐' : '🔒'} {new Date(n.created_at).toLocaleDateString('cs')}</span>
                  </div>
                  {n.content && <div className="mt-1 w-full"><MarkdownRenderer content={n.content} className="text-xs" /></div>}
                </div>
              ))}
              {notes.length === 0 && <p className="text-muted-foreground text-sm">Zatím žádné výpisky.</p>}
            </div>
          </div>
        </div>

        <aside className="grid gap-[18px]">
          <div className="panel-card animate-slide-up stagger-3">
            <h4 className="mt-0">Tipy na výpisky</h4>
            <ul className="pl-4 text-sm"><li>Piš si klíčová slova</li><li>Používej barvy</li><li>Doplň si obrázky</li></ul>
          </div>
          <button className="btn-alik-accent" onClick={() => setShowForm(true)}>Nahrát výpisky</button>
        </aside>
      </main>
    </AppLayout>
  );
}
