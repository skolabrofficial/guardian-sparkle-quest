import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type AdminTabKey =
  | 'hledani' | 'kurzy' | 'fakulty' | 'dotazy' | 'obrazky' | 'zmenar'
  | 'blokace' | 'uzivatele';

interface AdminBoardItem {
  key: AdminTabKey;
  label: string;
  color: string; // matches sign-card s-* classes
  developerOnly?: boolean;
}

const BOARD: AdminBoardItem[] = [
  { key: 'hledani', label: 'Hledání', color: 's-blue' },
  { key: 'kurzy', label: 'Kurzy', color: 's-green' },
  { key: 'fakulty', label: 'Fakulty', color: 's-cyan' },
  { key: 'dotazy', label: 'Dotazy', color: 's-yellow' },
  { key: 'obrazky', label: 'Obrázky', color: 's-purple' },
  { key: 'zmenar', label: 'Změnář', color: 's-orange' },
  { key: 'blokace', label: 'Blokace', color: 's-red', developerOnly: true },
  { key: 'uzivatele', label: 'Uživatelé', color: 's-blue', developerOnly: true },
];

interface Props {
  activeTab: string;
  onSelect: (key: AdminTabKey) => void;
}

export default function RektoratBoard({ activeTab, onSelect }: Props) {
  const { isDeveloper, isStaff } = useAuth();
  const [open, setOpen] = useState(true);

  // Lecturers see no admin board
  if (!isStaff && !isDeveloper) return null;

  const items = BOARD.filter(b => !b.developerOnly || isDeveloper);

  return (
    <section className="my-4 mx-1.5 animate-float-in">
      {/* Cap toggle */}
      <div className="flex justify-center mb-3">
        <button
          onClick={() => setOpen(o => !o)}
          title={open ? 'Schovat správcovské cedule' : 'Zobrazit správcovské cedule'}
          aria-label="Přepnout správcovské menu"
          className="relative w-16 h-16 rounded-full bg-card border-2 border-border shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
          }}
        >
          <span className="text-3xl drop-shadow-md" role="img" aria-hidden>
            {open ? '🎓' : '🛠️'}
          </span>
          <span
            className="absolute -bottom-1 -right-1 text-[10px] font-extrabold bg-card text-foreground px-1.5 py-0.5 rounded-full border border-border shadow"
          >
            {open ? '▾' : '▸'}
          </span>
        </button>
      </div>

      {open && (
        <nav className="flex flex-wrap justify-center gap-3 animate-slide-up">
          {items.map((item, i) => (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`sign-card sign-card-nav ${item.color} ${activeTab === item.key ? 'active' : ''} stagger-${(i % 6) + 1}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </section>
  );
}
