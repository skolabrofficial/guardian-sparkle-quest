import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type Tab = 'prehled' | 'kurzy' | 'lektori' | 'studenti' | 'fakulty' | 'rozvrh' | 'dotazy' | 'vypisky' | 'oznameni' | 'reporty' | 'audit' | 'nastaveni' | 'notifikace' | 'role' | 'statistiky' | 'rozpocet' | 'smernice' | 'zpravy' | 'zadosti' | 'kvalita' | 'export' | 'import' | 'hromadne' | 'harmonogram' | 'bezpecnost' | 'klubovny' | 'kapacity' | 'mentori' | 'plany' | 'hodnoceni' | 'blokace' | 'forum' | 'emailove-sablony' | 'integrace';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'prehled', label: 'Přehled', icon: '📊' },
  { key: 'kurzy', label: 'Správa kurzů', icon: '📚' },
  { key: 'fakulty', label: 'Správa fakult', icon: '🏛' },
  { key: 'lektori', label: 'Lektoři', icon: '👨‍🏫' },
  { key: 'studenti', label: 'Studenti', icon: '🎓' },
  { key: 'role', label: 'Uživatelská práva', icon: '🔑' },
  { key: 'blokace', label: 'Blokace uživatelů', icon: '🚫' },
  { key: 'forum', label: 'Správa fóra', icon: '💬' },
  { key: 'rozvrh', label: 'Správa rozvrhu', icon: '📅' },
  { key: 'dotazy', label: 'Doučování', icon: '❓' },
  { key: 'vypisky', label: 'Výpisky', icon: '📝' },
  { key: 'oznameni', label: 'Oznámení', icon: '📢' },
  { key: 'notifikace', label: 'Notifikace', icon: '🔔' },
  { key: 'reporty', label: 'Hlášení', icon: '⚠' },
  { key: 'audit', label: 'Auditní log', icon: '📋' },
  { key: 'statistiky', label: 'Statistiky', icon: '📈' },
  { key: 'rozpocet', label: 'Rozpočet', icon: '💰' },
  { key: 'smernice', label: 'Směrnice', icon: '📜' },
  { key: 'zpravy', label: 'Zprávy správcům', icon: '✉' },
  { key: 'zadosti', label: 'Žádosti', icon: '📩' },
  { key: 'kvalita', label: 'Kvalita', icon: '✅' },
  { key: 'export', label: 'Export', icon: '📤' },
  { key: 'import', label: 'Import', icon: '📥' },
  { key: 'hromadne', label: 'Hromadné', icon: '⚡' },
  { key: 'harmonogram', label: 'Harmonogram', icon: '🗓' },
  { key: 'bezpecnost', label: 'Bezpečnost', icon: '🛡' },
  { key: 'klubovny', label: 'Klubovny', icon: '🏠' },
  { key: 'kapacity', label: 'Kapacity', icon: '👥' },
  { key: 'mentori', label: 'Mentoři', icon: '🤝' },
  { key: 'plany', label: 'Plány', icon: '🗺' },
  { key: 'hodnoceni', label: 'Hodnocení', icon: '⭐' },
  { key: 'emailove-sablony', label: 'E-mailové šablony', icon: '📧' },
  { key: 'integrace', label: 'Integrace & API', icon: '🔗' },
  { key: 'nastaveni', label: 'Konfigurace', icon: '⚙' },
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

  const [assignLektorCourseId, setAssignLektorCourseId] = useState<string | null>(null);
  const [selectedLektor, setSelectedLektor] = useState('');
  const [assignDeanFacultyId, setAssignDeanFacultyId] = useState<string | null>(null);
  const [selectedDean, setSelectedDean] = useState('');

  // Settings
  const [settingsData, setSettingsData] = useState<any[]>([]);
  const [newSettingKey, setNewSettingKey] = useState('');
  const [newSettingValue, setNewSettingValue] = useState('');

  // Smernice (guidelines) 
  const [smerniceName, setSmerniceName] = useState('');
  const [smerniceContent, setSmerniceContent] = useState('');

  // Email templates
  const [emailTemplates, setEmailTemplates] = useState<{name: string; subject: string; body: string}[]>([
    { name: 'Uvítací e-mail', subject: 'Vítejte na Alíkově Univerzitě!', body: 'Dobrý den, **{{jmeno}}**!\n\nVítáme vás na Alíkově Univerzitě.' },
    { name: 'Blokace', subject: 'Váš účet byl zablokován', body: 'Dobrý den,\n\nváš účet byl zablokován z důvodu: **{{duvod}}**.' },
    { name: 'Odblokování', subject: 'Váš účet byl odblokován', body: 'Dobrý den,\n\nváš účet byl odblokován.' },
  ]);
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isStaff && !isDeveloper) navigate('/');
  }, [authLoading, isStaff, isDeveloper]);

  useEffect(() => {
    if (!user || (!isStaff && !isDeveloper)) return;
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
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20),
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

  const getUserName = (userId: string) => {
    const u = users.find(u => u.user_id === userId);
    return u?.display_name || userId?.slice(0, 8) || '—';
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

  const deleteCourse = async (id: string) => {
    await supabase.from('courses').delete().eq('id', id);
    toast.success('Kurz smazán'); loadAll();
  };

  const deleteFaculty = async (id: string) => {
    await supabase.from('faculties').delete().eq('id', id);
    toast.success('Fakulta smazána'); loadAll();
  };

  const resolveReport = async (id: string) => {
    if (!user) return;
    await supabase.from('reports').update({ status: 'resolved', resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', id);
    toast.success('Report vyřešen'); loadAll();
  };

  const assignLektor = async () => {
    if (!assignLektorCourseId || !selectedLektor) return;
    const { error } = await supabase.from('courses').update({ lektor_id: selectedLektor }).eq('id', assignLektorCourseId);
    if (error) toast.error(error.message);
    else { toast.success('Lektor přiřazen'); setAssignLektorCourseId(null); setSelectedLektor(''); loadAll(); }
  };

  const assignDean = async () => {
    if (!assignDeanFacultyId || !selectedDean) return;
    const { error } = await supabase.from('faculties').update({ dean_id: selectedDean }).eq('id', assignDeanFacultyId);
    if (error) toast.error(error.message);
    else { toast.success('Děkan přiřazen'); setAssignDeanFacultyId(null); setSelectedDean(''); loadAll(); }
  };

  const saveSetting = async () => {
    if (!user || !newSettingKey) return;
    const existing = settingsData.find(s => s.key === newSettingKey);
    if (existing) {
      await supabase.from('system_settings').update({ value: newSettingValue, updated_by: user.id }).eq('id', existing.id);
    } else {
      await supabase.from('system_settings').insert({ key: newSettingKey, value: newSettingValue, updated_by: user.id });
    }
    toast.success('Nastavení uloženo');
    setNewSettingKey(''); setNewSettingValue('');
    loadAll();
  };

  // ============ BLOCKING (20 functions) ============
  const generateBlockMessage = (block: any): string => {
    const userName = getUserName(block.user_id);
    const blockerName = getUserName(block.blocked_by);
    const typeMap: Record<string, string> = { full: 'plná blokace', partial: 'částečná blokace', warning: 'varování', temporary: 'dočasná blokace' };
    const sevMap: Record<string, string> = { low: 'nízká', standard: 'standardní', high: 'vysoká', critical: 'kritická' };
    const areas = block.affected_areas?.length > 0 ? block.affected_areas.join(', ') : 'veškerý přístup';
    const expiry = block.is_permanent ? 'trvalá (bez konce)' : block.expires_at ? new Date(block.expires_at).toLocaleString('cs-CZ') : 'neurčeno';

    return `## Zpráva pro správce Alík.cz — Protokol o blokaci\n\n` +
      `**Číslo protokolu:** BLK-${block.id.slice(0, 8).toUpperCase()}\n\n` +
      `**Datum vystavení:** ${new Date().toLocaleString('cs-CZ')}\n\n---\n\n` +
      `### Informace o blokaci\n\n` +
      `Uživatel **${userName}** byl zablokován uživatelem **${blockerName}** dne ${new Date(block.blocked_at).toLocaleString('cs-CZ')}. ` +
      `Jedná se o **${typeMap[block.block_type] || block.block_type}** se závažností **${sevMap[block.severity] || block.severity}**.\n\n` +
      `### Důvod blokace\n\n` +
      `${block.reason}\n\n` +
      (block.details ? `### Podrobnosti\n\n${block.details}\n\n` : '') +
      `### Parametry\n\n` +
      `| Parametr | Hodnota |\n|---|---|\n` +
      `| Typ | ${typeMap[block.block_type] || block.block_type} |\n` +
      `| Závažnost | ${sevMap[block.severity] || block.severity} |\n` +
      `| Trvalá | ${block.is_permanent ? 'Ano' : 'Ne'} |\n` +
      `| Platnost do | ${expiry} |\n` +
      `| Dotčené oblasti | ${areas} |\n` +
      `| Počet varování | ${block.warning_count || 0} |\n` +
      `| Pořadí blokace | ${block.block_count || 1}. |\n` +
      `| Eskalováno | ${block.escalated ? 'Ano' : 'Ne'} |\n\n` +
      (block.evidence_urls?.length > 0 ? `### Důkazy\n\n${block.evidence_urls.map((u: string, i: number) => `${i + 1}. ${u}`).join('\n')}\n\n` : '') +
      (block.internal_notes ? `### Interní poznámky\n\n${block.internal_notes}\n\n` : '') +
      `---\n\n*Tato zpráva byla automaticky vygenerována systémem Alíkovy Univerzity a je určena výhradně správcům webu Alík.cz.*`;
  };

  const createBlock = async () => {
    if (!user || !blockUserId || !blockReason) return;
    const { data, error } = await supabase.from('user_blocks').insert({
      user_id: blockUserId, blocked_by: user.id, reason: blockReason,
      details: blockDetails || null, block_type: blockType, severity: blockSeverity,
      is_permanent: blockPermanent, expires_at: blockExpires ? new Date(blockExpires).toISOString() : null,
      notification_sent: true,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    // Generate block message for Alík admins
    if (data) {
      const msg = generateBlockMessage(data);
      await supabase.from('block_messages').insert({ block_id: data.id, generated_by: user.id, message_text: msg });
    }
    toast.success('Uživatel zablokován, zpráva vygenerována');
    setBlockUserId(''); setBlockReason(''); setBlockDetails(''); setBlockType('full'); setBlockSeverity('standard'); setBlockPermanent(false); setBlockExpires('');
    loadAll();
  };

  const unblockUser = async (blockId: string) => {
    if (!user) return;
    await supabase.from('user_blocks').update({ is_active: false, unblocked_at: new Date().toISOString(), unblocked_by: user.id, unblock_reason: 'Manuální odblokování' }).eq('id', blockId);
    toast.success('Uživatel odblokován'); loadAll();
  };

  const approveAppeal = async (blockId: string) => {
    if (!user) return;
    await supabase.from('user_blocks').update({ appeal_status: 'approved', appeal_reviewed_by: user.id, appeal_reviewed_at: new Date().toISOString(), is_active: false, unblocked_at: new Date().toISOString(), unblocked_by: user.id }).eq('id', blockId);
    toast.success('Odvolání schváleno'); loadAll();
  };

  const rejectAppeal = async (blockId: string, response: string) => {
    if (!user) return;
    await supabase.from('user_blocks').update({ appeal_status: 'rejected', appeal_reviewed_by: user.id, appeal_reviewed_at: new Date().toISOString(), appeal_response: response || 'Odvolání zamítnuto.' }).eq('id', blockId);
    toast.success('Odvolání zamítnuto'); loadAll();
  };

  const escalateBlock = async (blockId: string) => {
    if (!user) return;
    await supabase.from('user_blocks').update({ escalated: true, escalated_to: user.id }).eq('id', blockId);
    toast.success('Blokace eskalována'); loadAll();
  };

  const changeSeverity = async (blockId: string, severity: string) => {
    await supabase.from('user_blocks').update({ severity }).eq('id', blockId);
    toast.success('Závažnost změněna'); loadAll();
  };

  const changeBlockType = async (blockId: string, type: string) => {
    await supabase.from('user_blocks').update({ block_type: type }).eq('id', blockId);
    toast.success('Typ změněn'); loadAll();
  };

  const extendBlock = async (blockId: string, days: number) => {
    const block = blocks.find(b => b.id === blockId);
    const base = block?.expires_at ? new Date(block.expires_at) : new Date();
    base.setDate(base.getDate() + days);
    await supabase.from('user_blocks').update({ expires_at: base.toISOString() }).eq('id', blockId);
    toast.success(`Prodlouženo o ${days} dní`); loadAll();
  };

  const makePermanent = async (blockId: string) => {
    await supabase.from('user_blocks').update({ is_permanent: true, expires_at: null }).eq('id', blockId);
    toast.success('Nastaveno jako trvalé'); loadAll();
  };

  const addInternalNote = async (blockId: string, note: string) => {
    const block = blocks.find(b => b.id === blockId);
    const updated = `${block?.internal_notes || ''}\n[${new Date().toLocaleString('cs')}] ${note}`.trim();
    await supabase.from('user_blocks').update({ internal_notes: updated }).eq('id', blockId);
    toast.success('Poznámka přidána'); loadAll();
  };

  const addEvidence = async (blockId: string, url: string) => {
    const block = blocks.find(b => b.id === blockId);
    await supabase.from('user_blocks').update({ evidence_urls: [...(block?.evidence_urls || []), url] }).eq('id', blockId);
    toast.success('Důkaz přidán'); loadAll();
  };

  const setAffectedAreas = async (blockId: string, areas: string[]) => {
    await supabase.from('user_blocks').update({ affected_areas: areas }).eq('id', blockId);
    toast.success('Oblasti aktualizovány'); loadAll();
  };

  const sendWarning = async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    await supabase.from('user_blocks').update({ warning_count: (block?.warning_count || 0) + 1, last_warning_at: new Date().toISOString() }).eq('id', blockId);
    toast.success('Varování odesláno'); loadAll();
  };

  const scheduleReview = async (blockId: string, date: string) => {
    await supabase.from('user_blocks').update({ review_scheduled_at: new Date(date).toISOString() }).eq('id', blockId);
    toast.success('Revize naplánována'); loadAll();
  };

  const incrementBlockCount = async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    await supabase.from('user_blocks').update({ block_count: (block?.block_count || 1) + 1 }).eq('id', blockId);
    loadAll();
  };

  const setAppealReviewing = async (blockId: string) => {
    await supabase.from('user_blocks').update({ appeal_status: 'reviewing' }).eq('id', blockId);
    toast.success('V přezkoumání'); loadAll();
  };

  const addIpNote = async (blockId: string, note: string) => {
    await supabase.from('user_blocks').update({ ip_note: note }).eq('id', blockId);
    toast.success('IP poznámka přidána'); loadAll();
  };

  const updateMetadata = async (blockId: string, key: string, value: string) => {
    const block = blocks.find(b => b.id === blockId);
    await supabase.from('user_blocks').update({ metadata: { ...(block?.metadata || {}), [key]: value } }).eq('id', blockId);
    toast.success('Metadata aktualizována'); loadAll();
  };

  const bulkUnblockExpired = async () => {
    if (!user) return;
    const expired = blocks.filter(b => b.is_active && b.expires_at && new Date(b.expires_at) < new Date());
    for (const b of expired) {
      await supabase.from('user_blocks').update({ is_active: false, unblocked_at: new Date().toISOString(), unblocked_by: user.id, unblock_reason: 'Automatické odblokování' }).eq('id', b.id);
    }
    toast.success(`Odblokováno ${expired.length}`); loadAll();
  };

  const getBlockStats = () => {
    const active = blocks.filter(b => b.is_active).length;
    const pending = blocks.filter(b => b.appeal_status === 'pending').length;
    const permanent = blocks.filter(b => b.is_permanent && b.is_active).length;
    const escalated = blocks.filter(b => b.escalated && b.is_active).length;
    return { active, pending, permanent, escalated, total: blocks.length };
  };

  const regenerateBlockMessage = async (block: any) => {
    if (!user) return;
    const msg = generateBlockMessage(block);
    await supabase.from('block_messages').insert({ block_id: block.id, generated_by: user.id, message_text: msg });
    toast.success('Zpráva znovu vygenerována');
    loadAll();
  };

  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [internalNoteText, setInternalNoteText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [appealResponseText, setAppealResponseText] = useState('');
  const [viewingMessage, setViewingMessage] = useState<string | null>(null);

  const lektors = users.filter(u => {
    const r = roles.find(r => r.user_id === u.user_id);
    return r && ['lektor', 'dohledci', 'developer'].includes(r.role);
  });

  // ============ RENDER ============
  const renderContent = () => {
    switch (activeTab) {
      case 'prehled':
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { v: stats.courses, l: 'kurzů', c: '#1f3f6b' },
                { v: stats.faculties, l: 'fakult', c: '#1f3f6b' },
                { v: stats.questions, l: 'dotazů', c: '#1f3f6b' },
                { v: users.length, l: 'uživatelů', c: '#1f3f6b' },
                { v: stats.blocks, l: 'blokací', c: '#dc2626' },
                { v: stats.forumPosts, l: 'příspěvků', c: '#1f3f6b' },
              ].map((s, i) => (
                <div key={i} className="stat-card"><strong className="block text-[22px]" style={{ color: s.c }}>{s.v}</strong><span className="text-xs text-muted-foreground">{s.l}</span></div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="panel-card"><h4 className="mt-0">Čekající odvolání</h4><p className="text-2xl font-extrabold" style={{ color: '#dc2626' }}>{getBlockStats().pending}</p></div>
              <div className="panel-card"><h4 className="mt-0">Otevřené reporty</h4><p className="text-2xl font-extrabold" style={{ color: '#ea580c' }}>{reports.filter(r => r.status === 'pending').length}</p></div>
            </div>
          </div>
        );

      case 'kurzy':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Správa kurzů ({courses.length})</h3>
            {courses.map(c => (
              <div key={c.id} className="catalog-item-card items-center">
                <div className="flex-1">
                  <strong>{c.title}</strong>
                  <span className="text-xs text-muted-foreground ml-2">{c.day_of_week} {c.time_slot}</span>
                  {c.lektor_id && <span className="text-xs ml-2" style={{ color: '#8b6914' }}>👨‍🏫 {getUserName(c.lektor_id)}</span>}
                  <span className="text-xs ml-2 text-muted-foreground">({enrollments.filter(e => e.course_id === c.id).length} studentů)</span>
                </div>
                <div className="flex gap-1.5">
                  {isDeveloper && (
                    <button className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#fff8e0', color: '#8b6914' }} onClick={() => { setAssignLektorCourseId(c.id); setSelectedLektor(c.lektor_id || ''); }}>👨‍🏫</button>
                  )}
                  <button className="btn-alik-outline text-xs" onClick={() => deleteCourse(c.id)}>Smazat</button>
                </div>
              </div>
            ))}
            {assignLektorCourseId && (
              <div className="panel-card mt-2" style={{ background: '#fffbe8' }}>
                <h4 className="mt-0 text-sm">Přiřadit lektora</h4>
                <select value={selectedLektor} onChange={e => setSelectedLektor(e.target.value)} className="border-2 border-yellow-200 rounded-xl py-2 px-3 text-sm outline-none w-full">
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
          <div className="grid gap-2">
            <h3 className="mt-0">Správa fakult ({faculties.length})</h3>
            {faculties.map(f => (
              <div key={f.id} className="catalog-item-card items-center">
                <div className="flex-1">
                  <strong>{f.name}</strong>
                  {f.dean_id && <span className="text-xs ml-2" style={{ color: '#8b6914' }}>🎓 Děkan: {getUserName(f.dean_id)}</span>}
                  <span className="text-xs ml-2 text-muted-foreground">({courses.filter(c => c.faculty_id === f.id).length} kurzů)</span>
                </div>
                <div className="flex gap-1.5">
                  {isDeveloper && (
                    <button className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#fff8e0', color: '#8b6914' }} onClick={() => { setAssignDeanFacultyId(f.id); setSelectedDean(f.dean_id || ''); }}>🎓 Děkan</button>
                  )}
                  <button className="btn-alik-outline text-xs" onClick={() => deleteFaculty(f.id)}>Smazat</button>
                </div>
              </div>
            ))}
            {assignDeanFacultyId && (
              <div className="panel-card mt-2" style={{ background: '#fffbe8' }}>
                <h4 className="mt-0 text-sm">Přiřadit děkana</h4>
                <select value={selectedDean} onChange={e => setSelectedDean(e.target.value)} className="border-2 border-yellow-200 rounded-xl py-2 px-3 text-sm outline-none w-full">
                  <option value="">Vyberte uživatele</option>
                  {lektors.map(l => <option key={l.user_id} value={l.user_id}>{l.display_name}</option>)}
                </select>
                <div className="flex gap-2 mt-2">
                  <button onClick={assignDean} className="btn-alik-primary text-xs">Přiřadit</button>
                  <button onClick={() => setAssignDeanFacultyId(null)} className="btn-alik-outline text-xs">Zrušit</button>
                </div>
              </div>
            )}
          </div>
        );

      case 'lektori':
      case 'mentori':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Lektoři a mentoři</h3>
            {roles.filter(r => r.role === 'lektor').map(r => {
              const coursesCount = courses.filter(c => c.lektor_id === r.user_id).length;
              return (
                <div key={r.id} className="catalog-item-card items-center">
                  <strong>{getUserName(r.user_id)}</strong>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground">{coursesCount} kurzů</span>
                    <span className="text-xs font-bold" style={{ color: '#166534' }}>Lektor</span>
                  </div>
                </div>
              );
            })}
            {roles.filter(r => r.role === 'lektor').length === 0 && <p className="text-muted-foreground text-sm">Žádní lektoři.</p>}
          </div>
        );

      case 'studenti':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Studenti ({roles.filter(r => r.role === 'student').length})</h3>
            {roles.filter(r => r.role === 'student').map(r => {
              const enrolled = enrollments.filter(e => e.student_id === r.user_id).length;
              return (
                <div key={r.id} className="catalog-item-card items-center">
                  <strong>{getUserName(r.user_id)}</strong>
                  <span className="text-xs text-muted-foreground">{enrolled} kurzů</span>
                </div>
              );
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
                const roleColors: Record<string, string> = { developer: '#991b1b', dohledci: '#b45309', lektor: '#166534', student: '#1e40af' };
                return (
                  <div key={u.id} className="catalog-item-card items-center">
                    <strong>{u.display_name}</strong>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full text-white" style={{ background: roleColors[r?.role || 'student'] || '#6b7280' }}>{r?.role || '—'}</span>
                  </div>
                );
              })}
            </div>
            {isDeveloper && (
              <div className="grid gap-2 mt-2 p-3 rounded-xl" style={{ background: '#f8f9ff' }}>
                <h4 className="mt-0 text-sm">Přiřadit roli</h4>
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

      case 'blokace': {
        const bs = getBlockStats();
        return (
          <div className="grid gap-4">
            <h3 className="mt-0">🚫 Blokace uživatelů</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#dc2626' }}>{bs.active}</strong><span className="text-xs text-muted-foreground">aktivních</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#ea580c' }}>{bs.pending}</strong><span className="text-xs text-muted-foreground">odvolání</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#991b1b' }}>{bs.permanent}</strong><span className="text-xs text-muted-foreground">trvalých</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#7c2d12' }}>{bs.escalated}</strong><span className="text-xs text-muted-foreground">eskalovaných</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{bs.total}</strong><span className="text-xs text-muted-foreground">celkem</span></div>
            </div>
            <button onClick={bulkUnblockExpired} className="btn-alik-outline text-sm w-fit">♻ Odblokovat vypršelé</button>

            {isDeveloper && (
              <div className="panel-card" style={{ borderColor: '#fca5a5' }}>
                <h4 className="mt-0 text-sm">Nová blokace</h4>
                <div className="grid gap-2">
                  <select value={blockUserId} onChange={e => setBlockUserId(e.target.value)} className="border-2 border-red-200 rounded-xl py-2 px-3 text-sm outline-none">
                    <option value="">Vyberte uživatele</option>
                    {users.map(u => <option key={u.user_id} value={u.user_id}>{u.display_name}</option>)}
                  </select>
                  <input placeholder="Důvod blokace" value={blockReason} onChange={e => setBlockReason(e.target.value)} className="border-2 border-red-200 rounded-xl py-2 px-3 text-sm outline-none" />
                  <textarea placeholder="Podrobnosti (volitelné)" value={blockDetails} onChange={e => setBlockDetails(e.target.value)} className="border-2 border-red-200 rounded-xl py-2 px-3 text-sm outline-none min-h-[50px]" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={blockType} onChange={e => setBlockType(e.target.value)} className="border-2 border-red-200 rounded-xl py-2 px-3 text-sm outline-none">
                      <option value="full">Plná</option><option value="partial">Částečná</option><option value="warning">Varování</option><option value="temporary">Dočasná</option>
                    </select>
                    <select value={blockSeverity} onChange={e => setBlockSeverity(e.target.value)} className="border-2 border-red-200 rounded-xl py-2 px-3 text-sm outline-none">
                      <option value="low">Nízká</option><option value="standard">Standardní</option><option value="high">Vysoká</option><option value="critical">Kritická</option>
                    </select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={blockPermanent} onChange={e => setBlockPermanent(e.target.checked)} /> Trvalá</label>
                    {!blockPermanent && <input type="datetime-local" value={blockExpires} onChange={e => setBlockExpires(e.target.value)} className="border-2 border-red-200 rounded-xl py-2 px-3 text-sm outline-none flex-1" />}
                  </div>
                  <button onClick={createBlock} disabled={!blockUserId || !blockReason} className="btn-alik-primary text-sm">🚫 Zablokovat (+ zpráva pro Alík)</button>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              {blocks.map(b => (
                <div key={b.id}>
                  <div className="catalog-item-card items-center cursor-pointer" onClick={() => setExpandedBlock(expandedBlock === b.id ? null : b.id)} style={{ background: b.is_active ? '#fef2f2' : '#f0fdf4', borderLeft: `4px solid ${b.is_active ? '#dc2626' : '#16a34a'}` }}>
                    <div className="flex-1">
                      <strong>{getUserName(b.user_id)}</strong>
                      <span className="text-xs ml-2">{b.reason.slice(0, 40)}</span>
                      {b.appeal_status === 'pending' && <span className="text-xs ml-2 font-bold" style={{ color: '#ea580c' }}>⏳ Odvolání</span>}
                      {b.escalated && <span className="text-xs ml-2 font-bold" style={{ color: '#991b1b' }}>⚠ Eskalováno</span>}
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: b.is_active ? '#dc2626' : '#16a34a' }}>
                      {b.is_active ? 'Aktivní' : 'Neaktivní'}
                    </span>
                  </div>

                  {expandedBlock === b.id && (
                    <div className="p-3 rounded-b-xl text-sm grid gap-3" style={{ background: '#fafafa', borderLeft: '4px solid #e5e7eb' }}>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Typ:</span> <strong>{b.block_type}</strong></div>
                        <div><span className="text-muted-foreground">Závažnost:</span> <strong>{b.severity}</strong></div>
                        <div><span className="text-muted-foreground">Trvalá:</span> <strong>{b.is_permanent ? 'Ano' : 'Ne'}</strong></div>
                        <div><span className="text-muted-foreground">Blokováno:</span> <strong>{new Date(b.blocked_at).toLocaleString('cs')}</strong></div>
                        <div><span className="text-muted-foreground">Vyprší:</span> <strong>{b.expires_at ? new Date(b.expires_at).toLocaleString('cs') : '—'}</strong></div>
                        <div><span className="text-muted-foreground">Varování:</span> <strong>{b.warning_count}</strong></div>
                      </div>
                      {b.details && <p className="text-xs"><span className="text-muted-foreground">Detaily:</span> {b.details}</p>}
                      {b.internal_notes && <p className="text-xs whitespace-pre-wrap"><span className="text-muted-foreground">Interní:</span> {b.internal_notes}</p>}
                      {b.appeal_text && (
                        <div className="p-2 rounded-lg text-xs" style={{ background: '#fff8e0' }}>
                          <strong>Odvolání:</strong> {b.appeal_text}<br /><span className="text-muted-foreground">Stav: {b.appeal_status}</span>
                        </div>
                      )}

                      {isDeveloper && b.is_active && (
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => unblockUser(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#dcfce7', color: '#166534' }}>✓ Odblokovat</button>
                          <button onClick={() => escalateBlock(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#fef3c7', color: '#92400e' }}>⚠ Eskalovat</button>
                          <button onClick={() => makePermanent(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#fde8e8', color: '#991b1b' }}>∞ Trvalá</button>
                          <button onClick={() => extendBlock(b.id, 7)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#f0f4ff', color: '#1e40af' }}>+7 dní</button>
                          <button onClick={() => extendBlock(b.id, 30)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#f0f4ff', color: '#1e40af' }}>+30 dní</button>
                          <button onClick={() => sendWarning(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#fff3cd', color: '#856404' }}>⚡ Varování</button>
                          <button onClick={() => incrementBlockCount(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#f3e8ff', color: '#6b21a8' }}>+1</button>
                          <button onClick={() => regenerateBlockMessage(b)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#e0f2fe', color: '#0369a1' }}>✉ Zpráva</button>
                          <select onChange={e => changeSeverity(b.id, e.target.value)} value={b.severity} className="text-xs rounded-lg px-2 py-1 border border-red-200 outline-none">
                            <option value="low">Nízká</option><option value="standard">Standard</option><option value="high">Vysoká</option><option value="critical">Kritická</option>
                          </select>
                          <select onChange={e => changeBlockType(b.id, e.target.value)} value={b.block_type} className="text-xs rounded-lg px-2 py-1 border border-red-200 outline-none">
                            <option value="full">Plná</option><option value="partial">Částečná</option><option value="warning">Varování</option><option value="temporary">Dočasná</option>
                          </select>
                        </div>
                      )}

                      {isDeveloper && b.appeal_status === 'pending' && (
                        <div className="grid gap-2 p-2 rounded-lg" style={{ background: '#fff8e0' }}>
                          <strong className="text-xs">Rozhodnutí o odvolání</strong>
                          <div className="flex gap-2">
                            <button onClick={() => approveAppeal(b.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: '#16a34a' }}>✓ Schválit</button>
                            <button onClick={() => setAppealReviewing(b.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: '#fef3c7', color: '#92400e' }}>🔍 Přezkoumat</button>
                          </div>
                          <div className="flex gap-2">
                            <input placeholder="Odpověď..." value={appealResponseText} onChange={e => setAppealResponseText(e.target.value)} className="border border-yellow-200 rounded-lg py-1 px-2 text-xs outline-none flex-1" />
                            <button onClick={() => { rejectAppeal(b.id, appealResponseText); setAppealResponseText(''); }} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: '#dc2626' }}>✗ Zamítnout</button>
                          </div>
                        </div>
                      )}

                      {isDeveloper && (
                        <div className="grid gap-2">
                          <div className="flex gap-2">
                            <input placeholder="Interní poznámka..." value={internalNoteText} onChange={e => setInternalNoteText(e.target.value)} className="border border-gray-200 rounded-lg py-1 px-2 text-xs outline-none flex-1" />
                            <button onClick={() => { addInternalNote(b.id, internalNoteText); setInternalNoteText(''); }} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#f0f4ff', color: '#1e40af' }}>+ Poznámka</button>
                          </div>
                          <div className="flex gap-2">
                            <input placeholder="URL důkazu..." value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} className="border border-gray-200 rounded-lg py-1 px-2 text-xs outline-none flex-1" />
                            <button onClick={() => { addEvidence(b.id, evidenceUrl); setEvidenceUrl(''); }} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#f3e8ff', color: '#6b21a8' }}>+ Důkaz</button>
                          </div>
                          <div className="flex gap-2">
                            <input placeholder="IP poznámka..." onBlur={e => addIpNote(b.id, e.target.value)} className="border border-gray-200 rounded-lg py-1 px-2 text-xs outline-none flex-1" />
                            <input type="date" onChange={e => scheduleReview(b.id, e.target.value)} className="border border-gray-200 rounded-lg py-1 px-2 text-xs outline-none" title="Naplánovat revizi" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {blocks.length === 0 && <p className="text-muted-foreground text-sm">Žádné blokace.</p>}
            </div>
          </div>
        );
      }

      case 'forum':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Správa fóra ({forumPosts.length} příspěvků)</h3>
            {forumPosts.slice(0, 20).map(p => (
              <div key={p.id} className="catalog-item-card">
                <div className="flex-1">
                  <strong className="text-xs">{getUserName(p.author_id)}</strong>
                  <span className="text-xs ml-2">{p.content.slice(0, 60)}</span>
                </div>
                <div className="flex gap-1.5 items-center">
                  {p.label && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#eef5ff', color: '#315493' }}>{p.label}</span>}
                  {p.is_pinned && <span className="text-xs">📌</span>}
                  {p.is_deleted && <span className="text-xs text-red-500">🗑</span>}
                </div>
              </div>
            ))}
          </div>
        );

      case 'oznameni':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">Oznámení</h3>
            <div className="grid gap-2">
              <input placeholder="Nadpis" value={annTitle} onChange={e => setAnnTitle(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
              <textarea placeholder="Obsah (podporuje Markdown)" value={annContent} onChange={e => setAnnContent(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none min-h-[60px]" />
              <button className="btn-alik-primary text-sm" onClick={addAnnouncement}>Přidat oznámení</button>
            </div>
            {announcements.map(a => (
              <div key={a.id} className="catalog-item-card">
                <div className="flex-1"><strong>{a.title}</strong>
                  {a.content && <div className="text-xs mt-1"><MarkdownRenderer content={a.content} /></div>}
                </div>
                <span className="text-xs">{a.priority}</span>
              </div>
            ))}
          </div>
        );

      case 'reporty':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Reporty / Hlášení</h3>
            {reports.map(r => (
              <div key={r.id} className="catalog-item-card items-center">
                <div>
                  <strong>{r.reason}</strong>
                  <span className="text-xs text-muted-foreground ml-2">{r.entity_type} • {r.status}</span>
                  <span className="text-xs text-muted-foreground ml-2">{new Date(r.created_at).toLocaleString('cs')}</span>
                </div>
                {r.status === 'pending' && <button className="btn-alik-outline text-xs" onClick={() => resolveReport(r.id)}>Vyřešit</button>}
              </div>
            ))}
            {reports.length === 0 && <p className="text-muted-foreground text-sm">Žádné reporty.</p>}
          </div>
        );

      case 'audit':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Auditní log (posledních 50)</h3>
            {auditLogs.map(l => (
              <div key={l.id} className="catalog-item-card text-xs">
                <div className="flex-1">
                  <strong>{l.action}</strong> <span className="text-muted-foreground">— {l.entity_type} {l.entity_id?.slice(0, 8)}</span>
                  {l.user_id && <span className="ml-2">{getUserName(l.user_id)}</span>}
                </div>
                <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString('cs')}</span>
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
                <div className="flex-1"><strong>{q.question.slice(0, 80)}</strong><span className="text-xs ml-2 text-muted-foreground">{getUserName(q.user_id)}</span></div>
                <span className="text-xs">{q.topic} • <strong style={{ color: q.status === 'pending' ? '#ea580c' : '#16a34a' }}>{q.status}</strong></span>
              </div>
            ))}
          </div>
        );

      case 'rozvrh':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Správa rozvrhu ({scheduleItems.length})</h3>
            {['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek'].map(day => {
              const items = scheduleItems.filter(s => s.day_of_week === day);
              if (items.length === 0) return null;
              return (
                <div key={day}>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mt-2">{day}</h4>
                  {items.map(s => (
                    <div key={s.id} className="schedule-item-card mb-1"><strong>{s.title}</strong><span>{s.time_slot} {s.room && `• ${s.room}`}</span></div>
                  ))}
                </div>
              );
            })}
          </div>
        );

      case 'vypisky':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Správa výpisků ({notes.length})</h3>
            {notes.map(n => (
              <div key={n.id} className="catalog-item-card items-center">
                <div className="flex-1"><strong>{n.title}</strong><span className="text-xs ml-2 text-muted-foreground">{getUserName(n.user_id)}</span></div>
                <span className="text-xs">{n.is_public ? '🌐 Veřejné' : '🔒 Soukromé'}</span>
              </div>
            ))}
          </div>
        );

      case 'notifikace':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Notifikace</h3>
            {notifications.map(n => (
              <div key={n.id} className="catalog-item-card items-center">
                <div className="flex-1"><strong>{n.title}</strong>{n.message && <span className="text-xs ml-2 text-muted-foreground">{n.message.slice(0, 50)}</span>}</div>
                <span className="text-xs">{n.is_read ? '✓ Přečteno' : '● Nepřečteno'}</span>
              </div>
            ))}
            {notifications.length === 0 && <p className="text-muted-foreground text-sm">Žádné notifikace.</p>}
          </div>
        );

      case 'statistiky':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">📈 Statistiky</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { v: courses.length, l: 'kurzů celkem' },
                { v: courses.filter(c => c.is_active).length, l: 'aktivních kurzů' },
                { v: enrollments.length, l: 'zápisů' },
                { v: questions.filter(q => q.status === 'pending').length, l: 'nevyřešených dotazů' },
                { v: notes.filter(n => n.is_public).length, l: 'veřejných výpisků' },
                { v: blocks.filter(b => b.is_active).length, l: 'aktivních blokací', red: true },
                { v: forumPosts.length, l: 'příspěvků ve fóru' },
                { v: reports.filter(r => r.status === 'pending').length, l: 'otevřených reportů', red: true },
                { v: users.length, l: 'uživatelů celkem' },
              ].map((s, i) => (
                <div key={i} className="stat-card"><strong className="block text-lg" style={{ color: (s as any).red ? '#dc2626' : '#1f3f6b' }}>{s.v}</strong><span className="text-xs text-muted-foreground">{s.l}</span></div>
              ))}
            </div>
          </div>
        );

      case 'rozpocet':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">💰 Rozpočet</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#16a34a' }}>{courses.length * 500} Kč</strong><span className="text-xs text-muted-foreground">Odhadované náklady (kurzy)</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{faculties.length * 2000} Kč</strong><span className="text-xs text-muted-foreground">Odhadované náklady (fakulty)</span></div>
            </div>
            <p className="text-sm text-muted-foreground">Rozpočtový modul poskytuje přehled odhadovaných nákladů na provoz univerzity. Hodnoty jsou vypočteny na základě aktuálního počtu kurzů a fakult.</p>
          </div>
        );

      case 'smernice':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">📜 Směrnice</h3>
            <p className="text-sm text-muted-foreground">Správa interních směrnic a pravidel. Směrnice jsou ukládány v systémových nastaveních.</p>
            {isDeveloper && (
              <div className="grid gap-2 p-3 rounded-xl" style={{ background: '#f8f9ff' }}>
                <input placeholder="Název směrnice" value={smerniceName} onChange={e => setSmerniceName(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                <textarea placeholder="Obsah (Markdown)" value={smerniceContent} onChange={e => setSmerniceContent(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none min-h-[80px]" />
                <button onClick={async () => {
                  if (!user || !smerniceName) return;
                  await supabase.from('system_settings').insert({ key: `smernice_${Date.now()}`, value: JSON.stringify({ name: smerniceName, content: smerniceContent }), updated_by: user.id });
                  toast.success('Směrnice uložena'); setSmerniceName(''); setSmerniceContent(''); loadAll();
                }} className="btn-alik-primary text-sm">Uložit směrnici</button>
              </div>
            )}
            {settingsData.filter(s => s.key.startsWith('smernice_')).map(s => {
              const parsed = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
              return (
                <div key={s.id} className="panel-card">
                  <h4 className="mt-0 text-sm">{(parsed as any)?.name || s.key}</h4>
                  <MarkdownRenderer content={(parsed as any)?.content || ''} />
                </div>
              );
            })}
          </div>
        );

      case 'zpravy':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">✉ Zprávy pro správce Alíka</h3>
            <p className="text-xs text-muted-foreground">Automaticky generované zprávy o blokacích, určené pro předání správcům webu Alík.cz.</p>
            {blockMessages.map(m => (
              <div key={m.id} className="panel-card">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString('cs')}</span>
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.sent_to_alik ? 'text-white' : ''}`} style={{ background: m.sent_to_alik ? '#16a34a' : '#fef3c7', color: m.sent_to_alik ? undefined : '#92400e' }}>
                      {m.sent_to_alik ? '✓ Odesláno' : '⏳ Čeká'}
                    </span>
                    <button onClick={() => setViewingMessage(viewingMessage === m.id ? null : m.id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#eef5ff', color: '#1e40af' }}>
                      {viewingMessage === m.id ? 'Skrýt' : 'Zobrazit'}
                    </button>
                    {!m.sent_to_alik && (
                      <button onClick={async () => {
                        await supabase.from('block_messages').update({ sent_to_alik: true }).eq('id', m.id);
                        toast.success('Označeno jako odesláno'); loadAll();
                      }} className="text-xs font-bold px-2 py-1 rounded-lg text-white" style={{ background: '#16a34a' }}>Označit odesláno</button>
                    )}
                  </div>
                </div>
                {viewingMessage === m.id && (
                  <div className="border border-border rounded-xl p-3 mt-2" style={{ background: '#fafafa' }}>
                    <MarkdownRenderer content={m.message_text} />
                  </div>
                )}
              </div>
            ))}
            {blockMessages.length === 0 && <p className="text-muted-foreground text-sm">Žádné zprávy.</p>}
          </div>
        );

      case 'zadosti':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">📩 Žádosti</h3>
            <p className="text-sm text-muted-foreground">Přehled žádostí o změnu role, odblokování a dalších požadavků uživatelů.</p>
            {blocks.filter(b => b.appeal_status === 'pending').map(b => (
              <div key={b.id} className="catalog-item-card items-center" style={{ borderLeft: '4px solid #ea580c' }}>
                <div className="flex-1">
                  <strong>{getUserName(b.user_id)}</strong>
                  <span className="text-xs ml-2">Odvolání proti blokaci</span>
                  <p className="text-xs text-muted-foreground mt-1">{b.appeal_text?.slice(0, 100)}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => approveAppeal(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg text-white" style={{ background: '#16a34a' }}>✓</button>
                  <button onClick={() => rejectAppeal(b.id, 'Zamítnuto.')} className="text-xs font-bold px-2 py-1 rounded-lg text-white" style={{ background: '#dc2626' }}>✗</button>
                </div>
              </div>
            ))}
            {blocks.filter(b => b.appeal_status === 'pending').length === 0 && <p className="text-muted-foreground text-sm">Žádné čekající žádosti.</p>}
          </div>
        );

      case 'kvalita':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">✅ Kvalita</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card"><strong className="block text-lg" style={{ color: courses.filter(c => c.lektor_id).length === courses.length ? '#16a34a' : '#ea580c' }}>{Math.round((courses.filter(c => c.lektor_id).length / Math.max(courses.length, 1)) * 100)}%</strong><span className="text-xs text-muted-foreground">kurzů s lektorem</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: faculties.filter(f => f.dean_id).length === faculties.length ? '#16a34a' : '#ea580c' }}>{Math.round((faculties.filter(f => f.dean_id).length / Math.max(faculties.length, 1)) * 100)}%</strong><span className="text-xs text-muted-foreground">fakult s děkanem</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{Math.round((questions.filter(q => q.status === 'answered').length / Math.max(questions.length, 1)) * 100)}%</strong><span className="text-xs text-muted-foreground">zodpovězených dotazů</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{Math.round((reports.filter(r => r.status === 'resolved').length / Math.max(reports.length, 1)) * 100)}%</strong><span className="text-xs text-muted-foreground">vyřešených reportů</span></div>
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">📤 Export dat</h3>
            <p className="text-sm text-muted-foreground">Exportujte data do JSON formátu.</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Kurzy', data: courses },
                { label: 'Fakulty', data: faculties },
                { label: 'Uživatelé', data: users },
                { label: 'Blokace', data: blocks },
                { label: 'Oznámení', data: announcements },
                { label: 'Rozvrh', data: scheduleItems },
              ].map(({ label, data }) => (
                <button key={label} className="btn-alik-outline text-sm" onClick={() => {
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `${label.toLowerCase()}.json`; a.click();
                  URL.revokeObjectURL(url);
                  toast.success(`${label} exportovány`);
                }}>📤 {label}</button>
              ))}
            </div>
          </div>
        );

      case 'import':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">📥 Import dat</h3>
            <p className="text-sm text-muted-foreground">Import kurzů z JSON souboru.</p>
            <input type="file" accept=".json" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              try {
                const data = JSON.parse(text);
                if (!Array.isArray(data)) { toast.error('Neplatný formát'); return; }
                for (const item of data) {
                  if (item.title) {
                    await supabase.from('courses').insert({ title: item.title, description: item.description || null, difficulty: item.difficulty || 'beginner' });
                  }
                }
                toast.success(`Importováno ${data.length} položek`);
                loadAll();
              } catch { toast.error('Chyba při zpracování souboru'); }
            }} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
          </div>
        );

      case 'hromadne':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">⚡ Hromadné akce</h3>
            <div className="grid gap-2">
              <button className="btn-alik-outline text-sm" onClick={async () => {
                await supabase.from('announcements').update({ is_active: false }).eq('is_active', true);
                toast.success('Všechna oznámení deaktivována'); loadAll();
              }}>Deaktivovat všechna oznámení</button>
              <button className="btn-alik-outline text-sm" onClick={bulkUnblockExpired}>♻ Odblokovat vypršelé blokace</button>
              <button className="btn-alik-outline text-sm" onClick={async () => {
                const pending = reports.filter(r => r.status === 'pending');
                for (const r of pending) { await resolveReport(r.id); }
                toast.success(`Vyřešeno ${pending.length} reportů`);
              }}>Vyřešit všechny reporty</button>
            </div>
          </div>
        );

      case 'harmonogram':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">🗓 Harmonogram</h3>
            <p className="text-sm text-muted-foreground">Plánované revize blokací a nadcházející termíny.</p>
            {blocks.filter(b => b.review_scheduled_at && b.is_active).map(b => (
              <div key={b.id} className="schedule-item-card">
                <div><strong>{getUserName(b.user_id)}</strong> — revize blokace</div>
                <span>{new Date(b.review_scheduled_at).toLocaleDateString('cs')}</span>
              </div>
            ))}
            {blocks.filter(b => b.review_scheduled_at && b.is_active).length === 0 && <p className="text-muted-foreground text-sm">Žádné naplánované revize.</p>}
          </div>
        );

      case 'bezpecnost':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">🛡 Bezpečnost</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card"><strong className="block text-lg" style={{ color: getBlockStats().active > 0 ? '#dc2626' : '#16a34a' }}>{getBlockStats().active}</strong><span className="text-xs text-muted-foreground">aktivních blokací</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{getBlockStats().escalated}</strong><span className="text-xs text-muted-foreground">eskalovaných</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{reports.filter(r => r.status === 'pending').length}</strong><span className="text-xs text-muted-foreground">otevřených reportů</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{auditLogs.length}</strong><span className="text-xs text-muted-foreground">záznamů v logu</span></div>
            </div>
            <div className="panel-card">
              <h4 className="mt-0 text-sm">Poslední auditní záznamy</h4>
              {auditLogs.slice(0, 5).map(l => (
                <div key={l.id} className="text-xs py-1 border-b border-border last:border-0">{l.action} — {new Date(l.created_at).toLocaleString('cs')}</div>
              ))}
            </div>
          </div>
        );

      case 'klubovny':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">🏠 Klubovny</h3>
            <p className="text-sm text-muted-foreground">Správa virtuálních kluboven přiřazených k fakultám.</p>
            {faculties.map(f => (
              <div key={f.id} className="catalog-item-card"><strong>{f.name}</strong><span className="text-xs">Klubovna {f.icon || '🏠'}</span></div>
            ))}
          </div>
        );

      case 'kapacity':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">👥 Kapacity</h3>
            {courses.map(c => {
              const enrolled = enrollments.filter(e => e.course_id === c.id).length;
              const max = c.max_students || 30;
              const pct = Math.round((enrolled / max) * 100);
              return (
                <div key={c.id} className="catalog-item-card items-center">
                  <div className="flex-1"><strong>{c.title}</strong><span className="text-xs ml-2">{enrolled}/{max}</span></div>
                  <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? '#dc2626' : pct > 70 ? '#ea580c' : '#16a34a' }} />
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'plany':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">🗺 Studijní plány (přehled)</h3>
            <p className="text-sm text-muted-foreground">Přehled studijních plánů uživatelů viditelných pro správce.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{courses.length}</strong><span className="text-xs text-muted-foreground">dostupných kurzů</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{enrollments.length}</strong><span className="text-xs text-muted-foreground">zápisů celkem</span></div>
            </div>
          </div>
        );

      case 'hodnoceni':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">⭐ Hodnocení</h3>
            <p className="text-sm text-muted-foreground">Přehled hodnocení kurzů a lektorů.</p>
            {courses.map(c => (
              <div key={c.id} className="catalog-item-card items-center">
                <div className="flex-1"><strong>{c.title}</strong>{c.lektor_id && <span className="text-xs ml-2">👨‍🏫 {getUserName(c.lektor_id)}</span>}</div>
                <span className="text-xs">⭐ —</span>
              </div>
            ))}
          </div>
        );

      // ===== NEW SECTION 1: E-mailové šablony =====
      case 'emailove-sablony':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">📧 E-mailové šablony</h3>
            <p className="text-xs text-muted-foreground">Správa šablon pro automatické e-maily odesílané uživatelům. Šablony podporují Markdown a proměnné ve formátu {'{{proměnná}}'}.</p>
            {emailTemplates.map((tpl, i) => (
              <div key={i} className="panel-card">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="mt-0 text-sm">{tpl.name}</h4>
                  <button onClick={() => setEditingTemplate(editingTemplate === i ? null : i)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#fef3c7', color: '#92400e' }}>
                    {editingTemplate === i ? 'Zavřít' : '✏ Upravit'}
                  </button>
                </div>
                {editingTemplate === i ? (
                  <div className="grid gap-2">
                    <input value={tpl.subject} onChange={e => { const t = [...emailTemplates]; t[i] = { ...t[i], subject: e.target.value }; setEmailTemplates(t); }} placeholder="Předmět" className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
                    <textarea value={tpl.body} onChange={e => { const t = [...emailTemplates]; t[i] = { ...t[i], body: e.target.value }; setEmailTemplates(t); }} placeholder="Tělo (Markdown)" className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none min-h-[80px] font-mono" />
                    <h5 className="text-xs font-bold text-muted-foreground mt-1">Náhled:</h5>
                    <div className="border border-border rounded-xl p-3" style={{ background: '#fafafa' }}>
                      <MarkdownRenderer content={tpl.body} />
                    </div>
                    <button onClick={async () => {
                      if (!user) return;
                      await supabase.from('system_settings').upsert({ key: `email_tpl_${i}`, value: JSON.stringify(tpl), updated_by: user.id }, { onConflict: 'key' });
                      toast.success('Šablona uložena'); setEditingTemplate(null);
                    }} className="btn-alik-primary text-xs">Uložit šablonu</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-muted-foreground">Předmět: <strong>{tpl.subject}</strong></p>
                    <div className="mt-2 border border-border rounded-xl p-2" style={{ background: '#fafafa' }}>
                      <MarkdownRenderer content={tpl.body} className="text-xs" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      // ===== NEW SECTION 2: Integrace & API =====
      case 'integrace':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">🔗 Integrace & API</h3>
            <p className="text-xs text-muted-foreground">Přehled systémových integrací a API endpointů Alíkovy Univerzity.</p>
            <div className="grid gap-2">
              {[
                { name: 'Alík.cz', status: 'Aktivní', desc: 'Propojení s hlavním webem Alík.cz pro přenos blokačních zpráv a uživatelských dat.', icon: '🌐' },
                { name: 'Blokační systém', status: 'Aktivní', desc: 'Automatické generování zpráv o blokacích pro správce Alíka.', icon: '🚫' },
                { name: 'Notifikační engine', status: 'Aktivní', desc: 'Systém notifikací pro uživatele a správce.', icon: '🔔' },
                { name: 'Export API', status: 'Aktivní', desc: 'JSON export všech datových tabulek.', icon: '📤' },
                { name: 'Fórum engine', status: 'Aktivní', desc: 'Diskuzní fóra s rolově řízenou moderací.', icon: '💬' },
                { name: 'Doučovací systém', status: 'Aktivní', desc: 'Systém otázek a odpovědí s podporou viditelnosti.', icon: '❓' },
              ].map((integ, i) => (
                <div key={i} className="catalog-item-card items-center">
                  <div className="flex-1">
                    <strong>{integ.icon} {integ.name}</strong>
                    <p className="text-xs text-muted-foreground mt-0.5">{integ.desc}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#16a34a' }}>{integ.status}</span>
                </div>
              ))}
            </div>
            <div className="panel-card mt-2">
              <h4 className="mt-0 text-sm">API klíče</h4>
              <p className="text-xs text-muted-foreground">Správa API klíčů pro externí integraci. Klíče se ukládají do systémových nastavení.</p>
              {isDeveloper && (
                <div className="grid gap-2 mt-2">
                  <div className="flex gap-2">
                    <input placeholder="Název klíče" value={newSettingKey} onChange={e => setNewSettingKey(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none flex-1" />
                    <input placeholder="Hodnota" value={newSettingValue} onChange={e => setNewSettingValue(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none flex-1" />
                    <button onClick={saveSetting} className="btn-alik-primary text-xs">Uložit</button>
                  </div>
                  {settingsData.filter(s => s.key.startsWith('api_')).map(s => (
                    <div key={s.id} className="catalog-item-card text-xs"><strong>{s.key}</strong><span className="text-muted-foreground">••••••</span></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'nastaveni':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">⚙ Konfigurace systému</h3>
            {isDeveloper && (
              <div className="grid gap-2 p-3 rounded-xl" style={{ background: '#f8f9ff' }}>
                <h4 className="mt-0 text-sm">Nové nastavení</h4>
                <div className="flex gap-2">
                  <input placeholder="Klíč" value={newSettingKey} onChange={e => setNewSettingKey(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none flex-1" />
                  <input placeholder="Hodnota" value={newSettingValue} onChange={e => setNewSettingValue(e.target.value)} className="border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none flex-1" />
                  <button onClick={saveSetting} className="btn-alik-primary text-xs">Uložit</button>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              {settingsData.map(s => (
                <div key={s.id} className="catalog-item-card items-center">
                  <div className="flex-1"><strong className="text-xs">{s.key}</strong></div>
                  <span className="text-xs text-muted-foreground">{typeof s.value === 'string' ? s.value.slice(0, 40) : JSON.stringify(s.value).slice(0, 40)}</span>
                </div>
              ))}
              {settingsData.length === 0 && <p className="text-muted-foreground text-sm">Žádná nastavení.</p>}
            </div>
          </div>
        );

      default:
        return (
          <div className="panel-card">
            <h3 className="mt-0">{tabs.find(t => t.key === activeTab)?.icon} {tabs.find(t => t.key === activeTab)?.label}</h3>
            <p className="text-muted-foreground">Modul je aktivní.</p>
          </div>
        );
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center">Načítání...</div>;

  return (
    <AppLayout searchLabel="Rektorát" searchPlaceholder="Hledat v rektorátu..." searchTags={['kurzy', 'uživatelé', 'blokace']}>
      <main className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5 items-start">
        <aside className="grid gap-0.5 max-h-[80vh] overflow-y-auto pr-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5 px-2">Funkce ({tabs.length})</h3>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`text-left text-xs py-1.5 px-2.5 rounded-xl font-bold transition-all ${activeTab === t.key ? 'btn-alik-primary' : 'hover:bg-blue-50'}`}
            >
              {t.icon} {t.label}
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
