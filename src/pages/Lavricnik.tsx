import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import UserLink from '@/components/UserLink';
import { Trophy, TrendingUp, Award } from 'lucide-react';

interface Laurel {
  id: string;
  user_id: string;
  type: 'blue' | 'green' | 'brown'; // modrý, zelený, veverka
  awarded_by: string | null;
  awarded_at: string;
  reason: string | null;
  expires_at: string | null;
}

interface LaurelTransaction {
  id: string;
  user_id: string;
  laurel_type: string;
  action: 'awarded' | 'revoked' | 'expired';
  amount: number;
  timestamp: string;
  actor_id: string | null;
  note: string | null;
}

interface Profile {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

const LAUREL_TYPES = {
  blue: { label: 'Modrý Vavřín', icon: '🔵', color: 'bg-blue-100 text-blue-900', hint: 'Za výjimečné články' },
  green: { label: 'Zelený Vavřín', icon: '🟢', color: 'bg-green-100 text-green-900', hint: 'Za kvalitní obsah' },
  brown: { label: 'Hnědý Vavřín (Veverka)', icon: '🟤', color: 'bg-amber-100 text-amber-900', hint: 'Za nejlepší učitele' },
};

export default function Lavricnik() {
  const { user, isStaff, isRektor } = useAuth();
  const [laurels, setLaurels] = useState<Laurel[]>([]);
  const [transactions, setTransactions] = useState<LaurelTransaction[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [showAwardForm, setShowAwardForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedType, setSelectedType] = useState<'blue' | 'green' | 'brown'>('blue');
  const [reason, setReason] = useState('');
  const [expiryDays, setExpiryDays] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'blue' | 'green' | 'brown'>('all');
  const [searchUser, setSearchUser] = useState('');

  async function load() {
    setLoading(true);
    try {
      const sb: any = supabase;

      // Načti vavříny
      const { data: laurelData } = await sb
        .from('user_laurels')
        .select('*')
        .order('awarded_at', { ascending: false });
      setLaurels(laurelData || []);

      // Načti transakce (jen pro adminy/rektora)
      let txData: any[] | null = null;
      if (isStaff || isRektor) {
        const res = await sb
          .from('laurel_transactions')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100);
        txData = res.data;
        setTransactions(txData || []);
      }

      // Načti profily všech uživatelů s vavříny
      const userIds = new Set<string>();
      laurelData?.forEach(l => {
        userIds.add(l.user_id);
        if (l.awarded_by) userIds.add(l.awarded_by);
      });
      txData?.forEach(t => {
        userIds.add(t.user_id);
        if (t.actor_id) userIds.add(t.actor_id);
      });

      if (userIds.size > 0) {
        const { data: profileData } = await sb
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', Array.from(userIds));

        const m: Record<string, Profile> = {};
        profileData?.forEach((p: Profile) => {
          m[p.user_id] = p;
        });
        setProfiles(m);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user]);

  async function awardLaurel() {
    if (!user || !selectedUser.trim() || !selectedType) return;
    const sb: any = supabase;

    try {
      // Najdi uživatele podle username
      const { data: targetUser } = await sb
        .from('profiles')
        .select('user_id')
        .eq('username', selectedUser.trim())
        .maybeSingle();

      if (!targetUser) {
        toast.error('Uživatel nenalezen');
        return;
      }

      let expiresAt = null;
      if (expiryDays && Number(expiryDays) > 0) {
        expiresAt = new Date(Date.now() + Number(expiryDays) * 86400000).toISOString();
      }

      const { error } = await sb.from('user_laurels').insert({
        user_id: targetUser.user_id,
        type: selectedType,
        awarded_by: user.id,
        reason: reason || null,
        expires_at: expiresAt,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Log transakci
      await sb.from('laurel_transactions').insert({
        user_id: targetUser.user_id,
        laurel_type: selectedType,
        action: 'awarded',
        amount: 1,
        actor_id: user.id,
        note: reason,
      });

      toast.success(`${LAUREL_TYPES[selectedType].label} uděleno!`);
      setSelectedUser('');
      setReason('');
      setExpiryDays('');
      setShowAwardForm(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function revokeLaurel(laurelId: string, type: string) {
    if (!isRektor) {
      toast.error('Pouze rektor může odebrat vavřín');
      return;
    }

    const sb: any = supabase;
    try {
      const { error } = await sb.from('user_laurels').delete().eq('id', laurelId);
      if (error) {
        toast.error(error.message);
        return;
      }

      const laurel = laurels.find(l => l.id === laurelId);
      if (laurel) {
        await sb.from('laurel_transactions').insert({
          user_id: laurel.user_id,
          laurel_type: type,
          action: 'revoked',
          amount: 1,
          actor_id: user?.id,
        });
      }

      toast.success('Vavřín odebrán');
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const filteredLaurels = laurels.filter(l => {
    if (filter !== 'all' && l.type !== filter) return false;
    if (searchUser) {
      const profile = profiles[l.user_id];
      if (!profile) return false;
      return (
        profile.username.toLowerCase().includes(searchUser.toLowerCase()) ||
        profile.display_name.toLowerCase().includes(searchUser.toLowerCase())
      );
    }
    return true;
  });

  return (
    <AppLayout searchLabel="Hledat vavříny" searchPlaceholder="např. username">
      <main className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
        <div className="grid gap-[18px]">
          <article className="feature-card grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 animate-float-in">
            <div>
              <h2 className="mt-0 text-[22px]">🏆 Vavřína Univerzity</h2>
              <p>Oficiální uznání za výjimečný přínos a kvalitu.</p>
              <p className="text-muted-foreground">Celkem {laurels.length} vavřínů uděleno.</p>
            </div>
            <div className="grid place-items-center">
              <Trophy className="w-16 h-16 text-amber-500 opacity-30" />
            </div>
          </article>

          {isStaff && (
            <div className="panel-card animate-slide-up stagger-1">
              <button className="btn-alik-primary text-sm" onClick={() => setShowAwardForm(!showAwardForm)}>
                {showAwardForm ? 'Zrušit' : '+ Udělit vavřín'}
              </button>
              {showAwardForm && (
                <form onSubmit={e => { e.preventDefault(); awardLaurel(); }} className="grid gap-3 mt-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Uživatel
                    </label>
                    <input
                      type="text"
                      placeholder="username"
                      value={selectedUser}
                      onChange={e => setSelectedUser(e.target.value)}
                      required
                      className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                      Typ vavřína
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(LAUREL_TYPES).map(([key, info]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedType(key as 'blue' | 'green' | 'brown')}
                          className={`p-2 rounded-lg border-2 text-xs font-bold transition-all ${
                            selectedType === key
                              ? `${info.color} border-current`
                              : 'border-border hover:border-secondary'
                          }`}
                        >
                          {info.icon} {info.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Důvod
                    </label>
                    <textarea
                      placeholder="Krátký popis důvodu..."
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none min-h-[60px] focus:border-secondary transition-colors w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      Platnost (dní, 0 = permanentní)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={expiryDays}
                      onChange={e => setExpiryDays(e.target.value)}
                      className="border-2 border-border rounded-xl py-2 px-3 text-sm outline-none focus:border-secondary transition-colors w-full"
                    />
                  </div>

                  <button type="submit" className="btn-alik-accent text-sm">
                    Udělit
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Filtry */}
          <div className="panel-card animate-slide-up stagger-2 flex flex-wrap gap-2">
            {['all', 'blue', 'green', 'brown'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  filter === f
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {f === 'all' ? 'Všechny' : LAUREL_TYPES[f as 'blue' | 'green' | 'brown'].label}
              </button>
            ))}
            <input
              type="text"
              placeholder="Hledat uživatele..."
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              className="border-2 border-border rounded-lg py-1 px-2 text-xs outline-none focus:border-secondary transition-colors ml-auto"
            />
          </div>

          {/* Galerie vavřínů */}
          <div className="grid gap-3">
            {loading ? (
              <p className="text-muted-foreground text-sm">Načítám...</p>
            ) : filteredLaurels.length === 0 ? (
              <p className="text-muted-foreground text-sm">Žádné vavříny.</p>
            ) : (
              filteredLaurels.map(laurel => {
                const profile = profiles[laurel.user_id];
                const typeInfo = LAUREL_TYPES[laurel.type];
                const isExpired = laurel.expires_at && new Date(laurel.expires_at) < new Date();

                return (
                  <div
                    key={laurel.id}
                    className={`panel-card animate-slide-up stagger-3 border-l-4 ${
                      laurel.type === 'blue'
                        ? 'border-blue-500'
                        : laurel.type === 'green'
                        ? 'border-green-500'
                        : 'border-amber-600'
                    } ${isExpired ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`text-2xl flex-shrink-0 ${isExpired ? 'opacity-50' : ''}`}>
                          {typeInfo.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {profile ? (
                              <Link to={`/uziv/${profile.username}`} className="font-bold hover:underline">
                                {profile.display_name}
                              </Link>
                            ) : (
                              <span className="font-bold">Neznámý uživatel</span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-lg font-bold ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            {isExpired && <span className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-900">Vypršel</span>}
                          </div>
                          {laurel.reason && <p className="text-sm text-muted-foreground mt-1">{laurel.reason}</p>}
                          <div className="text-xs text-muted-foreground mt-2">
                            Uděleno: {new Date(laurel.awarded_at).toLocaleDateString('cs')}
                            {laurel.expires_at && (
                              <> • Vyprší: {new Date(laurel.expires_at).toLocaleDateString('cs')}</>
                            )}
                          </div>
                        </div>
                      </div>

                      {isRektor && !isExpired && (
                        <button
                          onClick={() => revokeLaurel(laurel.id, laurel.type)}
                          className="text-xs px-2 py-1 rounded-lg bg-red-100 text-red-900 hover:bg-red-200 transition-colors flex-shrink-0"
                        >
                          Odebrat
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar - Transakce */}
        <aside className="grid gap-[18px]">
          <div className="panel-card">
            <h3 className="mt-0 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Poslední transakce
            </h3>
            {isStaff || isRektor ? (
              transactions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Žádné transakce.</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {transactions.slice(0, 50).map(tx => {
                    const profile = profiles[tx.user_id];
                    const actor = tx.actor_id ? profiles[tx.actor_id] : null;

                    return (
                      <div key={tx.id} className="text-xs border-b border-border pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            {profile ? (
                              <span className="font-bold">{profile.display_name}</span>
                            ) : (
                              <span className="text-muted-foreground">Neznámý</span>
                            )}
                          </div>
                          <span
                            className={`font-bold ${
                              tx.action === 'awarded'
                                ? 'text-green-600'
                                : tx.action === 'revoked'
                                ? 'text-red-600'
                                : 'text-orange-600'
                            }`}
                          >
                            {tx.action === 'awarded' ? '+' : '-'}1
                          </span>
                        </div>
                        <div className="text-muted-foreground">
                          {tx.action === 'awarded'
                            ? 'Obdržel'
                            : tx.action === 'revoked'
                            ? 'Odebrán'
                            : 'Vypršel'}{' '}
                          {tx.laurel_type}
                        </div>
                        {actor && (
                          <div className="text-muted-foreground text-[10px]">od {actor.display_name}</div>
                        )}
                        <div className="text-muted-foreground text-[10px]">
                          {new Date(tx.timestamp).toLocaleDateString('cs')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <p className="text-xs text-muted-foreground">Jen pro administrátory.</p>
            )}
          </div>

          <div className="panel-card">
            <h3 className="mt-0 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Statistika
            </h3>
            <div className="space-y-2">
              {Object.entries(LAUREL_TYPES).map(([key, info]) => {
                const count = laurels.filter(l => l.type === key).length;
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{info.label}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </main>
    </AppLayout>
  );
}
