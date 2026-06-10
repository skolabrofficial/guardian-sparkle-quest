import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/NotificationBell';
import OnlineIndicator from '@/components/OnlineIndicator';
import { getRoleSymbol, ROLE_LABELS, ROLE_GRADIENT, ROLE_COLORS } from '@/lib/roleUtils';
import { getSpecialUserBadge, SpecialUserBadgeView } from '@/lib/userBadges';
import { Search, User, LogOut, BookOpen, LogIn, UserPlus, GraduationCap, Sparkles } from 'lucide-react';

interface AppHeaderProps {
  searchLabel?: string;
  searchPlaceholder?: string;
  searchTags?: string[];
  onSearch?: (term: string) => void;
}

export default function AppHeader({ searchLabel = 'Najít', searchPlaceholder = 'Hledat...', searchTags = [], onSearch }: AppHeaderProps) {
  const { user, profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const specialBadge = getSpecialUserBadge(profile);

  return (
    <header className="relative grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_0.9fr] gap-4 items-stretch animate-float-in rounded-3xl p-5 border border-border"
      style={{
        background: `
          linear-gradient(135deg, hsla(225,60%,97%,0.95), hsla(225,60%,97%,0.8)),
          radial-gradient(ellipse at 10% 20%, hsla(2,100%,67%,0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 90% 80%, hsla(35,100%,65%,0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 0%, hsla(222,100%,65%,0.06) 0%, transparent 60%)
        `,
        boxShadow: '0 20px 40px -12px rgba(20,26,40,0.1), 0 0 0 1px rgba(255,255,255,0.6) inset',
      }}
    >
      {/* Decorative top accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{
        background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--brand-3)), hsl(var(--accent)))',
      }} />

      {/* Brand */}
      <div className="flex gap-4 items-center pt-1">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
            boxShadow: '0 8px 20px -4px hsla(2,100%,67%,0.35)',
          }}>
            <GraduationCap size={28} className="text-white" />
          </div>
          <Sparkles size={12} className="absolute -top-1 -right-1 text-secondary animate-pulse" />
        </div>
        <div>
          <h1 className="m-0 text-[30px] lg:text-[34px] tracking-wide font-extrabold leading-tight" style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)) 40%, hsl(var(--secondary)))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Alíkova Univerzita
          </h1>
          <p className="mt-0.5 font-bold text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Vzdělávací odvětví webu Alík.cz
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl p-4 border border-border/60 transition-shadow duration-300 hover:shadow-lg" style={{
        background: 'hsla(0,0%,100%,0.7)',
        backdropFilter: 'blur(12px)',
      }}>
        <label className="block text-[10px] font-extrabold uppercase tracking-[0.15em] mb-2 text-muted-foreground">
          {searchLabel}
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); onSearch?.(e.target.value); }}
              placeholder={searchPlaceholder}
              className="border-2 border-border/60 rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none bg-white/80 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all w-full"
            />
          </div>
          <button
            onClick={() => onSearch?.(searchTerm)}
            className="btn-alik-secondary text-xs flex items-center gap-1.5"
          >
            <Search size={13} /> Hledat
          </button>
        </div>
        {searchTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {searchTags.map((tag) => (
              <span
                key={tag}
                className="search-tag hover:bg-blue-100 transition-colors cursor-pointer text-[11px]"
                onClick={() => { setSearchTerm(tag); onSearch?.(tag); }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* User panel */}
      <div className="rounded-2xl p-4 border border-border/60 transition-shadow duration-300 hover:shadow-lg" style={{
        background: 'hsla(0,0%,100%,0.7)',
        backdropFilter: 'blur(12px)',
      }}>
        {user ? (
          <>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-[48px] h-[56px] rounded-2xl border-2 border-white bg-gradient-to-b ${ROLE_GRADIENT[role || 'student']} overflow-hidden`} style={{ boxShadow: '0 6px 16px rgba(0,0,0,0.12)' }}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/80">
                      <User size={22} />
                    </div>
                  )}
                </div>
                <OnlineIndicator lastSeen={profile?.last_seen || new Date().toISOString()} size="md" className="absolute -bottom-0.5 -right-0.5 ring-2 ring-white" />
              </div>
              <div className="flex-1 min-w-0">
                <strong className="block truncate text-sm">
                  {profile?.display_name || user.email}{getRoleSymbol(role)}
                  <SpecialUserBadgeView badge={specialBadge} compact />
                </strong>
                <small className="block text-xs" style={{ color: ROLE_COLORS[role || 'student'] }}>
                  {ROLE_LABELS[role || 'student'] || 'Student'}
                </small>
              </div>
              <NotificationBell />
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-2.5">
              <button className="btn-alik-secondary text-[11px] flex items-center justify-center gap-1" onClick={() => navigate(profile?.username ? `/uziv/${profile.username}` : '/profil')}>
                <User size={11} /> Profil
              </button>
              <button className="btn-alik-outline text-[11px] flex items-center justify-center gap-1" onClick={() => navigate('/studium')}>
                <BookOpen size={11} /> Studium
              </button>
              <button className="btn-alik-primary text-[11px] flex items-center justify-center gap-1" onClick={signOut}>
                <LogOut size={11} /> Odejít
              </button>
            </div>
          </>
        ) : (
          <div className="grid gap-2">
            <p className="text-sm text-muted-foreground mb-1">Přihlaste se pro přístup</p>
            <button className="btn-alik-primary text-sm flex items-center justify-center gap-1.5" onClick={() => navigate('/login')}>
              <LogIn size={14} /> Přihlásit se
            </button>
            <button className="btn-alik-secondary text-sm flex items-center justify-center gap-1.5" onClick={() => navigate('/register')}>
              <UserPlus size={14} /> Registrace
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
