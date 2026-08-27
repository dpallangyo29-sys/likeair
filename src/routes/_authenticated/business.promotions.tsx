import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Megaphone, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getBusinessProfile, getBusinessPromotions, requireBusinessAccess, formatDuration } from "@/lib/business";

export const Route = createFileRoute("/_authenticated/business/promotions")({ beforeLoad: requireBusinessAccess, head: () => ({ meta: [{ title: "My LikeAir Promotions" }] }), component: PromotionsPage });

function PromotionsPage() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { user } = useAuth();
  const business = useQuery({ queryKey: ["business-profile", user?.id], enabled: !!user?.id, queryFn: () => getBusinessProfile(user!.id) });
  const promotions = useQuery({ queryKey: ["business-promotions", business.data?.id], enabled: !!business.data?.id, queryFn: () => getBusinessPromotions(business.data!.id) });
  if (pathname !== "/business/promotions") return <Outlet />;

  return <main className="min-h-screen bg-background px-5 py-8 text-foreground"><div className="mx-auto max-w-3xl"><a href="/business/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal"><ArrowLeft className="h-3.5 w-3.5" /> Dashboard</a><div className="mt-7 flex items-end justify-between gap-3"><div><div className="text-[11px] font-bold tracking-[0.18em] text-teal">PROMOTIONS</div><h1 className="mt-2 font-display text-3xl font-black">My Promotions</h1></div><a href="/business/promotions/new" className="inline-flex items-center gap-1.5 rounded-xl bg-teal px-3 py-2 text-xs font-black text-teal-foreground"><Plus className="h-4 w-4" /> Promote</a></div><div className="mt-6 space-y-3">{promotions.data?.map((promotion) => <div key={promotion.id} className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-bold"><Megaphone className="h-4 w-4 text-teal" />{promotion.title}</div><div className="mt-1 text-xs text-muted-foreground">{promotion.category} · {promotion.location}</div></div><Status value={promotion.status} /></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><Metric label="Budget" value={`TZS ${promotion.budget_amount.toLocaleString()}`} /><Metric label="Duration" value={formatDuration(promotion.duration_hours)} /><Metric label="Balance" value={`TZS ${promotion.remaining_balance.toLocaleString()}`} /></div></div>)}{promotions.data?.length === 0 && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">You have no promotions yet.</div>}</div></div></main>;
}
function Status({ value }: { value: string }) { return <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[10px] font-bold capitalize text-teal">{value.replaceAll("_", " ")}</span>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-background p-3"><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-1 font-bold">{value}</div></div>; }
