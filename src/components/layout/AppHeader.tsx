import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '@/components/NotificationBell';
import { getRoleSymbol, ROLE_LABELS, ROLE_GRADIENT, ROLE_COLORS } from '@/lib/roleUtils';
import { Search, User, LogOut, BookOpen, LogIn, UserPlus } from 'lucide-react';

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

  return (
    <header className="hero-section grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_0.9fr] gap-4 items-center animate-float-in">
      <div className="flex gap-4 items-center">
        <div>
          <h1 className="m-0 text-[34px] tracking-wide text-primary font-extrabold" style={{ textShadow: '1px 1px 0 #fff' }}>
            Alíkova Univerzita
          </h1>
          <p className="mt-1 font-bold" style={{ color: '#0d3d62' }}>Vzdělávací odvětví webu Alík.cz</p>
        </div>
      </div>

      <div className="panel-card group hover:shadow-lg transition-shadow duration-300">
        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-muted-foreground">
          {searchLabel}
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); onSearch?.(e.target.value); }}
              placeholder={searchPlaceholder}
              className="border-2 border-border rounded-xl py-2.5 pl-9 pr-3 text-base outline-none bg-card focus:border-secondary transition-colors w-full"
            />
          </div>
          <button
            onClick={() => onSearch?.(searchTerm)}
            className="border-none font-extrabold py-2.5 px-4 rounded-xl cursor-pointer transition-all duration-200 hover:brightness-110 active:translate-y-[2px]"
            style={{ background: 'linear-gradient(180deg, #ffd15f, #ffae2f)', color: '#6a3700', boxShadow: '0 6px 0 #e19118' }}
          >
            Hledat
          </button>
        </div>
        {searchTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {searchTags.map((tag) => (
              <span
                key={tag}
                className="search-tag hover:bg-blue-100 transition-colors cursor-pointer"
                onClick={() => { setSearchTerm(tag); onSearch?.(tag); }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="panel-card hover:shadow-lg transition-shadow duration-300">
        {user ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className={`w-[50px] h-[60px] rounded-[14px] border-2 border-card bg-gradient-to-b ${ROLE_GRADIENT[role || 'student']}`} style={{ boxShadow: '0 6px 12px rgba(0,0,0,0.12)' }}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full rounded-[12px] object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/80">
                    <User size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <strong className="block truncate">
                  {profile?.display_name || user.email}{getRoleSymbol(role)}
                </strong>
                <small className="block text-muted-foreground" style={{ color: ROLE_COLORS[role || 'student'] }}>
                  {ROLE_LABELS[role || 'student'] || 'Student'}
                </small>
              </div>
              <NotificationBell />
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              <button className="btn-alik-secondary text-xs flex items-center justify-center gap-1" onClick={() => navigate('/profil')}>
                <User size={12} /> Profil
              </button>
              <button className="btn-alik-outline text-xs flex items-center justify-center gap-1" onClick={() => navigate('/studium')}>
                <BookOpen size={12} /> Studium
              </button>
              <button className="btn-alik-primary text-xs flex items-center justify-center gap-1" onClick={signOut}>
                <LogOut size={12} /> Odejít
              </button>
            </div>
          </>
        ) : (
          <div className="grid gap-1.5">
            <p className="text-sm text-muted-foreground">Přihlaste se pro přístup</p>
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
