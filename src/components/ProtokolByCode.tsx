import { useEffect, useState, Fragment } from 'react';
import { lookupProtokolByCode, PROTOKOL_CODE_REGEX } from '@/lib/protokolCodes';
import { ProtokolFromAudit } from '@/components/Protokol';
import { supabase } from '@/integrations/supabase/client';

/** Načte jeden protokol podle kódu a zobrazí jej v Protokol stylu. */
export function ProtokolByCode({ code }: { code: string }) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'missing' }
    | { status: 'ready'; row: any; profile: any; role: string | null; sourceTable: 'audit_log' | 'entity_history' }
  >({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = await lookupProtokolByCode(code);
      if (!found) { if (!cancelled) setState({ status: 'missing' }); return; }
      let profile: any = null;
      let role: string | null = null;
      if (found.row.user_id) {
        const [pRes, rRes] = await Promise.all([
          supabase.from('profiles').select('display_name, username, avatar_url').eq('user_id', found.row.user_id).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', found.row.user_id).maybeSingle(),
        ]);
        profile = pRes.data;
        role = rRes.data?.role ?? null;
      }
      if (!cancelled) setState({ status: 'ready', row: found.row, profile, role, sourceTable: found.kind });
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (state.status === 'loading') return <span className="protokol-kod">[[{code}]] …</span>;
  if (state.status === 'missing') return <span className="protokol-kod" title="Protokol nenalezen">[[{code}]] ⚠</span>;
  return <ProtokolFromAudit row={state.row} profile={state.profile} role={state.role} sourceTable={state.sourceTable} />;
}

/** Vykreslí text poznámky s nahrazením [[PRT-XXXXXX]] kódů za živé karty protokolu. */
export function PoznamkaText({ text }: { text: string }) {
  if (!text) return null;
  const parts: Array<string | { code: string }> = [];
  let last = 0;
  const re = new RegExp(PROTOKOL_CODE_REGEX.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ code: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <div className="space-y-2 whitespace-pre-wrap">
      {parts.map((p, i) =>
        typeof p === 'string'
          ? <Fragment key={i}>{p}</Fragment>
          : <ProtokolByCode key={i} code={p.code} />
      )}
    </div>
  );
}
