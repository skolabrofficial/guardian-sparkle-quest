import { getRoleSymbol, getRoleColor } from '@/lib/roleUtils';

interface Props {
  role?: string | null;
  className?: string;
}

/**
 * Renders a styled superscript role symbol that can't be imitated by typing.
 * Uses CSS font features and custom styling to distinguish from regular text.
 */
export default function RoleBadge({ role, className = '' }: Props) {
  const symbol = getRoleSymbol(role);
  if (!symbol) return null;
  
  const color = getRoleColor(role);

  return (
    <span
      className={`role-badge ${className}`}
      style={{ color }}
      title={role === 'developer' ? 'Vývojář' : role === 'dohledci' ? 'Dohledčí' : role === 'lektor' ? 'Lektor' : ''}
      aria-label={`Role: ${role}`}
    >
      {symbol}
    </span>
  );
}
