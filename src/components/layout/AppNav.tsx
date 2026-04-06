import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/rektorat', label: 'Rektorát', color: 's-red', staffOnly: true },
  { href: '/fakulty', label: 'Fakulty', color: 's-blue' },
  { href: '/kurzy', label: 'Kurzy', color: 's-green' },
  { href: '/rozvrh', label: 'Rozvrh', color: 's-cyan' },
  { href: '/studium', label: 'Studium', color: 's-yellow' },
  { href: '/vypisky', label: 'Výpisky z hodin', color: 's-purple' },
  { href: '/doucovani', label: 'Doučování', color: 's-orange' },
];

export default function AppNav() {
  const location = useLocation();
  const { isStaff, isDeveloper } = useAuth();

  return (
    <nav className="flex flex-wrap justify-center gap-3 my-6 mx-1.5">
      {navItems
        .filter((item) => !item.staffOnly || isStaff || isDeveloper)
        .map((item, i) => (
          <Link
            key={item.href}
            to={item.href}
            className={`sign-card sign-card-nav ${item.color} ${location.pathname === item.href ? 'active' : ''} animate-slide-up stagger-${i + 1}`}
          >
            {item.label}
          </Link>
        ))}
    </nav>
  );
}
