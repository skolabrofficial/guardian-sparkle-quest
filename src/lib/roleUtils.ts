// Role symbols displayed after display names for non-student users
// Using Unicode combining/special characters that can't be easily typed
export const ROLE_SYMBOLS: Record<string, string> = {
  developer: '⚙',    // gear - will be rendered as styled superscript
  dohledci: '♛',     // crown
  lektor: '✦',       // star
};

export const ROLE_LABELS: Record<string, string> = {
  developer: 'Vývojář',
  dohledci: 'Dohledčí',
  lektor: 'Lektor',
  student: 'Student',
};

export const ROLE_COLORS: Record<string, string> = {
  developer: '#991b1b',
  dohledci: '#b45309',
  lektor: '#166534',
  student: '#1e40af',
};

export const ROLE_GRADIENT: Record<string, string> = {
  developer: 'from-red-400 to-orange-500',
  dohledci: 'from-amber-400 to-yellow-500',
  lektor: 'from-blue-400 to-cyan-500',
  student: 'from-green-400 to-emerald-500',
};

/**
 * Returns the role symbol for a given role, or empty string for students.
 */
export function getRoleSymbol(role?: string | null): string {
  if (!role || role === 'student') return '';
  return ROLE_SYMBOLS[role] || '';
}

/**
 * Returns display name + role symbol
 */
export function nameWithRole(name: string, role?: string | null): string {
  return `${name}${getRoleSymbol(role) ? ` ${getRoleSymbol(role)}` : ''}`;
}

/**
 * Returns role color for the symbol
 */
export function getRoleColor(role?: string | null): string {
  if (!role) return '';
  return ROLE_COLORS[role] || '';
}
