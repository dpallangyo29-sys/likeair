import { supabase } from "@/integrations/supabase/client";

export type GigInterestStatus =
  "interested" | "contacted" | "shortlisted" | "selected" | "completed" | "declined";

// This table is added by a migration newer than the generated database types.
// Keep the compatibility cast local until Supabase types are regenerated.
function gigInterestsTable() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from("gig_interests" as any) as any;
}

export async function getUserGigInterestIds(userId: string, gigIds: string[]) {
  if (!gigIds.length) return new Set<string>();
  const { data, error } = await gigInterestsTable()
    .select("gig_id")
    .eq("user_id", userId)
    .in("gig_id", gigIds);
  if (error) throw error;
  return new Set<string>((data ?? []).map((row: { gig_id: string }) => row.gig_id));
}

export async function expressGigInterest(
  userId: string,
  gigId: string,
  message?: string,
): Promise<void> {
  const { error } = await gigInterestsTable().upsert(
    {
      gig_id: gigId,
      user_id: userId,
      message: message?.trim() || null,
    },
    { onConflict: "gig_id,user_id" },
  );
  if (error) throw error;
}

export async function getGigInterestCounts(gigIds: string[]) {
  const counts = new Map<string, number>();
  if (!gigIds.length) return counts;
  const { data, error } = await gigInterestsTable().select("gig_id").in("gig_id", gigIds);
  if (error) throw error;
  (data ?? []).forEach((row: { gig_id: string }) => {
    counts.set(row.gig_id, (counts.get(row.gig_id) ?? 0) + 1);
  });
  return counts;
}

export type GigInterest = {
  id: string;
  gig_id: string;
  user_id: string;
  message: string | null;
  status: GigInterestStatus;
  created_at: string;
  applicant: {
    full_name: string | null;
    avatar_url: string | null;
    campus_id: string | null;
    verified: boolean;
  } | null;
};

export async function getGigInterestsForOwner(gigId: string): Promise<GigInterest[]> {
  const { data, error } = await gigInterestsTable()
    .select("id, gig_id, user_id, message, status, created_at")
    .eq("gig_id", gigId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Omit<GigInterest, "applicant">[];
  const userIds = rows.map((row) => row.user_id);
  if (!userIds.length) return [];
  const { data: applicants, error: applicantError } = await supabase
    .from("seller_profiles")
    .select("id, full_name, avatar_url, campus_id, verified")
    .in("id", userIds);
  if (applicantError) throw applicantError;
  const applicantMap = new Map(
    (applicants ?? []).map((applicant) => [
      applicant.id,
      {
        full_name: applicant.full_name,
        avatar_url: applicant.avatar_url,
        campus_id: applicant.campus_id,
        verified: applicant.verified ?? false,
      },
    ]),
  );
  return rows.map((row) => ({
    ...row,
    applicant: applicantMap.get(row.user_id) ?? null,
  }));
}

export async function updateGigInterestStatus(
  interestId: string,
  status: GigInterestStatus,
): Promise<void> {
  const { error } = await gigInterestsTable().update({ status }).eq("id", interestId);
  if (error) throw error;
}
