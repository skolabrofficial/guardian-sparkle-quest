import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type Tab = 'prehled' | 'kurzy' | 'lektori' | 'studenti' | 'fakulty' | 'rozvrh' | 'dotazy' | 'vypisky' | 'oznameni' | 'reporty' | 'audit' | 'nastaveni' | 'notifikace' | 'role' | 'statistiky' | 'rozpocet' | 'smernice' | 'zpravy' | 'zadosti' | 'kvalita' | 'export' | 'import' | 'hromadne' | 'harmonogram' | 'bezpecnost' | 'klubovny' | 'kapacity' | 'mentori' | 'plany' | 'hodnoceni' | 'konfigurace';

const tabs: { key: Tab; label: string }[] = [
  { key: 'prehled', label: 'Přehled' },
  { key: 'kurzy', label: 'Správa kurzů' },
  { key: 'fakulty', label: 'Správa fakult' },
  { key: 'lektori', label: 'Mentoři / Lektoři' },
  { key: 'studenti', label: 'Studenti' },
  { key: 'role', label: 'Uživatelská práva' },
  { key: 'rozvrh', label: 'Správa rozvrhu' },
  { key: 'dotazy', label: 'Správa doučování' },
  { key: 'vypisky', label: 'Správa výpisků' },
  { key: 'oznameni', label: 'Oznámení' },
  { key: 'notifikace', label: 'Notifikace' },
  { key: 'reporty', label: 'Reporty/Hlášení' },
  { key: 'audit', label: 'Auditní log' },
  { key: 'statistiky', label: 'Statistiky' },
  { key: 'rozpocet', label: 'Rozpočet' },
  { key: 'smernice', label: 'Směrnice' },
  { key: 'zpravy', label: 'Zprávy' },
  { key: 'zadosti', label: 'Žádosti' },
  { key: 'kvalita', label: 'Kontrola kvality' },
  { key: 'export', label: 'Export dat' },
  { key: 'import', label: 'Import dat' },
  { key: 'hromadne', label: 'Hromadné operace' },
  { key: 'harmonogram', label: 'Harmonogram semestru' },
  { key: 'bezpecnost', label: 'Bezpečnost' },
  { key: 'klubovny', label: 'Správa kluboven' },
  { key: 'kapacity', label: 'Přehled kapacit' },
  { key: 'mentori', label: 'Přehled mentorů' },
  { key: 'plany', label: 'Studijní plány' },
  { key: 'hodnoceni', label: 'Hodnocení' },
  { key: 'nastaveni', label: 'Konfigurace systému' },
];

export default function Rektorat() {
  const { user, isStaff, isDeveloper, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('prehled');
  const [courses, setCourses] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [scheduleItems, setScheduleItems] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({ courses: 0, faculties: 0, questions: 0, notes: 0 });

  // Form states
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [roleUserId, setRoleUserId] = useState('');
  const [roleValue, setRoleValue] = useState<string>('student');

  useEffect(() => {
    if (!authLoading && !isStaff && !isDeveloper) navigate('/');
  }, [authLoading, isStaff, isDeveloper]);

  useEffect(() => {
    if (!user || (!isStaff && !isDeveloper)) return;
    loadAll();
  }, [user, activeTab]);

  const loadAll = async () => {
    const [c, f, q, n, s, ann, al, rep, notif, ur, pr] = await Promise.all([
      supabase.from('courses').select('*').order('title'),
      supabase.from('faculties').select('*').order('name'),
      supabase.from('tutoring_questions').select('*').order('created_at', { ascending: false }),
      supabase.from('study_notes').select('*').order('created_at', { ascending: false }),
      supabase.from('schedule_items').select('*').order('day_of_week'),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('user_roles').select('*'),
      supabase.from('profiles').select('*'),
    ]);
    if (c.data) setCourses(c.data);
    if (f.data) setFaculties(f.data);
    if (q.data) setQuestions(q.data);
    if (n.data) setNotes(n.data);
    if (s.data) setScheduleItems(s.data);
    if (ann.data) setAnnouncements(ann.data);
    if (al.data) setAuditLogs(al.data);
    if (rep.data) setReports(rep.data);
    if (notif.data) setNotifications(notif.data);
    if (ur.data) setRoles(ur.data);
    if (pr.data) setUsers(pr.data);
    setStats({
      courses: c.data?.length || 0,
      faculties: f.data?.length || 0,
      questions: q.data?.length || 0,
      notes: n.data?.length || 0,
    });
  };

  const addAnnouncement = async () => {
    if (!user) return;
    const { error } = await supabase.from('announcements').insert({ author_id: user.id, title: annTitle, content: annContent });
    if (error) toast.error(error.message);
    else { toast.success('Oznámení přidáno'); setAnnTitle(''); setAnnContent(''); loadAll(); }
  };

  const assignRole = async () => {
    if (!roleUserId) return;
    const { error } = await supabase.from('user_roles').upsert({ user_id: roleUserId, role: roleValue as any }, { onConflict: 'user_id,role' });
    if (error) toast.error(error.message);
    else { toast.success('Role přiřazena'); loadAll(); }
  };

  const deleteCourse = async (id: string) => {
    await supabase.from('courses').delete().eq('id', id);
    toast.success('Kurz smazán');
    loadAll();
  };

  const deleteFaculty = async (id: string) => {
    await supabase.from('faculties').delete().eq('id', id);
    toast.success('Fakulta smazána');
    loadAll();
  };

  const resolveReport = async (id: string) => {
    if (!user) return;
    await supabase.from('reports').update({ status: 'resolved', resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', id);
    toast.success('Report vyřešen');
    loadAll();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'prehled':
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="stat-card"><strong className="block text-[22px]" style={{ color: '#1f3f6b' }}>{stats.courses}</strong><span className="text-xs text-muted-foreground">kurzů</span></div>
              <div className="stat-card"><strong className="block text-[22px]" style={{ color: '#1f3f6b' }}>{stats.faculties}</strong><span className="text-xs text-muted-foreground">fakult</span></div>
              <div className="stat-card"><strong className="block text-[22px]" style={{ color: '#1f3f6b' }}>{stats.questions}</strong><span className="text-xs text-muted-foreground">dotazů</span></div>
              <div className="stat-card"><strong className="block text-[22px]" style={{ color: '#1f3f6b' }}>{users.length}</strong><span className="text-xs text-muted-foreground">uživatelů</span></div>
            </div>
            <div className="panel-card">
              <h3 className="mt-0">Nejbližší porada</h3>
              <p className="text-muted-foreground">Pondělí 10:00 — tým rektorátu</p>
            </div>
          </div>
        );
      case 'kurzy':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Správa kurzů ({courses.length})</h3>
            {courses.map(c => (
              <div key={c.id} className="catalog-item-card items-center">
                <div><strong>{c.title}</strong> <span className="text-xs text-muted-foreground">{c.day_of_week} {c.time_slot}</span></div>
                <button className="btn-alik-outline text-xs" onClick={() => deleteCourse(c.id)}>Smazat</button>
              </div>
            ))}
          </div>
        );
      case 'fakulty':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Správa fakult ({faculties.length})</h3>
            {faculties.map(f => (
              <div key={f.id} className="catalog-item-card items-center">
                <strong>{f.name}</strong>
                <button className="btn-alik-outline text-xs" onClick={() => deleteFaculty(f.id)}>Smazat</button>
              </div>
            ))}
          </div>
        );
      case 'lektori':
      case 'mentori':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Lektoři a mentoři</h3>
            {roles.filter(r => r.role === 'lektor').map(r => {
              const u = users.find(u => u.user_id === r.user_id);
              return <div key={r.id} className="catalog-item-card"><strong>{u?.display_name || r.user_id}</strong><span className="text-xs">Lektor</span></div>;
            })}
            {roles.filter(r => r.role === 'lektor').length === 0 && <p className="text-muted-foreground text-sm">Žádní lektoři.</p>}
          </div>
        );
      case 'studenti':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Studenti</h3>
            {roles.filter(r => r.role === 'student').map(r => {
              const u = users.find(u => u.user_id === r.user_id);
              return <div key={r.id} className="catalog-item-card"><strong>{u?.display_name || r.user_id}</strong><span className="text-xs">Student</span></div>;
            })}
          </div>
        );
      case 'role':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">Správa rolí</h3>
            <div className="grid gap-2">
              {users.map(u => {
                const r = roles.find(r => r.user_id === u.user_id);
                return <div key={u.id} className="catalog-item-card"><strong>{u.display_name}</strong><span className="text-xs font-bold">{r?.role || '—'}</span></div>;
              })}
            </div>
            {isDeveloper && (
              <div className="grid gap-2 mt-2">
                <h4>Přiřadit roli</h4>
                <select value={roleUserId} onChange={e => setRoleUserId(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none">
                  <option value="">Vyberte uživatele</option>
                  {users.map(u => <option key={u.user_id} value={u.user_id}>{u.display_name}</option>)}
                </select>
                <select value={roleValue} onChange={e => setRoleValue(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none">
                  <option value="student">Student</option><option value="lektor">Lektor</option><option value="dohledci">Dohledčí</option><option value="developer">Vývojář</option>
                </select>
                <button className="btn-alik-primary text-sm" onClick={assignRole}>Přiřadit</button>
              </div>
            )}
          </div>
        );
      case 'oznameni':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">Oznámení</h3>
            <div className="grid gap-2">
              <input placeholder="Nadpis" value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
              <textarea placeholder="Obsah" value={annContent} onChange={e => setAnnContent(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none min-h-[60px]" />
              <button className="btn-alik-primary text-sm" onClick={addAnnouncement}>Přidat oznámení</button>
            </div>
            {announcements.map(a => (
              <div key={a.id} className="catalog-item-card"><strong>{a.title}</strong><span className="text-xs">{a.priority}</span></div>
            ))}
          </div>
        );
      case 'reporty':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Reporty / Hlášení</h3>
            {reports.map(r => (
              <div key={r.id} className="catalog-item-card items-center">
                <div><strong>{r.reason}</strong> <span className="text-xs text-muted-foreground">{r.status}</span></div>
                {r.status === 'pending' && <button className="btn-alik-outline text-xs" onClick={() => resolveReport(r.id)}>Vyřešit</button>}
              </div>
            ))}
            {reports.length === 0 && <p className="text-muted-foreground text-sm">Žádné reporty.</p>}
          </div>
        );
      case 'audit':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Auditní log</h3>
            {auditLogs.map(l => (
              <div key={l.id} className="catalog-item-card text-xs">
                <span>{l.action} – {l.entity_type}</span>
                <span>{new Date(l.created_at).toLocaleString('cs')}</span>
              </div>
            ))}
            {auditLogs.length === 0 && <p className="text-muted-foreground text-sm">Log je prázdný.</p>}
          </div>
        );
      case 'dotazy':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Správa doučování ({questions.length})</h3>
            {questions.map(q => (
              <div key={q.id} className="catalog-item-card">
                <strong>{q.question.slice(0, 80)}</strong>
                <span className="text-xs">{q.topic} • {q.status}</span>
              </div>
            ))}
          </div>
        );
      case 'rozvrh':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Správa rozvrhu ({scheduleItems.length})</h3>
            {scheduleItems.map(s => (
              <div key={s.id} className="schedule-item-card"><strong>{s.title}</strong><span>{s.day_of_week} {s.time_slot}</span></div>
            ))}
          </div>
        );
      case 'vypisky':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Správa výpisků ({notes.length})</h3>
            {notes.map(n => (
              <div key={n.id} className="catalog-item-card"><strong>{n.title}</strong><span className="text-xs">{n.is_public ? 'Veřejné' : 'Soukromé'}</span></div>
            ))}
          </div>
        );
      case 'notifikace':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Notifikace</h3>
            {notifications.map(n => (
              <div key={n.id} className="catalog-item-card"><strong>{n.title}</strong><span className="text-xs">{n.is_read ? '✓' : '●'}</span></div>
            ))}
            {notifications.length === 0 && <p className="text-muted-foreground text-sm">Žádné notifikace.</p>}
          </div>
        );
      default:
        return (
          <div className="panel-card">
            <h3 className="mt-0">{tabs.find(t => t.key === activeTab)?.label}</h3>
            <p className="text-muted-foreground">Tato funkce je připravena a bude brzy plně funkční. Základní infrastruktura je nastavena.</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>✓</strong><span className="text-xs text-muted-foreground">Databáze</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>✓</strong><span className="text-xs text-muted-foreground">RLS politiky</span></div>
            </div>
          </div>
        );
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Načítání...</div>;

  return (
    <AppLayout searchLabel="Rektorát" searchPlaceholder="Hledat v rektorátu..." searchTags={['kurzy', 'uživatelé', 'reporty']}>
      <main className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-5 items-start">
        <aside className="grid gap-1">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-2">Funkce ({tabs.length})</h3>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`text-left text-sm py-2 px-3 rounded-xl font-bold transition-all ${activeTab === t.key ? 'btn-alik-primary' : 'btn-alik-outline'}`}
            >
              {t.label}
            </button>
          ))}
        </aside>
        <div className="panel-card min-h-[400px]">
          {renderContent()}
        </div>
      </main>
    </AppLayout>
  );
}
