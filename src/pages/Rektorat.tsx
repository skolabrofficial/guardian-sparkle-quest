import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ImageModeration from '@/components/ImageModeration';
import ImageUploader from '@/components/ImageUploader';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { nameWithRole, getRoleSymbol, ROLE_COLORS, ROLE_LABELS } from '@/lib/roleUtils';

type Tab = 'prehled' | 'kurzy' | 'lektori' | 'studenti' | 'fakulty' | 'rozvrh' | 'dotazy' | 'vypisky' | 'oznameni' | 'reporty' | 'audit' | 'nastaveni' | 'notifikace' | 'role' | 'statistiky' | 'rozpocet' | 'smernice' | 'zpravy' | 'zadosti' | 'kvalita' | 'export' | 'import' | 'hromadne' | 'harmonogram' | 'bezpecnost' | 'klubovny' | 'kapacity' | 'mentori' | 'plany' | 'hodnoceni' | 'blokace' | 'forum' | 'emailove-sablony' | 'integrace' | 'obrazky' | 'odeslat-notifikaci';

const tabGroups: { group: string; items: { key: Tab; label: string; icon: string }[] }[] = [
  { group: '📊 Přehled', items: [
    { key: 'prehled', label: 'Dashboard', icon: '📊' },
    { key: 'statistiky', label: 'Statistiky', icon: '📈' },
    { key: 'kvalita', label: 'Kvalita', icon: '✅' },
  ]},
  { group: '👥 Uživatelé', items: [
    { key: 'studenti', label: 'Studenti', icon: '🎓' },
    { key: 'lektori', label: 'Lektoři', icon: '👨‍🏫' },
    { key: 'mentori', label: 'Mentoři', icon: '🤝' },
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
  { group: '⚙ Systém', items: [
    { key: 'reporty', label: 'Hlášení', icon: '⚠' },
    { key: 'audit', label: 'Audit log', icon: '📋' },
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
  const [blocks, setBlocks] = useState<any[]>([]);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [blockMessages, setBlockMessages] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [stats, setStats] = useState({ courses: 0, faculties: 0, questions: 0, notes: 0, blocks: 0, forumPosts: 0 });

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

  useEffect(() => {
    if (!authLoading && !isStaff && !isDeveloper && !isLektor) navigate('/');
  }, [authLoading, isStaff, isDeveloper, isLektor]);

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
    setStats({
      courses: c.data?.length || 0,
      faculties: f.data?.length || 0,
      questions: q.data?.length || 0,
      notes: n.data?.length || 0,
      blocks: bl.data?.filter((b: any) => b.is_active).length || 0,
      forumPosts: fp.data?.length || 0,
    });
  };

  const getUserRole = (userId: string) => roles.find(r => r.user_id === userId)?.role || null;
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
    await supabase.from('user_roles').delete().eq('user_id', roleUserId);
    const { error } = await supabase.from('user_roles').insert({ user_id: roleUserId, role: roleValue as any });
    if (error) toast.error(error.message);
    else { toast.success('Role přiřazena'); loadAll(); }
  };

  const deleteCourse = async (id: string) => { await supabase.from('courses').delete().eq('id', id); toast.success('Kurz smazán'); loadAll(); };
  const deleteFaculty = async (id: string) => { await supabase.from('faculties').delete().eq('id', id); toast.success('Fakulta smazána'); loadAll(); };
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

  const lektors = users.filter(u => { const r = roles.find(r => r.user_id === u.user_id); return r && ['lektor', 'dohledci', 'developer'].includes(r.role); });

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
              {auditLogs.slice(0, 5).map(l => (
                <div key={l.id} className="text-xs py-1.5 border-b border-border last:border-0 flex justify-between">
                  <span><strong>{l.action}</strong> {l.user_id && <span className="text-muted-foreground">— {getUserName(l.user_id)}</span>}</span>
                  <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString('cs')}</span>
                </div>
              ))}
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
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">📚 Správa kurzů ({courses.length})</h3>
            {courses.map(c => (
              <div key={c.id} className="catalog-item-card items-center">
                <div className="flex-1">
                  <strong>{c.title}</strong>
                  <span className="text-xs text-muted-foreground ml-2">{c.day_of_week} {c.time_slot}</span>
                  {c.lektor_id && <span className="text-xs ml-2 text-secondary-foreground">👨‍🏫 {getUserName(c.lektor_id)}</span>}
                  <span className="text-xs ml-2 text-muted-foreground">({enrollments.filter(e => e.course_id === c.id).length} st.)</span>
                </div>
                <div className="flex gap-1.5">
                  {isDeveloper && <button className="text-xs font-bold px-2 py-1 rounded-lg bg-accent text-accent-foreground" onClick={() => { setAssignLektorCourseId(c.id); setSelectedLektor(c.lektor_id || ''); }}>👨‍🏫</button>}
                  <button className="btn-alik-outline text-xs" onClick={() => deleteCourse(c.id)}>🗑</button>
                </div>
              </div>
            ))}
            {assignLektorCourseId && (
              <div className="panel-card mt-2 border-l-4 border-accent">
                <h4 className="mt-0 text-sm">Přiřadit lektora</h4>
                <select value={selectedLektor} onChange={e => setSelectedLektor(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none w-full">
                  <option value="">Vyberte lektora</option>
                  {lektors.map(l => <option key={l.user_id} value={l.user_id}>{l.display_name}</option>)}
                </select>
                <div className="flex gap-2 mt-2">
                  <button onClick={assignLektor} className="btn-alik-primary text-xs">Přiřadit</button>
                  <button onClick={() => setAssignLektorCourseId(null)} className="btn-alik-outline text-xs">Zrušit</button>
                </div>
              </div>
            )}
          </div>
        );

      case 'fakulty':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0 text-lg font-extrabold">🏛 Fakulty ({faculties.length})</h3>
            {faculties.map(f => (
              <div key={f.id} className="catalog-item-card items-center">
                <div className="flex-1">
                  <strong>{f.name}</strong>
                  {f.dean_id && <span className="text-xs ml-2 text-secondary-foreground">🎓 {getUserName(f.dean_id)}</span>}
                  <span className="text-xs ml-2 text-muted-foreground">({courses.filter(c => c.faculty_id === f.id).length} kurzů)</span>
                </div>
                <div className="flex gap-1.5">
                  {isDeveloper && <button className="text-xs font-bold px-2 py-1 rounded-lg bg-accent text-accent-foreground" onClick={() => { setAssignDeanFacultyId(f.id); setSelectedDean(f.dean_id || ''); }}>🎓</button>}
                  <button className="btn-alik-outline text-xs" onClick={() => deleteFaculty(f.id)}>🗑</button>
                </div>
              </div>
            ))}
            {assignDeanFacultyId && (
              <div className="panel-card mt-2 border-l-4 border-accent">
                <h4 className="mt-0 text-sm">Přiřadit děkana</h4>
                <select value={selectedDean} onChange={e => setSelectedDean(e.target.value)} className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none w-full">
                  <option value="">Vyberte uživatele</option>
                  {lektors.map(l => <option key={l.user_id} value={l.user_id}>{l.display_name}</option>)}
                </select>
                <div className="flex gap-2 mt-2"><button onClick={assignDean} className="btn-alik-primary text-xs">Přiřadit</button><button onClick={() => setAssignDeanFacultyId(null)} className="btn-alik-outline text-xs">Zrušit</button></div>
              </div>
            )}
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
                      <option value="full">Plná</option><option value="partial">Částečná</option><option value="warning">Varování</option><option value="temporary">Dočasná</option>
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
            {blocks.map(b => (
              <div key={b.id}>
                <div className="catalog-item-card items-center cursor-pointer" onClick={() => setExpandedBlock(expandedBlock === b.id ? null : b.id)} style={{ borderLeft: `4px solid ${b.is_active ? 'hsl(var(--destructive))' : 'hsl(var(--chart-2))'}` }}>
                  <div className="flex-1">
                    <strong>{getUserName(b.user_id)}</strong>
                    <span className="text-xs ml-2">{b.reason.slice(0, 40)}</span>
                    {b.appeal_status === 'pending' && <span className="text-xs ml-2 font-bold text-accent-foreground">⏳</span>}
                    {b.escalated && <span className="text-xs ml-2 font-bold text-destructive">⚠</span>}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${b.is_active ? 'bg-destructive' : 'bg-green-600'}`}>{b.is_active ? 'Aktivní' : '✓'}</span>
                </div>
                {expandedBlock === b.id && (
                  <div className="p-3 rounded-b-xl text-sm grid gap-3 bg-muted/30 border-l-4 border-border">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Typ:</span> <strong>{b.block_type}</strong></div>
                      <div><span className="text-muted-foreground">Závažnost:</span> <strong>{b.severity}</strong></div>
                      <div><span className="text-muted-foreground">Trvalá:</span> <strong>{b.is_permanent ? 'Ano' : 'Ne'}</strong></div>
                      <div><span className="text-muted-foreground">Blokoval:</span> <strong>{getUserName(b.blocked_by)}</strong></div>
                    </div>
                    {b.details && <div className="text-xs bg-card p-2 rounded-xl"><MarkdownRenderer content={b.details} /></div>}
                    {b.is_active && (
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => unblockUser(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg bg-green-100 text-green-700">Odblokovat</button>
                        <button onClick={() => escalateBlock(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg bg-accent text-accent-foreground">Eskalovat</button>
                        <button onClick={() => sendWarning(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg bg-muted">Varování</button>
                        <button onClick={() => extendBlock(b.id, 7)} className="text-xs font-bold px-2 py-1 rounded-lg bg-muted">+7d</button>
                        <button onClick={() => makePermanent(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg bg-destructive/10 text-destructive">Trvalá</button>
                        <button onClick={() => regenerateBlockMessage(b)} className="text-xs font-bold px-2 py-1 rounded-lg bg-muted">📄 Zpráva</button>
                      </div>
                    )}
                    {b.appeal_status === 'pending' && (
                      <div className="grid gap-2 p-2 rounded-xl bg-accent/10 border border-accent/30">
                        <p className="text-xs"><strong>Odvolání:</strong> {b.appeal_text}</p>
                        <div className="flex gap-2">
                          <button onClick={() => approveAppeal(b.id)} className="text-xs font-bold px-3 py-1 rounded-lg bg-green-600 text-white">✓ Schválit</button>
                          <button onClick={() => setAppealReviewing(b.id)} className="text-xs font-bold px-3 py-1 rounded-lg bg-accent text-accent-foreground">Přezkoumat</button>
                          <button onClick={() => rejectAppeal(b.id, 'Zamítnuto.')} className="text-xs font-bold px-3 py-1 rounded-lg bg-destructive text-destructive-foreground">✗ Zamítnout</button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input placeholder="Interní poznámka" value={internalNoteText} onChange={e => setInternalNoteText(e.target.value)} className="border rounded-lg px-2 py-1 text-xs flex-1 outline-none" />
                      <button onClick={() => { addInternalNote(b.id, internalNoteText); setInternalNoteText(''); }} className="text-xs font-bold px-2 py-1 rounded-lg bg-primary text-primary-foreground">+</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
            {auditLogs.map(l => (
              <div key={l.id} className="catalog-item-card text-xs"><div className="flex-1"><strong>{l.action}</strong> <span className="text-muted-foreground">— {l.entity_type}</span>{l.user_id && <span className="ml-2">{getUserName(l.user_id)}</span>}</div><span className="text-muted-foreground">{new Date(l.created_at).toLocaleString('cs')}</span></div>
            ))}
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

      default:
        return <div className="panel-card"><h3 className="mt-0">{allTabs.find(t => t.key === activeTab)?.icon} {allTabs.find(t => t.key === activeTab)?.label}</h3><p className="text-muted-foreground">Modul je aktivní.</p></div>;
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Načítání...</div>;

  return (
    <AppLayout searchLabel="Rektorát" searchPlaceholder="Hledat v rektorátu..." searchTags={['kurzy', 'uživatelé', 'blokace']}>
      <main className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 items-start">
        {/* Sidebar */}
        <aside className="grid gap-1 max-h-[85vh] overflow-y-auto pr-1 sticky top-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Rektorát</h3>
            <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{allTabs.length}</span>
          </div>
          {tabGroups.map(g => (
            <div key={g.group} className="mb-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground px-2 py-1">{g.group}</p>
              {g.items.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`w-full text-left text-xs py-1.5 px-2.5 rounded-xl font-bold transition-all ${activeTab === t.key ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
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
