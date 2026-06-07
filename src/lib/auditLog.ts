import { supabase } from '@/integrations/supabase/client';
import { minRoleForAction, type MinRole } from '@/lib/minRole';

/** Insert an entry into the global audit_log table. Best-effort, never throws.
 *  Automatically attaches `min_role` (the minimal role that could have done it)
 *  into `details` so protokol cards show the correct badge regardless of actor.
 */
export async function logAudit(
  action: string,
  options: {
    entityType?: string;
    entityId?: string;
    details?: Record<string, any>;
    /** Override the automatic minimal role detection. */
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
}
