import { getSupabaseClient } from '@/lib/supabase';

type AuditActionInput = {
  actionType: string;
  entityType?: string | null;
  entityId?: string | null;
  requestParams?: Record<string, unknown> | null;
};

export async function logAdminAction(input: AuditActionInput): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return;
    }

    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (adminError || !adminUser?.id) {
      console.error('Audit: cannot resolve admin user id', adminError);
      return;
    }

    const requestPath = typeof window !== 'undefined' ? window.location.pathname : null;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

    const { error } = await supabase.rpc('log_admin_action', {
      p_admin_user_id: adminUser.id,
      p_action_type: input.actionType,
      p_entity_type: input.entityType ?? null,
      p_entity_id: input.entityId ?? null,
      p_ip_address: null,
      p_user_agent: userAgent,
      p_request_path: requestPath,
      p_request_params: input.requestParams ?? {},
    });

    if (error) {
      console.error('Audit: log_admin_action failed', error);
    }
  } catch (error) {
    console.error('Audit: unexpected error', error);
  }
}
