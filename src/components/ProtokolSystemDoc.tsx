import { useState } from 'react';
import Protokol, { ProtokolFromAudit } from '@/components/Protokol';

/**
 * Kompletní dokumentace protokolového systému („NFP – Nová Forma Protokolu").
 * Určeno pro přenos do jiných projektů. Každý blok níže je samostatně
 * zkopírovatelný do schránky.
 */

// ─────────────────────────────────────────────────────────────────────────
// Zdrojové kódy (snapshot). Pokud tyto soubory změníš v projektu, aktualizuj
// je i zde, aby dokumentace odpovídala skutečnosti.
// ─────────────────────────────────────────────────────────────────────────

const SQL_SCHEMA = `-- ─────────────── Tabulka audit_log ───────────────
-- Univerzální log akcí (kdo, co, na čem, kdy, detaily).
CREATE TABLE public.audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action       text NOT NULL,          -- např. 'user.block', 'article.publish'
  entity_type  text,                    -- např. 'profiles', 'articles'
  entity_id    uuid,
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX audit_log_entity_idx ON public.audit_log (entity_type, entity_id);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log insert own"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "audit_log read staff"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'rektor')
      OR public.has_role(auth.uid(), 'spravce'));


-- ─────────────── Tabulka entity_history ───────────────
-- Změnová historie k jednotlivé entitě (title/content/…).
CREATE TABLE public.entity_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  text NOT NULL,
  entity_id    uuid NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action       text NOT NULL,           -- 'create' | 'update' | 'delete' | ...
  changes      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX entity_history_entity_idx ON public.entity_history (entity_type, entity_id, created_at DESC);

GRANT SELECT, INSERT ON public.entity_history TO authenticated;
GRANT ALL ON public.entity_history TO service_role;
ALTER TABLE public.entity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history insert own"
  ON public.entity_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "history read staff or author"
  ON public.entity_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'rektor')
      OR public.has_role(auth.uid(), 'spravce')
      OR user_id = auth.uid());


-- ─────────────── Tabulka protokol_codes ───────────────
-- Krátké kódy [[PRT-XXXXXX]] pro odkazování na konkrétní protokol.
CREATE TABLE public.protokol_codes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  source_table  text NOT NULL CHECK (source_table IN ('audit_log','entity_history')),
  source_id     uuid NOT NULL,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_id)
);
CREATE INDEX protokol_codes_code_idx ON public.protokol_codes (code);

GRANT SELECT, INSERT ON public.protokol_codes TO authenticated;
GRANT ALL ON public.protokol_codes TO service_role;
ALTER TABLE public.protokol_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "protokol_codes read all auth"
  ON public.protokol_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "protokol_codes insert auth"
  ON public.protokol_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
`;

const TS_PROTOKOL = `// src/components/Protokol.tsx
import { ReactNode, useEffect, useState } from 'react';

/* ─────────────── Druhy (typy akcí) ─────────────── */
export const DRUHY: Record<number, { label: string; bg: string; fg: string; verb: (f: boolean) => string }> = {
  16:  { label: 'Vytvoření',      bg: '#363', fg: '#fff', verb: f => f ? 'vytvořila' : 'vytvořil' },
  24:  { label: 'Úprava',         bg: '#284', fg: '#fff', verb: f => f ? 'změnila'   : 'změnil' },
  191: { label: 'Smazání',        bg: '#C22', fg: '#fff', verb: f => f ? 'smazala'   : 'smazal' },
  192: { label: 'Trvalé smazání', bg: '#A22', fg: '#fff', verb: f => f ? 'trvale smazala' : 'trvale smazal' },
  222: { label: 'Poznámka',       bg: '#CCC', fg: '#000', verb: f => f ? 'poznamenala' : 'poznamenal' },
  223: { label: 'Velká změna',    bg: '#444', fg: '#fff', verb: f => f ? 'provedla'  : 'provedl' },
  224: { label: 'Kritické',       bg: '#000', fg: '#fff', verb: f => f ? 'spustila'  : 'spustil' },
  225: { label: 'Zveřejnění',     bg: '#CC2222', fg: '#fff', verb: f => f ? 'zveřejnila' : 'zveřejnil' },
  226: { label: 'Přizvání',       bg: '#2196F3', fg: '#fff', verb: f => f ? 'přizvala'  : 'přizval' },
  227: { label: 'Převzetí',       bg: '#FF9800', fg: '#fff', verb: f => f ? 'převzala'  : 'převzal' },
  228: { label: 'Uvolnění',       bg: '#795548', fg: '#fff', verb: f => f ? 'uvolnila'  : 'uvolnil' },
  229: { label: 'Kontrola originality', bg: '#673AB7', fg: '#fff', verb: f => f ? 'provedla' : 'provedl' },
  230: { label: 'Kvalitářka',     bg: '#00BCD4', fg: '#fff', verb: f => f ? 'přidala' : 'přidal' },
  231: { label: 'Přidání bodů',   bg: '#4CAF50', fg: '#fff', verb: f => f ? 'přidala' : 'přidal' },
};

/* ─────────────── Autority ─────────────── */
export const AUTORITY: Record<number, { label: string; bg?: string; fg?: string; bold?: boolean; show?: boolean }> = {
  1:   { label: 'host',     show: false },
  2:   { label: 'uživatel', bold: true, show: false },
  24:  { label: 'redaktor', bg: '#7a4a8a', fg: '#fff', show: true },
  48:  { label: 'lektor',   bg: '#C0392B', fg: '#fff', show: true },
  192: { label: 'správce',  bg: '#258B25', fg: '#fff', show: true },
  255: { label: 'rektor',   bg: '#254BFF', fg: '#fff', show: true },
};

/* Kompletní zdroj viz Protokol.tsx v projektu. */
`;

const TS_MIN_ROLE = `// src/lib/minRole.ts
export type MinRole = 'rektor' | 'spravce' | 'lektor' | 'redaktor' | 'student';

const RULES: Array<{ test: RegExp | string; role: MinRole }> = [
  { test: /^role\\./,            role: 'rektor' },
  { test: /^changelog\\./,       role: 'rektor' },
  { test: /^user\\.force_signout/, role: 'rektor' },
  { test: /^block\\.permanent/,  role: 'rektor' },
  { test: /^settings\\./,        role: 'rektor' },

  { test: /^user\\.(block|unblock)/, role: 'spravce' },
  { test: /^block\\./,           role: 'spravce' },
  { test: /^mediation\\./,       role: 'spravce' },
  { test: /^announcement\\./,    role: 'spravce' },
  { test: /^report\\./,          role: 'spravce' },
  { test: /^note\\./,            role: 'spravce' },
  { test: /^profanity\\./,       role: 'spravce' },
  { test: /^forum\\.(delete|pin|lock|move)/, role: 'spravce' },
  { test: /^account_access\\./,  role: 'spravce' },
  { test: /^wall\\./,            role: 'spravce' },

  { test: /^image\\./,           role: 'lektor' },
  { test: /^tutoring\\./,        role: 'lektor' },
  { test: /^course\\./,          role: 'lektor' },
  { test: /^article\\.(publish|reject|delete|stolen|originality|change_author)/, role: 'spravce' },
  { test: /^article\\./,         role: 'redaktor' },
];

export function minRoleForAction(action: string): MinRole {
  const a = (action || '').toLowerCase();
  for (const r of RULES) {
    if (typeof r.test === 'string' ? a === r.test : r.test.test(a)) return r.role;
  }
  return 'student';
}`;

const TS_AUDIT_LOG = `// src/lib/auditLog.ts
import { supabase } from '@/integrations/supabase/client';
import { minRoleForAction, type MinRole } from '@/lib/minRole';

/** Zápis do audit_log. Automaticky doplní min_role. */
export async function logAudit(
  action: string,
  options: {
    entityType?: string;
    entityId?: string;
    details?: Record<string, any>;
    minRole?: MinRole;
  } = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const min_role = options.minRole ?? minRoleForAction(action);
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action,
      entity_type: options.entityType ?? null,
      entity_id: options.entityId ?? null,
      details: { ...(options.details ?? {}), min_role },
    });
  } catch (e) {
    console.error('[audit] failed', e);
  }
}`;

const TS_PROTOKOL_CODES = `// src/lib/protokolCodes.ts
import { supabase } from '@/integrations/supabase/client';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bez 0/O/1/I

function randomCode(len = 6): string {
  let s = '';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return \`PRT-\${s}\`;
}

export async function ensureProtokolCode(
  sourceTable: 'audit_log' | 'entity_history',
  sourceId: string
): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from('protokol_codes')
      .select('code')
      .eq('source_table', sourceTable)
      .eq('source_id', sourceId)
      .maybeSingle();
    if (existing?.code) return existing.code;

    for (let i = 0; i < 5; i++) {
      const code = randomCode();
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('protokol_codes')
        .insert({ code, source_table: sourceTable, source_id: sourceId, created_by: user?.id ?? null })
        .select('code')
        .single();
      if (!error && data) return data.code;
    }
    return null;
  } catch { return null; }
}

export async function lookupProtokolByCode(code: string) {
  const c = code.toUpperCase().trim();
  const { data: link } = await supabase
    .from('protokol_codes')
    .select('source_table, source_id')
    .eq('code', c)
    .maybeSingle();
  if (!link) return null;

  if (link.source_table === 'audit_log') {
    const { data } = await supabase.from('audit_log').select('*').eq('id', link.source_id).maybeSingle();
    return data ? { kind: 'audit_log' as const, row: data } : null;
  }
  if (link.source_table === 'entity_history') {
    const { data } = await supabase.from('entity_history').select('*').eq('id', link.source_id).maybeSingle();
    return data ? { kind: 'entity_history' as const, row: data } : null;
  }
  return null;
}

export const PROTOKOL_CODE_REGEX = /\\[\\[(PRT-[A-Z0-9]{4,10})\\]\\]/g;`;

const CSS_BLOCK = `/* Vlož do src/index.css (očekává tokeny --card, --border, --foreground, --muted, --muted-foreground) */
.protokol {
  position: relative; display: block;
  background: hsl(var(--card)); border: 1px solid hsl(var(--border));
  border-radius: 10px; margin: 0 0 8px; overflow: hidden;
  font-size: 13px; line-height: 1.45;
}
.protokol::before { content: ''; display: block; float: left; width: 0; min-height: 3.6em; }
.protokol-druh {
  float: left; width: 1.9em; min-height: 100%;
  padding: 0.4em 0; text-align: center; font-weight: 800;
  letter-spacing: 0.08em; font-size: 0.8em; background: #444; color: #fff;
}
.protokol-druh > span {
  display: inline-block; writing-mode: vertical-rl; transform: rotate(180deg);
  white-space: nowrap; margin: 1em 0;
}
.protokol-info { padding: 8px 10px 6px 10px; margin-left: 2.4em; overflow: hidden; position: relative; }
.protokol-info .profilovka {
  float: right; width: 36px; height: 36px; background-size: cover; background-position: center;
  border-radius: 50%; margin: 0 0 4px 8px;
  background-color: hsl(var(--muted)); border: 1px solid hsl(var(--border));
}
.protokol-info .profilovka-fallback {
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 12px; color: hsl(var(--muted-foreground));
}
.protokol-info .protokol-autorita {
  float: right; font-size: 11px; font-weight: 700;
  padding: 2px 6px; border-radius: 6px; margin: 6px 6px 0 0; text-transform: lowercase;
}
.protokol-info .nick { font-weight: 600; color: hsl(var(--foreground)); text-decoration: none; }
.protokol-info .nick:hover { text-decoration: underline; }
.protokol-info .odznak { margin: 0 2px; }
.protokol-info time {
  color: hsl(var(--muted-foreground)); font-size: 12px;
  border-bottom: 1px dotted hsl(var(--muted-foreground)); cursor: help;
}
.protokol-zmeny { margin: 0; padding: 0 10px 8px 2.4em; clear: both; font-size: 12px; }
.protokol-zmeny > div {
  display: flex; gap: 0.4em; padding: 2px 0 2px 8px;
  margin-left: 8px; border-left: 2px solid hsl(var(--border));
}
.protokol-zmeny ins { background: #d1fadf; color: #064e3b; text-decoration: none; padding: 0 3px; border-radius: 3px; }
.protokol-zmeny del { background: #fee2e2; color: #7f1d1d; padding: 0 3px; border-radius: 3px; }
.protokol-text { clear: both; padding: 0 10px 8px 2.4em; font-size: 12px; color: hsl(var(--muted-foreground)); }
.protokol-kod {
  display: inline-block; margin-left: 8px;
  font-family: 'SF Mono', ui-monospace, Menlo, monospace;
  font-size: 11px; font-weight: 700; color: #254BFF;
  background: hsl(var(--muted)); border: 1px dashed #254BFF66;
  padding: 1px 6px; border-radius: 4px; cursor: pointer;
  vertical-align: middle; transition: all .15s;
}
.protokol-kod:hover { background: #254BFF; color: #fff; border-style: solid; }`;

const USAGE = `// ─── Jak zapisovat protokoly ───
import { logAudit } from '@/lib/auditLog';
// při jakékoli mod akci:
await logAudit('user.block', {
  entityType: 'profiles',
  entityId: targetUserId,
  details: { reason: 'spam', target_username: 'petr' },
});

// ─── Změny konkrétní entity (before/after diff) ───
import { recordHistory } from '@/components/ChangeHistory';
await recordHistory('articles', articleId, myUserId, 'update', {
  title:   { from: 'Starý název', to: 'Nový název' },
  content: { from: oldContent,    to: newContent    },
});

// ─── Zobrazení karet ───
import { ProtokolFromAudit } from '@/components/Protokol';
{rows.map(r => (
  <ProtokolFromAudit
    key={r.id}
    row={r}
    profile={profiles[r.user_id]}
    role={roles[r.user_id]}
    sourceTable="audit_log"
  />
))}

// ─── Vložení odkazu na protokol do textu (poznámky, komentáře) ───
// Kdekoliv v textu napiš [[PRT-AB12CD]] – komponenta PoznamkaText to nahradí
// živou kartou daného protokolu.
import { PoznamkaText } from '@/components/ProtokolByCode';
<PoznamkaText text={note.text} />`;

// ─────────────────────────────────────────────────────────────────────────

function Block({ title, code, lang }: { title: string; code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {}
  };
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="text-sm font-bold">{title}</div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{lang}</span>
          <button
            onClick={copy}
            className="text-xs font-bold px-2 py-1 rounded-md border border-border hover:bg-background transition"
          >
            {copied ? '✓ Zkopírováno' : '📋 Kopírovat'}
          </button>
        </div>
      </header>
      <pre className="text-xs leading-relaxed overflow-auto p-3 m-0 max-h-[400px]"><code>{code}</code></pre>
    </section>
  );
}

export default function ProtokolSystemDoc() {
  const now = new Date();
  const demoRow = {
    id: 'demo-1',
    action: 'user.block',
    entity_type: 'profiles',
    entity_id: '00000000-0000-0000-0000-000000000000',
    details: { reason: 'spam v diskuzi', target_username: 'petr', min_role: 'spravce' },
    created_at: new Date(now.getTime() - 5 * 60_000).toISOString(),
    user_id: 'demo',
  };
  const demoProfile = { display_name: 'Anička', username: 'anicka', avatar_url: null };

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="mt-0 text-lg font-extrabold">📖 Systém protokolů (NFP)</h3>
        <p className="text-sm text-muted-foreground m-0">
          Kompletní popis protokolového systému pro přenos do jiného projektu.
          Každý blok zkopíruj tlačítkem „Kopírovat" a vlož do cílového projektu na příslušné místo.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="text-sm font-bold mb-2">🎬 Ukázka výsledné karty</div>
        <ProtokolFromAudit row={demoRow as any} profile={demoProfile as any} role="spravce" sourceTable="audit_log" />
        <Protokol
          druh={225}
          autorita={24}
          nick="Redaktor Karel"
          feminin={false}
          cas={new Date(now.getTime() - 3600_000)}
          kontext={<>zveřejnění článku <em>„Jak se učí Alík"</em></>}
          kod="PRT-DEMO01"
        />
      </section>

      <section className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="text-sm font-bold mb-2">🧭 Architektura ve zkratce</div>
        <ol className="text-sm space-y-1 pl-5 list-decimal m-0">
          <li><b>audit_log</b> – globální log akcí (kdo/co/kdy/detaily).</li>
          <li><b>entity_history</b> – změny polí konkrétní entity (before/after).</li>
          <li><b>protokol_codes</b> – krátké kódy <code>[[PRT-XXXXXX]]</code> jako odkazy.</li>
          <li><b>minRole</b> – z názvu akce dopočítá minimální roli; ta se ukládá do <code>details.min_role</code> a barví odznáček autority.</li>
          <li><b>Protokol.tsx</b> – vizuální karta (druh + autorita + nick + čas + kontext + změny + kód).</li>
          <li><b>ProtokolByCode.tsx</b> – zobrazí kartu podle kódu, a <code>PoznamkaText</code> rozparsuje kódy v libovolném textu.</li>
        </ol>
      </section>

      <Block title="1) SQL schéma + RLS" code={SQL_SCHEMA} lang="sql" />
      <Block title="2) src/lib/minRole.ts" code={TS_MIN_ROLE} lang="ts" />
      <Block title="3) src/lib/auditLog.ts" code={TS_AUDIT_LOG} lang="ts" />
      <Block title="4) src/lib/protokolCodes.ts" code={TS_PROTOKOL_CODES} lang="ts" />
      <Block title="5) src/components/Protokol.tsx (hlavička – kompletní verzi zkopíruj přímo ze souboru v projektu)" code={TS_PROTOKOL} lang="tsx" />
      <Block title="6) CSS (do src/index.css)" code={CSS_BLOCK} lang="css" />
      <Block title="7) Použití v aplikaci" code={USAGE} lang="ts" />

      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <div className="font-bold mb-2">📚 Slovník druhů (id → význam)</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
          <div><b>16</b> Vytvoření</div><div><b>24</b> Úprava</div><div><b>191</b> Smazání</div>
          <div><b>192</b> Trvalé smazání</div><div><b>222</b> Poznámka</div><div><b>223</b> Velká změna</div>
          <div><b>224</b> Kritické</div><div><b>225</b> Zveřejnění</div><div><b>226</b> Přizvání</div>
          <div><b>227</b> Převzetí</div><div><b>228</b> Uvolnění</div><div><b>229</b> Kontrola originality</div>
          <div><b>230</b> Kvalitářka</div><div><b>231</b> Přidání bodů</div>
        </div>
        <div className="font-bold mt-3 mb-2">🎖 Autority (odznáček role)</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
          <div><b>1</b> host (skryté)</div><div><b>2</b> uživatel (skryté)</div>
          <div><b>24</b> redaktor</div><div><b>48</b> lektor</div>
          <div><b>192</b> správce</div><div><b>255</b> rektor</div>
        </div>
        <div className="mt-3 text-muted-foreground text-xs">
          Konvence názvů akcí: <code>entity.akce</code> (např. <code>user.block</code>, <code>article.publish</code>,
          <code>forum.delete</code>). Odpovídající druh a minimální role se automaticky odvodí ze jména akce
          (viz <code>actionToDruh</code> v <code>Protokol.tsx</code> a <code>minRoleForAction</code> v <code>minRole.ts</code>).
        </div>
      </section>
    </div>
  );
}
