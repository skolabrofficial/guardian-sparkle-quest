// Priorita role (vyšší = silnější). Když má uživatel víc rolí, vrať nejsilnější.
export const ROLE_PRIORITY: Record<string, number> = {
  rektor: 5,
  developer: 5,
  spravce: 4,
  dohledci: 4,
  lektor: 3,
  redaktor: 2,
  student: 1,
};

export function pickHighestRole(roles: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestP = -1;
  for (const r of roles) {
    if (!r) continue;
    const p = ROLE_PRIORITY[r] ?? 0;
    if (p > bestP) { bestP = p; best = r; }
  }
  return best;
}

/** Z pole řádků user_roles vyber nejvyšší roli daného uživatele. */
export function highestRoleFor(userId: string, rows: Array<{ user_id: string; role: string }>): string | null {
  return pickHighestRole(rows.filter(r => r.user_id === userId).map(r => r.role));
}
