import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchCampuses } from "@/lib/feed";
import { postableProductCategories, postableGigCategories } from "@/lib/categories";
import { normalizePhoneTZ } from "@/lib/phone";
import { TZ_REGIONS } from "@/lib/regions";
import { cn } from "@/lib/utils";

type Kind = "product" | "gig" | "ad";
const TABLE: Record<Kind, "products" | "gigs" | "ads"> = {
  product: "products",
  gig: "gigs",
  ad: "ads",
};

export const Route = createFileRoute("/_authenticated/edit/$kind/$id")({
  head: () => ({
    meta: [
      { title: "Edit post — LikeAir" },
      { name: "description", content: "Edit or remove one of your LikeAir posts." },
      { property: "og:title", content: "Edit post — LikeAir" },
      { property: "og:description", content: "Edit or remove your listing on LikeAir." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: EditPage,
});

function EditPage() {
  const { kind, id } = Route.useParams();
  const k = kind as Kind;
  const isValidKind = (["product", "gig", "ad"] as const).includes(k);
  const navigate = useNavigate();

  const {
    data: row,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [`edit-${k}`, id],
    enabled: isValidKind,
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLE[k]).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (row) setState(row as Record<string, unknown>);
  }, [row]);

  if (!isValidKind) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Unknown post type.</p>
      </Shell>
    );
  }

  function upd<K extends string>(key: K, v: unknown) {
    setState((s) => ({ ...s, [key]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...state };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.seller_id;
      delete payload.poster_id;
      // normalize phone if edited
      if (typeof payload.whatsapp === "string" && payload.whatsapp) {
        const norm = normalizePhoneTZ(payload.whatsapp as string);
        if (!norm) throw new Error("WhatsApp must be like 07XXXXXXXX or +2557XXXXXXXX");
        payload.whatsapp = norm;
      }
      // coerce price for product
      if (
        k === "product" &&
        payload.price !== undefined &&
        payload.price !== null &&
        payload.price !== ""
      ) {
        payload.price = Number(payload.price);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(TABLE[k]) as any).update(payload).eq("id", id);
      if (error) throw error;
      toast.success("Post updated.");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await supabase.from(TABLE[k]).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted.");
    navigate({ to: "/profile" });
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </Shell>
    );
  }
  if (!row) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">
          Post not found or you don't have permission to edit it.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold text-teal tracking-widest uppercase">
            Edit {k}
          </div>
          <h1 className="mt-1 font-display text-2xl font-black">Tweak &amp; save</h1>
        </div>
        <button
          onClick={remove}
          className="btn btn-ghost text-coral border-coral/30 hover:border-coral"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {k === "product" && (
          <>
            {state.image_url ? (
              <img
                src={state.image_url as string}
                alt=""
                className="w-full max-h-64 object-cover rounded-2xl border border-border"
              />
            ) : null}
            <TextField
              label="Title"
              value={(state.title as string) ?? ""}
              onChange={(v) => upd("title", v)}
            />
            <TextField
              label="Price (TZS)"
              value={String(state.price ?? "")}
              onChange={(v) => upd("price", v)}
              type="number"
            />
            <SelectField
              label="Category"
              value={(state.category as string) ?? ""}
              onChange={(v) => upd("category", v)}
              options={postableProductCategories.map((c) => ({
                value: c.id,
                label: `${c.emoji} ${c.label}`,
              }))}
            />
            <CampusField
              value={(state.campus_id as string) ?? ""}
              onChange={(v) => upd("campus_id", v || null)}
            />
            <RegionField
              value={(state.region as string) ?? ""}
              onChange={(v) => upd("region", v || null)}
            />
            <TextField
              label="WhatsApp"
              value={(state.whatsapp as string) ?? ""}
              onChange={(v) => upd("whatsapp", v)}
              hint="07XXXXXXXX or +2557XXXXXXXX"
            />
            <TextArea
              label="Description"
              value={(state.description as string) ?? ""}
              onChange={(v) => upd("description", v)}
            />
          </>
        )}

        {k === "gig" && (
          <>
            <TextField
              label="Title"
              value={(state.title as string) ?? ""}
              onChange={(v) => upd("title", v)}
            />
            <TextField
              label="Budget"
              value={(state.budget as string) ?? ""}
              onChange={(v) => upd("budget", v)}
            />
            <TextField
              label="Deadline"
              value={state.deadline_at ? String(state.deadline_at).slice(0, 10) : ""}
              onChange={(v) =>
                upd("deadline_at", v ? new Date(`${v}T23:59:59`).toISOString() : null)
              }
              type="date"
            />
            <TextArea
              label="Description"
              value={(state.description as string) ?? ""}
              onChange={(v) => upd("description", v)}
            />
            <TagChips
              label="Categories"
              options={postableGigCategories.map((c) => ({
                value: c.id,
                label: `${c.emoji} ${c.label}`,
              }))}
              values={(state.categories as string[]) ?? []}
              onChange={(v) => upd("categories", v)}
            />
            <TextField
              label="Tags (comma-separated)"
              value={((state.tags as string[]) ?? []).join(", ")}
              onChange={(v) =>
                upd(
                  "tags",
                  v
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
            <CampusField
              value={(state.campus_id as string) ?? ""}
              onChange={(v) => upd("campus_id", v || null)}
            />
            <RegionField
              value={(state.region as string) ?? ""}
              onChange={(v) => upd("region", v || null)}
            />
            <TextField
              label="WhatsApp"
              value={(state.whatsapp as string) ?? ""}
              onChange={(v) => upd("whatsapp", v)}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={!!state.urgent}
                onChange={(e) => upd("urgent", e.target.checked)}
                className="accent-coral"
              />
              <span className="text-coral font-semibold">⚡ Mark as urgent</span>
            </label>
          </>
        )}

        {k === "ad" && (
          <>
            {state.image_url ? (
              <img
                src={state.image_url as string}
                alt=""
                className="w-full max-h-64 object-cover rounded-2xl border border-border"
              />
            ) : null}
            <TextField
              label="Headline"
              value={(state.title as string) ?? ""}
              onChange={(v) => upd("title", v)}
            />
            <TextArea
              label="Body"
              value={(state.body as string) ?? ""}
              onChange={(v) => upd("body", v)}
            />
            <TextField
              label="Link"
              value={(state.cta_url as string) ?? ""}
              onChange={(v) => upd("cta_url", v)}
            />
          </>
        )}

        <button onClick={save} disabled={saving} className="btn btn-primary w-full py-3 text-sm">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden pb-16">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-teal/12 blur-[120px] glow-orb" />
        <div className="absolute bottom-0 -right-40 h-[500px] w-[500px] rounded-full bg-coral/12 blur-[120px] glow-orb-alt" />
      </div>
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile
        </Link>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function Wrap({
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
function TextField({
  label,
  value,
  onChange,
  hint,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  type?: string;
}) {
  return (
    <Wrap label={label} hint={hint}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm outline-none"
      />
    </Wrap>
  );
}
function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Wrap label={label}>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm outline-none resize-none"
      />
    </Wrap>
  );
}
function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Wrap label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface">
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}
function CampusField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data = [] } = useQuery({ queryKey: ["campuses"], queryFn: fetchCampuses });
  return (
    <Wrap label="Campus (optional)">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm outline-none"
      >
        <option value="">— none —</option>
        {data.map((c) => (
          <option key={c.id} value={c.id} className="bg-surface">
            {c.name}
          </option>
        ))}
      </select>
    </Wrap>
  );
}
function RegionField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Wrap label="Region (optional)">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm outline-none"
      >
        <option value="">— none —</option>
        {TZ_REGIONS.map((r) => (
          <option key={r} value={r} className="bg-surface">
            {r}
          </option>
        ))}
      </select>
    </Wrap>
  );
}
function TagChips({
  label,
  options,
  values,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
  }
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => toggle(o.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold border transition",
                on
                  ? "bg-teal text-teal-foreground border-teal"
                  : "bg-surface border-border text-muted-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
