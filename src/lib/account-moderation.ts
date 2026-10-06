import { supabase } from "@/integrations/supabase/client";

function moderationRpc(name: string, args: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.rpc(name as any, args);
}

export async function setUserVerification(userId: string, verified: boolean) {
  const { error } = await moderationRpc("admin_set_user_verification", {
    target_user_id: userId,
    should_verify: verified,
  });
  if (error) throw error;
}

export async function setUserBan(userId: string, banned: boolean, reason?: string) {
  const { error } = await moderationRpc("admin_set_user_ban", {
    target_user_id: userId,
    should_ban: banned,
    reason: reason?.trim() || null,
  });
  if (error) throw error;
}
