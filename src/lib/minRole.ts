// Minimální role potřebná pro danou akci. Když se akce zaloguje, v protokolu
// se zobrazí odznáček TÉTO role (ne skutečné role aktéra). Tím se v logu vždy
// ukáže, jaká nejnižší pravomoc by k dané akci stačila.
export type MinRole = 'rektor' | 'spravce' | 'lektor' | 'redaktor' | 'student';

const RULES: Array<{ test: RegExp | string; role: MinRole }> = [
  // POUZE rektor
  { test: /^role\./,            role: 'rektor' },
  { test: /^changelog\./,       role: 'rektor' },
  { test: /^mediation\.(approve|reject|invite_lektor)/, role: 'rektor' },
  { test: /^user\.force_signout/, role: 'rektor' },
  { test: /^block\.permanent/,  role: 'rektor' },
  { test: /^settings\./,        role: 'rektor' },

  // rektor + správce
  { test: /^user\.(block|unblock)/, role: 'spravce' },
  { test: /^block\./,           role: 'spravce' },
  { test: /^appeal\./,          role: 'spravce' },
  { test: /^mediation\./,       role: 'spravce' },
  { test: /^announcement\./,    role: 'spravce' },
  { test: /^report\./,          role: 'spravce' },
  { test: /^note\./,            role: 'spravce' },
  { test: /^profanity\./,       role: 'spravce' },
  { test: /^forum\.(delete|pin|lock|move)/, role: 'spravce' },
  { test: /^account_access\./,  role: 'spravce' },
  { test: /^wall\./,            role: 'spravce' },

  // rektor + správce + lektor + redaktor
  { test: /^image\./,           role: 'lektor' },
  { test: /^tutoring\./,        role: 'lektor' },
  { test: /^course\./,          role: 'lektor' },
  { test: /^article\.(publish|reject|delete|stolen|originality|change_author)/, role: 'spravce' },
  { test: /^article\./,         role: 'redaktor' },
];

export function minRoleForAction(action: string): MinRole {
  const a = (action || '').toLowerCase();
  for (const r of RULES) {
    if (typeof r.test === 'string' ? a === r.test : r.test.test(a)) return r.role;
  }
  return 'student';
}
