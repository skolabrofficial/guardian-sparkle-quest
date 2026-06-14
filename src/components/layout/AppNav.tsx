import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { href: '/fakulty', label: 'Fakulty', color: 's-blue' },
  { href: '/kurzy', label: 'Kurzy', color: 's-green' },
  { href: '/nauctura', label: 'Naučtura', color: 's-cyan' },
  { href: '/studium', label: 'Studium', color: 's-yellow' },
  { href: '/vypisky', label: 'Výpisky z hodin', color: 's-purple' },
  { href: '/doucovani', label: 'Doučování', color: 's-orange' },
];

function useNaucturaWarn() {
  const { user, isRektor } = useAuth();
  const [state, setState] = useState<{ warn: boolean; unrated: number }>({ warn: false, unrated: 0 });
  useEffect(() => {
    if (!user) return;
    (async () => {
      const sb: any = supabase;
      const { data: ed } = await sb.from('article_editors').select('id').eq('user_id', user.id).limit(1);
      if (!isRektor && !(ed && ed.length)) return;
      const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
      const dayAfter = new Date(tomorrow.getTime() + 86400000);
      const [{ count: tomorrowCount }, { count: unratedCount }] = await Promise.all([
        sb.from('articles').select('id', { count: 'exact', head: true })
          .eq('status', 'scheduled').gte('scheduled_for', tomorrow.toISOString()).lt('scheduled_for', dayAfter.toISOString()),
        sb.from('articles').select('id', { count: 'exact', head: true })
          .eq('status', 'published').is('rating', null),
      ]);
      setState({ warn: (tomorrowCount ?? 0) === 0, unrated: unratedCount ?? 0 });
    })();
  }, [user, isRektor]);
  return state;
}

interface AdminItem { key: string; label: string; color: string; developerOnly?: boolean; }
const ADMIN_ITEMS: AdminItem[] = [
  { key: 'hledani', label: 'Hledání', color: 's-blue' },
  { key: 'kurzy', label: 'Kurzy', color: 's-green' },
  { key: 'fakulty', label: 'Fakulty', color: 's-cyan' },
  { key: 'dotazy', label: 'Dotazy', color: 's-yellow' },
  { key: 'obrazky', label: 'Obrázky', color: 's-purple' },
  { key: 'zmenar', label: 'Změnář', color: 's-orange' },
  { key: 'blokace', label: 'Blokace', color: 's-red', developerOnly: true },
  { key: 'uzivatele', label: 'Uživatelé', color: 's-blue', developerOnly: true },
];

export default function AppNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isStaff, isDeveloper } = useAuth();
  const [adminOpen, setAdminOpen] = useState(false);

  const canAdmin = isStaff || isDeveloper;
  const adminItems = ADMIN_ITEMS.filter(i => !i.developerOnly || isDeveloper);
  const naucWarn = useNaucturaWarn();

  return (
    <nav className="my-6 mx-1.5">
      <div className="flex flex-wrap justify-center items-center gap-3">
        {canAdmin && (
          <button
            onClick={() => {
              if (!adminOpen) setAdminOpen(true);
              else setAdminOpen(false);
            }}
            title={adminOpen ? 'Schovat správcovské cedule' : 'Zobrazit správcovské cedule'}
            aria-label="Přepnout správcovské menu"
            className="relative w-14 h-14 rounded-full border-2 border-border shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center animate-slide-up"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
          >
            <span className="text-2xl drop-shadow-md" role="img" aria-hidden>
              {adminOpen ? '🛠️' : '🎓'}
            </span>
          </button>
        )}

        {!adminOpen && navItems.map((item, i) => (
          <Link
            key={item.href}
            to={item.href}
            className={`sign-card sign-card-nav ${item.color} ${location.pathname === item.href ? 'active' : ''} animate-slide-up stagger-${i + 1}`}
          >
            {item.label}
          </Link>
        ))}

        {adminOpen && canAdmin && adminItems.map((item, i) => {
          const href = `/rektorat?tab=${item.key}`;
          const active = location.pathname === '/rektorat';
          return (
            <Link
              key={item.key}
              to={href}
              onClick={() => navigate(href)}
              className={`sign-card sign-card-nav ${item.color} ${active ? 'active' : ''} animate-slide-up stagger-${(i % 6) + 1}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
