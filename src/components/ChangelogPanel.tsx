import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import UserLink from '@/components/UserLink';

interface Entry {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  author_id: string;
  created_at: string;
}

const CATEGORIES = [
  { v: 'feature', l: '✨ Nová funkce' },
  { v: 'fix', l: '🐛 Oprava' },
  { v: 'design', l: '🎨 Design' },
  { v: 'security', l: '🛡 Bezpečnost' },
  { v: 'policy', l: '📜 Pravidla' },
  { v: 'infra', l: '⚙ Infrastruktura' },
  { v: 'other', l: '📝 Jiné' },
];

const SEVERITIES = [
  { v: 'minor', l: 'Drobnost', color: '#6b7280' },
  { v: 'normal', l: 'Běžná', color: '#2563eb' },
  { v: 'major', l: 'Důležitá', color: '#d97706' },
  { v: 'critical', l: 'Kritická', color: '#dc2626' },
];

export default function ChangelogPanel() {
  const { user, isDeveloper } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [authors, setAuthors] = useState<Record<string, { display_name: string; username: string; role: string | null }>>({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('feature');
  const [severity, setSeverity] = useState('normal');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const load = async () => {
    const { data, error } = await supabase.from('changelog_entries').select('*').order('created_at', { ascending: false });
    if (error) { toast.error(error.message); return; }
    setEntries(data || []);
    const ids = [...new Set((data || []).map(e => e.author_id))];
    if (ids.length) {
      const [pr, rr] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name, username').in('user_id', ids),
        supabase.from('user_roles').select('user_id, role').in('user_id', ids),
      ]);
      const map: Record<string, any> = {};
      (pr.data || []).forEach((p: any) => { map[p.user_id] = { display_name: p.display_name, username: p.username, role: null }; });
      (rr.data || []).forEach((r: any) => { if (map[r.user_id]) map[r.user_id].role = r.role; });
      setAuthors(map);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user || !title.trim()) return;
    const { error } = await supabase.from('changelog_entries').insert({
      title: title.trim(), description, category, severity, author_id: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Záznam přidán');
    setTitle(''); setDescription(''); setCategory('feature'); setSeverity('normal');
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Smazat záznam?')) return;
    const { error } = await supabase.from('changelog_entries').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Smazáno'); load(); }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase.from('changelog_entries').update({ title: editTitle, description: editDesc }).eq('id', editingId);
    if (error) toast.error(error.message); else { toast.success('Uloženo'); setEditingId(null); load(); }
  };

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="mt-0 text-xl font-extrabold mb-1">📋 Změnář</h3>
        <p className="text-sm text-muted-foreground">Evidence větších změn na webu. {isDeveloper ? 'Vývojáři přidávají, ostatní s přístupem do rektorátu jen čtou.' : 'Pouze ke čtení.'}</p>
      </div>

      {isDeveloper && (
        <div className="panel-card border-l-4 border-primary">
          <h4 className="mt-0 text-sm font-extrabold mb-2">➕ Nový záznam</h4>
          <div className="grid gap-2">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Stručný nadpis změny..." className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-primary transition-colors" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Podrobný popis (Markdown)..." className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[100px] font-mono focus:border-primary transition-colors" />
            <div className="grid grid-cols-2 gap-2">
              <select value={category} onChange={e => setCategory(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                {CATEGORIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                {SEVERITIES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
            <button onClick={create} className="btn-alik-primary text-xs w-fit">📋 Přidat změnu</button>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <h4 className="mt-0 text-sm font-extrabold">Historie změn ({entries.length})</h4>
        {entries.length === 0 && <p className="text-sm text-muted-foreground">Zatím žádné záznamy.</p>}
        {entries.map(e => {
          const cat = CATEGORIES.find(c => c.v === e.category);
          const sev = SEVERITIES.find(s => s.v === e.severity) || SEVERITIES[1];
          const author = authors[e.author_id];
          const isEditing = editingId === e.id;
          return (
            <div key={e.id} className="catalog-item-card flex-col gap-2" style={{ borderLeft: `4px solid ${sev.color}` }}>
              <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: sev.color + '20', color: sev.color }}>{sev.l}</span>
                  <span className="text-xs font-bold text-muted-foreground">{cat?.l || e.category}</span>
                  <strong className="text-sm">{e.title}</strong>
                </div>
                {isDeveloper && (
                  <div className="flex gap-1.5">
                    <button onClick={() => { if (isEditing) setEditingId(null); else { setEditingId(e.id); setEditTitle(e.title); setEditDesc(e.description); } }} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#fef3c7', color: '#92400e' }}>✏</button>
                    <button onClick={() => remove(e.id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#fde8e8', color: '#991b1b' }}>🗑</button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="w-full grid gap-2">
                  <input value={editTitle} onChange={ev => setEditTitle(ev.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none" />
                  <textarea value={editDesc} onChange={ev => setEditDesc(ev.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[80px] font-mono" />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="btn-alik-primary text-xs">💾 Uložit</button>
                    <button onClick={() => setEditingId(null)} className="btn-alik-outline text-xs">Zrušit</button>
                  </div>
                </div>
              ) : (
                e.description && <div className="text-sm w-full"><MarkdownRenderer content={e.description} /></div>
              )}
              <div className="text-xs text-muted-foreground flex items-center gap-2 w-full">
                <span>📅 {new Date(e.created_at).toLocaleString('cs')}</span>
                <span>•</span>
                <span>👤 <UserLink userId={e.author_id} username={author?.username} displayName={author?.display_name} role={author?.role} /></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
