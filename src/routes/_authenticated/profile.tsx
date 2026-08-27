import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { normalizePhoneTZ } from "@/lib/phone";
import { TZ_REGIONS } from "@/lib/regions";
import { fetchCampuses } from "@/lib/feed";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  LogOut,
  Lock,
  ShieldCheck,
  Trash2,
  Wallet,
  Pencil,
  History,
  Rocket,
  CreditCard,
  Loader2,
  User as UserIcon,
  Store as StoreIcon,
  Plus,
  Eye,
  EyeOff,
  Bookmark,
  Briefcase,
  Package,
  BadgeCheck,
  MapPin,
  CheckCircle2,
  MessageCircle,
  X,
  UserPlus,
} from "lucide-react";
import { ThemeToggle } from "@/components/likeair/ThemeToggle";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/lib/features";
import { tzs, whatsappLink } from "@/lib/format";
import { deadlineLabel } from "@/lib/format";
import { toggleItemSave } from "@/lib/engagement";
import { getRecentlyViewed, type RecentlyViewedItem } from "@/lib/tracking";
import {
  getGigInterestCounts,
  getGigInterestsForOwner,
  updateGigInterestStatus,
  type GigInterest,
  type GigInterestStatus,
} from "@/lib/gig-interests";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your LikeAir Profile" },
      { name: "description", content: "Manage your LikeAir identity, posts and billing." },
      { property: "og:title", content: "Your LikeAir Profile" },
      { property: "og:description", content: "Identity, posts, and billing portal for LikeAir." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ProfilePage,
});

type Tab = "identity" | "posts" | "saved";

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("identity");

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24 overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-teal/20 blur-[130px]" />
        <div className="absolute bottom-0 -right-40 h-[520px] w-[520px] rounded-full bg-coral/20 blur-[130px]" />
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-coral transition"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-[11px] font-semibold text-teal tracking-widest">YOUR PROFILE</div>
          <h1 className="mt-1 font-display text-3xl font-black">{user?.email}</h1>
        </div>

        <div className="mt-5 flex gap-1 rounded-full bg-surface border border-border p-1">
          <TabBtn active={tab === "identity"} onClick={() => setTab("identity")} label="Identity" />
          <TabBtn active={tab === "posts"} onClick={() => setTab("posts")} label="My Posts" />
          <TabBtn active={tab === "saved"} onClick={() => setTab("saved")} label="Saved" />
        </div>

        <div className="mt-6">
          {tab === "identity" && <IdentityPanel />}
          {tab === "posts" && <PostsPanel />}
          {tab === "saved" && <SavedPanel />}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-full px-3 py-2 text-xs font-bold transition",
        active
          ? "bg-teal text-teal-foreground glow-teal"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/* -------------------- IDENTITY -------------------- */

function IdentityPanel() {
  const { profile, refetch } = useProfile();
  const { user } = useAuth();
  const { data: campuses = [] } = useQuery({ queryKey: ["campuses"], queryFn: fetchCampuses });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [storeBio, setStoreBio] = useState("");
  const [campusId, setCampusId] = useState("");
  const [region, setRegion] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setStoreName(profile.store_name ?? "");
    setStoreSlug(profile.store_slug ?? "");
    setStoreBio(profile.store_bio ?? "");
    setCampusId(profile.campus_id ?? "");
    setRegion(profile.region ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  async function uploadAvatar(file: File) {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Avatar images must be 10MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      setAvatarUrl(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
      toast.success("Avatar uploaded. Don't forget to save.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user) return;
    if (phone && !normalizePhoneTZ(phone)) {
      toast.error("Phone must be like 07XXXXXXXX or +2557XXXXXXXX");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: user.id,
        full_name: fullName || null,
        phone: phone ? normalizePhoneTZ(phone) : null,
        store_name: storeName || null,
        store_slug: storeSlug ? slugify(storeSlug) : null,
        store_bio: storeBio || null,
        campus_id: campusId || null,
        region: region || null,
        bio: bio || null,
        avatar_url: avatarUrl,
      };
      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      toast.success("Profile saved.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-4">
          <label className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-teal/40 bg-surface-elevated cursor-pointer group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full grid place-items-center text-muted-foreground">
                <UserIcon className="h-8 w-8" />
              </div>
            )}
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition grid place-items-center">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal" />
              ) : (
                <Camera className="h-4 w-4 text-teal" />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </label>
          <div>
            <div className="font-display text-lg font-black">{fullName || "Add your name"}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck
                className={cn(
                  "h-3 w-3",
                  profile?.verified ? "text-whatsapp" : "text-muted-foreground/60",
                )}
              />
              {profile?.verified ? "Verified" : "Not yet verified"}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-teal font-semibold mb-3">
          <ShieldCheck className="h-3.5 w-3.5" /> Trust snapshot
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TrustItem
            icon={<BadgeCheck className="h-4 w-4" />}
            label="Identity"
            value={profile?.verified ? "Verified" : "Not verified"}
            good={Boolean(profile?.verified)}
          />
          <TrustItem
            icon={<MapPin className="h-4 w-4" />}
            label="Campus"
            value={profile?.campus_id ? "Added" : "Add campus"}
            good={Boolean(profile?.campus_id)}
          />
          <TrustItem
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Phone"
            value={profile?.phone ? "Added" : "Add phone"}
            good={Boolean(profile?.phone)}
          />
          <TrustItem
            icon={<StoreIcon className="h-4 w-4" />}
            label="Storefront"
            value={profile?.store_name ? "Ready" : "Optional"}
            good={Boolean(profile?.store_name)}
          />
        </div>
        <div className="mt-3 rounded-xl bg-surface-elevated border border-border p-3 text-[11px] text-muted-foreground leading-relaxed">
          Complete your profile to make buyers and employers more confident when they interact with
          you.
        </div>
      </Card>

      <Card>
        <div className="text-[11px] uppercase tracking-widest text-teal font-semibold mb-3">
          Critical info
        </div>
        <FieldRow label="Full name">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-transparent text-sm outline-none"
          />
        </FieldRow>
        <FieldRow label="Phone" hint="07XXXXXXXX or +2557XXXXXXXX">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 000 000"
            className="w-full bg-transparent text-sm outline-none"
          />
        </FieldRow>
        <FieldRow label="Campus">
          <select
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
          >
            <option value="">— none —</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id} className="bg-surface">
                {c.name}
              </option>
            ))}
          </select>
        </FieldRow>
        <FieldRow label="Region">
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
        </FieldRow>
        <FieldRow label="Bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Short intro"
            className="w-full bg-transparent text-sm outline-none resize-none"
          />
        </FieldRow>
        <button
          onClick={save}
          disabled={saving}
          className="mt-3 w-full rounded-2xl bg-teal text-teal-foreground py-3 text-sm font-black glow-teal disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-widest text-teal font-semibold">
            Your store
          </div>
          {profile?.store_slug && (
            <Link
              to="/store/$slug"
              params={{ slug: profile.store_slug }}
              className="text-[11px] text-teal hover:underline inline-flex items-center gap-1"
            >
              <StoreIcon className="h-3 w-3" /> View public store
            </Link>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Group all your posts under one storefront — great if you post many items from the same
          account.
        </p>
        <FieldRow label="Store name">
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="MoMA Babuu Samosas"
            className="w-full bg-transparent text-sm outline-none"
          />
        </FieldRow>
        <FieldRow
          label="Store handle"
          hint={
            storeSlug ? `likeair.app/store/${slugify(storeSlug)}` : "Letters, numbers and dashes"
          }
        >
          <input
            value={storeSlug}
            onChange={(e) => setStoreSlug(e.target.value)}
            placeholder="moma-babuu"
            className="w-full bg-transparent text-sm outline-none"
          />
        </FieldRow>
        <FieldRow label="Store description">
          <textarea
            value={storeBio}
            onChange={(e) => setStoreBio(e.target.value)}
            rows={3}
            placeholder="What you sell, hours, pickup spot…"
            className="w-full bg-transparent text-sm outline-none resize-none"
          />
        </FieldRow>
        <button
          onClick={save}
          disabled={saving}
          className="mt-1 w-full rounded-2xl bg-surface-elevated border border-teal/40 text-teal py-3 text-sm font-black disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save store"}
        </button>
      </Card>

      <Link
        to="/business"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-teal/40 bg-teal/5 py-3 text-sm font-black text-teal transition hover:bg-teal/10"
      >
        <Briefcase className="h-4 w-4" />
        LikeAir Business
      </Link>
    </div>
  );
}

function slugify(v: string) {
  return v
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block mb-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="rounded-xl bg-surface-elevated border border-border px-3 py-2.5 focus-within:border-teal/60 transition">
        {children}
      </div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground/70">{hint}</div>}
    </label>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl bg-surface border border-border p-5">{children}</div>;
}

function TrustItem({
  icon,
  label,
  value,
  good,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2.5",
        good ? "border-whatsapp/30 bg-whatsapp/5" : "border-border bg-surface-elevated",
      )}
    >
      <div className={cn("shrink-0", good ? "text-whatsapp" : "text-muted-foreground")}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div
          className={cn(
            "text-xs font-semibold truncate",
            good ? "text-whatsapp" : "text-foreground",
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* -------------------- MY POSTS -------------------- */

function PostsPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const products = useQuery({
    queryKey: ["my-products", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,title,price,status,image_url,created_at")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const gigs = useQuery({
    queryKey: ["my-gigs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gigs")
        .select("id,title,budget,deadline_at,status,created_at")
        .eq("poster_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const gigInterestCounts = useQuery({
    queryKey: ["my-gig-interest-counts", user?.id, gigs.data?.map((gig) => gig.id)],
    enabled: !!user && !!gigs.data?.length,
    queryFn: () => getGigInterestCounts((gigs.data ?? []).map((gig) => gig.id)),
  });
  const [reviewGigId, setReviewGigId] = useState<string | null>(null);
  const ads = useQuery({
    queryKey: ["my-ads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("id,title,status,created_at")
        .eq("poster_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function del(table: "products" | "gigs" | "ads", id: string) {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted.");
    qc.invalidateQueries({ queryKey: [`my-${table}`] });
  }

  async function setStatus(
    table: "products" | "gigs" | "ads",
    id: string,
    status: "active" | "draft",
  ) {
    const { error } = await supabase.from(table).update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(
      status === "active"
        ? "Published — live on the feed."
        : "Moved to drafts (hidden from the feed).",
    );
    qc.invalidateQueries({ queryKey: [`my-${table}`] });
  }

  return (
    <div className="space-y-4">
      <Link
        to="/post"
        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-teal text-teal-foreground py-3 text-sm font-black glow-teal"
      >
        <Plus className="h-4 w-4" /> New post
      </Link>
      <Card>
        <SectionHeader label="Products" count={products.data?.length ?? 0} />
        {(products.data ?? []).map((p) => (
          <Row
            key={p.id}
            id={p.id}
            kind="product"
            title={p.title}
            sub={`TZS ${p.price?.toLocaleString?.() ?? p.price}`}
            status={p.status}
            img={p.image_url}
            onDelete={() => del("products", p.id)}
            onToggle={() => setStatus("products", p.id, p.status === "active" ? "draft" : "active")}
          />
        ))}
        {products.data?.length === 0 && <Empty label="No products yet." />}
      </Card>
      <Card>
        <SectionHeader label="Gigs" count={gigs.data?.length ?? 0} />
        {(gigs.data ?? []).map((g) => {
          const interestCount = gigInterestCounts.data?.get(g.id) ?? 0;
          return (
            <div key={g.id}>
              <Row
                id={g.id}
                kind="gig"
                title={g.title}
                sub={g.budget ?? "—"}
                meta={`${interestCount} interested`}
                status={g.status}
                onDelete={() => del("gigs", g.id)}
                onToggle={() => setStatus("gigs", g.id, g.status === "active" ? "draft" : "active")}
                extraAction={
                  interestCount > 0
                    ? {
                        label: reviewGigId === g.id ? "Hide applicants" : "Review applicants",
                        onClick: () => setReviewGigId(reviewGigId === g.id ? null : g.id),
                        icon: <UserPlus className="h-4 w-4" />,
                      }
                    : undefined
                }
              />
              {reviewGigId === g.id && <GigApplicants gigId={g.id} />}
            </div>
          );
        })}
        {gigs.data?.length === 0 && <Empty label="No gigs yet." />}
      </Card>
      <Card>
        <SectionHeader label="Ads" count={ads.data?.length ?? 0} />
        {(ads.data ?? []).map((a) => (
          <Row
            key={a.id}
            id={a.id}
            kind="ad"
            title={a.title}
            sub="Ad campaign"
            status={a.status}
            onDelete={() => del("ads", a.id)}
            onToggle={() => setStatus("ads", a.id, a.status === "active" ? "draft" : "active")}
          />
        ))}
        {ads.data?.length === 0 && <Empty label="No ads yet." />}
      </Card>
    </div>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="text-[11px] uppercase tracking-widest text-teal font-semibold">{label}</div>
      <div className="text-[10px] font-mono text-muted-foreground">{count}</div>
    </div>
  );
}

function Row({
  id,
  kind,
  title,
  sub,
  meta,
  status,
  img,
  onDelete,
  onToggle,
  extraAction,
}: {
  id: string;
  kind: "product" | "gig" | "ad";
  title: string;
  sub: string;
  meta?: string;
  status?: string | null;
  img?: string | null;
  onDelete: () => void;
  onToggle: () => void;
  extraAction?: { label: string; onClick: () => void; icon: ReactNode };
}) {
  const isDraft = status !== "active";
  return (
    <div className="flex items-center gap-3 py-2 border-t border-border/50 first:border-t-0">
      {img ? (
        <img src={img} alt="" className="h-10 w-10 rounded-lg object-cover" />
      ) : (
        <div className="h-10 w-10 rounded-lg bg-surface-elevated" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 font-bold uppercase tracking-wide",
              isDraft ? "bg-coral text-coral-foreground" : "bg-whatsapp text-whatsapp-foreground",
            )}
          >
            {isDraft ? "Draft" : "Live"}
          </span>
          {sub}
          {meta && <span>· {meta}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {extraAction && (
          <button
            onClick={extraAction.onClick}
            className="h-9 w-9 grid place-items-center rounded-full bg-surface-elevated border border-teal text-teal shadow-sm hover:bg-teal/10 transition"
            aria-label={extraAction.label}
            title={extraAction.label}
          >
            {extraAction.icon}
          </button>
        )}
        <button
          onClick={onToggle}
          className="h-9 w-9 grid place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-sm hover:brightness-110 transition"
          aria-label={isDraft ? "Publish" : "Move to drafts"}
          title={isDraft ? "Publish" : "Move to drafts"}
        >
          {isDraft ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <Link
          to="/edit/$kind/$id"
          params={{ kind, id }}
          className="h-9 w-9 grid place-items-center rounded-full bg-surface-elevated border border-teal text-teal shadow-sm hover:bg-teal/10 transition"
          aria-label="Edit"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <button
          onClick={onDelete}
          className="h-9 w-9 grid place-items-center rounded-full bg-surface-elevated border border-coral text-coral shadow-sm hover:bg-coral/10 transition"
          aria-label="Delete"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function GigApplicants({ gigId }: { gigId: string }) {
  const [interests, setInterests] = useState<GigInterest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGigInterestsForOwner(gigId)
      .then(setInterests)
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Could not load applicants"),
      )
      .finally(() => setLoading(false));
  }, [gigId]);

  async function changeStatus(interestId: string, status: GigInterestStatus) {
    try {
      await updateGigInterestStatus(interestId, status);
      setInterests((current) =>
        current.map((interest) =>
          interest.id === interestId ? { ...interest, status } : interest,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update applicant");
    }
  }

  if (loading)
    return (
      <div className="border-t border-border/50 py-3 text-xs text-muted-foreground">
        Loading applicants…
      </div>
    );
  if (!interests.length)
    return (
      <div className="border-t border-border/50 py-3 text-xs text-muted-foreground">
        No applicants yet.
      </div>
    );

  return (
    <div className="border-t border-border/50 bg-surface-elevated/50 px-3 py-3 space-y-2">
      {interests.map((interest) => (
        <div
          key={interest.id}
          className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3"
        >
          <img
            src={
              interest.applicant?.avatar_url ||
              `https://api.dicebear.com/7.x/thumbs/svg?seed=${interest.user_id}`
            }
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold">
              {interest.applicant?.full_name || "LikeAir member"}
              {interest.applicant?.verified && <span className="ml-1 text-teal">✓</span>}
            </div>
            {interest.message && (
              <p className="mt-1 text-[11px] text-muted-foreground">{interest.message}</p>
            )}
          </div>
          <select
            value={interest.status}
            onChange={(event) => changeStatus(interest.id, event.target.value as GigInterestStatus)}
            className="max-w-[120px] rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] font-semibold outline-none"
            aria-label="Applicant status"
          >
            {(
              [
                "interested",
                "contacted",
                "shortlisted",
                "selected",
                "completed",
                "declined",
              ] as const
            ).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-xs text-muted-foreground py-4 text-center">{label}</div>;
}

/* -------------------- SAVED -------------------- */

type SavedProduct = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  whatsapp: string | null;
  status: string | null;
};
type SavedGig = {
  id: string;
  title: string;
  budget: string | null;
  deadline_at: string | null;
  whatsapp: string | null;
  status: string | null;
};

function SavedPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const saved = useQuery({
    queryKey: ["my-saves", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: saveRows, error: saveErr } = await supabase
        .from("saves")
        .select("item_type, item_id")
        .eq("user_id", user!.id);
      if (saveErr) throw saveErr;

      const productIds = (saveRows ?? [])
        .filter((r) => r.item_type === "product")
        .map((r) => r.item_id);
      const gigIds = (saveRows ?? []).filter((r) => r.item_type === "gig").map((r) => r.item_id);

      const [productsRes, gigsRes] = await Promise.all([
        productIds.length
          ? supabase
              .from("products")
              .select("id,title,price,image_url,whatsapp,status")
              .in("id", productIds)
          : Promise.resolve({ data: [] as SavedProduct[], error: null }),
        gigIds.length
          ? supabase.from("gigs").select("id,title,budget,whatsapp,status").in("id", gigIds)
          : Promise.resolve({ data: [] as SavedGig[], error: null }),
      ]);
      if (productsRes.error) throw productsRes.error;
      if (gigsRes.error) throw gigsRes.error;

      return {
        products: (productsRes.data ?? []) as SavedProduct[],
        gigs: (gigsRes.data ?? []) as SavedGig[],
      };
    },
  });

  async function unsave(itemType: "product" | "gig", itemId: string) {
    if (!user) return;
    const res = await toggleItemSave(user.id, itemType, itemId);
    if (!res.success) return toast.error(res.error ?? "Could not remove.");
    toast.success("Removed from saved.");
    qc.invalidateQueries({ queryKey: ["my-saves", user.id] });
  }

  if (saved.isLoading) {
    return (
      <div className="grid place-items-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const products = saved.data?.products ?? [];
  const gigs = saved.data?.gigs ?? [];
  const recentlyViewed = getRecentlyViewed();

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader label="Saved products" count={products.length} />
        {products.map((p) => (
          <SavedRow
            key={p.id}
            title={p.title}
            sub={tzs(p.price)}
            img={p.image_url}
            whatsapp={p.whatsapp}
            msg={`Hi, I saw your listing for ${p.title} on LikeAir, is it still available?`}
            onUnsave={() => unsave("product", p.id)}
          />
        ))}
        {products.length === 0 && (
          <Empty label="Nothing saved yet — tap the bookmark icon on a listing." />
        )}
      </Card>
      <Card>
        <SectionHeader label="Saved gigs" count={gigs.length} />
        {gigs.map((g) => (
          <SavedRow
            key={g.id}
            title={g.title}
            sub={[g.budget ?? "—", deadlineLabel(g.deadline_at)].filter(Boolean).join(" · ")}
            whatsapp={g.whatsapp}
            msg={`Hi, I'm interested in your gig post "${g.title}" on LikeAir, is it still available?`}
            onUnsave={() => unsave("gig", g.id)}
          />
        ))}
        {gigs.length === 0 && <Empty label="No saved gigs yet." />}
      </Card>
      <Card>
        <SectionHeader label="Recently viewed" count={recentlyViewed.length} />
        {recentlyViewed.map((item) => (
          <RecentRow key={`${item.type}:${item.id}`} item={item} />
        ))}
        {recentlyViewed.length === 0 && <Empty label="Items you open will appear here." />}
      </Card>
    </div>
  );
}

function RecentRow({ item }: { item: RecentlyViewedItem }) {
  const msg =
    item.type === "product"
      ? `Hi, I saw your listing for ${item.title} on LikeAir, is it still available?`
      : `Hi, I'm interested in your gig post "${item.title}" on LikeAir.`;
  return (
    <SavedRow
      title={item.title}
      sub={item.subtitle}
      img={item.imageUrl}
      whatsapp={item.whatsapp ?? null}
      msg={msg}
      onUnsave={undefined}
    />
  );
}

function SavedRow({
  title,
  sub,
  img,
  whatsapp,
  msg,
  onUnsave,
}: {
  title: string;
  sub: string;
  img?: string | null;
  whatsapp: string | null;
  msg: string;
  onUnsave?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-t border-border/50 first:border-t-0">
      {img ? (
        <img src={img} alt="" className="h-10 w-10 rounded-lg object-cover" />
      ) : (
        <div className="h-10 w-10 rounded-lg bg-surface-elevated grid place-items-center text-muted-foreground">
          <Bookmark className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{title}</div>
        <div className="text-[10px] text-muted-foreground">{sub}</div>
      </div>
      <div className="flex items-center gap-1.5">
        {whatsapp && (
          <a
            href={whatsappLink(whatsapp, msg)}
            target="_blank"
            rel="noreferrer"
            className="h-9 w-9 grid place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-sm hover:brightness-110 transition"
            aria-label="Chat on WhatsApp"
            title="Chat on WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
        {onUnsave && (
          <button
            onClick={onUnsave}
            className="h-9 w-9 grid place-items-center rounded-full bg-surface-elevated border border-coral text-coral shadow-sm hover:bg-coral/10 transition"
            aria-label="Remove from saved"
            title="Remove from saved"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------- BILLING (locked portal) -------------------- */

function BillingPanel() {
  const { user } = useAuth();
  const wallet = useQuery({
    queryKey: ["wallet", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("balance,currency")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? { balance: 0, currency: "TZS" };
    },
  });
  const ledger = useQuery({
    queryKey: ["ledger", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_ledger")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const active = FEATURES.monetization && FEATURES.mobileMoney;

  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl border border-teal/30 bg-gradient-to-br from-surface via-surface-elevated to-surface p-5 overflow-hidden">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-teal/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-coral/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-teal tracking-widest">
            <Lock className="h-3 w-3" /> SECURE BILLING PORTAL
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="font-display text-4xl font-black tracking-tight">
              {(wallet.data?.balance ?? 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {wallet.data?.currency ?? "TZS"}
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">Boost fuel remaining</div>

          {!active && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-coral/10 border border-coral/30 px-3 py-1 text-[10px] font-bold text-coral">
              <Lock className="h-3 w-3" /> Portal inactive — mobile money launches soon
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BillingTile icon={<Wallet className="h-4 w-4" />} label="Deposit" locked={!active} />
        <BillingTile icon={<Rocket className="h-4 w-4" />} label="Boost a post" locked={!active} />
        <BillingTile
          icon={<CreditCard className="h-4 w-4" />}
          label="Ad billing"
          locked={!active}
        />
        <BillingTile icon={<History className="h-4 w-4" />} label="Statements" locked={!active} />
      </div>

      <Card>
        <SectionHeader label="Payment history" count={ledger.data?.length ?? 0} />
        {(ledger.data ?? []).length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">
            No transactions yet. When mobile-money payments go live, every deposit, ad spend & boost
            charge will appear here.
          </div>
        ) : (
          (ledger.data ?? []).map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between py-2 border-t border-border/50 first:border-t-0 text-sm"
            >
              <div>
                <div className="font-semibold">{l.kind}</div>
                <div className="text-[10px] text-muted-foreground">
                  {new Date(l.created_at).toLocaleString()}
                </div>
              </div>
              <div
                className={cn("font-mono", Number(l.amount) < 0 ? "text-coral" : "text-whatsapp")}
              >
                {Number(l.amount) < 0 ? "" : "+"}
                {Number(l.amount).toLocaleString()} TZS
              </div>
            </div>
          ))
        )}
      </Card>

      <div className="rounded-2xl border border-border bg-surface/50 p-4 text-[11px] text-muted-foreground flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-teal mt-0.5 shrink-0" />
        <span>
          Encrypted portal. Only you can see your billing details. Mobile-money integration (M-Pesa,
          Tigo Pesa, Airtel Money) will activate this section when it launches.
        </span>
      </div>
    </div>
  );
}

function BillingTile({ icon, label, locked }: { icon: ReactNode; label: string; locked: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 flex flex-col gap-2 relative overflow-hidden",
        locked
          ? "bg-surface border-border text-muted-foreground"
          : "bg-teal/10 border-teal/30 text-teal",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-semibold">
        {icon} {label}
      </div>
      {locked && (
        <div className="text-[10px] flex items-center gap-1 opacity-70">
          <Lock className="h-3 w-3" /> Inactive
        </div>
      )}
    </div>
  );
}
