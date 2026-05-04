import { supabase } from '@/integrations/supabase/client';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bez 0/O/1/I

function randomCode(len = 6): string {
  let s = '';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return `PRT-${s}`;
}

/** Vrátí existující kód pro daný protokol nebo vytvoří nový. */
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

    // Pokus o vložení – v případě kolize zkusíme znovu (max 5×)
    for (let i = 0; i < 5; i++) {
      const code = randomCode();
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('protokol_codes')
        .insert({
          code,
          source_table: sourceTable,
          source_id: sourceId,
          created_by: user?.id ?? null,
        })
        .select('code')
        .single();
      if (!error && data) return data.code;
    }
    return null;
  } catch {
    return null;
  }
}

/** Najde záznam podle kódu (pro vykreslení v poznámce). */
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

export const PROTOKOL_CODE_REGEX = /\[\[(PRT-[A-Z0-9]{4,10})\]\]/g;
