import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ImageModeration from '@/components/ImageModeration';
import ImageUploader from '@/components/ImageUploader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { nameWithRole, getRoleSymbol, ROLE_COLORS, ROLE_LABELS } from '@/lib/roleUtils';
import ChangeHistory, { recordHistory } from '@/components/ChangeHistory';
import { invalidateProfanityCache } from '@/hooks/useProfanityFilter';
import AdminSearch from '@/components/AdminSearch';
import ChangelogPanel from '@/components/ChangelogPanel';
import UserLink from '@/components/UserLink';
import { ProtokolFromAudit } from '@/components/Protokol';

type Tab = 'prehled' | 'kurzy' | 'lektori' | 'studenti' | 'fakulty' | 'rozvrh' | 'dotazy' | 'vypisky' | 'oznameni' | 'reporty' | 'audit' | 'nastaveni' | 'notifikace' | 'role' | 'statistiky' | 'rozpocet' | 'smernice' | 'zpravy' | 'zadosti' | 'kvalita' | 'export' | 'import' | 'hromadne' | 'harmonogram' | 'bezpecnost' | 'klubovny' | 'kapacity' | 'mentori' | 'plany' | 'hodnoceni' | 'blokace' | 'forum' | 'emailove-sablony' | 'integrace' | 'obrazky' | 'odeslat-notifikaci' | 'styly-stranek' | 'obsahove-boxy' | 'filtr-slov' | 'hledani' | 'zmenar' | 'uzivatele' | 'mezirozpravy';

const tabGroups: { group: string; items: { key: Tab; label: string; icon: string }[] }[] = [
  { group: '📊 Přehled', items: [
    { key: 'prehled', label: 'Dashboard', icon: '📊' },
    { key: 'hledani', label: 'Hledání', icon: '🔍' },
    { key: 'statistiky', label: 'Statistiky', icon: '📈' },
    { key: 'kvalita', label: 'Kvalita', icon: '✅' },
  ]},
  { group: '👥 Uživatelé', items: [
    { key: 'studenti', label: 'Studenti', icon: '🎓' },
    { key: 'lektori', label: 'Lektoři', icon: '👨‍🏫' },
    { key: 'mentori', label: 'Mentoři', icon: '🤝' },
    { key: 'uzivatele', label: 'Všichni uživatelé', icon: '👥' },
    { key: 'role', label: 'Práva', icon: '🔑' },
    { key: 'blokace', label: 'Blokace', icon: '🚫' },
  ]},
  { group: '📚 Výuka', items: [
    { key: 'kurzy', label: 'Kurzy', icon: '📚' },
    { key: 'fakulty', label: 'Fakulty', icon: '🏛' },
    { key: 'rozvrh', label: 'Rozvrh', icon: '📅' },
    { key: 'dotazy', label: 'Doučování', icon: '❓' },
    { key: 'vypisky', label: 'Výpisky', icon: '📝' },
    { key: 'forum', label: 'Fórum', icon: '💬' },
    { key: 'kapacity', label: 'Kapacity', icon: '👥' },
    { key: 'plany', label: 'Plány', icon: '🗺' },
    { key: 'hodnoceni', label: 'Hodnocení', icon: '⭐' },
  ]},
  { group: '📢 Komunikace', items: [
    { key: 'oznameni', label: 'Oznámení', icon: '📢' },
    { key: 'notifikace', label: 'Přehled notifikací', icon: '🔔' },
    { key: 'odeslat-notifikaci', label: 'Odeslat notifikaci', icon: '📨' },
    { key: 'mezirozpravy', label: 'Mezirozpravy', icon: '📨' },
    { key: 'zpravy', label: 'Zprávy Alíkovi', icon: '✉' },
    { key: 'emailove-sablony', label: 'E-mail šablony', icon: '📧' },
  ]},
  { group: '🖼️ Média', items: [
    { key: 'obrazky', label: 'Moderace obrázků', icon: '🖼️' },
  ]},
  { group: '🎨 Vzhled', items: [
    { key: 'obsahove-boxy', label: 'Obsahové boxy', icon: '📦' },
    { key: 'styly-stranek', label: 'Styly stránek', icon: '🎨' },
  ]},
  { group: '⚙ Systém', items: [
    { key: 'reporty', label: 'Hlášení', icon: '⚠' },
    { key: 'audit', label: 'Audit log', icon: '📋' },
    { key: 'zmenar', label: 'Změnář', icon: '📝' },
    { key: 'filtr-slov', label: 'Filtr slov', icon: '🤬' },
    { key: 'bezpecnost', label: 'Bezpečnost', icon: '🛡' },
    { key: 'rozpocet', label: 'Rozpočet', icon: '💰' },
    { key: 'smernice', label: 'Směrnice', icon: '📜' },
    { key: 'zadosti', label: 'Žádosti', icon: '📩' },
    { key: 'harmonogram', label: 'Harmonogram', icon: '🗓' },
    { key: 'klubovny', label: 'Klubovny', icon: '🏠' },
    { key: 'export', label: 'Export', icon: '📤' },
    { key: 'import', label: 'Import', icon: '📥' },
    { key: 'hromadne', label: 'Hromadné', icon: '⚡' },
    { key: 'integrace', label: 'Integrace', icon: '🔗' },
    { key: 'nastaveni', label: 'Konfigurace', icon: '⚙' },
  ]},
];

const allTabs = tabGroups.flatMap(g => g.items);

export default function Rektorat() {
  const { user, isStaff, isDeveloper, isLektor, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get('tab') as Tab | null;
    return (t && allTabs.find(x => x.key === t)) ? t : 'prehled';
  });
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
  const [blocks, setBlocks] = useState<any[]>([]);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [blockMessages, setBlockMessages] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [stats, setStats] = useState({ courses: 0, faculties: 0, questions: 0, notes: 0, blocks: 0, forumPosts: 0 });

  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseEdit, setCourseEdit] = useState<Record<string, any>>({});

  const [editingFacultyId, setEditingFacultyId] = useState<string | null>(null);
  const [facultyEdit, setFacultyEdit] = useState<Record<string, any>>({});

  const [assignFacultyCourseId, setAssignFacultyCourseId] = useState<string | null>(null);
  const [selectedFacultyForCourse, setSelectedFacultyForCourse] = useState('');

  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', day_of_week: '', time_slot: '', difficulty: 'beginner', room: '', building: '', semester: 'zimní', credits: 0, exam_type: 'žádný', language: 'čeština' });
  const [showNewFaculty, setShowNewFaculty] = useState(false);
  const [newFaculty, setNewFaculty] = useState({ name: '', description: '', icon: '🏛', color: '#4f7dff' });

  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [roleUserId, setRoleUserId] = useState('');
  const [roleValue, setRoleValue] = useState<string>('student');

  const [blockUserId, setBlockUserId] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockDetails, setBlockDetails] = useState('');
  const [blockType, setBlockType] = useState('full');
  const [blockSeverity, setBlockSeverity] = useState('standard');
  const [blockPermanent, setBlockPermanent] = useState(false);
  const [blockExpires, setBlockExpires] = useState('');
  const [blockAreas, setBlockAreas] = useState<string[]>([]);

  const [assignLektorCourseId, setAssignLektorCourseId] = useState<string | null>(null);
  const [selectedLektor, setSelectedLektor] = useState('');
  const [assignDeanFacultyId, setAssignDeanFacultyId] = useState<string | null>(null);
  const [selectedDean, setSelectedDean] = useState('');

  const [settingsData, setSettingsData] = useState<any[]>([]);
  const [newSettingKey, setNewSettingKey] = useState('');
  const [newSettingValue, setNewSettingValue] = useState('');

  const [smerniceName, setSmerniceName] = useState('');
  const [smerniceContent, setSmerniceContent] = useState('');

  const [emailTemplates, setEmailTemplates] = useState<{name: string; subject: string; body: string}[]>([
    { name: 'Uvítací e-mail', subject: 'Vítejte na Alíkově Univerzitě!', body: 'Dobrý den, **{{jmeno}}**!\n\nVítáme vás na Alíkově Univerzitě.' },
    { name: 'Blokace', subject: 'Váš účet byl zablokován', body: 'Dobrý den,\n\nváš účet byl zablokován z důvodu: **{{duvod}}**.' },
    { name: 'Odblokování', subject: 'Váš účet byl odblokován', body: 'Dobrý den,\n\nváš účet byl odblokován.' },
  ]);
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);

  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState<'all' | 'role' | 'user'>('all');
  const [notifTargetRole, setNotifTargetRole] = useState('student');
  const [notifTargetUser, setNotifTargetUser] = useState('');
  const [notifSending, setNotifSending] = useState(false);

  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [internalNoteText, setInternalNoteText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [appealResponseText, setAppealResponseText] = useState('');
  const [viewingMessage, setViewingMessage] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [pageStyles, setPageStyles] = useState<any[]>([]);
  const [newStylePath, setNewStylePath] = useState('');
  const [newStyleClass, setNewStyleClass] = useState('');
  const [newStyleCSS, setNewStyleCSS] = useState('');
  const [newStyleDesc, setNewStyleDesc] = useState('');
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [editStyleCSS, setEditStyleCSS] = useState('');

  const [contentBlocks, setContentBlocks] = useState<any[]>([]);
  const [newBlock, setNewBlock] = useState({ page_path: '/', title: '', content: '', style_preset: 'announcement', position: 'top', link_url: '', link_text: '', image_url: '', custom_css: '' });
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockEdit, setBlockEdit] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!authLoading && !isStaff && !isDeveloper && !isLektor) navigate('/');
  }, [authLoading, isStaff, isDeveloper, isLektor]);

  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null;
    if (t && allTabs.find(x => x.key === t) && t !== activeTab) setActiveTab(t);
  }, [searchParams]);

  useEffect(() => {
    if (!user || (!isStaff && !isDeveloper && !isLektor)) return;
    loadAll();
  }, [user, activeTab, isStaff, isDeveloper, isLektor]);

  const loadAll = async () => {
    const [c, f, q, n, s, ann, al, rep, notif, ur, pr, bl, fp, enr, bm, ss] = await Promise.all([
      supabase.from('courses').select('*').order('title'),
      supabase.from('faculties').select('*').order('name'),
      supabase.from('tutoring_questions').select('*').order('created_at', { ascending: false }),
      supabase.from('study_notes').select('*').order('created_at', { ascending: false }),
      supabase.from('schedule_items').select('*').order('day_of_week'),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('user_roles').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('user_blocks').select('*').order('blocked_at', { ascending: false }),
      supabase.from('forum_posts').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('enrollments').select('*'),
      supabase.from('block_messages').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('system_settings').select('*'),
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
    if (bl.data) setBlocks(bl.data);
    if (fp.data) setForumPosts(fp.data);
    if (enr.data) setEnrollments(enr.data);
    if (bm.data) setBlockMessages(bm.data);
    if (ss.data) setSettingsData(ss.data);
    const psRes = await supabase.from('page_styles').select('*').order('page_path');
    if (psRes.data) setPageStyles(psRes.data);
    const cbRes = await supabase.from('content_blocks').select('*').order('sort_order');
    if (cbRes.data) setContentBlocks(cbRes.data);
    setStats({
      courses: c.data?.length || 0,
      faculties: f.data?.length || 0,
      questions: q.data?.length || 0,
      notes: n.data?.length || 0,
      blocks: bl.data?.filter((b: any) => b.is_active).length || 0,
      forumPosts: fp.data?.length || 0,
    });
  };

  const getUserRole = (userId: string) => {
    const userRoles = roles.filter(r => r.user_id === userId).map(r => r.role);
    const prio: Record<string, number> = { rektor: 4, developer: 4, spravce: 3, dohledci: 3, lektor: 2, student: 1 };
    return userRoles.sort((a, b) => (prio[b] || 0) - (prio[a] || 0))[0] || null;
  };
  const getUserName = (userId: string) => {
    const u = users.find(u => u.user_id === userId);
    return nameWithRole(u?.display_name || userId?.slice(0, 8) || '—', getUserRole(userId));
  };

  const addAnnouncement = async () => {
    if (!user) return;
    const { error } = await supabase.from('announcements').insert({ author_id: user.id, title: annTitle, content: annContent });
    if (error) toast.error(error.message);
    else { toast.success('Oznámení přidáno'); setAnnTitle(''); setAnnContent(''); loadAll(); }
  };

  const deleteCourse = async (id: string) => { await supabase.from('courses').delete().eq('id', id); toast.success('Kurz smazán'); loadAll(); };
  const deleteFaculty = async (id: string) => { await supabase.from('faculties').delete().eq('id', id); toast.success('Fakulta smazána'); loadAll(); };

  const resolveReport = async (id: string) => {
    if (!user) return;
    await supabase.from('reports').update({ status: 'resolved', resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', id);
    toast.success('Report vyřešen'); loadAll();
  };

  const lektors = users.filter(u => { const r = roles.find(r => r.user_id === u.user_id); return r && ['lektor', 'spravce', 'rektor'].includes(r.role); });

  const sendNotification = async () => {
    if (!user || !notifTitle) return;
    setNotifSending(true);
    try {
      let targetUsers: string[] = [];
      if (notifTarget === 'all') {
        targetUsers = users.map(u => u.user_id);
      } else if (notifTarget === 'role') {
        targetUsers = roles.filter(r => r.role === notifTargetRole).map((r: any) => r.user_id);
      } else if (notifTarget === 'user') {
        targetUsers = [notifTargetUser];
      }
      for (const uid of targetUsers) {
        await supabase.from('notifications').insert({ user_id: uid, title: notifTitle, message: notifMessage || null });
      }
      toast.success(`Notifikace odeslána ${targetUsers.length} uživatelům`);
      setNotifTitle(''); setNotifMessage('');
    } catch { toast.error('Chyba'); }
    setNotifSending(false);
    loadAll();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'hledani':
        return <AdminSearch />;
      case 'zmenar':
        return <ChangelogPanel />;
      case 'mezirozpravy':
        return (
          <div className="grid gap-4">
            <h3 className="mt-0 text-lg font-extrabold">📨 Mezirozpravy – Rektorát</h3>
            <p className="text-sm text-muted-foreground">Přehled všech mezirozprav, čekajících žádostí a posledních zpráv.</p>
            <a href="/rektorat/mezirozpravy" className="btn-alik-primary text-sm w-fit">→ Otevřít dohled mezirozprav</a>
          </div>
        );
      case 'prehled': {
        return (
          <div className="grid gap-5">
            <div>
              <h3 className="mt-0 text-xl font-extrabold mb-3">📊 Dashboard</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { v: stats.courses, l: 'Kurzů', icon: '📚' },
                  { v: stats.faculties, l: 'Fakult', icon: '🏛' },
                  { v: users.length, l: 'Uživatelů', icon: '👥' },
                  { v: stats.questions, l: 'Dotazů', icon: '❓' },
                  { v: stats.blocks, l: 'Blokací', icon: '🚫', danger: true },
                  { v: stats.forumPosts, l: 'Příspěvků', icon: '💬' },
                ].map((s, i) => (
                  <div key={i} className="stat-card text-center">
                    <span className="text-2xl">{s.icon}</span>
                    <strong className={`block text-2xl font-extrabold mt-1 ${(s as any).danger ? 'text-destructive' : 'text-primary'}`}>{s.v}</strong>
                    <span className="text-xs text-muted-foreground">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
      default:
        return (
          <div className="grid gap-4">
            <h3 className="mt-0">{allTabs.find(t => t.key === activeTab)?.icon} {allTabs.find(t => t.key === activeTab)?.label}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="stat-card"><strong>{courses.length}</strong><span className="block text-xs text-muted-foreground">kurzů</span></div>
              <div className="stat-card"><strong>{users.length}</strong><span className="block text-xs text-muted-foreground">uživatelů</span></div>
              <div className="stat-card"><strong>{blocks.filter((b: any) => b.is_active).length}</strong><span className="block text-xs text-muted-foreground">aktivních blokací</span></div>
              <div className="stat-card"><strong>{auditLogs.length}</strong><span className="block text-xs text-muted-foreground">protokolů</span></div>
            </div>
            <p className="text-sm text-muted-foreground">Modul je načtený; data a rychlé akce jsou dostupné v příslušných přehledech Rektorátu.</p>
          </div>
        );
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Načítání...</div>;

  return (
    <AppLayout searchLabel="Rektorát" searchPlaceholder="Hledat v rektorátu..." searchTags={['kurzy', 'uživatelé', 'blokace']}>
      
      <main className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* Sidebar */}
        <aside className="panel-card !p-3 sticky top-4 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-extrabold text-foreground">🏛 Rektorát</h3>
            <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{allTabs.length}</span>
          </div>
          {tabGroups.map(g => (
            <div key={g.group} className="mb-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground px-2 py-1.5 border-b border-border mb-1">{g.group}</p>
              <div className="grid gap-0.5">
                {g.items.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`w-full text-left text-xs py-2 px-3 rounded-xl font-bold transition-all duration-200 ${
                      activeTab === t.key
                        ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                        : 'hover:bg-muted/80 text-foreground/80 hover:text-foreground'
                    }`}
                  >
                    <span className="mr-1.5">{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Content */}
        <div className="panel-card min-h-[400px] animate-float-in">
          {renderContent()}
        </div>
      </main>
    </AppLayout>
  );
}
