import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import RoleBadge from '@/components/RoleBadge';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roleUtils';
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

export default function Povereni() {
  const { user, isDeveloper } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StaffMember>>({});

  const load = async () => {
    setLoading(true);
    // Get all non-student roles
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

    // Sort: developer first, then dohledci, then lektor, then by sort_order
    const roleOrder: Record<string, number> = { developer: 0, dohledci: 1, lektor: 2 };
    merged.sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9) || a.sort_order - b.sort_order);

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

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-extrabold mb-1">Pověřené osoby</h2>
        <p className="text-sm text-muted-foreground mb-6">Seznam lidí, kteří se starají o chod Alíkovy univerzity.</p>

        {loading ? (
          <p className="text-muted-foreground text-sm">Načítání...</p>
        ) : visibleStaff.length === 0 ? (
          <p className="text-muted-foreground text-sm">Žádné pověřené osoby.</p>
        ) : (
          <div className="grid gap-3">
            {visibleStaff.map(member => (
              <div key={member.user_id} className={`panel-card ${!member.is_visible ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold text-sm">
                        {member.display_name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name + role badge */}
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="font-extrabold text-base">{member.display_name}</span>
                      <RoleBadge role={member.role} />
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${ROLE_COLORS[member.role]}15`, color: ROLE_COLORS[member.role] }}
                      >
                        {ROLE_LABELS[member.role]}
                      </span>
                    </div>

                    {member.custom_note && (
                      <p className="text-xs text-muted-foreground mt-1">{member.custom_note}</p>
                    )}

                    {/* Action links */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {member.show_mail_link && member.alik_username && (
                        <a
                          href={`https://www.alik.cz/@/${member.alik_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors no-underline"
                        >
                          ✉️ Napsat dopis
                        </a>
                      )}
                      {member.show_profile_link && member.alik_username && (
                        <a
                          href={`https://www.alik.cz/u/${member.alik_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors no-underline"
                        >
                          👤 Na Alíkovi
                        </a>
                      )}
                      {member.show_answers_link && (
                        <a
                          href={`/doucovani?mentor=${member.user_id}`}
                          className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors no-underline"
                        >
                          💡 Odpovědi
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Developer edit button */}
                  {isDeveloper && (
                    <button
                      onClick={() => {
                        if (editingId === member.user_id) { setEditingId(null); setEditForm({}); }
                        else { setEditingId(member.user_id); setEditForm({ ...member }); }
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ⚙️
                    </button>
                  )}
                </div>

                {/* Edit panel for developer */}
                {isDeveloper && editingId === member.user_id && (
                  <div className="mt-3 pt-3 border-t border-border grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-muted-foreground block mb-1">Přezdívka na Alíkovi</label>
                        <input
                          value={editForm.alik_username ?? member.alik_username}
                          onChange={e => setEditForm(f => ({ ...f, alik_username: e.target.value }))}
                          className="border-2 border-border rounded-xl py-1.5 px-2 text-sm outline-none w-full"
                          placeholder="prezdivka"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground block mb-1">Pořadí</label>
                        <input
                          type="number"
                          value={editForm.sort_order ?? member.sort_order}
                          onChange={e => setEditForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                          className="border-2 border-border rounded-xl py-1.5 px-2 text-sm outline-none w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground block mb-1">Poznámka</label>
                      <input
                        value={editForm.custom_note ?? member.custom_note}
                        onChange={e => setEditForm(f => ({ ...f, custom_note: e.target.value }))}
                        className="border-2 border-border rounded-xl py-1.5 px-2 text-sm outline-none w-full"
                        placeholder="Krátká poznámka..."
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={editForm.show_mail_link ?? member.show_mail_link}
                          onChange={e => setEditForm(f => ({ ...f, show_mail_link: e.target.checked }))} className="accent-primary" />
                        Dopisy
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={editForm.show_profile_link ?? member.show_profile_link}
                          onChange={e => setEditForm(f => ({ ...f, show_profile_link: e.target.checked }))} className="accent-primary" />
                        Profil na Alíkovi
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={editForm.show_answers_link ?? member.show_answers_link}
                          onChange={e => setEditForm(f => ({ ...f, show_answers_link: e.target.checked }))} className="accent-primary" />
                        Odpovědi
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={editForm.is_visible ?? member.is_visible}
                          onChange={e => setEditForm(f => ({ ...f, is_visible: e.target.checked }))} className="accent-primary" />
                        Viditelný
                      </label>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => saveSettings(member)} className="btn-alik-primary text-xs">💾 Uložit</button>
                      <button onClick={() => { setEditingId(null); setEditForm({}); }} className="text-xs text-muted-foreground">Zrušit</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
