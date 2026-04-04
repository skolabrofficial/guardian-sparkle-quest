import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProfanitySettings {
  bannedWords: string[];
  autoBlockEnabled: boolean;
  autoBlockType: string; // 'warning' | 'partial' | 'full'
  autoBlockReason: string;
  autoBlockThreshold: number; // how many violations before auto-block
  autoBlockDuration: number; // hours, 0 = permanent
}

const DEFAULT_SETTINGS: ProfanitySettings = {
  bannedWords: [],
  autoBlockEnabled: false,
  autoBlockType: 'warning',
  autoBlockReason: 'Automatická blokace za použití zakázaných slov',
  autoBlockThreshold: 3,
  autoBlockDuration: 24,
};

let cachedSettings: ProfanitySettings | null = null;
let cacheTime = 0;
const CACHE_TTL = 60_000; // 1 min

async function loadSettings(): Promise<ProfanitySettings> {
  if (cachedSettings && Date.now() - cacheTime < CACHE_TTL) return cachedSettings;

  const { data } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['profanity_words', 'profanity_autoblock']);

  const wordsRow = data?.find(r => r.key === 'profanity_words');
  const blockRow = data?.find(r => r.key === 'profanity_autoblock');

  const words = wordsRow?.value as any;
  const block = blockRow?.value as any;

  cachedSettings = {
    bannedWords: Array.isArray(words?.words) ? words.words : [],
    autoBlockEnabled: block?.enabled ?? false,
    autoBlockType: block?.type ?? 'warning',
    autoBlockReason: block?.reason ?? DEFAULT_SETTINGS.autoBlockReason,
    autoBlockThreshold: block?.threshold ?? 3,
    autoBlockDuration: block?.duration ?? 24,
  };
  cacheTime = Date.now();
  return cachedSettings;
}

export function invalidateProfanityCache() {
  cachedSettings = null;
  cacheTime = 0;
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function useProfanityFilter() {
  const [settings, setSettings] = useState<ProfanitySettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadSettings().then(s => { setSettings(s); setLoaded(true); });
  }, []);

  const checkText = useCallback((text: string): { clean: boolean; foundWords: string[] } => {
    if (!settings.bannedWords.length) return { clean: true, foundWords: [] };
    const norm = normalize(text);
    const found = settings.bannedWords.filter(w => {
      const nw = normalize(w.trim());
      if (!nw) return false;
      return norm.includes(nw);
    });
    return { clean: found.length === 0, foundWords: found };
  }, [settings.bannedWords]);

  const validateAndWarn = useCallback((text: string): boolean => {
    const { clean, foundWords } = checkText(text);
    if (!clean) {
      return false;
    }
    return true;
  }, [checkText]);

  return { checkText, validateAndWarn, settings, loaded };
}

/** Server-side: record a violation and potentially auto-block */
export async function recordProfanityViolation(userId: string, foundWords: string[], context: string) {
  const settings = await loadSettings();
  
  // Log to audit
  await supabase.from('audit_log').insert({
    user_id: userId,
    action: 'profanity_violation',
    entity_type: 'profanity',
    details: { words: foundWords, context },
  });

  if (!settings.autoBlockEnabled) return;

  // Count recent violations
  const since = new Date();
  since.setHours(since.getHours() - 24);
  const { count } = await supabase
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action', 'profanity_violation')
    .gte('created_at', since.toISOString());

  const violationCount = (count ?? 0);
  if (violationCount >= settings.autoBlockThreshold) {
    // Auto-block
    const expiresAt = settings.autoBlockDuration > 0
      ? new Date(Date.now() + settings.autoBlockDuration * 3600_000).toISOString()
      : null;

    await supabase.from('user_blocks').insert({
      user_id: userId,
      blocked_by: userId, // system auto-block
      reason: settings.autoBlockReason,
      details: `Automatická blokace: ${violationCount}× použití zakázaných slov za 24h. Poslední: ${foundWords.join(', ')}`,
      block_type: settings.autoBlockType,
      severity: 'standard',
      is_permanent: settings.autoBlockDuration === 0,
      expires_at: expiresAt,
    });
  }
}
