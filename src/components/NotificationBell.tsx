import { useState, useEffect, useRef } from 'react';
import { Bell, X, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean | null;
  created_at: string;
}

export default function NotificationBell() {
  const { user, isStaff, isLektor } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendTitle, setSendTitle] = useState('');
  const [sendMsg, setSendMsg] = useState('');
  const [sendTo, setSendTo] = useState('');
  const [profiles, setProfiles] = useState<{ user_id: string; display_name: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.is_read).length;

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  useEffect(() => {
    load();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('user_id, display_name');
    if (data) setProfiles(data);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendTo || !sendTitle) return;
    const { error } = await supabase.from('notifications').insert({
      user_id: sendTo,
      title: sendTitle,
      message: sendMsg || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Notifikace odeslána');
      setSendTitle('');
      setSendMsg('');
      setSendTo('');
      setShowSend(false);
    }
  };

  const canSend = isStaff || isLektor;

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'teď';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors cursor-pointer"
        aria-label="Notifikace"
      >
        <Bell size={20} className="text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center animate-bounce">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-[340px] max-h-[420px] bg-card rounded-2xl border border-border overflow-hidden z-50 animate-fade-in" style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h4 className="font-extrabold text-sm m-0">Notifikace</h4>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] font-bold text-primary hover:underline cursor-pointer bg-transparent border-none">
                  Přečíst vše
                </button>
              )}
              {canSend && (
                <button
                  onClick={() => { setShowSend(!showSend); if (!showSend) loadProfiles(); }}
                  className="p-1 rounded-lg hover:bg-muted cursor-pointer bg-transparent border-none"
                  title="Odeslat notifikaci"
                >
                  <Send size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted cursor-pointer bg-transparent border-none">
                <X size={14} />
              </button>
            </div>
          </div>

          {showSend && canSend && (
            <form onSubmit={handleSend} className="px-4 py-3 border-b border-border grid gap-2 bg-muted/50">
              <select value={sendTo} onChange={e => setSendTo(e.target.value)} className="border border-border rounded-lg py-1.5 px-2 text-xs outline-none bg-card" required>
                <option value="">Příjemce…</option>
                {profiles.map(p => <option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}
              </select>
              <input placeholder="Titulek" value={sendTitle} onChange={e => setSendTitle(e.target.value)} required className="border border-border rounded-lg py-1.5 px-2 text-xs outline-none bg-card" />
              <input placeholder="Zpráva (volitelná)" value={sendMsg} onChange={e => setSendMsg(e.target.value)} className="border border-border rounded-lg py-1.5 px-2 text-xs outline-none bg-card" />
              <button type="submit" className="btn-alik-primary text-xs py-1.5">Odeslat</button>
            </form>
          )}

          <div className="overflow-y-auto max-h-[300px]">
            {notifications.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Žádné notifikace</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`px-4 py-3 border-b border-border cursor-pointer transition-colors hover:bg-muted/50 ${!n.is_read ? 'bg-blue-50/60' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <strong className="text-sm">{n.title}</strong>
                    <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.message && <p className="text-xs text-muted-foreground mt-0.5 m-0">{n.message}</p>}
                  {!n.is_read && <span className="inline-block w-2 h-2 rounded-full bg-primary mt-1" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
