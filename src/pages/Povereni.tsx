import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RoleBadge from '@/components/RoleBadge';
import OnlineIndicator from '@/components/OnlineIndicator';
import { toast } from 'sonner';

interface StaffMember {
  user_id: string;
  display_name: string;
  username?: string;
  avatar_url: string | null;
  last_seen: string | null;
  role: string;
  alik_username: string;
  show_mail_link: boolean;
  show_profile_link: boolean;
  show_answers_link: boolean;
  custom_note: string;
  is_visible: boolean;
  sort_order: number;
  settings_id?: string;
  specialization: string;
  motto: string;
  contact_hours: string;
  favorite_subject: string;
  fun_fact: string;
  languages: string;
  joined_date: string | null;
  accepting_questions: boolean;
  response_style: string;
  availability_status: string;
  hobbies: string;
  achievements: string[];
  preferred_contact: string;
  max_questions_daily: number;
  experience_years: number;
  education: string;
  social_link: string;
  working_days: string;
  bio_short: string;
  profile_color: string;
  answer_count: number;
}

const db = () => supabase as any;

const ROLE_SECTION_INFO: Record<string, { title: string; eyebrow: string; description: string; symbol: string; tone: string }> = {
  rektor:  { title: 'Rektorát',  eyebrow: 'Vedení univerzity', description: 'Rektor vede celou univerzitu, schvaluje pravomoci a dohlíží na všechny moduly.', symbol: '♛', tone: 'hsl(var(--primary))' },
  spravce: { title: 'Správa',    eyebrow: 'Bezpečnost a moderace', description: 'Správci dohlížejí na bezpečnost, moderují obsah a řeší blokace.', symbol: '⚙', tone: 'hsl(var(--secondary))' },
  lektor:  { title: 'Sbor lektorů', eyebrow: 'Výuka a doučování', description: 'Lektoři vedou kurzy, odpovídají na dotazy a starají se o obsah výuky.', symbol: '✦', tone: 'hsl(var(--accent))' },
  redakce: { title: 'Redakce Naučtury', eyebrow: 'Naučná literatura', description: 'Redaktoři posuzují, dolaďují a vydávají články v Naučtuře. Spravují Vavřínové body.', symbol: '✒', tone: 'hsl(var(--primary))' },
};

const AVAILABILITY_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: 'Dostupný/á', color: '#3A6B3E' },
  busy: { label: 'Zaneprázdněný/á', color: '#C9A24B' },
  away: { label: 'Nepřítomný/á', color: '#7A1F2B' },
  offline: { label: 'Offline', color: '#6b7280' },
};

const EDITABLE_FIELDS = [
  { key: 'alik_username', label: 'Přezdívka na Alíkovi', type: 'text' },
  { key: 'specialization', label: 'Specializace', type: 'text' },
  { key: 'motto', label: 'Motto', type: 'text' },
  { key: 'contact_hours', label: 'Kontaktní hodiny', type: 'text' },
  { key: 'favorite_subject', label: 'Oblíbený předmět', type: 'text' },
  { key: 'fun_fact', label: 'Zajímavost', type: 'text' },
  { key: 'languages', label: 'Jazyky', type: 'text' },
  { key: 'response_style', label: 'Styl odpovědí', type: 'text' },
  { key: 'hobbies', label: 'Koníčky', type: 'text' },
  { key: 'preferred_contact', label: 'Preferovaný kontakt', type: 'text' },
  { key: 'education', label: 'Vzdělání', type: 'text' },
  { key: 'social_link', label: 'Odkaz (sociální síť)', type: 'text' },
  { key: 'working_days', label: 'Pracovní dny', type: 'text' },
  { key: 'bio_short', label: 'Krátké bio', type: 'text' },
  { key: 'profile_color', label: 'Barva profilu (hex)', type: 'text' },
  { key: 'custom_note', label: 'Poznámka pod jménem', type: 'text' },
  { key: 'sort_order', label: 'Pořadí', type: 'number' },
  { key: 'experience_years', label: 'Roky zkušeností', type: 'number' },
  { key: 'max_questions_daily', label: 'Max dotazů denně', type: 'number' },
  { key: 'joined_date', label: 'Datum nástupu', type: 'date' },
  { key: 'availability_status', label: 'Stav dostupnosti', type: 'select', options: ['available', 'busy', 'away', 'offline'] },
] as const;

const TOGGLE_FIELDS = [
  { key: 'show_mail_link', label: 'Dopisy' },
  { key: 'show_profile_link', label: 'Profil' },
  { key: 'show_answers_link', label: 'Odpovědi' },
  { key: 'is_visible', label: 'Viditelný' },
  { key: 'accepting_questions', label: 'Přijímá dotazy' },
] as const;

export default function Povereni() {
  const { user, isDeveloper } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [editorMembers, setEditorMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StaffMember>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [boxForm, setBoxForm] = useState<any>({ title: '', description: '', symbol: '✦', color: '#7A1F2B', member_ids: [], sort_order: 100, is_visible: true });
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').neq('role', 'student');
    if (!roles?.length) { setStaff([]); setLoading(false); return; }

    const userIds = roles.map(r => r.user_id);
    const [{ data: profiles }, { data: settings }, { data: answerCounts }] = await Promise.all([
      db().from('profiles').select('user_id, display_name, username, avatar_url, last_seen').in('user_id', userIds),
      db().from('staff_page_settings').select('*').in('user_id', userIds),
      supabase.from('tutoring_answers').select('mentor_id').in('mentor_id', userIds),
    ]);

    const countMap: Record<string, number> = {};
    answerCounts?.forEach((a: any) => { countMap[a.mentor_id] = (countMap[a.mentor_id] || 0) + 1; });

    const merged: StaffMember[] = roles.map((r: any) => {
      const p = profiles?.find((p: any) => p.user_id === r.user_id);
      const s = settings?.find((s: any) => s.user_id === r.user_id);
      return {
        user_id: r.user_id,
        display_name: p?.display_name || 'Neznámý',
        username: p?.username,
        avatar_url: p?.avatar_url,
        last_seen: p?.last_seen || null,
        role: r.role,
        alik_username: s?.alik_username || '',
        show_mail_link: s?.show_mail_link ?? true,
        show_profile_link: s?.show_profile_link ?? true,
        show_answers_link: s?.show_answers_link ?? true,
        custom_note: s?.custom_note || '',
        is_visible: s?.is_visible ?? true,
        sort_order: s?.sort_order ?? 0,
        settings_id: s?.id,
        specialization: s?.specialization || '',
        motto: s?.motto || '',
        contact_hours: s?.contact_hours || '',
        favorite_subject: s?.favorite_subject || '',
        fun_fact: s?.fun_fact || '',
        languages: s?.languages || 'čeština',
        joined_date: s?.joined_date || null,
        accepting_questions: s?.accepting_questions ?? true,
        response_style: s?.response_style || '',
        availability_status: s?.availability_status || 'available',
        hobbies: s?.hobbies || '',
        achievements: s?.achievements || [],
        preferred_contact: s?.preferred_contact || 'dopis',
        max_questions_daily: s?.max_questions_daily ?? 0,
        experience_years: s?.experience_years ?? 0,
        education: s?.education || '',
        social_link: s?.social_link || '',
        working_days: s?.working_days || '',
        bio_short: s?.bio_short || '',
        profile_color: s?.profile_color || '',
        answer_count: countMap[r.user_id] || 0,
      };
    });

    merged.sort((a, b) => a.sort_order - b.sort_order);
    setStaff(merged);

    const [{ data: bxs }, { data: profs }, { data: eds }] = await Promise.all([
      db().from('staff_page_boxes').select('*').order('sort_order'),
      db().from('profiles').select('user_id, display_name, username, avatar_url'),
      db().from('article_editors').select('user_id, topic_id'),
    ]);
    setBoxes(bxs || []);
    setAllProfiles(profs || []);
    // editor members: unique users from article_editors with their profiles
    const edIds = [...new Set((eds || []).map((e: any) => e.user_id))];
    const edTopics: Record<string, string[]> = {};
    (eds || []).forEach((e: any) => { edTopics[e.user_id] = edTopics[e.user_id] || []; if (e.topic_id) edTopics[e.user_id].push(e.topic_id); });
    setEditorMembers(edIds.map((uid: any) => {
      const p = (profs || []).find((x: any) => x.user_id === uid);
      return { user_id: uid, display_name: p?.display_name || 'Redaktor', username: p?.username, avatar_url: p?.avatar_url, topic_ids: edTopics[uid as string] };
    }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveBox = async () => {
    const payload = { ...boxForm, title: boxForm.title?.trim() };
    if (!payload.title) return toast.error('Vyplň název boxíku');
    if (editingBoxId && editingBoxId !== 'new') {
      const { error } = await db().from('staff_page_boxes').update(payload).eq('id', editingBoxId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await db().from('staff_page_boxes').insert({ ...payload, created_by: user?.id });
      if (error) return toast.error(error.message);
    }
    toast.success('Uloženo');
    setEditingBoxId(null);
    setBoxForm({ title: '', description: '', symbol: '✦', color: '#7A1F2B', member_ids: [], sort_order: 100, is_visible: true });
    load();
  };

  const deleteBox = async (id: string) => {
    if (!confirm('Smazat tento boxík?')) return;
    const { error } = await db().from('staff_page_boxes').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Smazáno');
    load();
  };

  const saveSettings = async (member: StaffMember) => {
    const payload: Record<string, any> = { user_id: member.user_id };
    [...EDITABLE_FIELDS, ...TOGGLE_FIELDS].forEach(f => {
      payload[f.key] = (editForm as any)[f.key] ?? (member as any)[f.key];
    });
    if (member.settings_id) {
      await db().from('staff_page_settings').update(payload).eq('id', member.settings_id);
    } else {
      await db().from('staff_page_settings').insert(payload);
    }
    toast.success('Nastavení uloženo');
    setEditingId(null);
    setEditForm({});
    load();
  };

  const visibleStaff = isDeveloper ? staff : staff.filter(s => s.is_visible);
  const roleGroups = ['rektor', 'spravce', 'lektor'] as const;
  const q = query.trim().toLowerCase();
  const matches = (m: StaffMember) => !q || [m.display_name, m.specialization, m.motto, m.alik_username, m.education].some(v => (v || '').toLowerCase().includes(q));

  const counts = useMemo(() => ({
    rektor: visibleStaff.filter(s => s.role === 'rektor').length,
    spravce: visibleStaff.filter(s => s.role === 'spravce').length,
    lektor: visibleStaff.filter(s => s.role === 'lektor').length,
    total: visibleStaff.length,
    online: visibleStaff.filter(s => s.last_seen && (Date.now() - new Date(s.last_seen).getTime()) < 5 * 60 * 1000).length,
  }), [visibleStaff]);

  return (
    <AppLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=JetBrains+Mono:wght@400;600&display=swap');

        .pov2 { --ink: hsl(var(--foreground)); --paper: hsl(var(--background)); --paper-2: hsl(var(--card)); --line: hsl(var(--border)); --gold: hsl(var(--primary)); --bord: hsl(var(--destructive)); --moss: hsl(var(--secondary)); color:var(--ink); }
        .dark .pov2 { --ink: hsl(var(--foreground)); --paper: hsl(var(--background)); --paper-2: hsl(var(--card)); --line: hsl(var(--border)); --gold: hsl(var(--primary)); --bord: hsl(var(--destructive)); --moss: hsl(var(--secondary)); }
        .pov2 .serif { font-family:'Cormorant Garamond', 'Playfair Display', Georgia, serif; font-feature-settings:'liga','dlig'; letter-spacing:-.005em; }
        .pov2 .mono { font-family:'JetBrains Mono', ui-monospace, Menlo, monospace; }

        .pov2-hero {
          background:
            radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--gold) 18%, transparent) 0%, transparent 50%),
            radial-gradient(120% 80% at 100% 100%, color-mix(in oklab, var(--bord) 22%, transparent) 0%, transparent 55%),
            var(--paper);
          border:1px solid var(--line); border-radius:20px; padding:48px 44px; position:relative; overflow:hidden;
        }
        .pov2-hero::before { content:""; position:absolute; inset:14px; border:1px solid var(--line); border-radius:14px; pointer-events:none; }
        .pov2-eyebrow { letter-spacing:.32em; text-transform:uppercase; font-size:11px; opacity:.7; }
        .pov2-h1 { font-size:clamp(48px,7vw,96px); line-height:.95; margin:.2em 0 .1em; font-weight:600; }
        .pov2-h1 em { color:var(--bord); font-style:italic; }
        .pov2-rule { display:flex; align-items:center; gap:14px; opacity:.8; margin:8px 0 0; }
        .pov2-rule::before, .pov2-rule::after { content:""; height:1px; background:var(--line); flex:1; }
        .pov2-rule span { font-size:18px; color:var(--gold); }

        .pov2-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:0; margin-top:28px; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
        .pov2-stat { padding:14px 16px; border-right:1px solid var(--line); }
        .pov2-stat:last-child { border-right:none; }
        .pov2-stat .n { font-size:28px; font-weight:600; }
        .pov2-stat .l { font-size:10px; letter-spacing:.22em; text-transform:uppercase; opacity:.65; }

        .pov2-toolbar { position:sticky; top:0; z-index:5; backdrop-filter:blur(10px); background:color-mix(in oklab, var(--paper) 85%, transparent); border:1px solid var(--line); border-radius:999px; padding:6px; display:flex; gap:4px; align-items:center; margin:28px 0; flex-wrap:wrap; }
        .pov2-tab { border:none; background:transparent; padding:8px 16px; border-radius:999px; cursor:pointer; font-size:12px; font-weight:700; color:var(--ink); display:inline-flex; gap:6px; align-items:center; }
        .pov2-tab[aria-selected="true"] { background:var(--ink); color:var(--paper); }
        .pov2-search { flex:1; min-width:180px; border:none; background:transparent; padding:8px 14px; outline:none; color:var(--ink); font-size:13px; }

        .pov2-section { margin:48px 0; }
        .pov2-section-head { display:grid; grid-template-columns:auto 1fr auto; gap:16px; align-items:end; border-bottom:2px solid var(--ink); padding-bottom:10px; margin-bottom:24px; }
        .pov2-section-num { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.2em; opacity:.55; }
        .pov2-section-title { font-size:clamp(28px,4vw,44px); line-height:1; margin:0; font-weight:600; }
        .pov2-section-sym { font-size:28px; color:var(--gold); }
        .pov2-section-desc { font-size:13px; opacity:.7; margin:6px 0 0; max-width:60ch; }

        .pov2-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:18px; }

        .pov2-card { position:relative; background:var(--paper-2); border:1px solid var(--line); border-radius:14px; padding:22px; display:flex; flex-direction:column; gap:10px; transition:transform .25s ease, box-shadow .25s ease; overflow:hidden; }
        .pov2-card:hover { transform:translateY(-2px); box-shadow:0 10px 30px -18px var(--ink); }
        .pov2-card::after { content:attr(data-initial); position:absolute; right:-14px; bottom:-30px; font-family:'Cormorant Garamond',serif; font-size:160px; font-weight:700; line-height:1; opacity:.05; pointer-events:none; }
        .pov2-card .accent { position:absolute; left:0; top:0; width:4px; height:100%; background:var(--accent,var(--gold)); }
        .pov2-card.featured { grid-column:span 2; background:var(--ink); color:var(--paper); }
        .pov2-card.featured .pov2-name, .pov2-card.featured .pov2-meta-row dt, .pov2-card.featured .pov2-meta-row dd { color:var(--paper); }
        .pov2-card.featured::after { color:var(--paper); opacity:.07; }

        .pov2-card-top { display:flex; gap:14px; align-items:flex-start; }
        .pov2-ava { width:64px; height:64px; border-radius:50%; overflow:hidden; flex-shrink:0; border:2px solid var(--paper); box-shadow:0 0 0 1px var(--line); position:relative; background:var(--paper); }
        .pov2-ava img { width:100%; height:100%; object-fit:cover; }
        .pov2-ava-ph { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-family:'Cormorant Garamond',serif; font-size:30px; font-weight:600; background:linear-gradient(135deg, var(--gold) 0%, var(--bord) 100%); color:var(--paper); }
        .pov2-online { position:absolute; bottom:0; right:0; }

        .pov2-name { font-family:'Cormorant Garamond',serif; font-size:24px; font-weight:600; line-height:1.05; margin:0; color:var(--ink); display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .pov2-handle { font-family:'JetBrains Mono',monospace; font-size:10px; opacity:.6; letter-spacing:.04em; }
        .pov2-spec { font-size:12px; opacity:.85; margin:0; }
        .pov2-motto { font-style:italic; font-family:'Cormorant Garamond',serif; font-size:15px; line-height:1.35; opacity:.85; border-left:2px solid var(--gold); padding-left:10px; margin:6px 0; }
        .pov2-note { font-size:12px; opacity:.75; }

        .pov2-chips { display:flex; flex-wrap:wrap; gap:6px; }
        .pov2-chip { font-family:'JetBrains Mono',monospace; font-size:10px; padding:3px 8px; border-radius:999px; border:1px solid var(--line); letter-spacing:.04em; }
        .pov2-chip.dot::before { content:"●"; margin-right:5px; }

        .pov2-meta-row { display:grid; grid-template-columns:auto 1fr; gap:4px 10px; font-size:12px; margin:6px 0 0; }
        .pov2-meta-row dt { font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.18em; text-transform:uppercase; opacity:.55; align-self:center; }
        .pov2-meta-row dd { margin:0; opacity:.9; }

        .pov2-actions { display:flex; flex-wrap:wrap; gap:6px; margin-top:auto; padding-top:10px; border-top:1px dashed var(--line); }
        .pov2-btn { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase; padding:6px 10px; border-radius:6px; border:1px solid var(--line); background:transparent; color:inherit; text-decoration:none; cursor:pointer; transition:all .18s; }
        .pov2-btn:hover { background:var(--ink); color:var(--paper); border-color:var(--ink); }
        .pov2-card.featured .pov2-btn { border-color:var(--paper); color:var(--paper); }
        .pov2-card.featured .pov2-btn:hover { background:var(--paper); color:var(--ink); }
        .pov2-btn.primary { background:var(--bord); color:#fff; border-color:var(--bord); }

        .pov2-edit { margin-top:10px; padding:12px; border-radius:8px; background:color-mix(in oklab, var(--ink) 6%, transparent); display:grid; gap:6px; }
        .pov2-input { width:100%; padding:6px 8px; border-radius:6px; border:1px solid var(--line); background:var(--paper); color:var(--ink); font-size:12px; font-family:inherit; }

        .pov2-empty { text-align:center; padding:60px 20px; opacity:.6; font-style:italic; font-family:'Cormorant Garamond',serif; font-size:18px; }

        .pov2-boxmgr { margin-top:48px; border:1.5px dashed var(--line); border-radius:14px; padding:20px; }

        @media (max-width: 720px) {
          .pov2-hero { padding:32px 22px; }
          .pov2-stats { grid-template-columns:repeat(2,1fr); }
          .pov2-stat:nth-child(2n) { border-right:none; }
          .pov2-stat:nth-child(-n+2) { border-bottom:1px solid var(--line); }
          .pov2-card.featured { grid-column:auto; }
        }
      `}</style>

      <div className="pov2 max-w-6xl mx-auto px-4 pb-24">
        {/* Hero */}
        <header className="pov2-hero">
          <div className="pov2-eyebrow">Univerzita · Almanach pověřených osob</div>
          <h1 className="serif pov2-h1">Pověření<em>.</em></h1>
          <div className="pov2-rule"><span>✦ ✦ ✦</span></div>
          <p className="serif" style={{ fontSize:18, fontStyle:'italic', maxWidth:'60ch', margin:'14px 0 0', opacity:.85 }}>
            Lidé, kteří drží univerzitu v chodu — rektorát, správa a sbor lektorů. Klikněte na kteroukoli kartu pro
            podrobnosti, nebo pište přímo dopisem.
          </p>
          <dl className="pov2-stats">
            <div className="pov2-stat"><div className="n mono">{counts.total.toString().padStart(2,'0')}</div><div className="l">Pověřených celkem</div></div>
            <div className="pov2-stat"><div className="n mono" style={{ color:'var(--moss)' }}>{counts.online.toString().padStart(2,'0')}</div><div className="l">Online nyní</div></div>
            <div className="pov2-stat"><div className="n mono">{counts.rektor + counts.spravce}</div><div className="l">Vedení & správa</div></div>
            <div className="pov2-stat"><div className="n mono">{counts.lektor}</div><div className="l">Lektorů</div></div>
          </dl>
        </header>

        {/* Toolbar */}
        <div className="pov2-toolbar" role="tablist">
          {[
            { id:'all', label:'Vše', sym:'❖' },
            { id:'rektor', label:'Rektorát', sym:'♛' },
            { id:'spravce', label:'Správa', sym:'⚙' },
            { id:'lektor', label:'Lektoři', sym:'✦' },
            ...boxes.map(b => ({ id:`box:${b.id}`, label:b.title, sym:b.symbol || '◆' })),
          ].map(t => (
            <button key={t.id} role="tab" aria-selected={activeTab===t.id} onClick={() => setActiveTab(t.id)} className="pov2-tab">
              <span aria-hidden>{t.sym}</span> {t.label}
            </button>
          ))}
          <input className="pov2-search" placeholder="Hledat jméno, specializaci, motto…" value={query} onChange={e=>setQuery(e.target.value)} />
        </div>

        {loading ? (
          <p className="pov2-empty">Načítání almanachu…</p>
        ) : (
          <>
            {/* Role sections */}
            {roleGroups.map((roleKey, idx) => {
              if (activeTab !== 'all' && activeTab !== roleKey) return null;
              const info = ROLE_SECTION_INFO[roleKey];
              const members = visibleStaff.filter(s => s.role === roleKey).filter(matches);
              if (!members.length) return null;

              return (
                <section key={roleKey} className="pov2-section">
                  <header className="pov2-section-head">
                    <span className="pov2-section-num">§ {String(idx+1).padStart(2,'0')}</span>
                    <div>
                      <div className="pov2-eyebrow">{info.eyebrow}</div>
                      <h2 className="serif pov2-section-title">{info.title}</h2>
                      <p className="pov2-section-desc">{info.description}</p>
                    </div>
                    <span className="pov2-section-sym" aria-hidden>{info.symbol}</span>
                  </header>

                  <div className="pov2-grid">
                    {members.map((member, i) => renderCard(member, i === 0 && roleKey === 'rektor', info.tone))}
                  </div>
                </section>
              );
            })}

            {/* Custom boxes */}
            {boxes.filter(b => isDeveloper || b.is_visible).map((box, idx) => {
              if (activeTab !== 'all' && activeTab !== `box:${box.id}`) return null;
              const members = (box.member_ids || []).map((id: string) => allProfiles.find(p => p.user_id === id)).filter(Boolean);
              return (
                <section key={box.id} className="pov2-section">
                  <header className="pov2-section-head">
                    <span className="pov2-section-num">§ {String(roleGroups.length + idx + 1).padStart(2,'0')}</span>
                    <div>
                      <div className="pov2-eyebrow">Vlastní sekce</div>
                      <h2 className="serif pov2-section-title">{box.title}</h2>
                      {box.description && <p className="pov2-section-desc">{box.description}</p>}
                      {isDeveloper && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => { setEditingBoxId(box.id); setBoxForm(box); }} className="pov2-btn">⚙ Upravit</button>
                          <button onClick={() => deleteBox(box.id)} className="pov2-btn">🗑 Smazat</button>
                          {!box.is_visible && <span className="pov2-chip">skryto</span>}
                        </div>
                      )}
                    </div>
                    <span className="pov2-section-sym" style={{ color: box.color || 'var(--gold)' }}>{box.symbol || '◆'}</span>
                  </header>

                  <div className="pov2-grid">
                    {members.map((p: any) => (
                      <article key={p.user_id} className="pov2-card" data-initial={p.display_name?.[0]?.toUpperCase()} style={{ ['--accent' as any]: box.color || 'var(--gold)' }}>
                        <span className="accent" />
                        <div className="pov2-card-top">
                          <div className="pov2-ava">
                            {p.avatar_url ? <img src={p.avatar_url} alt="" /> : <div className="pov2-ava-ph">{p.display_name?.[0]?.toUpperCase()}</div>}
                          </div>
                          <div>
                            <h3 className="pov2-name">{p.display_name}</h3>
                            {p.username && <div className="pov2-handle">@{p.username}</div>}
                          </div>
                        </div>
                        <div className="pov2-actions">
                          {p.username && <a className="pov2-btn" href={`/uziv/${p.username}`}>Zeď →</a>}
                        </div>
                      </article>
                    ))}
                    {members.length === 0 && <p className="pov2-empty" style={{ gridColumn:'1/-1' }}>Zatím žádní členové.</p>}
                  </div>
                </section>
              );
            })}

            {/* Box manager */}
            {isDeveloper && (
              <section className="pov2-boxmgr">
                <h3 className="serif" style={{ fontSize:22, margin:'0 0 8px' }}>⚙ Vlastní sekce (boxíky)</h3>
                <p style={{ fontSize:12, opacity:.7, margin:'0 0 12px' }}>Vytvoř novou sekci a přiřaď jí libovolné členy. Sekce se ukáže pod oficiálními bloky.</p>
                {editingBoxId ? (
                  <div className="grid gap-2">
                    <input className="pov2-input" placeholder="Název sekce" value={boxForm.title || ''} onChange={e => setBoxForm((f: any) => ({ ...f, title: e.target.value }))} />
                    <textarea className="pov2-input" rows={2} placeholder="Popis (volitelné)" value={boxForm.description || ''} onChange={e => setBoxForm((f: any) => ({ ...f, description: e.target.value }))} />
                    <div className="grid grid-cols-3 gap-2">
                      <input className="pov2-input" placeholder="Symbol (např. ✦)" value={boxForm.symbol || ''} onChange={e => setBoxForm((f: any) => ({ ...f, symbol: e.target.value }))} />
                      <input className="pov2-input" type="color" value={boxForm.color || '#7A1F2B'} onChange={e => setBoxForm((f: any) => ({ ...f, color: e.target.value }))} />
                      <input className="pov2-input" type="number" placeholder="Pořadí" value={boxForm.sort_order ?? 100} onChange={e => setBoxForm((f: any) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
                    </div>
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={boxForm.is_visible !== false} onChange={e => setBoxForm((f: any) => ({ ...f, is_visible: e.target.checked }))} /> Zobrazit veřejně</label>
                    <div>
                      <div style={{ fontSize:11, letterSpacing:'.18em', textTransform:'uppercase', opacity:.6, margin:'4px 0' }}>Členové</div>
                      <div style={{ maxHeight:200, overflowY:'auto', border:'1px solid var(--line)', borderRadius:8, padding:8, display:'grid', gap:4 }}>
                        {allProfiles.map(p => {
                          const checked = (boxForm.member_ids || []).includes(p.user_id);
                          return (
                            <label key={p.user_id} className="flex items-center gap-2" style={{ fontSize:12 }}>
                              <input type="checkbox" checked={checked} onChange={e => setBoxForm((f: any) => ({
                                ...f,
                                member_ids: e.target.checked
                                  ? [...(f.member_ids || []), p.user_id]
                                  : (f.member_ids || []).filter((x: string) => x !== p.user_id),
                              }))} />
                              {p.display_name} <span style={{ opacity:.5 }}>@{p.username}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveBox} className="pov2-btn primary">Uložit</button>
                      <button onClick={() => { setEditingBoxId(null); setBoxForm({ title: '', description: '', symbol: '✦', color: '#7A1F2B', member_ids: [], sort_order: 100, is_visible: true }); }} className="pov2-btn">Zrušit</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setEditingBoxId('new')} className="pov2-btn primary">➕ Nová sekce</button>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );

  function renderCard(member: StaffMember, featured: boolean, tone: string) {
    const isExpanded = expandedId === member.user_id;
    const avail = AVAILABILITY_LABELS[member.availability_status] || AVAILABILITY_LABELS.available;
    const accent = member.profile_color || tone;
    return (
      <article
        key={member.user_id}
        className={`pov2-card ${featured ? 'featured' : ''} ${!member.is_visible ? 'opacity-40' : ''}`}
        data-initial={member.display_name[0]?.toUpperCase()}
        style={{ ['--accent' as any]: accent }}
      >
        <span className="accent" />
        <div className="pov2-card-top">
          <div className="pov2-ava">
            {member.avatar_url ? <img src={member.avatar_url} alt="" /> : <div className="pov2-ava-ph">{member.display_name[0]?.toUpperCase()}</div>}
            <OnlineIndicator lastSeen={member.last_seen} size="md" className="pov2-online" />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <h3 className="pov2-name">
              {member.display_name}
              <RoleBadge role={member.role} />
            </h3>
            {member.username && <div className="pov2-handle">@{member.username}</div>}
            {member.specialization && <p className="pov2-spec">{member.specialization}</p>}
          </div>
        </div>

        {member.motto && <blockquote className="pov2-motto">{member.motto}</blockquote>}
        {member.custom_note && <p className="pov2-note">{member.custom_note}</p>}

        <div className="pov2-chips">
          <span className="pov2-chip dot" style={{ color: avail.color, borderColor: avail.color + '55' }}>{avail.label}</span>
          {member.accepting_questions && <span className="pov2-chip">přijímá dotazy</span>}
          {member.answer_count > 0 && <span className="pov2-chip">{member.answer_count}× odpověď</span>}
          {member.experience_years > 0 && <span className="pov2-chip">{member.experience_years} let praxe</span>}
        </div>

        {isExpanded && (
          <dl className="pov2-meta-row">
            {member.bio_short && (<><dt>Bio</dt><dd>{member.bio_short}</dd></>)}
            {member.favorite_subject && (<><dt>Předmět</dt><dd>{member.favorite_subject}</dd></>)}
            {member.education && (<><dt>Vzdělání</dt><dd>{member.education}</dd></>)}
            {member.languages && (<><dt>Jazyky</dt><dd>{member.languages}</dd></>)}
            {member.hobbies && (<><dt>Koníčky</dt><dd>{member.hobbies}</dd></>)}
            {member.fun_fact && (<><dt>Zajímavost</dt><dd>{member.fun_fact}</dd></>)}
            {member.contact_hours && (<><dt>Hodiny</dt><dd>{member.contact_hours}</dd></>)}
            {member.working_days && (<><dt>Dny</dt><dd>{member.working_days}</dd></>)}
            {member.response_style && (<><dt>Styl</dt><dd>{member.response_style}</dd></>)}
            {member.preferred_contact && (<><dt>Kontakt</dt><dd>{member.preferred_contact}</dd></>)}
            {member.max_questions_daily > 0 && (<><dt>Max/den</dt><dd>{member.max_questions_daily}</dd></>)}
            {member.joined_date && (<><dt>Od</dt><dd>{new Date(member.joined_date).toLocaleDateString('cs')}</dd></>)}
            {member.achievements?.length > 0 && (
              <><dt>Úspěchy</dt><dd><div className="pov2-chips">{member.achievements.map((a, i) => (<span key={i} className="pov2-chip">🏅 {a}</span>))}</div></dd></>
            )}
          </dl>
        )}

        <div className="pov2-actions">
          {member.username && <a className="pov2-btn primary" href={`/uziv/${member.username}`}>Zeď →</a>}
          {member.show_mail_link && member.alik_username && (
            <a href={`https://www.alik.cz/@/${member.alik_username}`} target="_blank" rel="noopener noreferrer" className="pov2-btn">✉ Dopis</a>
          )}
          {member.show_profile_link && member.alik_username && (
            <a href={`https://www.alik.cz/u/${member.alik_username}`} target="_blank" rel="noopener noreferrer" className="pov2-btn">Alík</a>
          )}
          {member.show_answers_link && (
            <a href={`/doucovani?mentor=${member.user_id}`} className="pov2-btn">Odpovědi</a>
          )}
          {member.social_link && <a href={member.social_link} target="_blank" rel="noopener noreferrer" className="pov2-btn">Odkaz</a>}
          <button onClick={() => setExpandedId(isExpanded ? null : member.user_id)} className="pov2-btn">
            {isExpanded ? '▲ Méně' : '▼ Více'}
          </button>
          {isDeveloper && (
            <button
              onClick={() => { if (editingId === member.user_id) { setEditingId(null); setEditForm({}); } else { setEditingId(member.user_id); setEditForm({ ...member }); } }}
              className="pov2-btn"
            >⚙</button>
          )}
        </div>

        {isDeveloper && editingId === member.user_id && (
          <div className="pov2-edit">
            {EDITABLE_FIELDS.map(field => (
              <div key={field.key}>
                <label style={{ fontSize:9, letterSpacing:'.18em', textTransform:'uppercase', opacity:.6 }}>{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    value={(editForm as any)[field.key] ?? (member as any)[field.key]}
                    onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="pov2-input"
                  >
                    {field.options?.map(o => (<option key={o} value={o}>{AVAILABILITY_LABELS[o]?.label || o}</option>))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={(editForm as any)[field.key] ?? (member as any)[field.key] ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, [field.key]: field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                    className="pov2-input"
                    placeholder={field.label}
                  />
                )}
              </div>
            ))}
            <div>
              <label style={{ fontSize:9, letterSpacing:'.18em', textTransform:'uppercase', opacity:.6 }}>Úspěchy (po řádcích)</label>
              <textarea
                value={((editForm.achievements ?? member.achievements) || []).join('\n')}
                onChange={e => setEditForm(f => ({ ...f, achievements: e.target.value.split('\n').filter(Boolean) }))}
                className="pov2-input"
                rows={3}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {TOGGLE_FIELDS.map(field => (
                <label key={field.key} className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={(editForm as any)[field.key] ?? (member as any)[field.key]} onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.checked }))} />
                  {field.label}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveSettings(member)} className="pov2-btn primary">Uložit</button>
              <button onClick={() => { setEditingId(null); setEditForm({}); }} className="pov2-btn">Zrušit</button>
            </div>
          </div>
        )}
      </article>
    );
  }
}
