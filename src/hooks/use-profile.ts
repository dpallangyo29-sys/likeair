import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  nida_number: string | null;
  student_id: string | null;
  campus_id: string | null;
  region: string | null;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean;
  banned_at?: string | null;
  ban_reason?: string | null;
  store_name: string | null;
  store_slug: string | null;
  store_bio: string | null;
};

export function useProfile() {
  const { user, signedIn } = useAuth();
  const q = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ProfileRow | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileRow) ?? null;
    },
  });
  const profile = q.data ?? null;
  return {
    profile,
    isLoading: q.isLoading,
    signedIn,
    hasStudentId: !!profile?.student_id,
    hasNida: !!profile?.nida_number,
    refetch: q.refetch,
  };
}

export function useIsStaff() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "moderator"])
        .limit(1)
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });
  return { isStaff: !!q.data, isLoading: q.isLoading };
}

export const useIsAdmin = useIsStaff;
