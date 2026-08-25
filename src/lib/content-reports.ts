import { supabase } from "@/integrations/supabase/client";

export type ContentReportReason =
  "scam" | "fake" | "spam" | "duplicate" | "wrong_category" | "inappropriate" | "other";

export type ContentReport = {
  id: string;
  reporter_id: string;
  target_type: "product" | "gig" | "ad" | "profile";
  target_id: string;
  reason: ContentReportReason;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  moderator_note: string | null;
  created_at: string;
};

function reportsTable() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from("content_reports" as any) as any;
}

export async function submitContentReport(input: {
  reporterId: string;
  targetType: "product" | "gig";
  targetId: string;
  reason: ContentReportReason;
  details?: string;
}) {
  const { error } = await reportsTable().insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details?.trim() || null,
  });
  if (error) throw error;
}

export async function getOpenReports() {
  const { data, error } = await reportsTable()
    .select(
      "id, reporter_id, target_type, target_id, reason, details, status, moderator_note, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ContentReport[];
}

export async function updateContentReport(
  id: string,
  status: ContentReport["status"],
  moderatorNote?: string,
) {
  const { error } = await reportsTable()
    .update({ status, moderator_note: moderatorNote?.trim() || null })
    .eq("id", id);
  if (error) throw error;
}
