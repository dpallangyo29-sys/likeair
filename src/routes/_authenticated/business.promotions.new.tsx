import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { TZ_REGIONS } from "@/lib/regions";
import { createBusinessPromotion, estimatePromotionDurationHours, estimatePromotionStrength, formatDuration, requireBusinessAccess, uploadBusinessImage } from "@/lib/business";

export const Route = createFileRoute("/_authenticated/business/promotions/new")({ beforeLoad: requireBusinessAccess, head: () => ({ meta: [{ title: "Promote Something on LikeAir" }] }), component: NewPromotionPage });

function NewPromotionPage() {
  const [contentType, setContentType] = useState("product");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState(2000);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const durationHours = estimatePromotionDurationHours(Number(budget) || 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!Number.isFinite(budget) || budget < 100) {
      toast.error("Enter at least TZS 100.");
      return;
    }
    setSaving(true);
    try {
      const imageUrl = file ? await uploadBusinessImage(file) : undefined;
      await createBusinessPromotion({ contentType, title, message, category, location, budgetAmount: budget, imageUrl });
      toast.success("Promotion created. Waiting for payment.");
      window.location.href = "/business/payments";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create promotion");
    } finally {
      setSaving(false);
    }
  }

  return <main className="min-h-screen bg-background px-5 py-8 text-foreground"><div className="mx-auto max-w-xl"><a href="/business/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal"><ArrowLeft className="h-3.5 w-3.5" /> Dashboard</a><div className="mt-7"><div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-teal"><Megaphone className="h-4 w-4" /> PROMOTE SOMETHING</div><h1 className="mt-2 font-display text-3xl font-black">Help people discover it</h1><p className="mt-2 text-sm text-muted-foreground">Keep it simple. Choose what you want people to see, your location and any budget.</p></div><form onSubmit={submit} className="mt-6 space-y-5 rounded-3xl border border-border bg-surface p-5"><section><Label text="What do you want people to see?" /><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[ ["product", "Product"], ["service", "Service"], ["business", "Business"], ["special_offer", "Special offer"], ["gig", "Gig"], ["custom", "Other"] ].map(([value, label]) => <button type="button" key={value} onClick={() => setContentType(value)} className={`rounded-xl border px-3 py-3 text-xs font-bold transition ${contentType === value ? "border-teal bg-teal text-teal-foreground" : "border-border bg-background text-muted-foreground hover:border-teal/50"}`}>{label}</button>)}</div></section><Field label="What should people see?" value={title} onChange={setTitle} placeholder="Weekend offer, tutoring service, new product..." required /><Field label="Simple message" value={message} onChange={setMessage} placeholder="Special offer this week..." textarea /><Field label="Category" value={category} onChange={setCategory} placeholder="Food, electronics, fashion..." required /><label className="block text-xs font-semibold"><span className="mb-1 block text-muted-foreground">Who should see this?</span><select value={location} onChange={(event) => setLocation(event.target.value)} required className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal"><option value="">Choose location...</option><option value="Tanzania">Across Tanzania</option>{TZ_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}</select></label><label className="block text-xs font-semibold"><span className="mb-1 block text-muted-foreground">Photo (optional)</span><span className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground hover:border-teal"><ImagePlus className="h-4 w-4" />{file?.name || "Add a photo"}<input type="file" accept="image/*" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} /></span></label><div><Label text="How much would you like to spend?" /><div className="mt-1 flex items-center rounded-xl border border-teal/50 bg-background px-3 py-3"><span className="mr-2 text-sm font-bold text-teal">TZS</span><input type="number" min="100" step="1" value={budget} onChange={(event) => setBudget(Number(event.target.value))} className="w-full bg-transparent text-lg font-black outline-none" /></div><p className="mt-1 text-[11px] text-muted-foreground">You can enter any valid amount.</p></div><div className="rounded-2xl border border-teal/30 bg-teal/5 p-4"><div className="text-[10px] font-bold tracking-widest text-teal">YOUR PROMOTION ESTIMATE</div><div className="mt-3 grid grid-cols-2 gap-3"><Estimate label="Estimated duration" value={`About ${formatDuration(durationHours)}`} /><Estimate label="Promotion strength" value={estimatePromotionStrength(Number(budget) || 0)} /></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Your promotion receives greater priority in relevant LikeAir discovery. This does not guarantee views, clicks or sales.</p></div><button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal py-3 text-sm font-black text-teal-foreground glow-teal disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Creating..." : "Continue to Payment"}</button><p className="text-center text-[11px] text-muted-foreground">Payment is required before admin review. The promotion will not appear publicly until approved.</p></form></div></main>;
}

function Label({ text }: { text: string }) { return <div className="mb-2 text-xs font-semibold text-muted-foreground">{text}</div>; }
function Field({ label, value, onChange, placeholder, required = false, textarea = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; textarea?: boolean }) { return <label className="block text-xs font-semibold"><span className="mb-1 block text-muted-foreground">{label}</span>{textarea ? <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={4} placeholder={placeholder} className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal" /> : <input required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal" />}</label>; }
function Estimate({ label, value }: { label: string; value: string }) { return <div><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-1 text-sm font-black">{value}</div></div>; }
