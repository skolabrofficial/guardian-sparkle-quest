import { supabase } from '@/integrations/supabase/client';

/** Insert an entry into the global audit_log table. Best-effort, never throws. */
export async function logAudit(
  action: string,
  options: {
    entityType?: string;
    entityId?: string;
    details?: Record<string, any>;
  } = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('audit_log').insert({
      user_id: user.id,
      action,
      entity_type: options.entityType ?? null,
      entity_id: options.entityId ?? null,
      details: options.details ?? null,
    });
  } catch (e) {
    console.error('[audit] failed', e);
  }
}
