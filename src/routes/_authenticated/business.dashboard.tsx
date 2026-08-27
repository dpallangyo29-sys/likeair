import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, CreditCard, Megaphone, Store, WalletCards } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getBusinessPayments, getBusinessProfile, getBusinessPromotions, requireBusinessAccess } from "@/lib/business";

export const Route = createFileRoute("/_authenticated/business/dashboard")({
  beforeLoad: requireBusinessAccess,
  head: () => ({ meta: [{ title: "LikeAir Business Dashboard" }] }),
  component: BusinessDashboard,
});

function BusinessDashboard() {
  const { user } = useAuth();
  const business = useQuery({ queryKey: ["business-profile", user?.id], enabled: !!user?.id, queryFn: () => getBusinessProfile(user!.id) });
  const promotions = useQuery({ queryKey: ["business-promotions", business.data?.id], enabled: !!business.data?.id, queryFn: () => getBusinessPromotions(business.data!.id) });
  const payments = useQuery({ queryKey: ["business-payments", business.data?.id], enabled: !!business.data?.id, queryFn: () => getBusinessPayments(business.data!.id) });
  const profile = business.data;
  if (!profile) return <div className="min-h-screen bg-background p-8 text-sm text-muted-foreground">Loading LikeAir Business...</div>;

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto max-w-3xl">
        <BusinessHeader />
        <section className="mt-7 rounded-3xl border border-teal/30 bg-gradient-to-br from-teal/10 via-surface to-surface p-6">
          <div className="flex items-center gap-2 text-teal"><BadgeCheck className="h-5 w-5" /><span className="text-[11px] font-bold tracking-[0.18em]">LIKEAIR BUSINESS VERIFIED</span></div>
          <h1 className="mt-3 font-display text-3xl font-black">Welcome, {profile.business_name}</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Get more people to discover what you offer, with simple promotions reviewed by LikeAir.</p>
          <a href="/business/promotions/new" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-teal px-5 py-3 text-sm font-black text-teal-foreground glow-teal"><Megaphone className="h-4 w-4" /> Promote Something</a>
        </section>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Summary label="Promotions" value={promotions.data?.length ?? 0} icon={<Megaphone />} />
          <Summary label="Payments" value={payments.data?.length ?? 0} icon={<CreditCard />} />
          <Summary label="Location" value={profile.location} icon={<Store />} />
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <PortalLink href="/business/promotions" icon={<Megaphone />} title="My Promotions" text="See waiting, approved and finished promotions." />
          <PortalLink href="/business/payments" icon={<WalletCards />} title="Payments" text="View pending payments, history and receipts." />
          <PortalLink href="/business/profile" icon={<Store />} title="Business Profile" text="Manage your reviewed business details." />
        </div>
      </div>
    </main>
  );
}

function BusinessHeader() { return <div className="flex items-center justify-between"><a href="/business" className="text-xs text-muted-foreground hover:text-teal">← LikeAir Business</a><a href="/" className="text-xs text-muted-foreground hover:text-teal">Back to LikeAir</a></div>; }
function Summary({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) { return <div className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-center gap-2 text-teal [&>svg]:h-4 [&>svg]:w-4">{icon}<span className="text-[10px] font-bold tracking-widest">{label.toUpperCase()}</span></div><div className="mt-3 truncate font-display text-xl font-black">{value}</div></div>; }
function PortalLink({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) { return <a href={href} className="group rounded-2xl border border-border bg-surface p-5 hover:border-teal/50"><div className="text-teal [&>svg]:h-5 [&>svg]:w-5">{icon}</div><div className="mt-3 flex items-center justify-between text-sm font-bold">{title}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></a>; }
