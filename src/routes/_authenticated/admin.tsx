import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-profile";
import {
  ShieldCheck,
  ArrowLeft,
  Users,
  Package,
  Briefcase,
  Megaphone,
  Activity,
  Trash2,
  Loader2,
  Lock,
  BadgeCheck,
  Ban,
  MapPin,
  Plus,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getOpenReports, updateContentReport, type ContentReport } from "@/lib/content-reports";
import { setUserBan, setUserVerification } from "@/lib/account-moderation";
import {
  getAdminBusinessApplications,
  getAdminBusinessPayments,
  getAdminPromotions,
  reviewBusinessApplication,
  type BusinessApplication,
} from "@/lib/business";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console" },
      { name: "description", content: "Private administration." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isStaff: isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground px-6">
        <div className="max-w-sm text-center rounded-3xl border border-coral/30 bg-coral/5 p-6">
          <Lock className="h-6 w-6 text-coral mx-auto" />
          <h1 className="mt-3 font-display text-xl font-black">Restricted</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            This area is reserved for LikeAir administration. Your account is not authorized.
          </p>
          <Link to="/" className="mt-4 inline-flex text-xs text-teal">
            ← Back to feed
          </Link>
        </div>
      </div>
    );
  }

  return <ConsoleShell />;
}

type Tab =
  | "overview"
  | "users"
  | "campuses"
  | "products"
  | "gigs"
  | "ads"
  | "reports"
  | "business"
  | "promotions"
  | "payments"
  | "activity";

function ConsoleShell() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-16 overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-teal/20 blur-[130px]" />
        <div className="absolute bottom-0 -right-40 h-[520px] w-[520px] rounded-full bg-coral/20 blur-[130px]" />
      </div>

      <div className="mx-auto max-w-5xl px-5 py-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to app
          </Link>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-teal tracking-widest">
            <ShieldCheck className="h-3 w-3" /> STAFF
          </div>
        </div>

        <h1 className="mt-4 font-display text-4xl font-black">Admin Console</h1>
        <p className="text-xs text-muted-foreground">LikeAir · private administration</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["overview", "users", "campuses", "products", "gigs", "ads", "reports", "business", "promotions", "payments", "activity"] as Tab[]).map(
            (t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-bold border transition",
                  tab === t
                    ? "bg-teal text-teal-foreground border-teal glow-teal"
                    : "bg-surface border-border text-muted-foreground hover:border-teal/40",
                )}
              >
                {t}
              </button>
            ),
          )}
        </div>

        <div className="mt-6">
          {tab === "overview" && <Overview />}
          {tab === "users" && <UsersTable />}
          {tab === "campuses" && <CampusesManager />}
          {tab === "products" && <ContentTable table="products" />}
          {tab === "gigs" && <ContentTable table="gigs" />}
          {tab === "ads" && <ContentTable table="ads" />}
          {tab === "reports" && <ReportsTable />}
          {tab === "business" && <BusinessApplicationsTable />}
          {tab === "promotions" && <PromotionsTable />}
          {tab === "payments" && <BusinessPaymentsTable />}
          {tab === "activity" && <ActivityTable />}
        </div>
      </div>
    </div>
  );
}

function BusinessApplicationsTable() {
  const qc = useQueryClient();
  const applications = useQuery({ queryKey: ["admin-business-applications"], queryFn: getAdminBusinessApplications });

  async function review(application: BusinessApplication, status: BusinessApplication["status"]) {
    const note = prompt("Internal note for this application (optional):", application.admin_note ?? "");
    if (note === null) return;
    try {
      await reviewBusinessApplication(application.id, status, note);
      qc.invalidateQueries({ queryKey: ["admin-business-applications"] });
      toast.success(status === "approved" ? "Business access approved." : "Application updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not review application");
    }
  }

  if (applications.isLoading) return <Loading />;
  if (applications.isError) return <div className="text-sm text-coral">Could not load business applications.</div>;
  return <div className="space-y-3">{(applications.data ?? []).map((application) => <div key={application.id} className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-bold">{application.business_name}</div><div className="mt-1 text-[11px] text-muted-foreground">{application.category} · {application.location} · {application.phone}</div></div><span className="rounded-full bg-teal/10 px-2 py-1 text-[10px] font-bold capitalize text-teal">{application.status.replace("_", " ")}</span></div><div className="mt-3 grid gap-2 text-xs"><div><b>Offers:</b> {application.offer}</div>{application.description && <div className="text-muted-foreground"><b>About:</b> {application.description}</div>}{application.admin_note && <div className="rounded-xl bg-coral/5 p-3 text-coral"><b>Internal note:</b> {application.admin_note}</div>}</div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => review(application, "approved")} className="rounded-xl bg-whatsapp px-3 py-2 text-xs font-bold text-white">Approve</button><button onClick={() => review(application, "more_information")} className="rounded-xl border border-teal/40 px-3 py-2 text-xs font-bold text-teal">More information</button><button onClick={() => review(application, "rejected")} className="rounded-xl border border-coral/40 px-3 py-2 text-xs font-bold text-coral">Reject</button></div></div>)}{applications.data?.length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">No business applications yet.</div>}</div>;
}

function PromotionsTable() {
  const promotions = useQuery({ queryKey: ["admin-promotions"], queryFn: getAdminPromotions });
  if (promotions.isLoading) return <Loading />;
  if (promotions.isError) return <div className="text-sm text-coral">Could not load promotions.</div>;
  return <div className="space-y-3"><div className="rounded-2xl border border-teal/30 bg-teal/5 p-4 text-xs text-teal">Promotions are started automatically after successful payment. This view is read-only.</div>{(promotions.data ?? []).map((promotion) => <div key={promotion.id} className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-bold">{promotion.title}</div><div className="mt-1 text-[11px] text-muted-foreground">{promotion.category} · {promotion.location} · TZS {promotion.budget_amount.toLocaleString()}</div></div><span className="rounded-full bg-teal/10 px-2 py-1 text-[10px] font-bold capitalize text-teal">{promotion.status.replaceAll("_", " ")}</span></div><div className="mt-3 text-xs text-muted-foreground">Balance: TZS {promotion.remaining_balance.toLocaleString()} · Spent: TZS {promotion.spent_amount.toLocaleString()} · Strength: {promotion.promotion_strength}</div></div>)}{promotions.data?.length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">No promotions yet.</div>}</div>;
}

function BusinessPaymentsTable() {
  const payments = useQuery({ queryKey: ["admin-business-payments"], queryFn: getAdminBusinessPayments });
  if (payments.isLoading) return <Loading />;
  if (payments.isError) return <div className="text-sm text-coral">Could not load business payments.</div>;
  return <div className="rounded-2xl border border-border overflow-x-auto"><table className="w-full min-w-[720px] text-xs"><thead className="bg-surface-elevated text-muted-foreground"><tr><Th>Amount</Th><Th>Status</Th><Th>Provider</Th><Th>Reference</Th><Th>Promotion</Th><Th>Created</Th><Th>Paid</Th></tr></thead><tbody>{(payments.data ?? []).map((payment) => <tr key={payment.id} className="border-t border-border/50"><Td className="font-bold">TZS {payment.amount.toLocaleString()}</Td><Td className="capitalize">{payment.status}</Td><Td>{payment.provider ?? "—"}</Td><Td className="font-mono">{payment.provider_reference ?? "—"}</Td><Td className="font-mono">{payment.promotion_id?.slice(0, 8) ?? "—"}</Td><Td>{new Date(payment.created_at).toLocaleString()}</Td><Td>{payment.paid_at ? new Date(payment.paid_at).toLocaleString() : "—"}</Td></tr>)}</tbody></table>{payments.data?.length === 0 && <div className="p-8 text-center text-xs text-muted-foreground">No business payments yet.</div>}</div>;
}

function ReportsTable() {
  const qc = useQueryClient();
  const reports = useQuery({ queryKey: ["admin-reports"], queryFn: getOpenReports });

  async function changeStatus(report: ContentReport, status: ContentReport["status"]) {
    try {
      await updateContentReport(report.id, status);
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Report updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update report");
    }
  }

  if (reports.isLoading) return <Loading />;
  if (reports.isError) return <div className="text-sm text-coral">Could not load reports.</div>;

  return (
    <div className="rounded-2xl border border-border overflow-x-auto">
      <table className="w-full min-w-[760px] text-xs">
        <thead className="bg-surface-elevated text-muted-foreground">
          <tr>
            <Th>Reason</Th>
            <Th>Target</Th>
            <Th>Details</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {(reports.data ?? []).map((report) => (
            <tr key={report.id} className="border-t border-border/50 align-top">
              <Td>{report.reason.replace("_", " ")}</Td>
              <Td className="font-mono">
                {report.target_type}:{report.target_id.slice(0, 8)}
              </Td>
              <Td className="max-w-[280px] whitespace-pre-wrap">{report.details ?? "—"}</Td>
              <Td>{report.status}</Td>
              <Td>{new Date(report.created_at).toLocaleDateString()}</Td>
              <Td>
                <select
                  value={report.status}
                  onChange={(event) =>
                    changeStatus(report, event.target.value as ContentReport["status"])
                  }
                  className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] outline-none"
                  aria-label="Report status"
                >
                  <option value="open">Open</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
      {reports.data?.length === 0 && (
        <div className="p-8 text-center text-xs text-muted-foreground">No reports yet.</div>
      )}
    </div>
  );
}

function useCount(table: "profiles" | "products" | "gigs" | "ads" | "interactions") {
  return useQuery({
    queryKey: ["admin-count", table],
    queryFn: async () => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function Overview() {
  const users = useCount("profiles");
  const products = useCount("products");
  const gigs = useCount("gigs");
  const ads = useCount("ads");
  const events = useCount("interactions");

  const stat = [
    {
      label: "Users",
      value: users.data,
      icon: <Users className="h-4 w-4" />,
      tint: "teal" as const,
    },
    {
      label: "Products",
      value: products.data,
      icon: <Package className="h-4 w-4" />,
      tint: "teal" as const,
    },
    {
      label: "Gigs",
      value: gigs.data,
      icon: <Briefcase className="h-4 w-4" />,
      tint: "coral" as const,
    },
    {
      label: "Ads",
      value: ads.data,
      icon: <Megaphone className="h-4 w-4" />,
      tint: "coral" as const,
    },
    {
      label: "Events",
      value: events.data,
      icon: <Activity className="h-4 w-4" />,
      tint: "teal" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stat.map((s) => (
        <div
          key={s.label}
          className={cn(
            "rounded-2xl border p-5",
            s.tint === "teal" ? "border-teal/30 bg-teal/5" : "border-coral/30 bg-coral/5",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 text-[11px] font-semibold tracking-widest",
              s.tint === "teal" ? "text-teal" : "text-coral",
            )}
          >
            {s.icon} {s.label.toUpperCase()}
          </div>
          <div className="mt-2 font-display text-3xl font-black">{s.value ?? "…"}</div>
        </div>
      ))}
    </div>
  );
}

function UsersTable() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone, campus_id, region, verified, banned_at, ban_reason, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  async function toggleVerification(userId: string, verified: boolean) {
    try {
      await setUserVerification(userId, !verified);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(!verified ? "Account verified." : "Verification removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update verification");
    }
  }

  async function toggleBan(userId: string, banned: boolean) {
    const reason = banned ? prompt("Reason for banning this account (optional):") : undefined;
    if (banned && reason === null) return;
    try {
      await setUserBan(userId, !banned, reason ?? undefined);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(banned ? "Account unbanned." : "Account banned and active posts suspended.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update ban status");
    }
  }
  if (isLoading) return <Loading />;
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-surface-elevated text-muted-foreground">
          <tr>
            <Th>Name</Th>
            <Th>Phone</Th>
            <Th>Campus</Th>
            <Th>Region</Th>
            <Th>Verified</Th>
            <Th>Account</Th>
            <Th>Actions</Th>
            <Th>Joined</Th>
          </tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.id} className="border-t border-border/50">
              <Td>{u.full_name ?? "—"}</Td>
              <Td className="font-mono">{u.phone ?? "—"}</Td>
              <Td>{u.campus_id ?? "—"}</Td>
              <Td>{u.region ?? "—"}</Td>
              <Td>{u.verified ? "✓" : "—"}</Td>
              <Td>{u.banned_at ? "Banned" : "Active"}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleVerification(u.id, u.verified)}
                    className={cn(
                      "h-7 w-7 grid place-items-center rounded-full border transition",
                      u.verified ? "border-coral text-coral" : "border-teal text-teal",
                    )}
                    aria-label={u.verified ? "Remove verification" : "Verify account"}
                    title={u.verified ? "Remove verification" : "Verify account"}
                  >
                    {u.verified ? <BadgeCheck className="h-3.5 w-3.5" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => toggleBan(u.id, Boolean(u.banned_at))}
                    className={cn(
                      "h-7 w-7 grid place-items-center rounded-full border transition",
                      u.banned_at ? "border-whatsapp text-whatsapp" : "border-coral text-coral",
                    )}
                    aria-label={u.banned_at ? "Unban account" : "Ban account"}
                    title={u.banned_at ? "Unban account" : "Ban account"}
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Td>
              <Td>{new Date(u.created_at).toLocaleDateString()}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampusesManager() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [id, setId] = useState("");
  const [saving, setSaving] = useState(false);
  const campuses = useQuery({
    queryKey: ["admin-campuses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campuses").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const suggestions = useQuery({
    queryKey: ["admin-campus-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campus_suggestions")
        .select("*")
        .order("use_count", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function addCampus() {
    const campusId = id.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!campusId || !name.trim() || !short.trim()) {
      toast.error("Campus ID, name, and short code are required.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("campuses").insert({
        id: campusId,
        name: name.trim(),
        short: short.trim().toUpperCase(),
      });
      if (error) throw error;
      setId("");
      setName("");
      setShort("");
      qc.invalidateQueries({ queryKey: ["admin-campuses"] });
      toast.success("Campus added to the directory.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add campus");
    } finally {
      setSaving(false);
    }
  }

  async function updateSuggestion(
    suggestion: { id: string; name: string; normalized_name: string; region: string | null },
    status: "approved" | "rejected",
  ) {
    try {
      if (status === "approved") {
        const campusId = suggestion.normalized_name.replace(/[^a-z0-9]+/g, "-").slice(0, 50);
        const { error: insertError } = await supabase.from("campuses").upsert({
          id: campusId,
          name: suggestion.name,
          short: suggestion.name.slice(0, 8).toUpperCase(),
        });
        if (insertError) throw insertError;
      }
      const { error } = await supabase
        .from("campus_suggestions")
        .update({ status })
        .eq("id", suggestion.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-campuses"] });
      qc.invalidateQueries({ queryKey: ["admin-campus-suggestions"] });
      toast.success(status === "approved" ? "Suggestion approved." : "Suggestion rejected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update suggestion");
    }
  }

  async function removeCampus(campusId: string) {
    if (!confirm("Remove this campus? Existing listings using it may prevent deletion.")) return;
    const { error } = await supabase.from("campuses").delete().eq("id", campusId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-campuses"] });
    toast.success("Campus removed.");
  }

  if (campuses.isLoading || suggestions.isLoading) return <Loading />;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-teal/30 bg-teal/5 p-5">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-teal">
          <Plus className="h-4 w-4" /> ADD OFFICIAL CAMPUS
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="University name" className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none" />
          <input value={id} onChange={(event) => setId(event.target.value)} placeholder="campus-id" className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none" />
          <input value={short} onChange={(event) => setShort(event.target.value)} placeholder="SHORT" maxLength={8} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm uppercase outline-none" />
          <button onClick={addCampus} disabled={saving} className="rounded-xl bg-teal px-4 py-2.5 text-xs font-black text-teal-foreground disabled:opacity-60">
            {saving ? "Adding..." : "Add campus"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 bg-surface-elevated px-4 py-3 text-[11px] font-bold tracking-widest text-teal">
          <MapPin className="h-4 w-4" /> OFFICIAL DIRECTORY
        </div>
        <div className="divide-y divide-border/50">
          {(campuses.data ?? []).map((campus) => (
            <div key={campus.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{campus.name}</div><div className="text-[10px] font-mono text-muted-foreground">{campus.id} · {campus.short}</div></div>
              <button onClick={() => removeCampus(campus.id)} className="h-8 w-8 grid place-items-center rounded-full border border-coral text-coral" aria-label="Remove campus" title="Remove campus"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="bg-surface-elevated px-4 py-3 text-[11px] font-bold tracking-widest text-coral">USER SUGGESTIONS</div>
        <div className="divide-y divide-border/50">
          {(suggestions.data ?? []).map((suggestion) => (
            <div key={suggestion.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{suggestion.name}</div><div className="text-[10px] text-muted-foreground">{suggestion.region ?? "No region"} · {suggestion.use_count} uses · {suggestion.status}</div></div>
              {suggestion.status === "pending" && <><button onClick={() => updateSuggestion(suggestion, "approved")} className="h-8 w-8 grid place-items-center rounded-full border border-whatsapp text-whatsapp" aria-label="Approve suggestion" title="Approve suggestion"><Check className="h-3.5 w-3.5" /></button><button onClick={() => updateSuggestion(suggestion, "rejected")} className="h-8 w-8 grid place-items-center rounded-full border border-coral text-coral" aria-label="Reject suggestion" title="Reject suggestion"><X className="h-3.5 w-3.5" /></button></>}
            </div>
          ))}
          {suggestions.data?.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">No campus suggestions.</div>}
        </div>
      </div>
    </div>
  );
}

function ContentTable({ table }: { table: "products" | "gigs" | "ads" }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-content", table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function del(id: string) {
    if (!confirm(`Delete this ${table.slice(0, -1)}?`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted.");
    qc.invalidateQueries({ queryKey: ["admin-content", table] });
    qc.invalidateQueries({ queryKey: ["admin-count", table] });
  }

  if (isLoading) return <Loading />;

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-surface-elevated text-muted-foreground">
          <tr>
            <Th>Title</Th>
            <Th>{table === "products" ? "Price" : table === "gigs" ? "Budget" : "Status"}</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th className="w-10"></Th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => {
            const row = r as Record<string, unknown>;
            const priceOrBudget =
              table === "products"
                ? Number(row.price ?? 0).toLocaleString()
                : table === "gigs"
                  ? String(row.budget ?? "—")
                  : String(row.status ?? "—");
            return (
              <tr key={String(row.id)} className="border-t border-border/50">
                <Td className="max-w-[260px] truncate">{String(row.title)}</Td>
                <Td>{priceOrBudget}</Td>
                <Td>{String(row.status)}</Td>
                <Td>{new Date(String(row.created_at)).toLocaleDateString()}</Td>
                <Td>
                  <button
                    onClick={() => del(String(row.id))}
                    className="h-7 w-7 grid place-items-center rounded-full bg-coral/10 text-coral hover:bg-coral/20 transition"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ActivityTable() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interactions")
        .select("event, item_type, category, weight, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
  if (isLoading) return <Loading />;
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-surface-elevated text-muted-foreground">
          <tr>
            <Th>Event</Th>
            <Th>Type</Th>
            <Th>Category</Th>
            <Th>Weight</Th>
            <Th>When</Th>
          </tr>
        </thead>
        <tbody>
          {data.map((e, i) => (
            <tr key={i} className="border-t border-border/50">
              <Td className="font-mono">{e.event}</Td>
              <Td>{e.item_type}</Td>
              <Td>{e.category ?? "—"}</Td>
              <Td>{e.weight}</Td>
              <Td>{new Date(e.created_at).toLocaleString()}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "text-left px-3 py-2 text-[10px] uppercase tracking-widest font-semibold",
        className,
      )}
    >
      {children}
    </th>
  );
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2", className)}>{children}</td>;
}
function Loading() {
  return (
    <div className="grid place-items-center py-16 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}
