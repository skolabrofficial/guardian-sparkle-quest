// Role symbols displayed after display names for non-student users
export const ROLE_SYMBOLS: Record<string, string> = {
  rektor: '⚙',     // ozubené kolo (dříve developer)
  spravce: '♛',    // koruna (dříve dohledci)
  lektor: '✦',     // hvězda
  redaktor: '✎',   // tužka
  // staré názvy – pro jistotu, pokud by někde zůstaly
  developer: '⚙',
  dohledci: '♛',
};

export const ROLE_LABELS: Record<string, string> = {
  rektor: 'Rektor',
  spravce: 'Správce',
  lektor: 'Lektor',
  redaktor: 'Redaktor',
  student: 'Student',
  developer: 'Rektor',
  dohledci: 'Správce',
};

// Nové barvy podle zadání: rektor modrá, správce zelená, lektor červená
export const ROLE_COLORS: Record<string, string> = {
  rektor: '#254BFF',
  spravce: '#258B25',
  lektor: '#C0392B',
  redaktor: '#7a4a8a', // fialová
  student: '#1e40af',
  developer: '#254BFF',
  dohledci: '#258B25',
};

export const ROLE_GRADIENT: Record<string, string> = {
  rektor: 'from-blue-400 to-indigo-600',
  spravce: 'from-green-400 to-emerald-600',
  lektor: 'from-red-400 to-rose-600',
  redaktor: 'from-purple-400 to-purple-600',
  student: 'from-slate-300 to-slate-500',
  developer: 'from-blue-400 to-indigo-600',
  dohledci: 'from-green-400 to-emerald-600',
};

/** Symbol or empty string for student. */
export function getRoleSymbol(role?: string | null): string {
  if (!role || role === 'student') return '';
  return ROLE_SYMBOLS[role] || '';
}

/** display_name + symbol */
export function nameWithRole(name: string, role?: string | null): string {
  const s = getRoleSymbol(role);
  return s ? `${name} ${s}` : name;
}

export function getRoleColor(role?: string | null): string {
  if (!role) return '';
  return ROLE_COLORS[role] || '';
}

export function getRoleLabel(role?: string | null): string {
  if (!role) return '';
  return ROLE_LABELS[role] || role;
}
