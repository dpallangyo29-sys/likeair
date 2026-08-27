import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Clock3, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getBusinessProfile, getLatestBusinessApplication } from "@/lib/business";

export const Route = createFileRoute("/_authenticated/business")({
  head: () => ({
    meta: [
      { title: "LikeAir Business" },
      { name: "description", content: "Promote your business, products, advertisements or services on LikeAir." },
    ],
  }),
  component: BusinessGateway,
});

function BusinessGateway() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { user } = useAuth();
  const profile = useQuery({
    queryKey: ["business-profile", user?.id],
    enabled: !!user?.id,
    queryFn: () => getBusinessProfile(user!.id),
  });
  const application = useQuery({
    queryKey: ["business-application", user?.id],
    enabled: !!user?.id && !profile.data,
    queryFn: () => getLatestBusinessApplication(user!.id),
  });

  if (pathname !== "/business") return <Outlet />;

  const business = profile.data;
  const pending = application.data;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background px-5 py-8 text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[460px] w-[460px] rounded-full bg-teal/20 blur-[130px]" />
        <div className="absolute bottom-0 -right-40 h-[460px] w-[460px] rounded-full bg-coral/20 blur-[130px]" />
      </div>
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-xs text-muted-foreground hover:text-teal">← Back to LikeAir</Link>
        <div className="mt-8 rounded-3xl border border-border bg-gradient-to-br from-surface via-surface-elevated to-surface p-6">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-teal">
            <BriefcaseBusiness className="h-4 w-4" /> LIKEAIR BUSINESS
          </div>
          <h1 className="mt-3 font-display text-3xl font-black leading-tight">
            {business ? `Welcome, ${business.business_name}` : "Grow what you do."}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Promote your business, products, advertisements or services on LikeAir.
          </p>

          {business ? (
            <Link to="/business/dashboard" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-teal px-5 py-3 text-sm font-black text-teal-foreground glow-teal">
              Enter LikeAir Business <ArrowRight className="h-4 w-4" />
            </Link>
          ) : pending ? (
            <Link to="/business/pending" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-coral px-5 py-3 text-sm font-black text-coral-foreground glow-coral">
              <Clock3 className="h-4 w-4" /> View application status
            </Link>
          ) : (
            <Link to="/business/apply" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-teal px-5 py-3 text-sm font-black text-teal-foreground glow-teal">
              Get Business Access <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Feature icon={<ShieldCheck />} title="Reviewed access" text="Every business is checked by LikeAir staff." />
          <Feature icon={<BriefcaseBusiness />} title="Simple promotions" text="Choose what to promote and your budget." />
          <Feature icon={<BadgeCheck />} title="Business identity" text="Approved businesses receive a clear badge." />
        </div>
      </div>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-teal [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <div className="mt-3 text-sm font-bold">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
