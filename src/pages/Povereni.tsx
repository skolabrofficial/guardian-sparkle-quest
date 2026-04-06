import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RoleBadge from '@/components/RoleBadge';
import { ROLE_LABELS } from '@/lib/roleUtils';
import { toast } from 'sonner';

interface StaffMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  alik_username: string;
  show_mail_link: boolean;
  show_profile_link: boolean;
  show_answers_link: boolean;
  custom_note: string;
  is_visible: boolean;
  sort_order: number;
  settings_id?: string;
}

const db = () => supabase as any;

const ROLE_SECTION_INFO: Record<string, { title: string; description: string; symbol: string }> = {
  developer: {
    title: 'Vývojáři',
    description: 'Vývojáři vytvářejí a spravují celou platformu Alíkovy univerzity. Řeší technické záležitosti a mají nejvyšší oprávnění.',
    symbol: '⚙',
  },
  dohledci: {
    title: 'Dohledčí',
    description: 'Dohledčí jsou pomocníci, kteří dohlížejí na bezpečnost, schvalují obrázky, moderují příspěvky a odpovídají na dotazy v doučování.',
    symbol: '♛',
  },
  lektor: {
    title: 'Lektoři',
    description: 'Lektoři vedou jednotlivé kurzy, odpovídají na dotazy studentů a starají se o obsah výuky.',
    symbol: '✦',
  },
};

export default function Povereni() {
  const { user, isDeveloper } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StaffMember>>({});

  const load = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').neq('role', 'student');
    if (!roles?.length) { setStaff([]); setLoading(false); return; }

    const userIds = roles.map(r => r.user_id);
    const [{ data: profiles }, { data: settings }] = await Promise.all([
      supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', userIds),
      db().from('staff_page_settings').select('*').in('user_id', userIds),
    ]);

    const merged: StaffMember[] = roles.map((r: any) => {
      const p = profiles?.find((p: any) => p.user_id === r.user_id);
      const s = settings?.find((s: any) => s.user_id === r.user_id);
      return {
        user_id: r.user_id,
        display_name: p?.display_name || 'Neznámý',
        avatar_url: p?.avatar_url,
        role: r.role,
        alik_username: s?.alik_username || '',
        show_mail_link: s?.show_mail_link ?? true,
        show_profile_link: s?.show_profile_link ?? true,
        show_answers_link: s?.show_answers_link ?? true,
        custom_note: s?.custom_note || '',
        is_visible: s?.is_visible ?? true,
        sort_order: s?.sort_order ?? 0,
        settings_id: s?.id,
      };
    });

    merged.sort((a, b) => a.sort_order - b.sort_order);
    setStaff(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async (member: StaffMember) => {
    const data = {
      user_id: member.user_id,
      alik_username: editForm.alik_username ?? member.alik_username,
      show_mail_link: editForm.show_mail_link ?? member.show_mail_link,
      show_profile_link: editForm.show_profile_link ?? member.show_profile_link,
      show_answers_link: editForm.show_answers_link ?? member.show_answers_link,
      custom_note: editForm.custom_note ?? member.custom_note,
      is_visible: editForm.is_visible ?? member.is_visible,
      sort_order: editForm.sort_order ?? member.sort_order,
    };
    if (member.settings_id) {
      await db().from('staff_page_settings').update(data).eq('id', member.settings_id);
    } else {
      await db().from('staff_page_settings').insert(data);
    }
    toast.success('Nastavení uloženo');
    setEditingId(null);
    setEditForm({});
    load();
  };

  const visibleStaff = isDeveloper ? staff : staff.filter(s => s.is_visible);
  const roleGroups = ['developer', 'dohledci', 'lektor'] as const;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
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
                  {/* Section header */}
                  <div className="staff-section-header px-6 pt-5 pb-4">
                    <h2 className="text-xl font-extrabold flex items-center gap-2 m-0">
                      {info.title}
                      <span className="staff-header-symbol">{info.symbol}</span>
                    </h2>
                    <p className="text-sm mt-1 mb-0 opacity-90">{info.description}</p>
                  </div>

                  {/* Member grid */}
                  <div className="staff-grid px-6 py-5">
                    {members.map(member => (
                      <div
                        key={member.user_id}
                        className={`staff-card ${!member.is_visible ? 'opacity-40' : ''}`}
                      >
                        {/* Avatar */}
                        <div className="staff-avatar">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" />
                          ) : (
                            <div className="staff-avatar-placeholder">
                              {member.display_name[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <div className="staff-name">
                          <span>{member.display_name}</span>
                          <RoleBadge role={member.role} />
                        </div>

                        {member.custom_note && (
                          <p className="text-[10px] opacity-70 mt-0 mb-1 text-center leading-tight">{member.custom_note}</p>
                        )}

                        {/* Action buttons */}
                        <div className="staff-actions">
                          {member.show_mail_link && member.alik_username && (
                            <a href={`https://www.alik.cz/@/${member.alik_username}`} target="_blank" rel="noopener noreferrer" className="staff-btn">
                              Napsat dopis
                            </a>
                          )}
                          {member.show_profile_link && member.alik_username && (
                            <a href={`https://www.alik.cz/u/${member.alik_username}`} target="_blank" rel="noopener noreferrer" className="staff-btn">
                              Na Alíkovi
                            </a>
                          )}
                          {member.show_answers_link && (
                            <a href={`/doucovani?mentor=${member.user_id}`} className="staff-btn">
                              Odpovědi
                            </a>
                          )}
                        </div>

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
                            <input
                              value={editForm.alik_username ?? member.alik_username}
                              onChange={e => setEditForm(f => ({ ...f, alik_username: e.target.value }))}
                              className="staff-edit-input"
                              placeholder="Přezdívka na Alíkovi"
                            />
                            <input
                              value={editForm.custom_note ?? member.custom_note}
                              onChange={e => setEditForm(f => ({ ...f, custom_note: e.target.value }))}
                              className="staff-edit-input"
                              placeholder="Poznámka"
                            />
                            <input
                              type="number"
                              value={editForm.sort_order ?? member.sort_order}
                              onChange={e => setEditForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                              className="staff-edit-input"
                              placeholder="Pořadí"
                            />
                            <div className="flex flex-wrap gap-2 text-[10px]">
                              {(['show_mail_link', 'show_profile_link', 'show_answers_link', 'is_visible'] as const).map(key => (
                                <label key={key} className="flex items-center gap-1 cursor-pointer">
                                  <input type="checkbox" checked={(editForm as any)[key] ?? (member as any)[key]}
                                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.checked }))} className="accent-primary" />
                                  {key === 'show_mail_link' ? 'Dopisy' : key === 'show_profile_link' ? 'Profil' : key === 'show_answers_link' ? 'Odpovědi' : 'Viditelný'}
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
                    ))}
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
