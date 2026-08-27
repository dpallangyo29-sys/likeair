import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getBusinessProfile, requireBusinessAccess } from "@/lib/business";

export const Route = createFileRoute("/_authenticated/business/profile")({ beforeLoad: requireBusinessAccess, head: () => ({ meta: [{ title: "LikeAir Business Profile" }] }), component: BusinessProfilePage });

function BusinessProfilePage() {
  const { user } = useAuth();
  const business = useQuery({ queryKey: ["business-profile", user?.id], enabled: !!user?.id, queryFn: () => getBusinessProfile(user!.id) });
  const profile = business.data;
  return <main className="min-h-screen bg-background px-5 py-8 text-foreground"><div className="mx-auto max-w-xl"><a href="/business/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal"><ArrowLeft className="h-3.5 w-3.5" /> Dashboard</a>{profile && <div className="mt-8 rounded-3xl border border-border bg-surface p-6"><div className="flex items-center gap-2 text-teal"><BadgeCheck className="h-5 w-5" /><span className="text-[11px] font-bold tracking-[0.18em]">LIKEAIR BUSINESS VERIFIED</span></div><h1 className="mt-5 font-display text-3xl font-black">{profile.business_name}</h1><div className="mt-6 space-y-4">{[ ["Category", profile.category], ["Location", profile.location], ["Phone", profile.phone], ["What we offer", profile.offer] ].map(([label, value]) => <div key={label}><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>)}{profile.description && <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</div><p className="mt-1 text-sm leading-relaxed">{profile.description}</p></div>}</div><p className="mt-7 border-t border-border pt-4 text-xs text-muted-foreground">This badge means LikeAir has reviewed this business.</p></div>}</div></main>;
}
