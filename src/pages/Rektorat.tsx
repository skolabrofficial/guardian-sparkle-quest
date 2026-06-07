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
// RektoratBoard removed — toggle now lives in AppNav
import ChangelogPanel from '@/components/ChangelogPanel';
import UserLink from '@/components/UserLink';
import { ProtokolFromAudit } from '@/components/Protokol';

type Tab = 'prehled' | 'kurzy' | 'lektori' | 'studenti' | 'fakulty' | 'rozvrh' | 'dotazy' | 'vypisky' | 'oznameni' | 'reporty' | 'audit' | 'nastaveni' | 'notifikace' | 'role' | 'statistiky' | 'rozpocet' | 'smernice' | 'zpravy' | 'zadosti' | 'kvalita' | 'export' | 'import' | 'hromadne' | 'harmonogram' | 'bezpecnost' | 'klubovny' | 'kapacity' | 'mentori' | 'plany' | 'hodnoceni' | 'blokace' | 'forum' | 'emailove-sablony' | 'integrace' | 'obrazky' | 'odeslat-notifikaci' | 'styly-stranek' | 'obsahove-boxy' | 'filtr-slov' | 'hledani' | 'zmenar' | 'uzivatele';

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

  // Course editing
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseEdit, setCourseEdit] = useState<Record<string, any>>({});

  // Faculty editing
  const [editingFacultyId, setEditingFacultyId] = useState<string | null>(null);
  const [facultyEdit, setFacultyEdit] = useState<Record<string, any>>({});

  // Course-faculty assignment
  const [assignFacultyCourseId, setAssignFacultyCourseId] = useState<string | null>(null);
  const [selectedFacultyForCourse, setSelectedFacultyForCourse] = useState('');

  // New course/faculty forms
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', day_of_week: '', time_slot: '', difficulty: 'beginner', room: '', building: '', semester: 'zimní', credits: 0, exam_type: 'žádný', language: 'čeština' });
  const [showNewFaculty, setShowNewFaculty] = useState(false);
  const [newFaculty, setNewFaculty] = useState({ name: '', description: '', icon: '🏛', color: '#4f7dff' });

  // Form states
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [roleUserId, setRoleUserId] = useState('');
  const [roleValue, setRoleValue] = useState<string>('student');

  // Block form
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

  // Notification sending
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

  // Page styles
  const [pageStyles, setPageStyles] = useState<any[]>([]);
  const [newStylePath, setNewStylePath] = useState('');
  const [newStyleClass, setNewStyleClass] = useState('');
  const [newStyleCSS, setNewStyleCSS] = useState('');
  const [newStyleDesc, setNewStyleDesc] = useState('');
  const [editingStyleId, setEditingStyleId] = useState<string | null>(null);
  const [editStyleCSS, setEditStyleCSS] = useState('');

  // Content blocks
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
  }, [user, activeTab]);

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
    // Load page styles separately
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

  const assignRole = async () => {
    if (!roleUserId) return;
    const { data: prev } = await supabase.from('user_roles').select('role').eq('user_id', roleUserId);
    await supabase.from('user_roles').delete().eq('user_id', roleUserId);
    const { error } = await supabase.from('user_roles').insert({ user_id: roleUserId, role: roleValue as any });
    if (error) toast.error(error.message);
    else {
      const { logAudit } = await import('@/lib/auditLog');
      await logAudit('role.assign', {
        entityType: 'user_roles', entityId: roleUserId,
        details: { target_user_id: roleUserId, from: (prev || []).map(p => p.role).join(',') || 'student', to: roleValue },
        minRole: 'rektor',
      });
      toast.success('Role přiřazena'); loadAll();
    }
  };

  const deleteCourse = async (id: string) => { await supabase.from('courses').delete().eq('id', id); toast.success('Kurz smazán'); loadAll(); };
  const deleteFaculty = async (id: string) => { await supabase.from('faculties').delete().eq('id', id); toast.success('Fakulta smazána'); loadAll(); };

  const saveCourseEdit = async () => {
    if (!editingCourseId) return;
    const { error } = await supabase.from('courses').update(courseEdit as any).eq('id', editingCourseId);
    if (error) toast.error(error.message);
    else {
      if (user) await recordHistory('course', editingCourseId, user.id, 'update', courseEdit);
      toast.success('Kurz uložen'); setEditingCourseId(null); setCourseEdit({}); loadAll();
    }
  };

  const saveFacultyEdit = async () => {
    if (!editingFacultyId) return;
    const { error } = await supabase.from('faculties').update(facultyEdit as any).eq('id', editingFacultyId);
    if (error) toast.error(error.message);
    else {
      if (user) await recordHistory('faculty', editingFacultyId, user.id, 'update', facultyEdit);
      toast.success('Fakulta uložena'); setEditingFacultyId(null); setFacultyEdit({}); loadAll();
    }
  };

  const assignFacultyToCourse = async () => {
    if (!assignFacultyCourseId) return;
    const { error } = await supabase.from('courses').update({ faculty_id: selectedFacultyForCourse || null }).eq('id', assignFacultyCourseId);
    if (error) toast.error(error.message);
    else { toast.success('Fakulta přiřazena'); setAssignFacultyCourseId(null); setSelectedFacultyForCourse(''); loadAll(); }
  };

  const createNewCourse = async () => {
    const { error } = await supabase.from('courses').insert({ ...newCourse, credits: Number(newCourse.credits) || 0 });
    if (error) toast.error(error.message);
    else { toast.success('Kurz vytvořen'); setShowNewCourse(false); setNewCourse({ title: '', description: '', day_of_week: '', time_slot: '', difficulty: 'beginner', room: '', building: '', semester: 'zimní', credits: 0, exam_type: 'žádný', language: 'čeština' }); loadAll(); }
  };

  const createNewFaculty = async () => {
    const { error } = await supabase.from('faculties').insert(newFaculty);
    if (error) toast.error(error.message);
    else { toast.success('Fakulta vytvořena'); setShowNewFaculty(false); setNewFaculty({ name: '', description: '', icon: '🏛', color: '#4f7dff' }); loadAll(); }
  };
  const resolveReport = async (id: string) => {
    if (!user) return;
    await supabase.from('reports').update({ status: 'resolved', resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', id);
    toast.success('Report vyřešen'); loadAll();
  };

  const assignLektor = async () => {
    if (!assignLektorCourseId || !selectedLektor) return;
    await supabase.from('courses').update({ lektor_id: selectedLektor }).eq('id', assignLektorCourseId);
    toast.success('Lektor přiřazen'); setAssignLektorCourseId(null); setSelectedLektor(''); loadAll();
  };

  const assignDean = async () => {
    if (!assignDeanFacultyId || !selectedDean) return;
    await supabase.from('faculties').update({ dean_id: selectedDean }).eq('id', assignDeanFacultyId);
    toast.success('Děkan přiřazen'); setAssignDeanFacultyId(null); setSelectedDean(''); loadAll();
  };

  const saveSetting = async () => {
    if (!user || !newSettingKey) return;
    const existing = settingsData.find(s => s.key === newSettingKey);
    if (existing) await supabase.from('system_settings').update({ value: newSettingValue, updated_by: user.id }).eq('id', existing.id);
    else await supabase.from('system_settings').insert({ key: newSettingKey, value: newSettingValue, updated_by: user.id });
    toast.success('Uloženo'); setNewSettingKey(''); setNewSettingValue(''); loadAll();
  };

  // ===== BLOCKING (20 functions) =====
  const generateBlockMessage = (block: any): string => {
    const userName = getUserName(block.user_id);
    const blockerName = getUserName(block.blocked_by);
    const typeMap: Record<string, string> = { full: 'plná blokace', partial: 'částečná blokace', warning: 'varování', temporary: 'dočasná blokace' };
    const sevMap: Record<string, string> = { low: 'nízká', standard: 'standardní', high: 'vysoká', critical: 'kritická' };
    const areas = block.affected_areas?.length > 0 ? block.affected_areas.join(', ') : 'veškerý přístup';
    const expiry = block.is_permanent ? 'trvalá (bez konce)' : block.expires_at ? new Date(block.expires_at).toLocaleString('cs-CZ') : 'neurčeno';
    // AZJ-style formatting for Alík.cz (using parentheses commands)
    const lines = [
      `(nadpis) Protokol o blokaci — Alíkova Univerzita`,
      ``,
      `(tučně) Číslo protokolu: BLK-${block.id.slice(0, 8).toUpperCase()}`,
      `(tučně) Datum vystavení: ${new Date().toLocaleString('cs-CZ')}`,
      ``,
      `(oddělovač)`,
      ``,
      `(malý nadpis) Informace o blokaci`,
      ``,
      `Uživatel (tučně)${userName}(normálně) byl zablokován uživatelem (tučně)${blockerName}(normálně) dne ${new Date(block.blocked_at).toLocaleString('cs-CZ')}. Jedná se o (červeně)(tučně)${typeMap[block.block_type] || block.block_type}(normálně) se závažností (červeně)${sevMap[block.severity] || block.severity}(normálně).`,
      ``,
      `(malý nadpis) Důvod blokace`,
      ``,
      `(tučně)${block.reason}(normálně)`,
    ];

    if (block.details) {
      lines.push('', '(malý nadpis) Podrobnosti', '', block.details);
    }

    lines.push(
      '', '(malý nadpis) Parametry', '',
      '(seznam)',
      `- Typ: (tučně)${typeMap[block.block_type] || block.block_type}(normálně)`,
      `- Závažnost: (tučně)${sevMap[block.severity] || block.severity}(normálně)`,
      `- Trvalá: ${block.is_permanent ? '(červeně)Ano(normálně)' : 'Ne'}`,
      `- Platnost do: (tučně)${expiry}(normálně)`,
      `- Dotčené oblasti: ${areas}`,
      `- Počet varování: ${block.warning_count || 0}`,
      `- Pořadí blokace: ${block.block_count || 1}.`,
      `- Eskalováno: ${block.escalated ? '(červeně)Ano(normálně)' : 'Ne'}`,
      '(konec)',
    );

    if (block.evidence_urls?.length > 0) {
      lines.push('', '(malý nadpis) Důkazy', '', '(seznam)');
      block.evidence_urls.forEach((u: string) => lines.push(`- (odkaz na ${u}) důkaz (konec odkazu)`));
      lines.push('(konec)');
    }

    if (block.internal_notes) {
      lines.push('', '(malý nadpis) Interní poznámky', '', block.internal_notes);
    }

    lines.push(
      '', '(oddělovač)', '',
      '(šedě)(kurzívou)Automaticky vygenerováno systémem Alíkovy Univerzity.(normálně)',
    );

    // Also generate a Markdown version for local display
    const mdVersion = `## Zpráva pro správce Alík.cz — Protokol o blokaci\n\n**Číslo protokolu:** BLK-${block.id.slice(0, 8).toUpperCase()}\n**Datum vystavení:** ${new Date().toLocaleString('cs-CZ')}\n\n---\n\n### Informace o blokaci\n\nUživatel **${userName}** byl zablokován uživatelem **${blockerName}** dne ${new Date(block.blocked_at).toLocaleString('cs-CZ')}. Jedná se o **${typeMap[block.block_type] || block.block_type}** se závažností **${sevMap[block.severity] || block.severity}**.\n\n### Důvod blokace\n\n${block.reason}\n\n${block.details ? `### Podrobnosti\n\n${block.details}\n\n` : ''}### Parametry\n\n| Parametr | Hodnota |\n|---|---|\n| Typ | ${typeMap[block.block_type] || block.block_type} |\n| Závažnost | ${sevMap[block.severity] || block.severity} |\n| Trvalá | ${block.is_permanent ? 'Ano' : 'Ne'} |\n| Platnost do | ${expiry} |\n| Dotčené oblasti | ${areas} |\n| Počet varování | ${block.warning_count || 0} |\n| Pořadí blokace | ${block.block_count || 1}. |\n| Eskalováno | ${block.escalated ? 'Ano' : 'Ne'} |\n\n${block.evidence_urls?.length > 0 ? `### Důkazy\n\n${block.evidence_urls.map((u: string, i: number) => `${i + 1}. ${u}`).join('\n')}\n\n` : ''}${block.internal_notes ? `### Interní poznámky\n\n${block.internal_notes}\n\n` : ''}---\n\n*Automaticky vygenerováno systémem Alíkovy Univerzity.*`;

    return `<!-- AZJ verze pro Alík.cz -->\n${lines.join('\n')}\n\n<!-- Markdown verze -->\n${mdVersion}`;
  };

  const createBlock = async () => {
    if (!user || !blockUserId || !blockReason) return;
    const { data, error } = await supabase.from('user_blocks').insert({
      user_id: blockUserId, blocked_by: user.id, reason: blockReason, details: blockDetails || null,
      block_type: blockType, severity: blockSeverity, is_permanent: blockPermanent,
      expires_at: blockExpires ? new Date(blockExpires).toISOString() : null, notification_sent: true,
      affected_areas: blockType === 'partial' ? blockAreas : [],
    }).select().single();
    if (error) { toast.error(error.message); return; }
    if (data) {
      const msg = generateBlockMessage(data);
      await supabase.from('block_messages').insert({ block_id: data.id, generated_by: user.id, message_text: msg });
    }
    toast.success('Uživatel zablokován');
    setBlockUserId(''); setBlockReason(''); setBlockDetails(''); setBlockType('full'); setBlockSeverity('standard'); setBlockPermanent(false); setBlockExpires(''); setBlockAreas([]);
    loadAll();
  };

  const unblockUser = async (blockId: string) => { if (!user) return; await supabase.from('user_blocks').update({ is_active: false, unblocked_at: new Date().toISOString(), unblocked_by: user.id, unblock_reason: 'Manuální odblokování' }).eq('id', blockId); toast.success('Odblokováno'); loadAll(); };
  const approveAppeal = async (blockId: string) => { if (!user) return; await supabase.from('user_blocks').update({ appeal_status: 'approved', appeal_reviewed_by: user.id, appeal_reviewed_at: new Date().toISOString(), is_active: false, unblocked_at: new Date().toISOString(), unblocked_by: user.id }).eq('id', blockId); toast.success('Schváleno'); loadAll(); };
  const rejectAppeal = async (blockId: string, response: string) => { if (!user) return; await supabase.from('user_blocks').update({ appeal_status: 'rejected', appeal_reviewed_by: user.id, appeal_reviewed_at: new Date().toISOString(), appeal_response: response || 'Zamítnuto.' }).eq('id', blockId); toast.success('Zamítnuto'); loadAll(); };
  const escalateBlock = async (blockId: string) => { if (!user) return; await supabase.from('user_blocks').update({ escalated: true, escalated_to: user.id }).eq('id', blockId); toast.success('Eskalováno'); loadAll(); };
  const changeSeverity = async (blockId: string, severity: string) => { await supabase.from('user_blocks').update({ severity }).eq('id', blockId); loadAll(); };
  const changeBlockType = async (blockId: string, type: string) => { await supabase.from('user_blocks').update({ block_type: type }).eq('id', blockId); loadAll(); };
  const extendBlock = async (blockId: string, days: number) => { const b = blocks.find(b => b.id === blockId); const base = b?.expires_at ? new Date(b.expires_at) : new Date(); base.setDate(base.getDate() + days); await supabase.from('user_blocks').update({ expires_at: base.toISOString() }).eq('id', blockId); toast.success(`+${days}d`); loadAll(); };
  const makePermanent = async (blockId: string) => { await supabase.from('user_blocks').update({ is_permanent: true, expires_at: null }).eq('id', blockId); loadAll(); };
  const addInternalNote = async (blockId: string, note: string) => { const b = blocks.find(b => b.id === blockId); await supabase.from('user_blocks').update({ internal_notes: `${b?.internal_notes || ''}\n[${new Date().toLocaleString('cs')}] ${note}`.trim() }).eq('id', blockId); toast.success('Přidáno'); loadAll(); };
  const addEvidence = async (blockId: string, url: string) => { const b = blocks.find(b => b.id === blockId); await supabase.from('user_blocks').update({ evidence_urls: [...(b?.evidence_urls || []), url] }).eq('id', blockId); toast.success('Přidáno'); loadAll(); };
  const setAffectedAreas = async (blockId: string, areas: string[]) => { await supabase.from('user_blocks').update({ affected_areas: areas }).eq('id', blockId); loadAll(); };
  const sendWarning = async (blockId: string) => { const b = blocks.find(b => b.id === blockId); await supabase.from('user_blocks').update({ warning_count: (b?.warning_count || 0) + 1, last_warning_at: new Date().toISOString() }).eq('id', blockId); toast.success('Varování odesláno'); loadAll(); };
  const scheduleReview = async (blockId: string, date: string) => { await supabase.from('user_blocks').update({ review_scheduled_at: new Date(date).toISOString() }).eq('id', blockId); toast.success('Naplánováno'); loadAll(); };
  const incrementBlockCount = async (blockId: string) => { const b = blocks.find(b => b.id === blockId); await supabase.from('user_blocks').update({ block_count: (b?.block_count || 1) + 1 }).eq('id', blockId); loadAll(); };
  const setAppealReviewing = async (blockId: string) => { await supabase.from('user_blocks').update({ appeal_status: 'reviewing' }).eq('id', blockId); loadAll(); };
  const addIpNote = async (blockId: string, note: string) => { await supabase.from('user_blocks').update({ ip_note: note }).eq('id', blockId); toast.success('Přidáno'); loadAll(); };
  const updateMetadata = async (blockId: string, key: string, value: string) => { const b = blocks.find(b => b.id === blockId); await supabase.from('user_blocks').update({ metadata: { ...(b?.metadata || {}), [key]: value } }).eq('id', blockId); loadAll(); };
  const bulkUnblockExpired = async () => { if (!user) return; const expired = blocks.filter(b => b.is_active && b.expires_at && new Date(b.expires_at) < new Date()); for (const b of expired) { await supabase.from('user_blocks').update({ is_active: false, unblocked_at: new Date().toISOString(), unblocked_by: user.id, unblock_reason: 'Auto' }).eq('id', b.id); } toast.success(`Odblokováno: ${expired.length}`); loadAll(); };
  const getBlockStats = () => ({ active: blocks.filter(b => b.is_active).length, pending: blocks.filter(b => b.appeal_status === 'pending').length, permanent: blocks.filter(b => b.is_permanent && b.is_active).length, escalated: blocks.filter(b => b.escalated && b.is_active).length, total: blocks.length });
  const regenerateBlockMessage = async (block: any) => { if (!user) return; await supabase.from('block_messages').insert({ block_id: block.id, generated_by: user.id, message_text: generateBlockMessage(block) }); toast.success('Regenerováno'); loadAll(); };

  const lektors = users.filter(u => { const r = roles.find(r => r.user_id === u.user_id); return r && ['lektor', 'spravce', 'rektor'].includes(r.role); });

  // Send notification
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

  // ===== RENDER =====
  const renderContent = () => {
    switch (activeTab) {
      case 'hledani':
        return <AdminSearch />;
      case 'zmenar':
        return <ChangelogPanel />;
      case 'uzivatele': {
        if (!isDeveloper) return <div className="panel-card"><p className="text-muted-foreground">Pouze pro vývojáře.</p></div>;
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-xl font-extrabold">👥 Všichni uživatelé ({users.length})</h3>
            <p className="text-sm text-muted-foreground">Klikni na přezdívku pro otevření zdi uživatele.</p>
            <div className="grid gap-1.5 max-h-[70vh] overflow-y-auto">
              {users.map((u: any) => {
                const r = roles.find((rr: any) => rr.user_id === u.user_id)?.role;
                return (
                  <div key={u.user_id} className="catalog-item-card items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-bold">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.display_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <strong className="text-sm block">
                        <UserLink userId={u.user_id} username={u.username} displayName={u.display_name} role={r} />
                      </strong>
                      <span className="text-xs text-muted-foreground">@{u.username || '—'} • {ROLE_LABELS[r || 'student'] || 'Student'}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{u.last_seen ? new Date(u.last_seen).toLocaleString('cs') : 'nikdy'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
      case 'prehled': {
        const bs = getBlockStats();
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="panel-card border-l-4 border-destructive">
                <h4 className="mt-0 text-sm">⏳ Čekající odvolání</h4>
                <p className="text-3xl font-extrabold text-destructive">{bs.pending}</p>
              </div>
              <div className="panel-card border-l-4 border-accent">
                <h4 className="mt-0 text-sm">⚠ Otevřené reporty</h4>
                <p className="text-3xl font-extrabold text-accent-foreground">{reports.filter(r => r.status === 'pending').length}</p>
              </div>
              <div className="panel-card border-l-4 border-primary">
                <h4 className="mt-0 text-sm">📧 Zápisů</h4>
                <p className="text-3xl font-extrabold text-primary">{enrollments.length}</p>
              </div>
            </div>
            <div className="panel-card">
              <h4 className="mt-0 text-sm">Poslední aktivity</h4>
              {auditLogs.slice(0, 5).map(l => {
                const u = users.find((x: any) => x.user_id === l.user_id);
                return <ProtokolFromAudit key={l.id} row={l} profile={u} role={getUserRole(l.user_id)} />;
              })}
            </div>
          </div>
        );
      }

      case 'obrazky':
        return <ImageModeration profiles={users} roles={roles} />;

      case 'odeslat-notifikaci':
        return (
          <div className="grid gap-4 max-w-lg">
            <h3 className="mt-0 text-lg font-extrabold">📨 Odeslat notifikaci</h3>
            <div className="grid gap-3">
              <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="Nadpis notifikace *" className="border-2 border-border rounded-xl py-2.5 px-3 text-sm outline-none bg-card focus:border-primary transition-colors" />
              <textarea value={notifMessage} onChange={e => setNotifMessage(e.target.value)} placeholder="Zpráva (volitelné, podporuje Markdown)" className="border-2 border-border rounded-xl py-2.5 px-3 text-sm outline-none bg-card focus:border-primary transition-colors min-h-[80px]" />
              <div className="grid gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Cíl</label>
                <div className="flex gap-2">
                  {[
                    { v: 'all' as const, l: '👥 Všichni' },
                    { v: 'role' as const, l: '🏷 Role' },
                    { v: 'user' as const, l: '👤 Uživatel' },
                  ].map(t => (
                    <button key={t.v} onClick={() => setNotifTarget(t.v)} className={`text-xs font-bold px-3 py-2 rounded-xl transition-all ${notifTarget === t.v ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{t.l}</button>
                  ))}
                </div>
                {notifTarget === 'role' && (
                  <select value={notifTargetRole} onChange={e => setNotifTargetRole(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none">
                    <option value="student">Studenti</option><option value="lektor">Lektoři</option><option value="dohledci">Dohledčí</option><option value="developer">Vývojáři</option>
                  </select>
                )}
                {notifTarget === 'user' && (
                  <select value={notifTargetUser} onChange={e => setNotifTargetUser(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none">
                    <option value="">Vyberte uživatele</option>
                    {users.map(u => <option key={u.user_id} value={u.user_id}>{u.display_name}</option>)}
                  </select>
                )}
              </div>
              <button onClick={sendNotification} disabled={notifSending || !notifTitle} className="btn-alik-primary text-sm py-3">
                {notifSending ? '⏳ Odesílání...' : '📨 Odeslat notifikaci'}
              </button>
            </div>
          </div>
        );

      case 'kurzy':
        return (
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="mt-0 text-lg font-extrabold">📚 Správa kurzů ({courses.length})</h3>
              {isDeveloper && <button className="btn-alik-primary text-sm" onClick={() => setShowNewCourse(!showNewCourse)}>{showNewCourse ? '✕ Zrušit' : '+ Nový kurz'}</button>}
            </div>

            {showNewCourse && (
              <div className="panel-card border-l-4 border-primary animate-fade-in">
                <h4 className="mt-0 text-sm mb-3">Nový kurz</h4>
                <div className="grid gap-2">
                  <input placeholder="Název kurzu *" value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-primary transition-colors" />
                  <textarea placeholder="Popis" value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[60px] focus:border-primary transition-colors" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <input placeholder="Den (Po, Út...)" value={newCourse.day_of_week} onChange={e => setNewCourse({ ...newCourse, day_of_week: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-primary transition-colors" />
                    <input placeholder="Čas (15:00)" value={newCourse.time_slot} onChange={e => setNewCourse({ ...newCourse, time_slot: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-primary transition-colors" />
                    <input placeholder="Místnost" value={newCourse.room} onChange={e => setNewCourse({ ...newCourse, room: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-primary transition-colors" />
                    <input placeholder="Budova" value={newCourse.building} onChange={e => setNewCourse({ ...newCourse, building: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-primary transition-colors" />
                    <input placeholder="Kredity" type="number" value={newCourse.credits} onChange={e => setNewCourse({ ...newCourse, credits: Number(e.target.value) })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-primary transition-colors" />
                    <select value={newCourse.difficulty} onChange={e => setNewCourse({ ...newCourse, difficulty: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none">
                      <option value="beginner">Začátečník</option><option value="intermediate">Pokročilý</option><option value="advanced">Expert</option>
                    </select>
                    <select value={newCourse.semester} onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none">
                      <option value="zimní">Zimní</option><option value="letní">Letní</option><option value="celoroční">Celoroční</option>
                    </select>
                    <select value={newCourse.exam_type} onChange={e => setNewCourse({ ...newCourse, exam_type: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none">
                      <option value="žádný">Žádný</option><option value="test">Test</option><option value="projekt">Projekt</option><option value="ústní">Ústní</option><option value="písemná">Písemná</option><option value="kombinovaná">Kombinovaná</option>
                    </select>
                    <select value={newCourse.language} onChange={e => setNewCourse({ ...newCourse, language: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none">
                      <option value="čeština">Čeština</option><option value="angličtina">Angličtina</option><option value="slovenština">Slovenština</option>
                    </select>
                  </div>
                  <button onClick={createNewCourse} disabled={!newCourse.title} className="btn-alik-accent text-sm">Vytvořit kurz</button>
                </div>
              </div>
            )}

            {courses.map(c => {
              const isEditing = editingCourseId === c.id;
              const cFaculty = faculties.find(f => f.id === c.faculty_id);
              const enrolledCount = enrollments.filter(e => e.course_id === c.id).length;
              return (
                <div key={c.id} className="panel-card !p-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <strong className="text-sm">{c.title}</strong>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {c.day_of_week && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted">{c.day_of_week} {c.time_slot}</span>}
                        {c.lektor_id && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground">👨‍🏫 {getUserName(c.lektor_id)}</span>}
                        {cFaculty && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">🏛 {cFaculty.name}</span>}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted">{enrolledCount} st.</span>
                        {c.room && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">🚪 {c.room}</span>}
                        {c.credits > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">🎯 {c.credits} kr.</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {isDeveloper && (
                        <>
                          <button className="text-xs font-bold px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Upravit" onClick={() => { setEditingCourseId(isEditing ? null : c.id); setCourseEdit(isEditing ? {} : { title: c.title, description: c.description || '', day_of_week: c.day_of_week || '', time_slot: c.time_slot || '', difficulty: c.difficulty || 'beginner', room: c.room || '', building: c.building || '', semester: c.semester || 'zimní', credits: c.credits || 0, exam_type: c.exam_type || 'žádný', language: c.language || 'čeština', prerequisites: c.prerequisites || '', syllabus: c.syllabus || '', capacity_note: c.capacity_note || '', schedule_note: c.schedule_note || '', max_students: c.max_students || 30 }); }}>✏️</button>
                          <button className="text-xs font-bold px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Přiřadit lektora" onClick={() => { setAssignLektorCourseId(assignLektorCourseId === c.id ? null : c.id); setSelectedLektor(c.lektor_id || ''); }}>👨‍🏫</button>
                          <button className="text-xs font-bold px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Přiřadit fakultu" onClick={() => { setAssignFacultyCourseId(assignFacultyCourseId === c.id ? null : c.id); setSelectedFacultyForCourse(c.faculty_id || ''); }}>🏛</button>
                        </>
                      )}
                      <button className="text-xs font-bold px-2 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" onClick={() => deleteCourse(c.id)}>🗑</button>
                    </div>
                  </div>

                  {assignLektorCourseId === c.id && (
                    <div className="mt-3 p-2.5 rounded-xl bg-muted/50 animate-fade-in grid gap-2">
                      <label className="text-xs font-bold">Přiřadit lektora</label>
                      <select value={selectedLektor} onChange={e => setSelectedLektor(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                        <option value="">Vyberte lektora</option>
                        {lektors.map(l => <option key={l.user_id} value={l.user_id}>{l.display_name}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={assignLektor} className="btn-alik-primary text-xs">Přiřadit</button>
                        <button onClick={() => setAssignLektorCourseId(null)} className="btn-alik-outline text-xs">Zrušit</button>
                      </div>
                    </div>
                  )}

                  {assignFacultyCourseId === c.id && (
                    <div className="mt-3 p-2.5 rounded-xl bg-muted/50 animate-fade-in grid gap-2">
                      <label className="text-xs font-bold">Přiřadit fakultu</label>
                      <select value={selectedFacultyForCourse} onChange={e => setSelectedFacultyForCourse(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                        <option value="">Bez fakulty</option>
                        {faculties.map(f => <option key={f.id} value={f.id}>{f.icon || '🏛'} {f.name}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={assignFacultyToCourse} className="btn-alik-primary text-xs">Přiřadit</button>
                        <button onClick={() => setAssignFacultyCourseId(null)} className="btn-alik-outline text-xs">Zrušit</button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-3 p-3 rounded-xl bg-muted/50 animate-fade-in grid gap-2">
                      <label className="text-xs font-bold">Upravit kurz</label>
                      <input placeholder="Název" value={courseEdit.title || ''} onChange={e => setCourseEdit({ ...courseEdit, title: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card focus:border-primary transition-colors" />
                      <textarea placeholder="Popis" value={courseEdit.description || ''} onChange={e => setCourseEdit({ ...courseEdit, description: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card min-h-[60px] focus:border-primary transition-colors" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <input placeholder="Den" value={courseEdit.day_of_week || ''} onChange={e => setCourseEdit({ ...courseEdit, day_of_week: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card" />
                        <input placeholder="Čas" value={courseEdit.time_slot || ''} onChange={e => setCourseEdit({ ...courseEdit, time_slot: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card" />
                        <input placeholder="Místnost" value={courseEdit.room || ''} onChange={e => setCourseEdit({ ...courseEdit, room: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card" />
                        <input placeholder="Budova" value={courseEdit.building || ''} onChange={e => setCourseEdit({ ...courseEdit, building: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card" />
                        <input placeholder="Kredity" type="number" value={courseEdit.credits || 0} onChange={e => setCourseEdit({ ...courseEdit, credits: Number(e.target.value) })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card" />
                        <input placeholder="Max studentů" type="number" value={courseEdit.max_students || 30} onChange={e => setCourseEdit({ ...courseEdit, max_students: Number(e.target.value) })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card" />
                        <select value={courseEdit.difficulty || 'beginner'} onChange={e => setCourseEdit({ ...courseEdit, difficulty: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                          <option value="beginner">Začátečník</option><option value="intermediate">Pokročilý</option><option value="advanced">Expert</option>
                        </select>
                        <select value={courseEdit.semester || 'zimní'} onChange={e => setCourseEdit({ ...courseEdit, semester: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                          <option value="zimní">Zimní</option><option value="letní">Letní</option><option value="celoroční">Celoroční</option>
                        </select>
                        <select value={courseEdit.exam_type || 'žádný'} onChange={e => setCourseEdit({ ...courseEdit, exam_type: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                          <option value="žádný">Žádný</option><option value="test">Test</option><option value="projekt">Projekt</option><option value="ústní">Ústní</option><option value="písemná">Písemná</option><option value="kombinovaná">Kombinovaná</option>
                        </select>
                        <select value={courseEdit.language || 'čeština'} onChange={e => setCourseEdit({ ...courseEdit, language: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                          <option value="čeština">Čeština</option><option value="angličtina">Angličtina</option><option value="slovenština">Slovenština</option>
                        </select>
                      </div>
                      <input placeholder="Prerekvizity" value={courseEdit.prerequisites || ''} onChange={e => setCourseEdit({ ...courseEdit, prerequisites: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card" />
                      <textarea placeholder="Sylabus" value={courseEdit.syllabus || ''} onChange={e => setCourseEdit({ ...courseEdit, syllabus: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card min-h-[60px]" />
                      <input placeholder="Poznámka ke kapacitě" value={courseEdit.capacity_note || ''} onChange={e => setCourseEdit({ ...courseEdit, capacity_note: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card" />
                      <input placeholder="Poznámka k rozvrhu" value={courseEdit.schedule_note || ''} onChange={e => setCourseEdit({ ...courseEdit, schedule_note: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card" />
                      <div className="flex gap-2">
                        <button onClick={saveCourseEdit} className="btn-alik-primary text-xs">💾 Uložit</button>
                        <button onClick={() => { setEditingCourseId(null); setCourseEdit({}); }} className="btn-alik-outline text-xs">Zrušit</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {courses.length === 0 && <p className="text-muted-foreground text-sm">Žádné kurzy.</p>}
          </div>
        );

      case 'fakulty':
        return (
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="mt-0 text-lg font-extrabold">🏛 Fakulty ({faculties.length})</h3>
              {isDeveloper && <button className="btn-alik-primary text-sm" onClick={() => setShowNewFaculty(!showNewFaculty)}>{showNewFaculty ? '✕ Zrušit' : '+ Nová fakulta'}</button>}
            </div>

            {showNewFaculty && (
              <div className="panel-card border-l-4 border-primary animate-fade-in">
                <h4 className="mt-0 text-sm mb-3">Nová fakulta</h4>
                <div className="grid gap-2">
                  <input placeholder="Název fakulty *" value={newFaculty.name} onChange={e => setNewFaculty({ ...newFaculty, name: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-primary transition-colors" />
                  <textarea placeholder="Popis" value={newFaculty.description} onChange={e => setNewFaculty({ ...newFaculty, description: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[60px] focus:border-primary transition-colors" />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Ikona (emoji)" value={newFaculty.icon} onChange={e => setNewFaculty({ ...newFaculty, icon: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none" />
                    <input type="color" value={newFaculty.color} onChange={e => setNewFaculty({ ...newFaculty, color: e.target.value })} className="border-2 border-border rounded-xl h-10 cursor-pointer" />
                  </div>
                  <button onClick={createNewFaculty} disabled={!newFaculty.name} className="btn-alik-accent text-sm">Vytvořit fakultu</button>
                </div>
              </div>
            )}

            {faculties.map(f => {
              const isEditing = editingFacultyId === f.id;
              const facultyCourses = courses.filter(c => c.faculty_id === f.id);
              return (
                <div key={f.id} className="panel-card !p-3 animate-fade-in" style={{ borderLeft: `4px solid ${f.color || 'hsl(var(--primary))'}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{f.icon || '🏛'}</span>
                        <strong className="text-sm">{f.name}</strong>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {f.dean_id && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-foreground">🎓 {getUserName(f.dean_id)}</span>}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted">{facultyCourses.length} kurzů</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {isDeveloper && (
                        <>
                          <button className="text-xs font-bold px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Upravit" onClick={() => { setEditingFacultyId(isEditing ? null : f.id); setFacultyEdit(isEditing ? {} : { name: f.name, description: f.description || '', icon: f.icon || '🏛', color: f.color || '#4f7dff', sort_order: f.sort_order || 0 }); }}>✏️</button>
                          <button className="text-xs font-bold px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Přiřadit děkana" onClick={() => { setAssignDeanFacultyId(assignDeanFacultyId === f.id ? null : f.id); setSelectedDean(f.dean_id || ''); }}>🎓</button>
                        </>
                      )}
                      <button className="text-xs font-bold px-2 py-1 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" onClick={() => deleteFaculty(f.id)}>🗑</button>
                    </div>
                  </div>

                  {assignDeanFacultyId === f.id && (
                    <div className="mt-3 p-2.5 rounded-xl bg-muted/50 animate-fade-in grid gap-2">
                      <label className="text-xs font-bold">Přiřadit děkana</label>
                      <select value={selectedDean} onChange={e => setSelectedDean(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                        <option value="">Vyberte uživatele</option>
                        {lektors.map(l => <option key={l.user_id} value={l.user_id}>{l.display_name}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={assignDean} className="btn-alik-primary text-xs">Přiřadit</button>
                        <button onClick={() => setAssignDeanFacultyId(null)} className="btn-alik-outline text-xs">Zrušit</button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-3 p-3 rounded-xl bg-muted/50 animate-fade-in grid gap-2">
                      <label className="text-xs font-bold">Upravit fakultu</label>
                      <input placeholder="Název" value={facultyEdit.name || ''} onChange={e => setFacultyEdit({ ...facultyEdit, name: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card focus:border-primary transition-colors" />
                      <textarea placeholder="Popis" value={facultyEdit.description || ''} onChange={e => setFacultyEdit({ ...facultyEdit, description: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card min-h-[60px] focus:border-primary transition-colors" />
                      <div className="grid grid-cols-3 gap-2">
                        <input placeholder="Ikona" value={facultyEdit.icon || ''} onChange={e => setFacultyEdit({ ...facultyEdit, icon: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card" />
                        <input type="color" value={facultyEdit.color || '#4f7dff'} onChange={e => setFacultyEdit({ ...facultyEdit, color: e.target.value })} className="border-2 border-border rounded-xl h-10 cursor-pointer" />
                        <input placeholder="Pořadí" type="number" value={facultyEdit.sort_order || 0} onChange={e => setFacultyEdit({ ...facultyEdit, sort_order: Number(e.target.value) })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveFacultyEdit} className="btn-alik-primary text-xs">💾 Uložit</button>
                        <button onClick={() => { setEditingFacultyId(null); setFacultyEdit({}); }} className="btn-alik-outline text-xs">Zrušit</button>
                      </div>
                    </div>
                  )}

                  {facultyCourses.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Kurzy: {facultyCourses.map(c => c.title).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
            {faculties.length === 0 && <p className="text-muted-foreground text-sm">Žádné fakulty.</p>}
          </div>
        );

      case 'lektori':
      case 'mentori':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">{activeTab === 'lektori' ? '👨‍🏫 Lektoři' : '🤝 Mentoři'}</h3>
            {roles.filter(r => r.role === 'lektor').map(r => (
              <div key={r.id} className="catalog-item-card items-center">
                <strong>{getUserName(r.user_id)}</strong>
                <span className="text-xs text-muted-foreground">{courses.filter(c => c.lektor_id === r.user_id).length} kurzů</span>
              </div>
            ))}
            {roles.filter(r => r.role === 'lektor').length === 0 && <p className="text-muted-foreground text-sm">Žádní lektoři.</p>}
          </div>
        );

      case 'studenti':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">🎓 Studenti ({roles.filter(r => r.role === 'student').length})</h3>
            {roles.filter(r => r.role === 'student').map(r => (
              <div key={r.id} className="catalog-item-card items-center">
                <strong>{getUserName(r.user_id)}</strong>
                <span className="text-xs text-muted-foreground">{enrollments.filter(e => e.student_id === r.user_id).length} kurzů</span>
              </div>
            ))}
          </div>
        );

      case 'role':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">🔑 Správa rolí</h3>
            {users.map(u => {
              const r = roles.find(r => r.user_id === u.user_id);
              return (
                <div key={u.id} className="catalog-item-card items-center">
                  <strong>{nameWithRole(u.display_name, r?.role)}</strong>
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-full text-white" style={{ background: ROLE_COLORS[r?.role || 'student'] }}>{ROLE_LABELS[r?.role || 'student']}</span>
                </div>
              );
            })}
            {isDeveloper && (
              <div className="panel-card border-l-4 border-primary mt-2">
                <h4 className="mt-0 text-sm">Přiřadit roli</h4>
                <div className="grid gap-2">
                  <select value={roleUserId} onChange={e => setRoleUserId(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none">
                    <option value="">Vyberte uživatele</option>
                    {users.map(u => <option key={u.user_id} value={u.user_id}>{u.display_name}</option>)}
                  </select>
                  <select value={roleValue} onChange={e => setRoleValue(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none">
                    <option value="student">Student</option><option value="lektor">Lektor</option><option value="dohledci">Dohledčí</option><option value="developer">Vývojář</option>
                  </select>
                  <button className="btn-alik-primary text-sm" onClick={assignRole}>Přiřadit</button>
                </div>
              </div>
            )}
          </div>
        );

      case 'blokace': {
        const bs = getBlockStats();
        return (
          <div className="grid gap-4">
            <h3 className="mt-0 text-lg font-extrabold">🚫 Blokace</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { v: bs.active, l: 'aktivních', color: 'text-destructive' },
                { v: bs.pending, l: 'odvolání', color: 'text-accent-foreground' },
                { v: bs.permanent, l: 'trvalých', color: 'text-destructive' },
                { v: bs.escalated, l: 'eskalovaných', color: 'text-primary' },
                { v: bs.total, l: 'celkem', color: 'text-foreground' },
              ].map((s, i) => (
                <div key={i} className="stat-card text-center"><strong className={`block text-xl ${s.color}`}>{s.v}</strong><span className="text-xs text-muted-foreground">{s.l}</span></div>
              ))}
            </div>
            <button onClick={bulkUnblockExpired} className="btn-alik-outline text-sm w-fit">♻ Odblokovat vypršelé</button>
            {isDeveloper && (
              <div className="panel-card border-l-4 border-destructive">
                <h4 className="mt-0 text-sm">Nová blokace</h4>
                <div className="grid gap-2">
                  <select value={blockUserId} onChange={e => setBlockUserId(e.target.value)} className="border-2 border-destructive/30 rounded-xl py-2 px-3 text-sm outline-none">
                    <option value="">Vyberte uživatele</option>
                    {users.map(u => <option key={u.user_id} value={u.user_id}>{u.display_name}</option>)}
                  </select>
                  <input placeholder="Důvod" value={blockReason} onChange={e => setBlockReason(e.target.value)} className="border-2 border-destructive/30 rounded-xl py-2 px-3 text-sm outline-none" />
                  <textarea placeholder="Podrobnosti" value={blockDetails} onChange={e => setBlockDetails(e.target.value)} className="border-2 border-destructive/30 rounded-xl py-2 px-3 text-sm outline-none min-h-[50px]" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={blockType} onChange={e => setBlockType(e.target.value)} className="border-2 border-destructive/30 rounded-xl py-2 px-3 text-sm outline-none">
                      <option value="warning">Varování</option>
                      <option value="partial">Částečná</option>
                      <option value="readonly">Pouze čtení</option>
                      <option value="shadow">Stínová</option>
                      <option value="temporary">Dočasná</option>
                      <option value="full">Plná</option>
                      <option value="ip_ban">IP ban</option>
                    </select>
                    <select value={blockSeverity} onChange={e => setBlockSeverity(e.target.value)} className="border-2 border-destructive/30 rounded-xl py-2 px-3 text-sm outline-none">
                      <option value="low">Nízká</option><option value="standard">Standardní</option><option value="high">Vysoká</option><option value="critical">Kritická</option>
                    </select>
                  </div>
                  {blockType === 'partial' && (
                    <div className="grid gap-1">
                      <label className="text-xs font-bold text-muted-foreground">Blokované sekce:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {['fakulty', 'kurzy', 'rozvrh', 'studium', 'vypisky', 'doucovani', 'profil'].map(area => (
                          <label key={area} className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={blockAreas.includes(area)} onChange={e => {
                              setBlockAreas(prev => e.target.checked ? [...prev, area] : prev.filter(a => a !== area));
                            }} />
                            {area}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={blockPermanent} onChange={e => setBlockPermanent(e.target.checked)} /> Trvalá</label>
                    {!blockPermanent && <input type="datetime-local" value={blockExpires} onChange={e => setBlockExpires(e.target.value)} className="border-2 border-destructive/30 rounded-xl py-2 px-3 text-sm outline-none flex-1" />}
                  </div>
                  <button onClick={createBlock} disabled={!blockUserId || !blockReason} className="btn-alik-primary text-sm">🚫 Zablokovat</button>
                </div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              {blocks.map(b => {
                const typeColors: Record<string, string> = { warning: '#eab308', partial: '#f97316', temporary: '#ef4444', full: '#dc2626', shadow: '#6b7280', readonly: '#a855f7', ip_ban: '#7f1d1d' };
                const c = typeColors[b.block_type] || '#dc2626';
                const remaining = b.is_permanent ? '∞' : b.expires_at ? Math.max(0, Math.ceil((new Date(b.expires_at).getTime() - Date.now()) / 86400000)) + 'd' : '?';
                return (
                  <a key={b.id} href={`/blokace/${b.id}`} className="panel-card hover:scale-[1.01] transition-transform" style={{ borderTop: `4px solid ${c}`, opacity: b.is_active ? 1 : 0.6 }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <strong className="block text-sm">{getUserName(b.user_id)}</strong>
                        <span className="text-xs text-muted-foreground">BLK-{b.id.slice(0, 8).toUpperCase()}</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white" style={{ background: b.is_active ? c : '#10b981' }}>
                          {b.is_active ? b.block_type : '✓ konec'}
                        </span>
                        {b.ip_ban_active && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-900 text-white">IP</span>}
                      </div>
                    </div>
                    <p className="text-xs line-clamp-2 mb-2">{b.reason}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>⏱ {remaining}</span>
                      {b.appeal_status === 'pending' && <span className="font-bold text-amber-600">⏳ odvolání</span>}
                      {b.escalated && <span className="font-bold text-purple-600">⚠ eskalace</span>}
                      <span>{b.warning_count || 0}× ⚠</span>
                    </div>
                  </a>
                );
              })}
              {blocks.length === 0 && <p className="text-sm text-muted-foreground sm:col-span-2">Žádné blokace.</p>}
            </div>
          </div>
        );
      }

      case 'forum':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">💬 Fórum ({forumPosts.length})</h3>
            {forumPosts.slice(0, 20).map(p => (
              <div key={p.id} className="catalog-item-card">
                <div className="flex-1">
                  <strong className="text-xs">{getUserName(p.author_id)}</strong>
                  <span className="text-xs ml-2">{p.content.slice(0, 60)}</span>
                </div>
                <div className="flex gap-1.5 items-center">
                  {p.label && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">{p.label}</span>}
                  {p.is_pinned && <span className="text-xs">📌</span>}
                  {p.is_deleted && <span className="text-xs text-destructive">🗑</span>}
                </div>
              </div>
            ))}
          </div>
        );

      case 'oznameni':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">📢 Oznámení</h3>
            <div className="grid gap-2 panel-card border-l-4 border-primary">
              <input placeholder="Nadpis" value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none" />
              <textarea placeholder="Obsah (Markdown)" value={annContent} onChange={e => setAnnContent(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[60px]" />
              <button className="btn-alik-primary text-sm" onClick={addAnnouncement}>Přidat oznámení</button>
            </div>
            {announcements.map(a => (
              <div key={a.id} className="catalog-item-card"><div className="flex-1"><strong>{a.title}</strong>{a.content && <div className="text-xs mt-1"><MarkdownRenderer content={a.content} /></div>}</div><span className="text-xs">{a.priority}</span></div>
            ))}
          </div>
        );

      case 'notifikace':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">🔔 Přehled notifikací ({notifications.length})</h3>
            {notifications.map(n => (
              <div key={n.id} className="catalog-item-card items-center">
                <div className="flex-1"><strong>{n.title}</strong>{n.message && <span className="text-xs ml-2 text-muted-foreground">{n.message.slice(0, 50)}</span>}<span className="text-xs ml-2 text-muted-foreground">→ {getUserName(n.user_id)}</span></div>
                <span className="text-xs">{n.is_read ? '✓' : '●'}</span>
              </div>
            ))}
            {notifications.length === 0 && <p className="text-muted-foreground text-sm">Žádné notifikace.</p>}
          </div>
        );

      case 'reporty':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">⚠ Hlášení</h3>
            {reports.map(r => (
              <div key={r.id} className="catalog-item-card items-center">
                <div><strong>{r.reason}</strong><span className="text-xs text-muted-foreground ml-2">{r.entity_type} • {r.status}</span></div>
                {r.status === 'pending' && <button className="btn-alik-outline text-xs" onClick={() => resolveReport(r.id)}>Vyřešit</button>}
              </div>
            ))}
            {reports.length === 0 && <p className="text-muted-foreground text-sm">Žádné reporty.</p>}
          </div>
        );

      case 'audit':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">📋 Audit log</h3>
            {auditLogs.map(l => {
              const u = users.find((x: any) => x.user_id === l.user_id);
              return <ProtokolFromAudit key={l.id} row={l} profile={u} role={getUserRole(l.user_id)} />;
            })}
          </div>
        );

      case 'statistiky':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">📈 Statistiky</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { v: courses.length, l: 'kurzů celkem' },
                { v: courses.filter(c => c.is_active).length, l: 'aktivních' },
                { v: enrollments.length, l: 'zápisů' },
                { v: questions.filter(q => q.status === 'pending').length, l: 'nevyřešených', danger: true },
                { v: notes.filter(n => n.is_public).length, l: 'veřejných výpisků' },
                { v: blocks.filter(b => b.is_active).length, l: 'blokací', danger: true },
                { v: forumPosts.length, l: 'fórum příspěvků' },
                { v: reports.filter(r => r.status === 'pending').length, l: 'otevřených reportů', danger: true },
                { v: users.length, l: 'uživatelů' },
              ].map((s, i) => (
                <div key={i} className="stat-card text-center"><strong className={`block text-xl ${(s as any).danger ? 'text-destructive' : 'text-primary'}`}>{s.v}</strong><span className="text-xs text-muted-foreground">{s.l}</span></div>
              ))}
            </div>
          </div>
        );

      case 'kvalita':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">✅ Kontrola kvality</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: Math.round((courses.filter(c => c.lektor_id).length / Math.max(courses.length, 1)) * 100), l: 'kurzů s lektorem', unit: '%' },
                { v: Math.round((faculties.filter(f => f.dean_id).length / Math.max(faculties.length, 1)) * 100), l: 'fakult s děkanem', unit: '%' },
                { v: Math.round((questions.filter(q => q.status === 'answered').length / Math.max(questions.length, 1)) * 100), l: 'zodpovězených dotazů', unit: '%' },
                { v: Math.round((reports.filter(r => r.status === 'resolved').length / Math.max(reports.length, 1)) * 100), l: 'vyřešených reportů', unit: '%' },
              ].map((s, i) => (
                <div key={i} className="stat-card text-center"><strong className={`block text-xl ${s.v > 70 ? 'text-green-600' : s.v > 40 ? 'text-accent-foreground' : 'text-destructive'}`}>{s.v}{s.unit}</strong><span className="text-xs text-muted-foreground">{s.l}</span></div>
              ))}
            </div>
          </div>
        );

      case 'rozpocet':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">💰 Rozpočet</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card text-center"><strong className="block text-xl text-green-600">{courses.length * 500} Kč</strong><span className="text-xs text-muted-foreground">Náklady (kurzy)</span></div>
              <div className="stat-card text-center"><strong className="block text-xl text-primary">{faculties.length * 2000} Kč</strong><span className="text-xs text-muted-foreground">Náklady (fakulty)</span></div>
            </div>
          </div>
        );

      case 'smernice':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">📜 Směrnice</h3>
            {isDeveloper && (
              <div className="panel-card border-l-4 border-primary">
                <input placeholder="Název" value={smerniceName} onChange={e => setSmerniceName(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none w-full mb-2" />
                <textarea placeholder="Obsah (Markdown)" value={smerniceContent} onChange={e => setSmerniceContent(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none w-full min-h-[80px] mb-2" />
                <button onClick={async () => {
                  if (!user || !smerniceName) return;
                  await supabase.from('system_settings').insert({ key: `smernice_${Date.now()}`, value: JSON.stringify({ name: smerniceName, content: smerniceContent }), updated_by: user.id });
                  toast.success('Uloženo'); setSmerniceName(''); setSmerniceContent(''); loadAll();
                }} className="btn-alik-primary text-sm">Uložit</button>
              </div>
            )}
            {settingsData.filter(s => s.key.startsWith('smernice_')).map(s => {
              const parsed = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
              return <div key={s.id} className="panel-card"><h4 className="mt-0 text-sm">{(parsed as any)?.name}</h4><MarkdownRenderer content={(parsed as any)?.content || ''} /></div>;
            })}
          </div>
        );

      case 'zpravy':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">✉ Zprávy pro Alíka</h3>
            {blockMessages.map(m => (
              <div key={m.id} className="panel-card">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString('cs')}</span>
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.sent_to_alik ? 'bg-green-600 text-white' : 'bg-accent text-accent-foreground'}`}>
                      {m.sent_to_alik ? '✓ Odesláno' : '⏳ Čeká'}
                    </span>
                    <button onClick={() => setViewingMessage(viewingMessage === m.id ? null : m.id)} className="text-xs font-bold px-2 py-1 rounded-lg bg-secondary text-secondary-foreground">
                      {viewingMessage === m.id ? 'Skrýt' : 'Zobrazit'}
                    </button>
                    {!m.sent_to_alik && (
                      <button onClick={async () => { await supabase.from('block_messages').update({ sent_to_alik: true }).eq('id', m.id); toast.success('Označeno'); loadAll(); }} className="text-xs font-bold px-2 py-1 rounded-lg bg-green-600 text-white">✓</button>
                    )}
                  </div>
                </div>
                {viewingMessage === m.id && <div className="border border-border rounded-xl p-3 mt-2 bg-muted/30"><MarkdownRenderer content={m.message_text} /></div>}
              </div>
            ))}
            {blockMessages.length === 0 && <p className="text-muted-foreground text-sm">Žádné zprávy.</p>}
          </div>
        );

      case 'zadosti':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">📩 Žádosti</h3>
            {blocks.filter(b => b.appeal_status === 'pending').map(b => (
              <div key={b.id} className="catalog-item-card items-center border-l-4 border-accent">
                <div className="flex-1"><strong>{getUserName(b.user_id)}</strong><p className="text-xs text-muted-foreground mt-1">{b.appeal_text?.slice(0, 100)}</p></div>
                <div className="flex gap-1.5">
                  <button onClick={() => approveAppeal(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg bg-green-600 text-white">✓</button>
                  <button onClick={() => rejectAppeal(b.id, 'Zamítnuto.')} className="text-xs font-bold px-2 py-1 rounded-lg bg-destructive text-destructive-foreground">✗</button>
                </div>
              </div>
            ))}
            {blocks.filter(b => b.appeal_status === 'pending').length === 0 && <p className="text-muted-foreground text-sm">Žádné čekající žádosti.</p>}
          </div>
        );

      case 'dotazy':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">❓ Doučování ({questions.length})</h3>
            {questions.map(q => (
              <div key={q.id} className="catalog-item-card"><div className="flex-1"><strong>{q.question.slice(0, 80)}</strong><span className="text-xs ml-2 text-muted-foreground">{getUserName(q.user_id)}</span></div><span className={`text-xs font-bold ${q.status === 'pending' ? 'text-accent-foreground' : 'text-green-600'}`}>{q.status}</span></div>
            ))}
          </div>
        );

      case 'rozvrh':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">📅 Rozvrh ({scheduleItems.length})</h3>
            {['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'].map(day => {
              const items = scheduleItems.filter(s => s.day_of_week === day);
              if (!items.length) return null;
              return <div key={day}><h4 className="text-xs font-bold uppercase text-muted-foreground mt-2">{day}</h4>{items.map(s => <div key={s.id} className="schedule-item-card mb-1"><strong>{s.title}</strong><span>{s.time_slot} {s.room && `• ${s.room}`}</span></div>)}</div>;
            })}
          </div>
        );

      case 'vypisky':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">📝 Výpisky ({notes.length})</h3>
            {notes.map(n => (
              <div key={n.id} className="catalog-item-card items-center"><div className="flex-1"><strong>{n.title}</strong><span className="text-xs ml-2 text-muted-foreground">{getUserName(n.user_id)}</span></div><span className="text-xs">{n.is_public ? '🌐' : '🔒'}</span></div>
            ))}
          </div>
        );

      case 'export':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">📤 Export</h3>
            <div className="grid grid-cols-2 gap-2">
              {[{ label: 'Kurzy', data: courses }, { label: 'Fakulty', data: faculties }, { label: 'Uživatelé', data: users }, { label: 'Blokace', data: blocks }, { label: 'Oznámení', data: announcements }, { label: 'Rozvrh', data: scheduleItems }].map(({ label, data }) => (
                <button key={label} className="btn-alik-outline text-sm" onClick={() => { const b = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `${label.toLowerCase()}.json`; a.click(); URL.revokeObjectURL(u); toast.success(`${label} exportovány`); }}>📤 {label}</button>
              ))}
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">📥 Import</h3>
            <input type="file" accept=".json" onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              try { const data = JSON.parse(await file.text()); if (!Array.isArray(data)) { toast.error('Neplatný formát'); return; }
                for (const item of data) { if (item.title) await supabase.from('courses').insert({ title: item.title, description: item.description || null, difficulty: item.difficulty || 'beginner' }); }
                toast.success(`Importováno ${data.length}`); loadAll();
              } catch { toast.error('Chyba'); }
            }} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none" />
          </div>
        );

      case 'hromadne':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">⚡ Hromadné akce</h3>
            <div className="grid gap-2">
              <button className="btn-alik-outline text-sm" onClick={async () => { await supabase.from('announcements').update({ is_active: false }).eq('is_active', true); toast.success('Deaktivováno'); loadAll(); }}>Deaktivovat oznámení</button>
              <button className="btn-alik-outline text-sm" onClick={bulkUnblockExpired}>♻ Odblokovat vypršelé</button>
              <button className="btn-alik-outline text-sm" onClick={async () => { for (const r of reports.filter(r => r.status === 'pending')) { await resolveReport(r.id); } toast.success('Vyřešeno'); }}>Vyřešit reporty</button>
            </div>
          </div>
        );

      case 'harmonogram':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">🗓 Harmonogram</h3>
            {blocks.filter(b => b.review_scheduled_at && b.is_active).map(b => (
              <div key={b.id} className="schedule-item-card"><div><strong>{getUserName(b.user_id)}</strong> — revize</div><span>{new Date(b.review_scheduled_at).toLocaleDateString('cs')}</span></div>
            ))}
            {blocks.filter(b => b.review_scheduled_at && b.is_active).length === 0 && <p className="text-muted-foreground text-sm">Žádné naplánované revize.</p>}
          </div>
        );

      case 'bezpecnost':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">🛡 Bezpečnost</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { v: getBlockStats().active, l: 'blokací', danger: getBlockStats().active > 0 },
                { v: getBlockStats().escalated, l: 'eskalovaných' },
                { v: reports.filter(r => r.status === 'pending').length, l: 'reportů', danger: true },
                { v: auditLogs.length, l: 'audit záznamů' },
              ].map((s, i) => (
                <div key={i} className="stat-card text-center"><strong className={`block text-xl ${(s as any).danger ? 'text-destructive' : 'text-primary'}`}>{s.v}</strong><span className="text-xs text-muted-foreground">{s.l}</span></div>
              ))}
            </div>
          </div>
        );

      case 'kapacity':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">👥 Kapacity</h3>
            {courses.map(c => {
              const enrolled = enrollments.filter(e => e.course_id === c.id).length;
              const max = c.max_students || 30;
              const pct = Math.round((enrolled / max) * 100);
              return (
                <div key={c.id} className="catalog-item-card items-center">
                  <div className="flex-1"><strong>{c.title}</strong><span className="text-xs ml-2">{enrolled}/{max}</span></div>
                  <div className="w-20 h-2 rounded-full overflow-hidden bg-muted"><div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? 'hsl(var(--destructive))' : pct > 70 ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-2))' }} /></div>
                </div>
              );
            })}
          </div>
        );

      case 'klubovny':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">🏠 Klubovny</h3>
            {faculties.map(f => <div key={f.id} className="catalog-item-card"><strong>{f.name}</strong><span className="text-xs">{f.icon || '🏠'}</span></div>)}
          </div>
        );

      case 'plany':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">🗺 Studijní plány</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card text-center"><strong className="block text-xl text-primary">{courses.length}</strong><span className="text-xs text-muted-foreground">kurzů</span></div>
              <div className="stat-card text-center"><strong className="block text-xl text-primary">{enrollments.length}</strong><span className="text-xs text-muted-foreground">zápisů</span></div>
            </div>
          </div>
        );

      case 'hodnoceni':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0 text-lg font-extrabold">⭐ Hodnocení</h3>
            {courses.map(c => (
              <div key={c.id} className="catalog-item-card items-center"><div className="flex-1"><strong>{c.title}</strong>{c.lektor_id && <span className="text-xs ml-2">👨‍🏫 {getUserName(c.lektor_id)}</span>}</div><span className="text-xs">⭐ —</span></div>
            ))}
          </div>
        );

      case 'emailove-sablony':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">📧 E-mailové šablony</h3>
            {emailTemplates.map((tpl, i) => (
              <div key={i} className="panel-card">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="mt-0 text-sm">{tpl.name}</h4>
                  <button onClick={() => setEditingTemplate(editingTemplate === i ? null : i)} className="text-xs font-bold px-2 py-1 rounded-lg bg-accent text-accent-foreground">{editingTemplate === i ? 'Zavřít' : '✏'}</button>
                </div>
                {editingTemplate === i ? (
                  <div className="grid gap-2">
                    <input value={tpl.subject} onChange={e => { const t = [...emailTemplates]; t[i] = { ...t[i], subject: e.target.value }; setEmailTemplates(t); }} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none" />
                    <textarea value={tpl.body} onChange={e => { const t = [...emailTemplates]; t[i] = { ...t[i], body: e.target.value }; setEmailTemplates(t); }} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[80px] font-mono" />
                    <div className="border border-border rounded-xl p-3 bg-muted/30"><MarkdownRenderer content={tpl.body} /></div>
                    <button onClick={async () => {
                      if (!user) return;
                      await supabase.from('system_settings').upsert({ key: `email_tpl_${i}`, value: JSON.stringify(tpl), updated_by: user.id }, { onConflict: 'key' });
                      toast.success('Uloženo'); setEditingTemplate(null);
                    }} className="btn-alik-primary text-xs">Uložit</button>
                  </div>
                ) : (
                  <div><p className="text-xs text-muted-foreground">Předmět: <strong>{tpl.subject}</strong></p><div className="mt-2 border border-border rounded-xl p-2 bg-muted/30"><MarkdownRenderer content={tpl.body} /></div></div>
                )}
              </div>
            ))}
          </div>
        );

      case 'integrace':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">🔗 Integrace</h3>
            {[
              { name: 'Alík.cz', desc: 'Přenos blokačních zpráv', icon: '🌐' },
              { name: 'Blokační systém', desc: 'Automatické generování zpráv', icon: '🚫' },
              { name: 'Notifikace', desc: 'Push notifikace', icon: '🔔' },
              { name: 'Moderace obrázků', desc: 'Kontrola nahrávaných obrázků', icon: '🖼️' },
              { name: 'Fórum', desc: 'Diskuzní moderace', icon: '💬' },
              { name: 'Doučování', desc: 'Q&A systém', icon: '❓' },
            ].map((integ, i) => (
              <div key={i} className="catalog-item-card items-center">
                <div className="flex-1"><strong>{integ.icon} {integ.name}</strong><p className="text-xs text-muted-foreground mt-0.5">{integ.desc}</p></div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-600 text-white">Aktivní</span>
              </div>
            ))}
          </div>
        );

      case 'nastaveni':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">⚙ Konfigurace</h3>
            {isDeveloper && (
              <div className="panel-card border-l-4 border-primary">
                <div className="flex gap-2">
                  <input placeholder="Klíč" value={newSettingKey} onChange={e => setNewSettingKey(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none flex-1" />
                  <input placeholder="Hodnota" value={newSettingValue} onChange={e => setNewSettingValue(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none flex-1" />
                  <button onClick={saveSetting} className="btn-alik-primary text-xs">Uložit</button>
                </div>
              </div>
            )}
            {settingsData.map(s => (
              <div key={s.id} className="catalog-item-card items-center"><strong className="text-xs">{s.key}</strong><span className="text-xs text-muted-foreground">{typeof s.value === 'string' ? s.value.slice(0, 40) : JSON.stringify(s.value).slice(0, 40)}</span></div>
            ))}
          </div>
        );

      case 'styly-stranek':
        return (
          <div className="grid gap-4">
            <div>
              <h3 className="mt-0 text-lg font-extrabold">🎨 Napoutávání obsahu &amp; Styly stránek</h3>
              <p className="text-sm text-muted-foreground mb-1">Přiřaďte vlastní CSS styly na libovolnou stránku (inspirováno stylem <strong>Alíka</strong>). CSS třída se přidá na <code>&lt;body&gt;</code>, takže můžete stylovat celou stránku.</p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <span className="px-2 py-1 rounded-full font-bold" style={{ background: '#e8fde8', color: '#166534' }}>✅ Wildcard cesty (/kurzy/*)</span>
                <span className="px-2 py-1 rounded-full font-bold" style={{ background: '#fff7ed', color: '#9a3412' }}>🎯 Body class injection</span>
                <span className="px-2 py-1 rounded-full font-bold" style={{ background: '#f0f4ff', color: '#3b52a0' }}>🔄 Live přepínání</span>
              </div>
            </div>

            {/* Example snippets */}
            <details className="panel-card border-l-4 border-accent cursor-pointer">
              <summary className="font-bold text-sm">📖 Příklady CSS (styl Alíka)</summary>
              <div className="mt-2 grid gap-2 text-xs font-mono">
                <div className="bg-muted/50 p-2 rounded-lg">
                  <p className="font-bold text-foreground mb-1">Zelené pozadí titulky:</p>
                  <code>{`.titulka .content { background: linear-gradient(180deg, rgba(230,246,174,1), rgba(255,255,255,0.85)); }`}</code>
                </div>
                <div className="bg-muted/50 p-2 rounded-lg">
                  <p className="font-bold text-foreground mb-1">Fialový blok (vtipy):</p>
                  <code>{`.vtip-obal { background-color: #F7E8FE; box-shadow: 0 0 0.75em rgba(187,68,238,0.2); }`}</code>
                </div>
                <div className="bg-muted/50 p-2 rounded-lg">
                  <p className="font-bold text-foreground mb-1">Kalendář blok:</p>
                  <code>{`.minikalendar { background: #FEC; border-spacing: 0; }`}</code>
                </div>
              </div>
            </details>

            {/* New style form */}
            <div className="panel-card border-l-4 border-primary">
              <h4 className="mt-0 mb-2 text-sm font-extrabold">➕ Přidat nový styl</h4>
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Cesta stránky (např. /kurzy)" value={newStylePath} onChange={e => setNewStylePath(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                  <input placeholder="CSS třída pro body (volitelné)" value={newStyleClass} onChange={e => setNewStyleClass(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                </div>
                <input placeholder="Popis stylu (volitelné)" value={newStyleDesc} onChange={e => setNewStyleDesc(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                <textarea placeholder={`/* Váš CSS sem */\n.moje-trida .panel-card {\n  background: #ffe;\n  border-radius: 1em;\n}`} value={newStyleCSS} onChange={e => setNewStyleCSS(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[140px] font-mono focus:border-secondary transition-colors" />
                {newStyleCSS && (
                  <details className="animate-fade-in">
                    <summary className="text-xs font-bold cursor-pointer text-muted-foreground">👁 Náhled CSS</summary>
                    <div className="mt-2 p-3 rounded-xl border border-dashed border-border bg-muted/30">
                      <style dangerouslySetInnerHTML={{ __html: `.preview-scope { ${newStyleCSS.slice(0, 2000)} }` }} />
                      <div className="preview-scope">
                        <div className="panel-card !p-3">
                          <h4 className="mt-0 text-sm">Ukázkový panel</h4>
                          <p className="text-xs text-muted-foreground">Takto bude vypadat obsah se stylem.</p>
                        </div>
                      </div>
                    </div>
                  </details>
                )}
                <button onClick={async () => {
                  if (!newStylePath || !newStyleCSS || !user) return;
                  const { error } = await supabase.from('page_styles').insert({ page_path: newStylePath, css_content: newStyleCSS, class_name: newStyleClass || null, description: newStyleDesc || null, updated_by: user.id });
                  if (error) toast.error(error.message);
                  else {
                    await recordHistory('page_style', 'new', user.id, 'create', { path: newStylePath, class_name: newStyleClass || '—' });
                    toast.success('Styl přidán'); setNewStylePath(''); setNewStyleClass(''); setNewStyleCSS(''); setNewStyleDesc(''); loadAll();
                  }
                }} className="btn-alik-primary text-xs w-fit">🎨 Přidat styl</button>
              </div>
            </div>

            {/* List existing styles */}
            <h4 className="mt-0 text-sm font-extrabold">📋 Existující styly ({pageStyles.length})</h4>
            {pageStyles.map((ps: any) => (
              <div key={ps.id} className="catalog-item-card flex-col gap-2" style={{ borderLeft: `4px solid ${ps.is_active ? '#22c55e' : '#ef4444'}` }}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-sm font-mono">{ps.page_path}</strong>
                    {ps.class_name && <span className="text-xs font-mono bg-accent/10 text-accent px-1.5 py-0.5 rounded">.{ps.class_name}</span>}
                    {ps.description && <span className="text-xs text-muted-foreground italic">— {ps.description}</span>}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={async () => {
                      await supabase.from('page_styles').update({ is_active: !ps.is_active }).eq('id', ps.id);
                      if (user) await recordHistory('page_style', ps.id, user.id, ps.is_active ? 'unpublish' : 'publish', { path: ps.page_path });
                      loadAll();
                    }} className="text-xs font-bold px-2 py-1 rounded-lg transition-all hover:brightness-95" style={{ background: ps.is_active ? '#e8fde8' : '#fde8e8', color: ps.is_active ? '#166534' : '#991b1b' }}>
                      {ps.is_active ? '✅ Aktivní' : '❌ Neaktivní'}
                    </button>
                    <button onClick={() => { setEditingStyleId(ps.id); setEditStyleCSS(ps.css_content); }} className="text-xs font-bold px-2 py-1 rounded-lg hover:brightness-95 transition-all" style={{ background: '#fef3c7', color: '#92400e' }}>✏</button>
                    <button onClick={async () => {
                      if (!confirm('Opravdu smazat tento styl?')) return;
                      await supabase.from('page_styles').delete().eq('id', ps.id);
                      if (user) await recordHistory('page_style', ps.id, user.id, 'delete', { path: ps.page_path });
                      toast.success('Styl smazán'); loadAll();
                    }} className="text-xs font-bold px-2 py-1 rounded-lg hover:brightness-95 transition-all" style={{ background: '#fde8e8', color: '#991b1b' }}>🗑</button>
                  </div>
                </div>
                {editingStyleId === ps.id ? (
                  <div className="w-full grid gap-2 mt-2 animate-fade-in">
                    <textarea value={editStyleCSS} onChange={e => setEditStyleCSS(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[140px] font-mono w-full focus:border-secondary transition-colors" />
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        await supabase.from('page_styles').update({ css_content: editStyleCSS, updated_by: user?.id }).eq('id', ps.id);
                        if (user) await recordHistory('page_style', ps.id, user.id, 'update', { path: ps.page_path });
                        toast.success('Styl uložen'); setEditingStyleId(null); loadAll();
                      }} className="btn-alik-primary text-xs">💾 Uložit</button>
                      <button onClick={() => setEditingStyleId(null)} className="btn-alik-outline text-xs">Zrušit</button>
                    </div>
                  </div>
                ) : (
                  <pre className="text-xs font-mono bg-muted/50 p-2 rounded-lg w-full overflow-x-auto mt-1 max-h-[100px] overflow-y-auto whitespace-pre-wrap">{ps.css_content.slice(0, 400)}{ps.css_content.length > 400 ? '...' : ''}</pre>
                )}
                <ChangeHistory entityType="page_style" entityId={ps.id} />
              </div>
            ))}
          </div>
        );

      case 'obsahove-boxy': {
        const PRESET_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
          announcement: { label: 'Oznámení', emoji: '📢', color: '#8b6914' },
          contest: { label: 'Soutěž', emoji: '🏆', color: '#b8860b' },
          joke: { label: 'Vtip', emoji: '😄', color: '#7c3aed' },
          article: { label: 'Článek', emoji: '📰', color: '#3d6b00' },
          promo: { label: 'Promo', emoji: '🔵', color: '#1a5aa0' },
          warning: { label: 'Varování', emoji: '⚠️', color: '#991b1b' },
          custom: { label: 'Vlastní', emoji: '🎨', color: '#666' },
        };
        const PAGES = ['/', '/kurzy', '/fakulty', '/rozvrh', '/studium', '/vypisky', '/doucovani', '/profil', '*'];
        return (
          <div className="grid gap-4">
            <div>
              <h3 className="mt-0 text-lg font-extrabold">📦 Obsahové boxy</h3>
              <p className="text-sm text-muted-foreground">Připněte stylizované boxíky s obsahem na libovolnou stránku. Inspirováno stylem Alíka (soutěže, oznámení, vtipy, články).</p>
            </div>

            {/* Preview of preset styles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(PRESET_LABELS).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: key === 'contest' ? '#fffbe0' : key === 'joke' ? '#f7e8fe' : key === 'article' ? '#eefacc' : key === 'promo' ? '#e8f0ff' : key === 'warning' ? '#fde8e8' : '#fff7cc', color: val.color }}>
                  <span>{val.emoji}</span> {val.label}
                </div>
              ))}
            </div>

            {/* New block form */}
            <div className="panel-card border-l-4 border-primary">
              <h4 className="mt-0 mb-2 text-sm font-extrabold">➕ Přidat nový box</h4>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 gap-2">
                  <select value={newBlock.page_path} onChange={e => setNewBlock({ ...newBlock, page_path: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card focus:border-secondary transition-colors">
                    {PAGES.map(p => <option key={p} value={p}>{p === '*' ? 'Všechny stránky' : p}</option>)}
                  </select>
                  <select value={newBlock.style_preset} onChange={e => setNewBlock({ ...newBlock, style_preset: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card focus:border-secondary transition-colors">
                    {Object.entries(PRESET_LABELS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                  </select>
                  <select value={newBlock.position} onChange={e => setNewBlock({ ...newBlock, position: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card focus:border-secondary transition-colors">
                    <option value="top">⬆ Nahoře</option>
                    <option value="bottom">⬇ Dole</option>
                    <option value="sidebar">📎 Sidebar</option>
                  </select>
                </div>
                <input placeholder="Nadpis boxu" value={newBlock.title} onChange={e => setNewBlock({ ...newBlock, title: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                <textarea placeholder="Obsah (Markdown)..." value={newBlock.content} onChange={e => setNewBlock({ ...newBlock, content: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[80px] font-mono focus:border-secondary transition-colors" />
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="URL obrázku (volitelné)" value={newBlock.image_url} onChange={e => setNewBlock({ ...newBlock, image_url: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                  <input placeholder="URL odkazu (volitelné)" value={newBlock.link_url} onChange={e => setNewBlock({ ...newBlock, link_url: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                </div>
                {newBlock.link_url && (
                  <input placeholder="Text odkazu (např. Více →)" value={newBlock.link_text} onChange={e => setNewBlock({ ...newBlock, link_text: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors" />
                )}
                {newBlock.style_preset === 'custom' && (
                  <textarea placeholder="Vlastní CSS" value={newBlock.custom_css} onChange={e => setNewBlock({ ...newBlock, custom_css: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[60px] font-mono focus:border-secondary transition-colors" />
                )}
                <button onClick={async () => {
                  if (!newBlock.title || !user) return;
                  const { error } = await supabase.from('content_blocks').insert({
                    ...newBlock,
                    link_url: newBlock.link_url || null,
                    link_text: newBlock.link_text || null,
                    image_url: newBlock.image_url || null,
                    custom_css: newBlock.custom_css || null,
                    created_by: user.id,
                  });
                  if (error) toast.error(error.message);
                  else {
                    await recordHistory('content_block', 'new', user.id, 'create', { title: newBlock.title, page: newBlock.page_path });
                    toast.success('Box přidán');
                    setNewBlock({ page_path: '/', title: '', content: '', style_preset: 'announcement', position: 'top', link_url: '', link_text: '', image_url: '', custom_css: '' });
                    loadAll();
                  }
                }} className="btn-alik-primary text-xs w-fit">📦 Přidat box</button>
              </div>
            </div>

            {/* Existing blocks */}
            <h4 className="mt-0 text-sm font-extrabold">📋 Existující boxy ({contentBlocks.length})</h4>
            {contentBlocks.map((cb: any) => {
              const preset = PRESET_LABELS[cb.style_preset] || PRESET_LABELS.custom;
              const isEditing = editingBlockId === cb.id;
              return (
                <div key={cb.id} className="catalog-item-card flex-col gap-2" style={{ borderLeft: `4px solid ${cb.is_active ? preset.color : '#ccc'}`, opacity: cb.is_active ? 1 : 0.6 }}>
                  <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">{preset.emoji}</span>
                      <strong className="text-sm">{cb.title || '(bez názvu)'}</strong>
                      <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{cb.page_path}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: preset.color + '20', color: preset.color }}>{preset.label}</span>
                      <span className="text-xs text-muted-foreground">{cb.position === 'top' ? '⬆' : cb.position === 'bottom' ? '⬇' : '📎'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={async () => {
                        await supabase.from('content_blocks').update({ is_active: !cb.is_active }).eq('id', cb.id);
                        if (user) await recordHistory('content_block', cb.id, user.id, cb.is_active ? 'unpublish' : 'publish', { title: cb.title });
                        loadAll();
                      }} className="text-xs font-bold px-2 py-1 rounded-lg transition-all hover:brightness-95" style={{ background: cb.is_active ? '#e8fde8' : '#fde8e8', color: cb.is_active ? '#166534' : '#991b1b' }}>
                        {cb.is_active ? '✅' : '❌'}
                      </button>
                      <button onClick={() => {
                        if (isEditing) { setEditingBlockId(null); } else { setEditingBlockId(cb.id); setBlockEdit({ title: cb.title, content: cb.content, style_preset: cb.style_preset, link_url: cb.link_url || '', link_text: cb.link_text || '', image_url: cb.image_url || '', custom_css: cb.custom_css || '', position: cb.position, page_path: cb.page_path }); }
                      }} className="text-xs font-bold px-2 py-1 rounded-lg hover:brightness-95 transition-all" style={{ background: '#fef3c7', color: '#92400e' }}>✏</button>
                      <button onClick={async () => {
                        if (!confirm('Smazat tento box?')) return;
                        await supabase.from('content_blocks').delete().eq('id', cb.id);
                        if (user) await recordHistory('content_block', cb.id, user.id, 'delete', { title: cb.title });
                        toast.success('Box smazán'); loadAll();
                      }} className="text-xs font-bold px-2 py-1 rounded-lg hover:brightness-95 transition-all" style={{ background: '#fde8e8', color: '#991b1b' }}>🗑</button>
                    </div>
                  </div>
                  {cb.content && !isEditing && (
                    <p className="text-xs text-muted-foreground w-full truncate">{cb.content.slice(0, 100)}{cb.content.length > 100 ? '...' : ''}</p>
                  )}
                  {isEditing && (
                    <div className="w-full grid gap-2 mt-2 animate-fade-in">
                      <div className="grid grid-cols-3 gap-2">
                        <select value={blockEdit.page_path} onChange={e => setBlockEdit({ ...blockEdit, page_path: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                          {PAGES.map(p => <option key={p} value={p}>{p === '*' ? 'Všechny stránky' : p}</option>)}
                        </select>
                        <select value={blockEdit.style_preset} onChange={e => setBlockEdit({ ...blockEdit, style_preset: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                          {Object.entries(PRESET_LABELS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                        </select>
                        <select value={blockEdit.position} onChange={e => setBlockEdit({ ...blockEdit, position: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none bg-card">
                          <option value="top">⬆ Nahoře</option><option value="bottom">⬇ Dole</option><option value="sidebar">📎 Sidebar</option>
                        </select>
                      </div>
                      <input value={blockEdit.title} onChange={e => setBlockEdit({ ...blockEdit, title: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none" placeholder="Nadpis" />
                      <textarea value={blockEdit.content} onChange={e => setBlockEdit({ ...blockEdit, content: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[60px] font-mono" placeholder="Obsah (Markdown)" />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={blockEdit.image_url} onChange={e => setBlockEdit({ ...blockEdit, image_url: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none" placeholder="URL obrázku" />
                        <input value={blockEdit.link_url} onChange={e => setBlockEdit({ ...blockEdit, link_url: e.target.value })} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none" placeholder="URL odkazu" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          await supabase.from('content_blocks').update({
                            ...blockEdit,
                            link_url: blockEdit.link_url || null,
                            link_text: blockEdit.link_text || null,
                            image_url: blockEdit.image_url || null,
                            custom_css: blockEdit.custom_css || null,
                          }).eq('id', cb.id);
                          if (user) await recordHistory('content_block', cb.id, user.id, 'update', { title: blockEdit.title });
                          toast.success('Box uložen'); setEditingBlockId(null); loadAll();
                        }} className="btn-alik-primary text-xs">💾 Uložit</button>
                        <button onClick={() => setEditingBlockId(null)} className="btn-alik-outline text-xs">Zrušit</button>
                      </div>
                    </div>
                  )}
                  <ChangeHistory entityType="content_block" entityId={cb.id} />
                </div>
              );
            })}
          </div>
        );
      }

      case 'filtr-slov': {
        const wordsRow = settingsData.find((s: any) => s.key === 'profanity_words');
        const blockRow = settingsData.find((s: any) => s.key === 'profanity_autoblock');
        const currentWords: string[] = (wordsRow?.value as any)?.words ?? [];
        const autoBlock = (blockRow?.value as any) ?? { enabled: false, type: 'warning', reason: 'Automatická blokace za použití zakázaných slov', threshold: 3, duration: 24 };

        const saveWords = async (words: string[]) => {
          const val = { words };
          if (wordsRow) {
            await supabase.from('system_settings').update({ value: val as any, updated_by: user?.id }).eq('id', wordsRow.id);
          } else {
            await supabase.from('system_settings').insert({ key: 'profanity_words', value: val as any, updated_by: user?.id });
          }
          invalidateProfanityCache();
          loadAll();
          toast.success('Seznam slov uložen');
        };

        const saveAutoBlock = async (ab: any) => {
          if (blockRow) {
            await supabase.from('system_settings').update({ value: ab as any, updated_by: user?.id }).eq('id', blockRow.id);
          } else {
            await supabase.from('system_settings').insert({ key: 'profanity_autoblock', value: ab as any, updated_by: user?.id });
          }
          invalidateProfanityCache();
          loadAll();
          toast.success('Nastavení autoblokace uloženo');
        };

        return (
          <div className="grid gap-4">
            <h3 className="mt-0 text-lg font-extrabold">🤬 Filtr sprostých slov</h3>
            <p className="text-sm text-muted-foreground">Zakázaná slova se kontrolují ve všech textových polích (fórum, doučování, oznámení, profil atd.). Při nalezení se příspěvek nepošle a zobrazí se varování.</p>

            {/* Word list */}
            <div className="panel-card border-l-4 border-destructive">
              <h4 className="mt-0 mb-2 text-sm font-extrabold">📝 Zakázaná slova</h4>
              <p className="text-xs text-muted-foreground mb-2">Jedno slovo / fráze na řádek. Filtr ignoruje diakritiku a velikost písmen.</p>
              <textarea
                defaultValue={currentWords.join('\n')}
                id="profanity-words-input"
                className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none w-full min-h-[120px] font-mono focus:border-destructive transition-colors"
                placeholder={"blbec\nidiote\nsprosté slovo"}
              />
              <button
                onClick={() => {
                  const el = document.getElementById('profanity-words-input') as HTMLTextAreaElement;
                  const words = el.value.split('\n').map(w => w.trim()).filter(Boolean);
                  saveWords(words);
                }}
                className="btn-alik-primary text-xs mt-2"
              >💾 Uložit seznam slov</button>
              <p className="text-xs text-muted-foreground mt-1">Aktuálně: <strong>{currentWords.length}</strong> slov</p>
            </div>

            {/* Auto-block settings */}
            <div className="panel-card border-l-4 border-amber-500">
              <h4 className="mt-0 mb-2 text-sm font-extrabold">⚡ Automatická blokace</h4>
              <p className="text-xs text-muted-foreground mb-3">Po dosažení zadaného počtu porušení za 24 hodin se uživatel automaticky zablokuje.</p>
              <div className="grid gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBlock.enabled}
                    onChange={e => saveAutoBlock({ ...autoBlock, enabled: e.target.checked })}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm font-bold">Automatická blokace zapnuta</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Typ blokace</label>
                    <select
                      value={autoBlock.type}
                      onChange={e => saveAutoBlock({ ...autoBlock, type: e.target.value })}
                      className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none w-full bg-card"
                    >
                      <option value="warning">⚠️ Varování</option>
                      <option value="partial">🚧 Částečná</option>
                      <option value="full">🚫 Úplná</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Práh (porušení/24h)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={autoBlock.threshold}
                      onChange={e => saveAutoBlock({ ...autoBlock, threshold: parseInt(e.target.value) || 3 })}
                      className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Doba blokace (hodiny, 0 = trvalá)</label>
                    <input
                      type="number"
                      min={0}
                      value={autoBlock.duration}
                      onChange={e => saveAutoBlock({ ...autoBlock, duration: parseInt(e.target.value) || 0 })}
                      className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Důvod blokace</label>
                    <input
                      value={autoBlock.reason}
                      onChange={e => saveAutoBlock({ ...autoBlock, reason: e.target.value })}
                      className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent violations from audit log */}
            <div className="panel-card">
              <h4 className="mt-0 mb-2 text-sm font-extrabold">📋 Poslední porušení</h4>
              {auditLogs.filter((a: any) => a.action === 'profanity_violation').length === 0 ? (
                <p className="text-xs text-muted-foreground">Žádná porušení.</p>
              ) : (
                <div className="grid gap-1 max-h-[200px] overflow-y-auto">
                  {auditLogs.filter((a: any) => a.action === 'profanity_violation').slice(0, 20).map((a: any) => {
                    const u = users.find((u: any) => u.user_id === a.user_id);
                    return (
                      <div key={a.id} className="catalog-item-card items-center">
                        <span className="text-xs font-bold">{u?.display_name || 'Neznámý'}</span>
                        <span className="text-xs text-destructive font-mono">{((a.details as any)?.words ?? []).join(', ')}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString('cs')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      }

      default:
        return <div className="panel-card"><h3 className="mt-0">{allTabs.find(t => t.key === activeTab)?.icon} {allTabs.find(t => t.key === activeTab)?.label}</h3><p className="text-muted-foreground">Modul je aktivní.</p></div>;
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
