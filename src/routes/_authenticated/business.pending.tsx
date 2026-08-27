import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock3, Info, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getBusinessProfile, getLatestBusinessApplication } from "@/lib/business";

export const Route = createFileRoute("/_authenticated/business/pending")({
  head: () => ({ meta: [{ title: "LikeAir Business Application" }] }),
  component: BusinessPendingPage,
});

function BusinessPendingPage() {
  const { user } = useAuth();
  const application = useQuery({ queryKey: ["business-application", user?.id], enabled: !!user?.id, queryFn: () => getLatestBusinessApplication(user!.id) });
  const profile = useQuery({ queryKey: ["business-profile", user?.id], enabled: !!user?.id, queryFn: () => getBusinessProfile(user!.id) });
  const status = application.data?.status;

  if (profile.data) return <StatusShell icon={<CheckCircle2 />} title="Your LikeAir Business access has been approved." text="Your business identity is ready." action="Enter LikeAir Business" href="/business/dashboard" />;
  if (!application.data) return <StatusShell icon={<Info />} title="No application yet" text="Tell us about your business to request access." action="Get Business Access" href="/business/apply" />;
  if (status === "rejected") return <StatusShell icon={<XCircle />} title="Your application was not approved" text={application.data.admin_note || "You can review your details and apply again."} action="Apply again" href="/business/apply" />;
  if (status === "more_information") return <StatusShell icon={<Info />} title="More information is needed" text={application.data.admin_note || "Please review your application and submit the missing details."} action="Update application" href="/business/apply" />;
  return <StatusShell icon={<Clock3 />} title="Your business application is being reviewed." text="An authorized LikeAir administrator will review it before business access is granted." action="Back to Business" href="/business" />;
}

function StatusShell({ icon, title, text, action, href }: { icon: React.ReactNode; title: string; text: string; action: string; href: string }) {
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto max-w-xl">
        <a href="/business" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal"><ArrowLeft className="h-3.5 w-3.5" /> LikeAir Business</a>
        <div className="mt-20 rounded-3xl border border-border bg-surface p-7 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal/10 text-teal [&>svg]:h-7 [&>svg]:w-7">{icon}</div>
          <h1 className="mt-5 font-display text-2xl font-black">{title}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{text}</p>
          <a href={href} className="mt-6 inline-flex rounded-2xl bg-teal px-5 py-3 text-sm font-black text-teal-foreground">{action}</a>
        </div>
      </div>
    </main>
  );
}
