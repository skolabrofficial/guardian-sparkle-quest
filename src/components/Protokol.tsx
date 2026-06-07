import { ReactNode, useEffect, useState } from 'react';

/* ─────────────── Druhy (typy akcí) ─────────────── */
export const DRUHY: Record<number, { label: string; bg: string; fg: string; verb: (f: boolean) => string }> = {
  16:  { label: 'Vytvoření',      bg: '#363', fg: '#fff', verb: f => f ? 'vytvořila' : 'vytvořil' },
  24:  { label: 'Úprava',         bg: '#284', fg: '#fff', verb: f => f ? 'změnila'   : 'změnil' },
  191: { label: 'Smazání',        bg: '#C22', fg: '#fff', verb: f => f ? 'smazala'   : 'smazal' },
  192: { label: 'Trvalé smazání', bg: '#A22', fg: '#fff', verb: f => f ? 'trvale smazala' : 'trvale smazal' },
  222: { label: 'Poznámka',       bg: '#CCC', fg: '#000', verb: f => f ? 'poznamenala' : 'poznamenal' },
  223: { label: 'Systém',         bg: '#444', fg: '#fff', verb: f => f ? 'provedla'  : 'provedl' },
  224: { label: 'Kritické',       bg: '#000', fg: '#fff', verb: f => f ? 'spustila'  : 'spustil' },
};

/* ─────────────── Autority ─────────────── */
export const AUTORITY: Record<number, { label: string; bg?: string; fg?: string; bold?: boolean; show?: boolean }> = {
  1:   { label: 'host',     show: false },
  2:   { label: 'uživatel', bold: true, show: false },
  48:  { label: 'lektor',   bg: '#C0392B', fg: '#fff', show: true },   // červená
  192: { label: 'správce',  bg: '#258B25', fg: '#fff', show: true },   // zelená
  255: { label: 'rektor',   bg: '#254BFF', fg: '#fff', show: true },   // modrá
};

/* ─────────────── Helpers ─────────────── */
export function roleToAutorita(role?: string | null): number {
  switch (role) {
    case 'rektor':
    case 'developer': return 255;
    case 'spravce':
    case 'dohledci':  return 192;
    case 'lektor':    return 48;
    case 'student':   return 2;
    default:          return 1;
  }
}

/** Map an audit_log.action string to a druh id. */
export function actionToDruh(action: string): number {
  const a = (action || '').toLowerCase();
  if (a.includes('force') || a.includes('critical') || a.includes('profanity')) return 224;
  if (a.includes('permanent') || a.includes('purge'))                            return 192;
  if (a.includes('delete') || a.includes('remove') || a.includes('block') || a.includes('reject')) return 191;
  if (a.includes('create') || a.includes('add') || a.includes('insert') || a.includes('register')) return 16;
  if (a.includes('update') || a.includes('edit')   || a.includes('change') || a.includes('move') || a.includes('pin') || a.includes('lock') || a.includes('approve')) return 24;
  if (a.includes('note') || a.includes('comment'))                               return 222;
  return 223;
}

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmtAbs(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
const MESICE = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
function fmtRel(d: Date, now: Date) {
  const diffMs = now.getTime() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 0)    return 'právě teď';
  if (sec < 60)   return `před ${sec} s`;
  const min = Math.round(sec / 60);
  if (min < 60)   return `před ${min} min`;
  const hod = Math.round(min / 60);
  if (hod < 24 && d.getDate() === now.getDate()) return `dnes v ${d.getHours()}:${pad(d.getMinutes())}`;
  if (hod < 48)   return `včera v ${d.getHours()}:${pad(d.getMinutes())}`;
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getDate()}. ${MESICE[d.getMonth()]} v ${d.getHours()}:${pad(d.getMinutes())}`;
  }
  return `${d.getDate()}. ${MESICE[d.getMonth()]} ${d.getFullYear()} v ${d.getHours()}:${pad(d.getMinutes())}`;
}

/* ─────────────── Typy ─────────────── */
export type Zmena = {
  field: string;
  from?: ReactNode;
  to?: ReactNode;
  custom?: ReactNode;
};

export type ProtokolProps = {
  druh: number;
  autorita?: number;
  nick: string;
  nickHref?: string;
  feminin?: boolean;
  koruna?: boolean;
  profilovka?: string;
  cas: Date;
  kontext?: ReactNode;
  zmeny?: Zmena[];
  text?: ReactNode;
  /** Krátký kód protokolu, např. "PRT-A1B2C3". Zobrazí se jako tlačítko ke kopírování. */
  kod?: string;
};

/* ─────────────── Komponenta ─────────────── */
export default function Protokol({
  druh, autorita = 1, nick, nickHref, feminin, koruna, profilovka, cas, kontext, zmeny, text, kod,
}: ProtokolProps) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(x => x + 1), 60_000); return () => clearInterval(id); }, []);
  const [copied, setCopied] = useState(false);
  const copyKod = async () => {
    if (!kod) return;
    try {
      await navigator.clipboard.writeText(`[[${kod}]]`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const D = DRUHY[druh] ?? DRUHY[223];
  const A = AUTORITY[autorita] ?? AUTORITY[1];
  const verb = D.verb(!!feminin);
  const iso = cas.toISOString();
  const abs = fmtAbs(cas);
  const rel = fmtRel(cas, new Date());
  const sizeClass = D.label.length >= 12 ? 'protokol-druh-24' : 'protokol-druh-32';

  return (
    <div className="protokol">
      <div className={`protokol-druh ${sizeClass}`} style={{ background: D.bg, color: D.fg }}>
        <span>{D.label}</span>
      </div>
      <div className="protokol-info">
        {profilovka
          ? <div className="profilovka" style={{ backgroundImage: `url(${profilovka})` }} />
          : <div className="profilovka profilovka-fallback">{nick.slice(0, 2).toUpperCase()}</div>}
        {A.show && (
          <span
            className="protokol-autorita"
            style={A.bg ? { background: A.bg, color: A.fg } : undefined}
          >
            {A.label}
          </span>
        )}
        {nickHref
          ? <a className="nick" href={nickHref} style={{ fontWeight: A.bold ? 700 : undefined }}>{nick}</a>
          : <span className="nick" style={{ fontWeight: A.bold ? 700 : undefined }}>{nick}</span>}
        {koruna && <span className="odznak" title={feminin ? 'Správkyně' : 'Správce'}>👑</span>}
        {' '}{verb}{' '}
        {kontext}{' '}
        <time dateTime={iso} title={abs}>{rel}</time>
        {(zmeny?.length || text) ? '. ' : '.'}
        {zmeny && zmeny.length > 0 && (
          <span className="protokol-zmeny-inline">
            {zmeny.map((z, i) => (
              <span key={i}>
                {z.custom
                  ? <>{z.custom}</>
                  : <><strong>{z.field}</strong>: změna z <del>{z.from ?? '—'}</del> na <ins>{z.to ?? '—'}</ins>.</>
                }{' '}
              </span>
            ))}
          </span>
        )}
        {text && <span className="protokol-text-inline"> {text}</span>}
        {kod && (
          <button
            type="button"
            onClick={copyKod}
            className="protokol-kod"
            title={copied ? 'Zkopírováno!' : 'Klikni a vlož do poznámky'}
          >
            {copied ? '✓ ' : ''}[[{kod}]]
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────── České popisky polí, entit a akcí ─────────────── */
export const FIELD_LABELS: Record<string, string> = {
  title: 'Název', content: 'Obsah', description: 'Popis', name: 'Jméno',
  display_name: 'Přezdívka', username: 'Uživatelské jméno', avatar_url: 'Avatar', bio: 'Bio',
  role: 'Role', reason: 'Důvod', severity: 'Závažnost', category: 'Kategorie',
  is_pinned: 'Připnutí', is_locked: 'Zamčeno', is_deleted: 'Smazáno', label: 'Štítek',
  block_type: 'Typ blokace', is_permanent: 'Trvalé', expires_at: 'Vyprší',
};

export const ENTITY_LABELS: Record<string, string> = {
  forum_posts: 'fóru kurzu', courses: 'kurzu', faculties: 'fakulty',
  tutoring_questions: 'doučovacího dotazu', tutoring_answers: 'odpovědi',
  user_blocks: 'blokace uživatele', user_block: 'blokace uživatele',
  user: 'uživatele', profiles: 'profilu', notifications: 'oznámení',
  changelog_entry: 'záznamu Změnáře', changelog_entries: 'záznamu Změnáře',
  announcements: 'oznámení', uploaded_images: 'obrázku',
  content_blocks: 'obsahového bloku', page_styles: 'stylu stránky',
  user_notes: 'poznámky o uživateli',
};

/** Vrať pěknou českou větu popisující akci, nebo null. */
function describeAction(action: string, entityType?: string | null, det?: any): string | null {
  const a = (action || '').toLowerCase();
  const ent = entityType ? (ENTITY_LABELS[entityType] || entityType) : null;
  const target = det?.target_username ? `uživateli ${det.target_username}` : (det?.target_user_id ? 'uživateli' : null);

  if (a === 'user.block')          return `blokaci ${target ?? 'uživatele'}${det?.reason ? ` (důvod: „${det.reason}")` : ''}`;
  if (a === 'user.unblock')        return `odblokování ${target ?? 'uživatele'}`;
  if (a === 'user.force_signout')  return `vynucené odhlášení ${target ?? 'uživatele'}`;
  if (a === 'changelog.create')    return `nový záznam ve Změnáři${det?.title ? `: „${det.title}"` : ''}`;
  if (a === 'changelog.update')    return `úpravu záznamu Změnáře${det?.title ? ` „${det.title}"` : ''}`;
  if (a === 'changelog.delete')    return `smazání záznamu Změnáře${det?.title ? ` „${det.title}"` : ''}`;
  if (a.startsWith('forum.'))      return `příspěvek ve fóru kurzu`;
  if (a.startsWith('image.'))      return `obrázek v moderaci`;
  if (a.startsWith('profanity.'))  return `automatický zásah filtru vulgarit`;
  if (a.startsWith('role.'))       return `úpravu role uživatele`;
  if (ent)                         return `${a.includes('create') ? 'nové' : 'změnu'} ${ent}`;
  return null;
}

/* ─────────────── Pomocník: vykreslí protokol z audit_log řádku ─────────────── */
export function ProtokolFromAudit({
  row, profile, role, sourceTable = 'audit_log',
}: {
  row: { id: string; action: string; entity_type?: string | null; entity_id?: string | null; details?: any; changes?: any; created_at: string; user_id?: string | null };
  profile?: { display_name?: string; username?: string; avatar_url?: string | null } | null;
  role?: string | null;
  /** Která tabulka je zdrojem – pro generování kódu PRT-… */
  sourceTable?: 'audit_log' | 'entity_history';
}) {
  const druh = actionToDruh(row.action);
  const det = row.details || row.changes || {};
  // Pokud akce má v details.min_role, zobraz odznáček minimální role (ne reálné role aktéra).
  const effectiveRole = det?.min_role ?? role;
  const autorita = roleToAutorita(effectiveRole);
  const nick = profile?.display_name || (row.user_id ? row.user_id.slice(0, 8) : 'systém');
  const href = profile?.username ? `/uziv/${profile.username}` : undefined;
  const zmeny: Zmena[] = [];

  if (det && typeof det === 'object') {
    for (const [k, v] of Object.entries(det)) {
      if (v && typeof v === 'object' && 'from' in (v as any) && 'to' in (v as any)) {
        zmeny.push({ field: FIELD_LABELS[k] || k, from: String((v as any).from ?? '—'), to: String((v as any).to ?? '—') });
      }
    }
  }

  // České větné popisy podle akce
  const sentence = describeAction(row.action, row.entity_type, det);
  const kontext = sentence
    ? <>{sentence}</>
    : row.entity_type
      ? <>v sekci <em>{ENTITY_LABELS[row.entity_type] || row.entity_type}</em>{row.entity_id ? <> (<code className="text-xs">{row.entity_id.slice(0, 8)}</code>)</> : null}</>
      : null;

  const text = zmeny.length === 0 && !sentence ? <code className="text-xs">{row.action}</code> : undefined;


  // Lazy načtení / vygenerování kódu PRT-…
  const [kod, setKod] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    import('@/lib/protokolCodes').then(({ ensureProtokolCode }) => {
      ensureProtokolCode(sourceTable, row.id).then(c => { if (!cancelled && c) setKod(c); });
    });
    return () => { cancelled = true; };
  }, [row.id, sourceTable]);

  return (
    <Protokol
      druh={druh}
      autorita={autorita}
      nick={nick}
      nickHref={href}
      profilovka={profile?.avatar_url || undefined}
      cas={new Date(row.created_at)}
      kontext={kontext}
      zmeny={zmeny.length ? zmeny : undefined}
      text={text}
      kod={kod}
    />
  );
}
