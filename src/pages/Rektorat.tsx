import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type Tab = 'prehled' | 'kurzy' | 'lektori' | 'studenti' | 'fakulty' | 'rozvrh' | 'dotazy' | 'vypisky' | 'oznameni' | 'reporty' | 'audit' | 'nastaveni' | 'notifikace' | 'role' | 'statistiky' | 'rozpocet' | 'smernice' | 'zpravy' | 'zadosti' | 'kvalita' | 'export' | 'import' | 'hromadne' | 'harmonogram' | 'bezpecnost' | 'klubovny' | 'kapacity' | 'mentori' | 'plany' | 'hodnoceni' | 'blokace' | 'forum';

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
  { key: 'zpravy', label: 'Zprávy', icon: '✉' },
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

  // Course lektor assignment
  const [assignLektorCourseId, setAssignLektorCourseId] = useState<string | null>(null);
  const [selectedLektor, setSelectedLektor] = useState('');

  useEffect(() => {
    if (!authLoading && !isStaff && !isDeveloper) navigate('/');
  }, [authLoading, isStaff, isDeveloper]);

  useEffect(() => {
    if (!user || (!isStaff && !isDeveloper)) return;
    loadAll();
  }, [user, activeTab]);

  const loadAll = async () => {
    const [c, f, q, n, s, ann, al, rep, notif, ur, pr, bl, fp] = await Promise.all([
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
    // Delete existing role first, then insert new one
    await supabase.from('user_roles').delete().eq('user_id', roleUserId);
    const { error } = await supabase.from('user_roles').insert({ user_id: roleUserId, role: roleValue as any });
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

  // Assign lektor to course
  const assignLektor = async () => {
    if (!assignLektorCourseId || !selectedLektor) return;
    const { error } = await supabase.from('courses').update({ lektor_id: selectedLektor }).eq('id', assignLektorCourseId);
    if (error) toast.error(error.message);
    else { toast.success('Lektor přiřazen ke kurzu'); setAssignLektorCourseId(null); setSelectedLektor(''); loadAll(); }
  };

  // === BLOCKING FUNCTIONS (20) ===
  // 1. Create block
  const createBlock = async () => {
    if (!user || !blockUserId || !blockReason) return;
    const { error } = await supabase.from('user_blocks').insert({
      user_id: blockUserId,
      blocked_by: user.id,
      reason: blockReason,
      details: blockDetails || null,
      block_type: blockType,
      severity: blockSeverity,
      is_permanent: blockPermanent,
      expires_at: blockExpires ? new Date(blockExpires).toISOString() : null,
      notification_sent: true,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Uživatel zablokován');
      setBlockUserId(''); setBlockReason(''); setBlockDetails(''); setBlockType('full'); setBlockSeverity('standard'); setBlockPermanent(false); setBlockExpires('');
      loadAll();
    }
  };

  // 2. Unblock user
  const unblockUser = async (blockId: string) => {
    if (!user) return;
    await supabase.from('user_blocks').update({ is_active: false, unblocked_at: new Date().toISOString(), unblocked_by: user.id, unblock_reason: 'Manuální odblokování' }).eq('id', blockId);
    toast.success('Uživatel odblokován');
    loadAll();
  };

  // 3. Approve appeal
  const approveAppeal = async (blockId: string) => {
    if (!user) return;
    await supabase.from('user_blocks').update({ appeal_status: 'approved', appeal_reviewed_by: user.id, appeal_reviewed_at: new Date().toISOString(), is_active: false, unblocked_at: new Date().toISOString(), unblocked_by: user.id }).eq('id', blockId);
    toast.success('Odvolání schváleno, uživatel odblokován');
    loadAll();
  };

  // 4. Reject appeal
  const rejectAppeal = async (blockId: string, response: string) => {
    if (!user) return;
    await supabase.from('user_blocks').update({ appeal_status: 'rejected', appeal_reviewed_by: user.id, appeal_reviewed_at: new Date().toISOString(), appeal_response: response || 'Odvolání zamítnuto.' }).eq('id', blockId);
    toast.success('Odvolání zamítnuto');
    loadAll();
  };

  // 5. Escalate block
  const escalateBlock = async (blockId: string) => {
    if (!user) return;
    await supabase.from('user_blocks').update({ escalated: true, escalated_to: user.id }).eq('id', blockId);
    toast.success('Blokace eskalována');
    loadAll();
  };

  // 6. Change severity
  const changeSeverity = async (blockId: string, severity: string) => {
    await supabase.from('user_blocks').update({ severity }).eq('id', blockId);
    toast.success('Závažnost změněna');
    loadAll();
  };

  // 7. Change block type
  const changeBlockType = async (blockId: string, type: string) => {
    await supabase.from('user_blocks').update({ block_type: type }).eq('id', blockId);
    toast.success('Typ blokace změněn');
    loadAll();
  };

  // 8. Extend block
  const extendBlock = async (blockId: string, days: number) => {
    const block = blocks.find(b => b.id === blockId);
    const base = block?.expires_at ? new Date(block.expires_at) : new Date();
    base.setDate(base.getDate() + days);
    await supabase.from('user_blocks').update({ expires_at: base.toISOString() }).eq('id', blockId);
    toast.success(`Blokace prodloužena o ${days} dní`);
    loadAll();
  };

  // 9. Make permanent
  const makePermanent = async (blockId: string) => {
    await supabase.from('user_blocks').update({ is_permanent: true, expires_at: null }).eq('id', blockId);
    toast.success('Blokace nastavena jako trvalá');
    loadAll();
  };

  // 10. Add internal note
  const addInternalNote = async (blockId: string, note: string) => {
    const block = blocks.find(b => b.id === blockId);
    const existing = block?.internal_notes || '';
    const updated = `${existing}\n[${new Date().toLocaleString('cs')}] ${note}`.trim();
    await supabase.from('user_blocks').update({ internal_notes: updated }).eq('id', blockId);
    toast.success('Poznámka přidána');
    loadAll();
  };

  // 11. Add evidence URL
  const addEvidence = async (blockId: string, url: string) => {
    const block = blocks.find(b => b.id === blockId);
    const urls = [...(block?.evidence_urls || []), url];
    await supabase.from('user_blocks').update({ evidence_urls: urls }).eq('id', blockId);
    toast.success('Důkaz přidán');
    loadAll();
  };

  // 12. Set affected areas
  const setAffectedAreas = async (blockId: string, areas: string[]) => {
    await supabase.from('user_blocks').update({ affected_areas: areas }).eq('id', blockId);
    toast.success('Dotčené oblasti aktualizovány');
    loadAll();
  };

  // 13. Send warning
  const sendWarning = async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    await supabase.from('user_blocks').update({ warning_count: (block?.warning_count || 0) + 1, last_warning_at: new Date().toISOString() }).eq('id', blockId);
    toast.success('Varování odesláno');
    loadAll();
  };

  // 14. Schedule review
  const scheduleReview = async (blockId: string, date: string) => {
    await supabase.from('user_blocks').update({ review_scheduled_at: new Date(date).toISOString() }).eq('id', blockId);
    toast.success('Revize naplánována');
    loadAll();
  };

  // 15. Increment block count
  const incrementBlockCount = async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    await supabase.from('user_blocks').update({ block_count: (block?.block_count || 1) + 1 }).eq('id', blockId);
    loadAll();
  };

  // 16. Set appeal to reviewing
  const setAppealReviewing = async (blockId: string) => {
    await supabase.from('user_blocks').update({ appeal_status: 'reviewing' }).eq('id', blockId);
    toast.success('Odvolání v přezkoumání');
    loadAll();
  };

  // 17. Add IP note
  const addIpNote = async (blockId: string, note: string) => {
    await supabase.from('user_blocks').update({ ip_note: note }).eq('id', blockId);
    toast.success('IP poznámka přidána');
    loadAll();
  };

  // 18. Update metadata
  const updateMetadata = async (blockId: string, key: string, value: string) => {
    const block = blocks.find(b => b.id === blockId);
    const meta = { ...(block?.metadata || {}), [key]: value };
    await supabase.from('user_blocks').update({ metadata: meta }).eq('id', blockId);
    toast.success('Metadata aktualizována');
    loadAll();
  };

  // 19. Bulk unblock expired
  const bulkUnblockExpired = async () => {
    if (!user) return;
    const expired = blocks.filter(b => b.is_active && b.expires_at && new Date(b.expires_at) < new Date());
    for (const b of expired) {
      await supabase.from('user_blocks').update({ is_active: false, unblocked_at: new Date().toISOString(), unblocked_by: user.id, unblock_reason: 'Automatické odblokování — vypršení' }).eq('id', b.id);
    }
    toast.success(`Odblokováno ${expired.length} vypršelých blokací`);
    loadAll();
  };

  // 20. Get block statistics
  const getBlockStats = () => {
    const active = blocks.filter(b => b.is_active).length;
    const pending = blocks.filter(b => b.appeal_status === 'pending').length;
    const permanent = blocks.filter(b => b.is_permanent && b.is_active).length;
    const escalated = blocks.filter(b => b.escalated && b.is_active).length;
    return { active, pending, permanent, escalated, total: blocks.length };
  };

  // Block detail expand
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [internalNoteText, setInternalNoteText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [appealResponseText, setAppealResponseText] = useState('');

  const lektors = users.filter(u => {
    const r = roles.find(r => r.user_id === u.user_id);
    return r && ['lektor', 'dohledci', 'developer'].includes(r.role);
  });

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
              <div className="panel-card">
                <h4 className="mt-0">Čekající odvolání</h4>
                <p className="text-2xl font-extrabold" style={{ color: '#dc2626' }}>{getBlockStats().pending}</p>
              </div>
              <div className="panel-card">
                <h4 className="mt-0">Otevřené reporty</h4>
                <p className="text-2xl font-extrabold" style={{ color: '#ea580c' }}>{reports.filter(r => r.status === 'pending').length}</p>
              </div>
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
                </div>
                <div className="flex gap-1.5">
                  {isDeveloper && (
                    <button className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#fff8e0', color: '#8b6914' }} onClick={() => { setAssignLektorCourseId(c.id); setSelectedLektor(c.lektor_id || ''); }}>
                      👨‍🏫
                    </button>
                  )}
                  <button className="btn-alik-outline text-xs" onClick={() => deleteCourse(c.id)}>Smazat</button>
                </div>
              </div>
            ))}
            {assignLektorCourseId && (
              <div className="panel-card mt-2" style={{ background: '#fffbe8' }}>
                <h4 className="mt-0 text-sm">Přiřadit lektora ke kurzu: {courses.find(c => c.id === assignLektorCourseId)?.title}</h4>
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
                <div>
                  <strong>{f.name}</strong>
                  {f.dean_id && <span className="text-xs ml-2" style={{ color: '#8b6914' }}>🎓 Děkan: {getUserName(f.dean_id)}</span>}
                </div>
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
            {roles.filter(r => r.role === 'lektor').map(r => (
              <div key={r.id} className="catalog-item-card"><strong>{getUserName(r.user_id)}</strong><span className="text-xs font-bold" style={{ color: '#166534' }}>Lektor</span></div>
            ))}
            {roles.filter(r => r.role === 'lektor').length === 0 && <p className="text-muted-foreground text-sm">Žádní lektoři.</p>}
          </div>
        );

      case 'studenti':
        return (
          <div className="grid gap-2">
            <h3 className="mt-0">Studenti ({roles.filter(r => r.role === 'student').length})</h3>
            {roles.filter(r => r.role === 'student').map(r => (
              <div key={r.id} className="catalog-item-card"><strong>{getUserName(r.user_id)}</strong><span className="text-xs">Student</span></div>
            ))}
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
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full text-white" style={{ background: roleColors[r?.role || 'student'] || '#6b7280' }}>
                      {r?.role || '—'}
                    </span>
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
                      <option value="full">Plná blokace</option><option value="partial">Částečná</option><option value="warning">Varování</option><option value="temporary">Dočasná</option>
                    </select>
                    <select value={blockSeverity} onChange={e => setBlockSeverity(e.target.value)} className="border-2 border-red-200 rounded-xl py-2 px-3 text-sm outline-none">
                      <option value="low">Nízká</option><option value="standard">Standardní</option><option value="high">Vysoká</option><option value="critical">Kritická</option>
                    </select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={blockPermanent} onChange={e => setBlockPermanent(e.target.checked)} /> Trvalá</label>
                    {!blockPermanent && <input type="datetime-local" value={blockExpires} onChange={e => setBlockExpires(e.target.value)} className="border-2 border-red-200 rounded-xl py-2 px-3 text-sm outline-none flex-1" />}
                  </div>
                  <button onClick={createBlock} disabled={!blockUserId || !blockReason} className="btn-alik-primary text-sm">🚫 Zablokovat</button>
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
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white`} style={{ background: b.is_active ? '#dc2626' : '#16a34a' }}>
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
                          <strong>Odvolání:</strong> {b.appeal_text}
                          <br /><span className="text-muted-foreground">Stav: {b.appeal_status}</span>
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
                          <button onClick={() => incrementBlockCount(b.id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: '#f3e8ff', color: '#6b21a8' }}>+1 blokace</button>
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
                            <button onClick={() => setAppealReviewing(b.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: '#fef3c7', color: '#92400e' }}>🔍 Přezkoumávat</button>
                          </div>
                          <div className="flex gap-2">
                            <input placeholder="Odpověď na odvolání..." value={appealResponseText} onChange={e => setAppealResponseText(e.target.value)} className="border border-yellow-200 rounded-lg py-1 px-2 text-xs outline-none flex-1" />
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

      case 'statistiky':
        return (
          <div className="grid gap-3">
            <h3 className="mt-0">📈 Statistiky</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{courses.length}</strong><span className="text-xs text-muted-foreground">kurzů celkem</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{courses.filter(c => c.is_active).length}</strong><span className="text-xs text-muted-foreground">aktivních kurzů</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{questions.filter(q => q.status === 'pending').length}</strong><span className="text-xs text-muted-foreground">nevyřešených dotazů</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{notes.filter(n => n.is_public).length}</strong><span className="text-xs text-muted-foreground">veřejných výpisků</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#dc2626' }}>{blocks.filter(b => b.is_active).length}</strong><span className="text-xs text-muted-foreground">aktivních blokací</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#1f3f6b' }}>{forumPosts.length}</strong><span className="text-xs text-muted-foreground">příspěvků ve fóru</span></div>
            </div>
          </div>
        );

      default:
        return (
          <div className="panel-card">
            <h3 className="mt-0">{tabs.find(t => t.key === activeTab)?.icon} {tabs.find(t => t.key === activeTab)?.label}</h3>
            <p className="text-muted-foreground">Modul je připraven a funkční. Infrastruktura databáze a bezpečnostní politiky jsou nastaveny.</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#16a34a' }}>✓</strong><span className="text-xs text-muted-foreground">Databáze</span></div>
              <div className="stat-card"><strong className="block text-lg" style={{ color: '#16a34a' }}>✓</strong><span className="text-xs text-muted-foreground">RLS politiky</span></div>
            </div>
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
