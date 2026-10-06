import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { TZ_REGIONS } from "@/lib/regions";
import { fetchCampuses } from "@/lib/feed";
import {
  createBusinessPromotion,
  formatDuration,
  requireBusinessAccess,
  uploadBusinessImage,
} from "@/lib/business";

export const Route = createFileRoute("/_authenticated/business/promotions/new")({
  beforeLoad: requireBusinessAccess,
  head: () => ({ meta: [{ title: "Promote Something on LikeAirGo" }] }),
  component: NewPromotionPage,
});

function NewPromotionPage() {
  const [contentType, setContentType] = useState("product");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [durationDays, setDurationDays] = useState<1 | 3 | 7>(3);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const durationHours = durationDays * 24;
  const { data: campuses = [] } = useQuery({
    queryKey: ["campuses"],
    queryFn: fetchCampuses,
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const imageUrl = file ? await uploadBusinessImage(file) : undefined;
      await createBusinessPromotion({
        contentType,
        title,
        message,
        category,
        location,
        durationDays,
        imageUrl,
      });
      toast.success("Your free promotion is live.");
      window.location.href = "/business/promotions";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create promotion");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground">
      <div className="mx-auto max-w-xl">
        <a
          href="/business/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </a>
        <div className="mt-7">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-teal">
            <Megaphone className="h-4 w-4" /> PROMOTE SOMETHING
          </div>
          <h1 className="mt-2 font-display text-3xl font-black">Help people discover it</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose what you want people to see, where it should appear, and how long it should run.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="mt-6 space-y-5 rounded-3xl border border-border bg-surface p-5"
        >
          <div className="rounded-xl border border-coral/30 bg-coral/5 p-3 text-xs text-coral">
            Business promotions are free. Your promotion will appear in the selected area for its
            chosen duration. We do not yet provide view or click reports.
          </div>
          <section>
            <Label text="What do you want people to see?" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["product", "Product"],
                ["service", "Service"],
                ["business", "Business"],
                ["special_offer", "Special offer"],
                ["gig", "Gig"],
                ["custom", "Other"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setContentType(value)}
                  className={`rounded-xl border px-3 py-3 text-xs font-bold transition ${contentType === value ? "border-teal bg-teal text-teal-foreground" : "border-border bg-background text-muted-foreground hover:border-teal/50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
          <Field
            label="What should people see?"
            value={title}
            onChange={setTitle}
            placeholder="Weekend offer, tutoring service, new product..."
            required
          />
          <Field
            label="Simple message"
            value={message}
            onChange={setMessage}
            placeholder="Special offer this week..."
            textarea
          />
          <Field
            label="Category"
            value={category}
            onChange={setCategory}
            placeholder="Food, electronics, fashion..."
            required
          />
          <label className="block text-xs font-semibold">
            <span className="mb-1 block text-muted-foreground">University, region, or country</span>
            <input
              list="promotion-locations"
              value={location}
              onChange={(event) => setLocation(event.currentTarget.value)}
              placeholder="Type or choose a university, region, or Tanzania"
              required
              maxLength={120}
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal"
            />
            <datalist id="promotion-locations">
              <option value="Tanzania" />
              {TZ_REGIONS.map((region) => (
                <option key={region} value={region} />
              ))}
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.name} />
              ))}
            </datalist>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              Type a university name or choose a suggestion. Use the campus name shown in LikeAirGo
              so students at that campus can find it.
            </span>
          </label>
          <label className="block text-xs font-semibold">
            <span className="mb-1 block text-muted-foreground">Photo (optional)</span>
            <span className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-sm text-muted-foreground hover:border-teal">
              <ImagePlus className="h-4 w-4" />
              {file?.name || "Add a photo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </span>
          </label>
          <label className="block text-xs font-semibold">
            <span className="mb-1 block text-muted-foreground">Promotion duration</span>
            <select
              value={durationDays}
              onChange={(event) =>
                setDurationDays(event.target.value === "1" ? 1 : event.target.value === "7" ? 7 : 3)
              }
              className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
            </select>
          </label>
          <div className="rounded-2xl border border-teal/30 bg-teal/5 p-4">
            <div className="text-[10px] font-bold tracking-widest text-teal">FREE PROMOTION</div>
            <p className="mt-2 text-sm font-bold">
              {formatDuration(durationHours)} in the selected location
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Your promotion is clearly labeled and rotated with other matching promotions. Reach is
              not guaranteed, and LikeAirGo does not yet measure or report views or clicks.
            </p>
          </div>
          <button
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal py-3 text-sm font-black text-teal-foreground glow-teal disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Publishing..." : "Publish free promotion"}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            No payment is requested. Your promotion starts immediately and ends after the selected
            duration.
          </p>
        </form>
      </div>
    </main>
  );
}

function Label({ text }: { text: string }) {
  return <div className="mb-2 text-xs font-semibold text-muted-foreground">{text}</div>;
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <label className="block text-xs font-semibold">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          placeholder={placeholder}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal"
        />
      ) : (
        <input
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:border-teal"
        />
      )}
    </label>
  );
}
