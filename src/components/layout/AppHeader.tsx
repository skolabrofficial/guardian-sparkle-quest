import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

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

  const roleLabel: Record<string, string> = {
    developer: 'Vývojář',
    dohledci: 'Dohledčí',
    lektor: 'Lektor',
    student: 'Student',
  };

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

      <div className="panel-card">
        <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: '#17609b' }}>
          {searchLabel}
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); onSearch?.(e.target.value); }}
            placeholder={searchPlaceholder}
            className="border-2 border-blue-200 rounded-xl py-2.5 px-3 text-base outline-none bg-card focus:border-secondary"
          />
          <button
            onClick={() => onSearch?.(searchTerm)}
            className="border-none font-extrabold py-2.5 px-4 rounded-xl cursor-pointer"
            style={{ background: 'linear-gradient(180deg, #ffd15f, #ffae2f)', color: '#6a3700', boxShadow: '0 6px 0 #e19118' }}
          >
            Hledat
          </button>
        </div>
        {searchTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {searchTags.map((tag) => (
              <span key={tag} className="search-tag" onClick={() => { setSearchTerm(tag); onSearch?.(tag); }}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="panel-card">
        {user ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-[50px] h-[60px] rounded-[14px] border-2 border-card" style={{ background: 'linear-gradient(180deg, #8fd3ff, #3f87ff)', boxShadow: '0 6px 12px rgba(0,0,0,0.12)' }} />
              <div>
                <strong>{profile?.display_name || user.email}</strong>
                <small className="block text-muted-foreground">{roleLabel[role || 'student'] || 'Student'}</small>
              </div>
            </div>
            <div className="grid gap-1.5 mt-2">
              <button className="btn-alik-secondary text-sm" onClick={() => navigate('/studium')}>Studijní plán</button>
              <button className="btn-alik-primary text-sm" onClick={signOut}>Odhlásit se</button>
            </div>
          </>
        ) : (
          <div className="grid gap-1.5">
            <p className="text-sm text-muted-foreground">Přihlaste se pro přístup</p>
            <button className="btn-alik-primary text-sm" onClick={() => navigate('/login')}>Přihlásit se</button>
            <button className="btn-alik-secondary text-sm" onClick={() => navigate('/register')}>Registrace</button>
          </div>
        )}
      </div>
    </header>
  );
}
