export type ArticleStatus =
  | 'draft_author' | 'awaiting_review' | 'returned_to_author' | 'in_editing'
  | 'polishing' | 'ready_to_publish' | 'scheduled' | 'published'
  | 'rejected' | 'flagged_stolen' | 'deleted';

export const STATUS_INFO: Record<ArticleStatus, { label: string; short: string; color: string; bg: string; description: string }> = {
  draft_author:        { label: 'Rozpracovaný autorem',      short: 'rozprac.',  color: '#7a6a4a', bg: '#fff5d0', description: 'Autor stále píše, redakce nevidí.' },
  awaiting_review:     { label: 'Čeká na posouzení',         short: 'na posouzení', color: '#3b4f8a', bg: '#dfe7ff', description: 'Autor článek odeslal, čeká na první pohled redakce.' },
  returned_to_author:  { label: 'Vrácený autorovi',          short: 'vráceno',   color: '#8a4a4a', bg: '#ffe1e1', description: 'Redakce vrátila k přepracování.' },
  in_editing:          { label: 'Zpracovávaný redakcí',      short: 'v redakci', color: '#3a6a8a', bg: '#dff0ff', description: 'Redaktor článek aktivně upravuje.' },
  polishing:           { label: 'Dolaďovaný',                short: 'doladění',  color: '#6a3a8a', bg: '#eddfff', description: 'Drobné úpravy před vydáním.' },
  ready_to_publish:    { label: 'Vydatelný',                 short: 'vydatelný', color: '#2b6a3a', bg: '#daf5e0', description: 'Schválený, čeká na vydání nebo naplánování.' },
  scheduled:           { label: 'Naplánovaný',               short: 'naplánován', color: '#2b6a8a', bg: '#dff0f5', description: 'Bude automaticky vydán v zadaný čas.' },
  published:           { label: 'Vydaný',                    short: 'vydaný',    color: '#1a4a1a', bg: '#c5f0c8', description: 'Veřejně přístupný článek.' },
  rejected:            { label: 'Zamítnutý',                 short: 'zamítnuto', color: '#7a1a1a', bg: '#ffd5d5', description: 'Definitivně zamítnutý redakcí.' },
  flagged_stolen:      { label: 'Označený jako ukradený',    short: 'ukradený',  color: '#000',    bg: '#ffb0b0', description: 'Obsah identifikován jako převzatý bez svolení.' },
  deleted:             { label: 'Smazaný',                   short: 'smazaný',   color: '#fff',    bg: '#555',    description: 'Smazaný (s důvodem).' },
};

/** Allowed transitions per actor type. */
export function allowedTransitions(current: ArticleStatus, role: 'author' | 'editor' | 'rektor'): { to: ArticleStatus; label: string; needsReason?: boolean }[] {
  const list: { to: ArticleStatus; label: string; needsReason?: boolean }[] = [];
  const E = role === 'editor' || role === 'rektor';
  const R = role === 'rektor';
  const A = role === 'author' || R;

  switch (current) {
    case 'draft_author':
      if (A) list.push({ to: 'awaiting_review', label: 'Odeslat k posouzení redakce' });
      break;
    case 'awaiting_review':
      if (E) list.push({ to: 'in_editing', label: 'Přijmout do zpracování' });
      if (E) list.push({ to: 'returned_to_author', label: 'Vrátit autorovi k přepracování', needsReason: true });
      if (E) list.push({ to: 'rejected', label: 'Zamítnout', needsReason: true });
      if (E) list.push({ to: 'flagged_stolen', label: 'Označit jako ukradený', needsReason: true });
      break;
    case 'returned_to_author':
      if (A) list.push({ to: 'awaiting_review', label: 'Znovu odeslat k posouzení' });
      if (E) list.push({ to: 'rejected', label: 'Zamítnout', needsReason: true });
      break;
    case 'in_editing':
      if (E) list.push({ to: 'polishing', label: 'Přejít na doladění' });
      if (E) list.push({ to: 'ready_to_publish', label: 'Označit jako vydatelný' });
      if (E) list.push({ to: 'returned_to_author', label: 'Vrátit autorovi', needsReason: true });
      if (E) list.push({ to: 'rejected', label: 'Zamítnout', needsReason: true });
      if (E) list.push({ to: 'flagged_stolen', label: 'Označit jako ukradený', needsReason: true });
      break;
    case 'polishing':
      if (E) list.push({ to: 'ready_to_publish', label: 'Hotovo, vydatelný' });
      if (E) list.push({ to: 'in_editing', label: 'Zpět do zpracování' });
      break;
    case 'ready_to_publish':
      if (E) list.push({ to: 'published', label: 'Vydat ihned' });
      if (E) list.push({ to: 'scheduled', label: 'Naplánovat vydání' });
      if (E) list.push({ to: 'in_editing', label: 'Zpět do zpracování' });
      break;
    case 'scheduled':
      if (E) list.push({ to: 'published', label: 'Vydat hned (bez čekání)' });
      if (E) list.push({ to: 'ready_to_publish', label: 'Zrušit plán' });
      break;
    case 'published':
      if (R) list.push({ to: 'in_editing', label: 'Stáhnout z vydání zpět do redakce', needsReason: true });
      if (R) list.push({ to: 'flagged_stolen', label: 'Stáhnout jako ukradený', needsReason: true });
      break;
    case 'rejected':
      if (R) list.push({ to: 'awaiting_review', label: 'Obnovit k posouzení' });
      break;
    case 'flagged_stolen':
      if (R) list.push({ to: 'rejected', label: 'Převést na zamítnutí' });
      if (R) list.push({ to: 'in_editing', label: 'Vrátit do redakce' });
      break;
    case 'deleted':
      if (R) list.push({ to: 'awaiting_review', label: 'Obnovit' });
      break;
  }
  return list;
}
