import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Package,
  Briefcase,
  Upload,
  Sparkles,
  X,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchCampuses } from "@/lib/feed";
import { postableProductCategories, postableGigCategories } from "@/lib/categories";
import { FEATURES } from "@/lib/features";
import { cn } from "@/lib/utils";
import { normalizePhoneTZ } from "@/lib/phone";
import { TZ_REGIONS } from "@/lib/regions";
import { VideoUpload } from "@/components/likeair/VideoUpload";

export const Route = createFileRoute("/_authenticated/post")({
  head: () => ({
    meta: [
      { title: "Post to LikeAir" },
      { name: "description", content: "Post a product, gig, or ad to LikeAir." },
      { property: "og:title", content: "Post to LikeAir" },
      { property: "og:description", content: "Reach students on your campus in minutes." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PostPage,
});

type PostKind = "product" | "gig";

function PostPage() {
  const [kind, setKind] = useState<PostKind>("product");
  const [termsOk, setTermsOk] = useState<boolean | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setTermsOk(true);
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("terms_accepted_at")
        .eq("id", data.user.id)
        .maybeSingle();
      setTermsOk(!!p?.terms_accepted_at);
    });
  }, []);

  async function acceptTerms() {
    setAccepting(true);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq("id", data.user.id);
    }
    setTermsOk(true);
    setAccepting(false);
  }

  if (termsOk === false) {
    return (
      <div className="relative min-h-screen bg-background text-foreground grid place-items-center px-5">
        <div className="max-w-md w-full rounded-2xl border border-border bg-surface p-6 text-center space-y-4">
          <ShieldCheck className="h-8 w-8 mx-auto text-teal" />
          <h1 className="font-display text-2xl font-black">One quick thing</h1>
          <p className="text-sm text-muted-foreground">
            Before posting, please accept LikeAir's{" "}
            <Link to="/terms" className="text-teal underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-teal underline">
              Privacy Policy
            </Link>
            .
          </p>
          <button
            disabled={accepting}
            onClick={acceptTerms}
            className="w-full rounded-2xl bg-teal text-teal-foreground py-3 text-sm font-black glow-teal disabled:opacity-60"
          >
            {accepting ? "Saving…" : "I agree — continue"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden pb-16">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-teal/12 blur-[120px]" />
        <div className="absolute bottom-0 -right-40 h-[500px] w-[500px] rounded-full bg-coral/12 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-2xl px-5 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
        </Link>

        <div className="mt-6">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-teal">
            <Sparkles className="h-3 w-3" />
            POST CENTER
          </div>
          <h1 className="mt-1 font-display text-3xl font-black">What are you posting?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a type — posting is free while we grow.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <KindTile
            active={kind === "product"}
            onClick={() => setKind("product")}
            icon={<Package className="h-4 w-4" />}
            label="Product"
            tint="teal"
          />
          <KindTile
            active={kind === "gig"}
            onClick={() => setKind("gig")}
            icon={<Briefcase className="h-4 w-4" />}
            label="Gig"
            tint="coral"
          />
        </div>

        <div className="mt-6">
          {kind === "product" && <ProductForm />}
          {kind === "gig" && <GigForm />}
        </div>
      </div>
    </div>
  );
}

function KindTile({
  active,
  onClick,
  icon,
  label,
  tint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  tint: "teal" | "coral" | "whatsapp";
}) {
  const activeCls =
    tint === "teal"
      ? "bg-teal text-teal-foreground glow-teal"
      : tint === "coral"
        ? "bg-coral text-coral-foreground glow-coral"
        : "bg-whatsapp text-whatsapp-foreground";
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 flex flex-col items-center gap-2 text-xs font-bold transition",
        active
          ? activeCls + " border-transparent"
          : "bg-surface border-border text-muted-foreground hover:border-teal/40",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

async function uploadMedia(bucket: "listings" | "ads", file: File | Blob, extension: string) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Not signed in");
  const mediaType = file.type || (extension === "webm" ? "video/webm" : "image/jpeg");
  const maxBytes = mediaType.startsWith("video/") ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
  if (!mediaType.startsWith("image/") && !mediaType.startsWith("video/")) {
    throw new Error("Only image and video files are supported");
  }
  if (file.size > maxBytes) {
    throw new Error(
      `${mediaType.startsWith("video/") ? "Video" : "Image"} is too large (maximum ${mediaType.startsWith("video/") ? "500MB" : "10MB"})`,
    );
  }
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${uid}/${crypto.randomUUID()}.${safeExtension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: mediaType,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function uploadImage(bucket: "listings" | "ads", file: File) {
  const extension = file.name.split(".").pop() || "jpg";
  return uploadMedia(bucket, file, extension);
}

function describeSubmissionError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const value = error as { message?: string; details?: string; hint?: string; code?: string };
    return (
      [value.message, value.details, value.hint, value.code ? `code ${value.code}` : undefined]
        .filter(Boolean)
        .join(" | ") || JSON.stringify(error)
    );
  }
  return String(error);
}

function CampusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data = [] } = useQuery({ queryKey: ["campuses"], queryFn: fetchCampuses });
  const isCustom = value.startsWith("custom:");
  const customName = isCustom ? value.slice("custom:".length) : "";
  return (
    <div className="space-y-2">
      <select
        value={isCustom ? "__custom__" : value}
        onChange={(e) => onChange(e.target.value === "__custom__" ? "custom:" : e.target.value)}
        className="w-full bg-transparent text-sm outline-none"
      >
        <option value="">Choose campus…</option>
        {data.map((c) => (
          <option key={c.id} value={c.id} className="bg-surface">
            {c.name}
          </option>
        ))}
        <option value="__custom__" className="bg-surface">
          Other campus — type it below
        </option>
      </select>
      {isCustom && (
        <input
          autoFocus
          value={customName}
          onChange={(e) => onChange(`custom:${e.target.value}`)}
          placeholder="Type your campus name"
          className="w-full bg-transparent text-sm outline-none border-t border-border pt-2"
        />
      )}
    </div>
  );
}

function campusValues(value: string) {
  return value.startsWith("custom:")
    ? { campus_id: null, campus_name: value.slice("custom:".length).trim() || null }
    : { campus_id: value || null, campus_name: null };
}

async function submitCampusSuggestion(value: string, region: string) {
  if (!value.startsWith("custom:")) return;
  const name = value.slice("custom:".length).trim();
  if (!name) return;
  const { error } = await supabase.rpc("submit_campus_suggestion", {
    suggestion_name: name,
    suggestion_region: region || undefined,
  });
  if (error) console.warn("Campus suggestion was not recorded", error);
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="rounded-xl bg-surface border border-border px-3 py-2.5 focus-within:border-teal/60 transition">
        {children}
      </div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground/70">{hint}</div>}
    </label>
  );
}

function ImagePicker({
  file,
  onChange,
  label = "Photo",
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  label?: string;
}) {
  const url = file ? URL.createObjectURL(file) : null;
  return (
    <label className="block cursor-pointer">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="relative rounded-2xl border-2 border-dashed border-border bg-surface aspect-[4/5] max-w-[220px] overflow-hidden flex items-center justify-center hover:border-teal/60 transition">
        {url ? (
          <>
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange(null);
              }}
              className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-full bg-background/70 backdrop-blur"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="text-center text-xs text-muted-foreground p-4">
            <Upload className="h-5 w-5 mx-auto mb-2" />
            Tap to upload
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </div>
    </label>
  );
}

function ProductForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("food");
  const [campusId, setCampusId] = useState("");
  const [region, setRegion] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange(f: File | null) {
    setFile(f);
  }

  async function submit(e: React.FormEvent, status: "active" | "draft" = "active") {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");

      let image_url: string | null = null;
      if (file) image_url = await uploadImage("listings", file);
      const campus = campusValues(campusId);
      const normalizedWa = whatsapp ? normalizePhoneTZ(whatsapp) : null;
      if (whatsapp && !normalizedWa) {
        toast.error("WhatsApp must be like 07XXXXXXXX or +2557XXXXXXXX");
        setLoading(false);
        return;
      }
      const { error } = await supabase.from("products").insert({
        seller_id: uid,
        title,
        description: description || null,
        price: price ? Number(price) : 0,
        category,
        ...campus,
        region: region || null,
        image_url,
        whatsapp: normalizedWa,
        status,
      });
      if (error) throw error;
      await submitCampusSuggestion(campusId, region);
      toast.success(
        status === "draft"
          ? "Saved to drafts — publish it any time from your profile."
          : "Product posted! Live on the feed.",
      );
      navigate({ to: status === "draft" ? "/profile" : "/" });
    } catch (err) {
      console.error("Ad submission failed", err);
      toast.error(describeSubmissionError(err) || "Failed to post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <ImagePicker file={file} onChange={handleFileChange} />
      <Field label="Title">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Vintage denim jacket"
          className="w-full bg-transparent text-sm outline-none"
        />
      </Field>
      <Field label="Price (TZS) — optional" hint="Leave blank if it's negotiable or free.">
        <input
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="15000"
          className="w-full bg-transparent text-sm outline-none"
        />
      </Field>
      <Field label="Category">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full bg-transparent text-sm outline-none"
        >
          {postableProductCategories.map((c) => (
            <option key={c.id} value={c.id} className="bg-surface">
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Campus (optional)">
        <CampusSelect value={campusId} onChange={setCampusId} />
      </Field>
      <Field label="Region (optional)">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full bg-transparent text-sm outline-none"
        >
          <option value="">— none —</option>
          {TZ_REGIONS.map((r) => (
            <option key={r} value={r} className="bg-surface">
              {r}
            </option>
          ))}
        </select>
      </Field>
      <Field label="WhatsApp number" hint="Format: 07XXXXXXXX or +2557XXXXXXXX">
        <input
          required
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="0712 000 000"
          className="w-full bg-transparent text-sm outline-none"
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Condition, size, pickup spot…"
          className="w-full bg-transparent text-sm outline-none resize-none"
        />
      </Field>
      {FEATURES.monetization && <BoostSection kind="product" />}
      <SubmitBar loading={loading} label="Post product" onDraft={(e) => submit(e, "draft")} />
    </form>
  );
}

function GigForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [categories, setCategories] = useState<string[]>(["paid"]);
  const [tagsStr, setTagsStr] = useState("");
  const [campusId, setCampusId] = useState("");
  const [region, setRegion] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleCat(id: string) {
    setCategories((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function submit(e: React.FormEvent, status: "active" | "draft" = "active") {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      let image_url: string | null = null;
      if (file) image_url = await uploadImage("listings", file);
      const campus = campusValues(campusId);
      const normalizedWa = whatsapp ? normalizePhoneTZ(whatsapp) : null;
      if (whatsapp && !normalizedWa) {
        toast.error("WhatsApp must be like 07XXXXXXXX or +2557XXXXXXXX");
        setLoading(false);
        return;
      }
      const { error } = await supabase.from("gigs").insert({
        poster_id: uid,
        title,
        description: description || null,
        image_url,
        budget: budget || null,
        ...(deadline ? { deadline_at: new Date(`${deadline}T23:59:59`).toISOString() } : {}),
        tags,
        categories: [...categories, ...(urgent ? ["urgent"] : [])],
        ...campus,
        region: region || null,
        whatsapp: normalizedWa,
        urgent,
        status,
      });
      if (error) throw error;
      await submitCampusSuggestion(campusId, region);
      toast.success(status === "draft" ? "Gig saved to drafts." : "Gig posted!");
      navigate({ to: status === "draft" ? "/profile" : "/" });
    } catch (err) {
      console.error("Ad submission failed", err);
      toast.error(describeSubmissionError(err) || "Failed to post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <ImagePicker file={file} onChange={setFile} label="Gig image (optional)" />
      <Field label="Gig title">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Need event photographer for hostel party"
          className="w-full bg-transparent text-sm outline-none"
        />
      </Field>
      <Field label="Budget (optional)" hint="e.g. 30,000 TZS / project or Negotiable">
        <input
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="30,000 TZS"
          className="w-full bg-transparent text-sm outline-none"
        />
      </Field>
      <Field label="Deadline (optional)" hint="The gig disappears from discovery after this date.">
        <input
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full bg-transparent text-sm outline-none"
        />
      </Field>
      <Field label="Description">
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="What you need, when, and what deliverables…"
          className="w-full bg-transparent text-sm outline-none resize-none"
        />
      </Field>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          Categories
        </div>
        <div className="flex flex-wrap gap-2">
          {postableGigCategories.map((c) => {
            const on = categories.includes(c.id);
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => toggleCat(c.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold border transition",
                  on
                    ? "bg-teal text-teal-foreground border-teal"
                    : "bg-surface border-border text-muted-foreground",
                )}
              >
                {c.emoji} {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <Field label="Tags" hint="Comma-separated (e.g. Photography, Weekend, DSLR)">
        <input
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="Photography, Weekend"
          className="w-full bg-transparent text-sm outline-none"
        />
      </Field>
      <Field label="Campus (optional)">
        <CampusSelect value={campusId} onChange={setCampusId} />
      </Field>
      <Field label="Region (optional)">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full bg-transparent text-sm outline-none"
        >
          <option value="">— none —</option>
          {TZ_REGIONS.map((r) => (
            <option key={r} value={r} className="bg-surface">
              {r}
            </option>
          ))}
        </select>
      </Field>
      <Field label="WhatsApp number" hint="Format: 07XXXXXXXX or +2557XXXXXXXX">
        <input
          required
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="0712 000 000"
          className="w-full bg-transparent text-sm outline-none"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={urgent}
          onChange={(e) => setUrgent(e.target.checked)}
          className="accent-coral"
        />
        <span className="text-coral font-semibold">⚡ Mark as urgent</span>
      </label>
      {FEATURES.monetization && <BoostSection kind="gig" />}
      <SubmitBar loading={loading} label="Post gig" onDraft={(e) => submit(e, "draft")} />
    </form>
  );
}

function AdForm() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [optimizedVideo, setOptimizedVideo] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent, status: "active" | "draft" = "active") {
    e.preventDefault();
    setLoading(true);
    let stage = "starting";
    try {
      stage = "checking authentication";
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      let image_url: string | null = null;
      if (file) {
        stage = "uploading photo";
        image_url = await uploadImage("ads", file);
      }
      let video_url: string | null = null;
      if (optimizedVideo) {
        stage = "uploading video";
        const extension = optimizedVideo.type === "video/webm" ? "webm" : "mp4";
        video_url = await uploadMedia("ads", optimizedVideo, extension);
      }
      stage = "saving ad";
      const { error } = await supabase.from("ads").insert({
        poster_id: uid,
        title,
        body: body || null,
        image_url,
        video_url,
        cta_url: ctaUrl || null,
        campus_id: null,
        status,
      });
      if (error) throw error;
      toast.success(status === "draft" ? "Ad saved to drafts." : "Ad submitted!");
      navigate({ to: status === "draft" ? "/profile" : "/" });
    } catch (err) {
      const detail = describeSubmissionError(err);
      console.error("Ad submission failed", { stage, error: err });
      toast.error(`Ad failed while ${stage}: ${detail}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="rounded-2xl bg-coral/10 border border-coral/30 p-3 text-xs text-coral">
        Ads target users automatically through the LikeAir interest algorithm — no need to pick a
        campus. Free while we grow; boost & billing arrives with mobile-money.
      </div>
      <ImagePicker file={file} onChange={setFile} />
      <VideoUpload
        maxSizeInMB={10}
        onVideoSelect={async (_originalFile, optimizedBlob) => {
          setOptimizedVideo(optimizedBlob);
        }}
        onVideoChange={(selectedFile) => {
          if (!selectedFile) setOptimizedVideo(null);
        }}
      />
      <Field label="Headline">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Grand opening — 20% off all snacks"
          className="w-full bg-transparent text-sm outline-none"
        />
      </Field>
      <Field label="Body">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full bg-transparent text-sm outline-none resize-none"
        />
      </Field>
      <Field label="Link (optional)">
        <input
          value={ctaUrl}
          onChange={(e) => setCtaUrl(e.target.value)}
          placeholder="https://…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </Field>
      <SubmitBar loading={loading} label="Submit ad" onDraft={(e) => submit(e, "draft")} />
    </form>
  );
}

function BoostSection({ kind }: { kind: PostKind }) {
  // Hidden until FEATURES.monetization = true. Scaffold shape only.
  return (
    <div className="rounded-2xl border border-teal/30 bg-teal/5 p-4">
      <div className="text-[11px] uppercase tracking-wider text-teal font-semibold">
        Boost this {kind}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Pay a small mobile-money top-up to promote your {kind}. Money is deducted per
        impression/click, like Meta ads.
      </p>
    </div>
  );
}

function SubmitBar({
  loading,
  label,
  onDraft,
}: {
  loading: boolean;
  label: string;
  onDraft?: (e: React.FormEvent) => void;
}) {
  return (
    <div className="space-y-2 pt-1">
      <button
        disabled={loading}
        className="w-full rounded-2xl bg-teal text-teal-foreground py-3 text-sm font-black glow-teal disabled:opacity-60"
      >
        {loading ? "Posting…" : label}
      </button>
      {onDraft && (
        <button
          type="button"
          disabled={loading}
          onClick={onDraft}
          className="w-full rounded-2xl bg-surface border border-border py-3 text-sm font-bold text-muted-foreground hover:border-teal/40 hover:text-foreground transition disabled:opacity-60"
        >
          Save as draft
        </button>
      )}
    </div>
  );
}
