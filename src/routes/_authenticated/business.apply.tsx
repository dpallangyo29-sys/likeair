import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, Building2, Clock3, Loader2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { TZ_REGIONS } from "@/lib/regions";
import { submitBusinessApplication } from "@/lib/business";
import { normalizePhoneTZ } from "@/lib/phone";
import { fetchCampuses } from "@/lib/feed";

export const Route = createFileRoute("/_authenticated/business/apply")({
  head: () => ({ meta: [{ title: "Get LikeAir Business Access" }] }),
  component: BusinessApplicationPage,
});

function BusinessApplicationPage() {
  const [started, setStarted] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [offer, setOffer] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [locationMode, setLocationMode] = useState<"campus" | "region" | "custom">("region");
  const { data: campuses = [] } = useQuery({ queryKey: ["campuses"], queryFn: fetchCampuses });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedPhone = normalizePhoneTZ(phone);
    if (!normalizedPhone) {
      toast.error("Phone must be like 07XXXXXXXX or +2557XXXXXXXX");
      return;
    }
    setSaving(true);
    try {
      await submitBusinessApplication({ businessName, offer, category, location, phone: normalizedPhone, description });
      toast.success("Your business application is being reviewed.");
      window.location.href = "/business/pending";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit application");
    } finally {
      setSaving(false);
    }
  }

  if (!started) {
    return (
      <main className="min-h-screen bg-background px-5 py-8 text-foreground">
        <div className="mx-auto max-w-xl">
          <a href="/business" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal">
            <ArrowLeft className="h-3.5 w-3.5" /> LikeAir Business
          </a>
          <div className="mt-16 rounded-3xl border border-border bg-surface p-6">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal/10 text-teal">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="mt-6 text-[11px] font-bold tracking-[0.18em] text-teal">GET BUSINESS ACCESS</div>
            <h1 className="mt-2 font-display text-3xl font-black">A separate space for your business</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              LikeAir Business helps you promote your products, services and offers. Your normal LikeAir account stays the same.
            </p>
            <div className="mt-6 space-y-3 border-t border-border pt-5">
              <InfoRow icon={<ShieldCheck />} text="LikeAir reviews every business before access is approved." />
              <InfoRow icon={<BadgeCheck />} text="Approved businesses receive a reviewed LikeAir Business identity." />
              <InfoRow icon={<Clock3 />} text="After you apply, an administrator will review your details." />
            </div>
            <button onClick={() => setStarted(true)} className="mt-7 w-full rounded-2xl bg-teal py-3 text-sm font-black text-teal-foreground glow-teal">
              Proceed to Application
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto max-w-xl">
        <a href="/business" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal">
          <ArrowLeft className="h-3.5 w-3.5" /> LikeAir Business
        </a>
        <div className="mt-7">
          <div className="text-[11px] font-bold tracking-[0.18em] text-teal">BUSINESS ACCESS</div>
          <h1 className="mt-2 font-display text-3xl font-black">Tell us about your business</h1>
          <p className="mt-2 text-sm text-muted-foreground">A LikeAir administrator will review your details before access is approved.</p>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-border bg-surface p-5">
          <Field label="Business name" value={businessName} onChange={setBusinessName} placeholder="e.g. Aura Bites" required />
          <Field label="What do you offer?" value={offer} onChange={setOffer} placeholder="Products, services, gigs or something else" required />
          <Field label="Category" value={category} onChange={setCategory} placeholder="Food, fashion, tutoring, electronics..." required />
          <LocationField mode={locationMode} value={location} campuses={campuses} onModeChange={(mode) => { setLocationMode(mode); setLocation(""); }} onChange={setLocation} />
          <Field label="Phone" value={phone} onChange={setPhone} placeholder="0712 000 000" required type="tel" />
          <label className="block text-xs font-semibold">
            <span className="mb-1 block text-muted-foreground">Short description (optional)</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Tell us anything useful for a quick review" className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal" />
          </label>
          <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal py-3 text-sm font-black text-teal-foreground glow-teal disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {saving ? "Sending..." : "Submit for Verification"}
          </button>
        </form>
      </div>
    </main>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-start gap-3 text-xs text-muted-foreground"><span className="mt-0.5 text-teal [&>svg]:h-4 [&>svg]:w-4">{icon}</span><span>{text}</span></div>;
}

function LocationField({ mode, value, campuses, onModeChange, onChange }: { mode: "campus" | "region" | "custom"; value: string; campuses: { id: string; name: string; short: string }[]; onModeChange: (mode: "campus" | "region" | "custom") => void; onChange: (value: string) => void }) {
  return <div className="block text-xs font-semibold"><span className="mb-2 block text-muted-foreground">Business location</span><div className="grid grid-cols-3 gap-2">{([["campus", "Campus"], ["region", "Region"], ["custom", "Type it"]] as const).map(([key, label]) => <button type="button" key={key} onClick={() => onModeChange(key)} className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${mode === key ? "border-teal bg-teal text-teal-foreground" : "border-border bg-background text-muted-foreground hover:border-teal/50"}`}>{label}</button>)}</div>{mode === "campus" && <select value={value} onChange={(event) => onChange(event.target.value)} required className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal"><option value="">Choose campus...</option>{campuses.map((campus) => <option key={campus.id} value={campus.name}>{campus.name}</option>)}</select>}{mode === "region" && <select value={value} onChange={(event) => onChange(event.target.value)} required className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal"><option value="">Choose region...</option>{TZ_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}</select>}{mode === "custom" && <input required value={value} onChange={(event) => onChange(event.target.value)} placeholder="Type city, campus or area" className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal" />}</div>;
}

function Field({ label, value, onChange, placeholder, required = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; type?: string }) {
  return (
    <label className="block text-xs font-semibold">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal" />
    </label>
  );
}
