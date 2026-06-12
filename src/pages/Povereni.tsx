import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RoleBadge from '@/components/RoleBadge';
import OnlineIndicator from '@/components/OnlineIndicator';
import { toast } from 'sonner';

interface StaffMember {
  user_id: string;
  display_name: string;
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

const ROLE_SECTION_INFO: Record<string, { title: string; description: string; symbol: string }> = {
  rektor:  { title: 'Rektorát',  description: 'Rektor vede celou univerzitu, schvaluje pravomoci a dohlíží na všechny moduly.', symbol: '♛' },
  spravce: { title: 'Správa',    description: 'Správci dohlížejí na bezpečnost, moderují obsah a řeší blokace.', symbol: '⚙' },
  lektor:  { title: 'Lektoři',   description: 'Lektoři vedou kurzy, odpovídají na dotazy a starají se o obsah výuky.', symbol: '✦' },
};

const AVAILABILITY_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: 'Dostupný/á', color: '#22c55e' },
  busy: { label: 'Zaneprázdněný/á', color: '#f59e0b' },
  away: { label: 'Nepřítomný/á', color: '#ef4444' },
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
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StaffMember>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [boxForm, setBoxForm] = useState<any>({ title: '', description: '', symbol: '✦', color: '#6366f1', member_ids: [], sort_order: 100, is_visible: true });

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').neq('role', 'student');
    if (!roles?.length) { setStaff([]); setLoading(false); return; }

    const userIds = roles.map(r => r.user_id);
    const [{ data: profiles }, { data: settings }, { data: answerCounts }] = await Promise.all([
      db().from('profiles').select('user_id, display_name, avatar_url, last_seen').in('user_id', userIds),
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

    const [{ data: bxs }, { data: profs }] = await Promise.all([
      db().from('staff_page_boxes').select('*').order('sort_order'),
      db().from('profiles').select('user_id, display_name, username, avatar_url'),
    ]);
    setBoxes(bxs || []);
    setAllProfiles(profs || []);
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
    setBoxForm({ title: '', description: '', symbol: '✦', color: '#6366f1', member_ids: [], sort_order: 100, is_visible: true });
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

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-8">Načítání...</p>
        ) : (
          <div className="grid gap-8">
            {roleGroups.map(roleKey => {
              const members = visibleStaff.filter(s => s.role === roleKey);
              if (!members.length) return null;
              const info = ROLE_SECTION_INFO[roleKey];

              return (
                <section key={roleKey} className="staff-section rounded-2xl overflow-hidden" data-role={roleKey}>
                  <div className="staff-section-header px-6 pt-5 pb-4">
                    <h2 className="text-xl font-extrabold flex items-center gap-2 m-0">
                      {info.title}
                      <span className="staff-header-symbol">{info.symbol}</span>
                    </h2>
                    <p className="text-sm mt-1 mb-0 opacity-90">{info.description}</p>
                  </div>

                  <div className="staff-grid px-6 py-5">
                    {members.map(member => {
                      const isExpanded = expandedId === member.user_id;
                      const avail = AVAILABILITY_LABELS[member.availability_status] || AVAILABILITY_LABELS.available;

                      return (
                        <div
                          key={member.user_id}
                          className={`staff-card ${!member.is_visible ? 'opacity-40' : ''}`}
                          style={member.profile_color ? { borderTop: `3px solid ${member.profile_color}` } : undefined}
                        >
                          {/* Avatar with online indicator */}
                          <div className="staff-avatar relative">
                            {member.avatar_url ? (
                              <img src={member.avatar_url} alt="" />
                            ) : (
                              <div className="staff-avatar-placeholder">
                                {member.display_name[0]?.toUpperCase()}
                              </div>
                            )}
                            <OnlineIndicator
                              lastSeen={member.last_seen}
                              size="md"
                              className="absolute -bottom-0.5 -right-0.5"
                            />
                          </div>

                          {/* Name + role */}
                          <div className="staff-name flex items-center gap-1">
                            <OnlineIndicator lastSeen={member.last_seen} size="sm" />
                            <span>{member.display_name}</span>
                            <RoleBadge role={member.role} />
                          </div>

                          {/* Availability badge */}
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full mb-1"
                            style={{ background: avail.color + '33', color: avail.color, border: `1px solid ${avail.color}55` }}>
                            {avail.label}
                          </span>

                          {/* Specialization */}
                          {member.specialization && (
                            <p className="text-[10px] opacity-80 mt-0 mb-0.5 text-center font-semibold">
                              📚 {member.specialization}
                            </p>
                          )}

                          {member.custom_note && (
                            <p className="text-[10px] opacity-70 mt-0 mb-0.5 text-center leading-tight italic">
                              „{member.custom_note}"
                            </p>
                          )}

                          {member.motto && (
                            <p className="text-[9px] opacity-60 mt-0 mb-1 text-center leading-tight">
                              ✧ {member.motto}
                            </p>
                          )}

                          {/* Answer count */}
                          {member.answer_count > 0 && (
                            <span className="text-[10px] opacity-70 mb-1">
                              {member.answer_count} odpověd{member.answer_count === 1 ? 'ě' : 'í'}
                            </span>
                          )}

                          {/* Accepting questions indicator */}
                          {member.accepting_questions && (
                            <span className="text-[9px] opacity-60 mb-1">✓ Přijímá dotazy</span>
                          )}

                          {/* Action buttons */}
                          <div className="staff-actions">
                            {member.show_mail_link && member.alik_username && (
                              <a href={`https://www.alik.cz/@/${member.alik_username}`} target="_blank" rel="noopener noreferrer" className="staff-btn">
                                ✉ Napsat dopis
                              </a>
                            )}
                            {member.show_profile_link && member.alik_username && (
                              <a href={`https://www.alik.cz/u/${member.alik_username}`} target="_blank" rel="noopener noreferrer" className="staff-btn">
                                👤 Na Alíkovi
                              </a>
                            )}
                            {member.show_answers_link && (
                              <a href={`/doucovani?mentor=${member.user_id}`} className="staff-btn">
                                💬 Odpovědi
                              </a>
                            )}
                            {member.social_link && (
                              <a href={member.social_link} target="_blank" rel="noopener noreferrer" className="staff-btn">
                                🔗 Odkaz
                              </a>
                            )}
                            <button onClick={() => setExpandedId(isExpanded ? null : member.user_id)} className="staff-btn">
                              {isExpanded ? '▲ Méně' : '▼ Více info'}
                            </button>
                          </div>

                          {/* Expanded detail card */}
                          {isExpanded && (
                            <div className="staff-detail-panel">
                              {member.bio_short && <p className="text-[10px] mb-1"><b>Bio:</b> {member.bio_short}</p>}
                              {member.favorite_subject && <p className="text-[10px] mb-1"><b>Oblíbený předmět:</b> {member.favorite_subject}</p>}
                              {member.education && <p className="text-[10px] mb-1"><b>Vzdělání:</b> {member.education}</p>}
                              {member.experience_years > 0 && <p className="text-[10px] mb-1"><b>Zkušenosti:</b> {member.experience_years} let</p>}
                              {member.languages && <p className="text-[10px] mb-1"><b>Jazyky:</b> {member.languages}</p>}
                              {member.hobbies && <p className="text-[10px] mb-1"><b>Koníčky:</b> {member.hobbies}</p>}
                              {member.fun_fact && <p className="text-[10px] mb-1"><b>Zajímavost:</b> {member.fun_fact}</p>}
                              {member.contact_hours && <p className="text-[10px] mb-1"><b>Kontaktní hodiny:</b> {member.contact_hours}</p>}
                              {member.working_days && <p className="text-[10px] mb-1"><b>Pracovní dny:</b> {member.working_days}</p>}
                              {member.response_style && <p className="text-[10px] mb-1"><b>Styl odpovědí:</b> {member.response_style}</p>}
                              {member.preferred_contact && <p className="text-[10px] mb-1"><b>Preferovaný kontakt:</b> {member.preferred_contact}</p>}
                              {member.max_questions_daily > 0 && <p className="text-[10px] mb-1"><b>Max dotazů/den:</b> {member.max_questions_daily}</p>}
                              {member.joined_date && <p className="text-[10px] mb-1"><b>Ve funkci od:</b> {new Date(member.joined_date).toLocaleDateString('cs')}</p>}
                              {member.achievements?.length > 0 && (
                                <div className="text-[10px] mb-1">
                                  <b>Úspěchy:</b>
                                  <div className="flex flex-wrap gap-1 mt-0.5">
                                    {member.achievements.map((a, i) => (
                                      <span key={i} className="px-1.5 py-0.5 rounded text-[9px] bg-white/10 border border-white/20">🏅 {a}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Dev edit */}
                          {isDeveloper && (
                            <button
                              onClick={() => {
                                if (editingId === member.user_id) { setEditingId(null); setEditForm({}); }
                                else { setEditingId(member.user_id); setEditForm({ ...member }); }
                              }}
                              className="text-[10px] opacity-50 hover:opacity-100 mt-1 cursor-pointer bg-transparent border-none"
                            >
                              ⚙ Upravit
                            </button>
                          )}

                          {isDeveloper && editingId === member.user_id && (
                            <div className="staff-edit-panel">
                              {EDITABLE_FIELDS.map(field => (
                                <div key={field.key}>
                                  <label className="text-[9px] opacity-60 block mb-0.5">{field.label}</label>
                                  {field.type === 'select' ? (
                                    <select
                                      value={(editForm as any)[field.key] ?? (member as any)[field.key]}
                                      onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.value }))}
                                      className="staff-edit-input"
                                    >
                                      {field.options?.map(o => (
                                        <option key={o} value={o}>{AVAILABILITY_LABELS[o]?.label || o}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type={field.type}
                                      value={(editForm as any)[field.key] ?? (member as any)[field.key] ?? ''}
                                      onChange={e => setEditForm(f => ({ ...f, [field.key]: field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                                      className="staff-edit-input"
                                      placeholder={field.label}
                                    />
                                  )}
                                </div>
                              ))}

                              {/* Achievements editor */}
                              <div>
                                <label className="text-[9px] opacity-60 block mb-0.5">Úspěchy (po řádcích)</label>
                                <textarea
                                  value={((editForm.achievements ?? member.achievements) || []).join('\n')}
                                  onChange={e => setEditForm(f => ({ ...f, achievements: e.target.value.split('\n').filter(Boolean) }))}
                                  className="staff-edit-input"
                                  rows={3}
                                  style={{ resize: 'vertical' }}
                                />
                              </div>

                              <div className="flex flex-wrap gap-2 text-[10px]">
                                {TOGGLE_FIELDS.map(field => (
                                  <label key={field.key} className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={(editForm as any)[field.key] ?? (member as any)[field.key]}
                                      onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.checked }))}
                                      className="accent-primary"
                                    />
                                    {field.label}
                                  </label>
                                ))}
                              </div>

                              <div className="flex gap-2 mt-1">
                                <button onClick={() => saveSettings(member)} className="staff-btn font-bold">Uložit</button>
                                <button onClick={() => { setEditingId(null); setEditForm({}); }} className="staff-btn opacity-60">Zrušit</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
