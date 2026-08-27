import { supabase } from "@/integrations/supabase/client";
import { redirect } from "@tanstack/react-router";

export type BusinessApplicationStatus = "pending" | "approved" | "rejected" | "more_information";
export type PromotionStatus =
  | "draft"
  | "waiting_for_payment"
  | "paid"
  | "waiting_for_review"
  | "approved"
  | "running"
  | "finished"
  | "rejected"
  | "paused"
  | "stopped";

export type BusinessApplication = {
  id: string;
  user_id: string;
  business_name: string;
  category: string;
  location: string;
  phone: string;
  offer: string;
  description: string | null;
  status: BusinessApplicationStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessProfile = {
  id: string;
  user_id: string;
  application_id: string;
  business_name: string;
  category: string;
  location: string;
  phone: string;
  offer: string;
  description: string | null;
  logo_url: string | null;
  verified_at: string;
};

export type Promotion = {
  id: string;
  business_id: string;
  content_type: string;
  content_id: string | null;
  title: string;
  message: string | null;
  image_url: string | null;
  video_url: string | null;
  location: string;
  category: string;
  budget_amount: number;
  remaining_balance: number;
  spent_amount: number;
  duration_hours: number;
  start_time: string | null;
  end_time: string | null;
  promotion_strength: string;
  promotion_score: number;
  status: PromotionStatus;
  payment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessPayment = {
  id: string;
  business_id: string;
  promotion_id: string | null;
  amount: number;
  currency: "TZS";
  provider: string | null;
  provider_reference: string | null;
  status: "pending" | "processing" | "successful" | "failed" | "cancelled";
  receipt_url: string | null;
  paid_at: string | null;
  created_at: string;
};

export function estimatePromotionDurationHours(budget: number) {
  return (Math.max(0, budget) / 2000) * 72;
}

export function estimatePromotionStrength(budget: number) {
  if (budget < 5000) return "Standard";
  if (budget < 20000) return "Strong";
  return "Very Strong";
}

export function formatDuration(hours: number) {
  if (hours < 24) return `${Math.max(1, Math.round(hours))} hours`;
  const days = hours / 24;
  return `${days < 10 ? days.toFixed(1).replace(".0", "") : Math.round(days)} days`;
}

function table(name: string) {
  // New tables remain locally cast until Supabase types are regenerated.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase.from(name as any) as any;
}

export async function getBusinessProfile(userId: string) {
  const { data, error } = await table("business_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as BusinessProfile | null) ?? null;
}

export async function requireBusinessAccess() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw redirect({ to: "/auth" });
  const businessProfile = await getBusinessProfile(data.user.id);
  if (!businessProfile) throw redirect({ to: "/business/pending" });
  return { businessProfile };
}

export async function getLatestBusinessApplication(userId: string) {
  const { data, error } = await table("business_applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as BusinessApplication | null) ?? null;
}

export async function submitBusinessApplication(input: {
  businessName: string;
  category: string;
  location: string;
  phone: string;
  offer: string;
  description?: string;
}) {
  const { data, error } = await supabase.rpc("submit_business_application" as any, {
    p_business_name: input.businessName.trim(),
    p_category: input.category.trim(),
    p_location: input.location.trim(),
    p_phone: input.phone.trim(),
    p_offer: input.offer.trim(),
    p_description: input.description?.trim() || null,
  } as any);
  if (error) throw error;
  return data as string;
}

export async function getBusinessPromotions(businessId: string) {
  const { data, error } = await table("promotions")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Promotion[];
}

export async function createBusinessPromotion(input: {
  contentType: string;
  contentId?: string;
  title: string;
  message?: string;
  imageUrl?: string;
  videoUrl?: string;
  location: string;
  category: string;
  budgetAmount: number;
}) {
  const { data, error } = await supabase.rpc("create_business_promotion" as any, {
    p_content_type: input.contentType,
    p_content_id: input.contentId || null,
    p_title: input.title.trim(),
    p_message: input.message?.trim() || null,
    p_image_url: input.imageUrl || null,
    p_video_url: input.videoUrl || null,
    p_location: input.location.trim(),
    p_category: input.category.trim(),
    p_budget_amount: input.budgetAmount,
    p_duration_hours: estimatePromotionDurationHours(input.budgetAmount),
    p_promotion_strength: estimatePromotionStrength(input.budgetAmount),
  } as any);
  if (error) throw error;
  return data as string;
}

export async function uploadBusinessImage(file: File) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sign in required");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Images must be 10MB or smaller.");
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${data.user.id}/business-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("listings").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("listings").getPublicUrl(path).data.publicUrl;
}

export async function getBusinessPayments(businessId: string) {
  const { data, error } = await table("business_payments")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BusinessPayment[];
}

export async function completeMockBusinessPayment(paymentId: string) {
  const { error } = await supabase.rpc("complete_mock_business_payment" as any, {
    p_payment_id: paymentId,
  } as any);
  if (error) throw error;
}

export async function getEligiblePromotions(location?: string, category?: string) {
  const { data, error } = await supabase.rpc("get_eligible_promotions" as any, {
    p_location: location || null,
    p_category: category || null,
    p_limit: 5,
  } as any);
  if (error) throw error;
  return (data ?? []) as Promotion[];
}

export async function reviewBusinessApplication(
  applicationId: string,
  status: Exclude<BusinessApplicationStatus, "approved"> | "approved",
  note?: string,
) {
  const { error } = await supabase.rpc("admin_review_business_application" as any, {
    p_application_id: applicationId,
    p_status: status,
    p_admin_note: note?.trim() || null,
  } as any);
  if (error) throw error;
}

export async function getAdminBusinessApplications() {
  const { data, error } = await table("business_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as BusinessApplication[];
}

export async function getAdminPromotions() {
  const { data, error } = await table("promotions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Promotion[];
}
export async function getAdminBusinessPayments() {
  const { data, error } = await table("business_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as BusinessPayment[];
}
