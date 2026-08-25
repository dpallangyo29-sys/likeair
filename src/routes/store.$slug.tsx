import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ShieldCheck, Store as StoreIcon, MapPin, PackageOpen } from "lucide-react";
import { fetchStoreBySlug, fetchStoreItems, type GigRow, type ProductRow } from "@/lib/feed";
import { ProductCard } from "@/components/likeair/ProductCard";
import { GigCard } from "@/components/likeair/GigCard";
import { ItemDetailDrawer } from "@/components/likeair/ItemDetailDrawer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/store/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.slug} — Store on LikeAir` },
      {
        name: "description",
        content: `Browse everything @${params.slug} is selling and offering on LikeAir.`,
      },
      { property: "og:title", content: `@${params.slug} on LikeAir` },
      {
        property: "og:description",
        content: "A student storefront on LikeAir — products, gigs and services in one place.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StorePage,
});

type DetailItem = { kind: "product"; data: ProductRow } | { kind: "gig"; data: GigRow };

function StorePage() {
  const { slug } = Route.useParams();
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [tab, setTab] = useState<"products" | "gigs">("products");

  const storeQ = useQuery({ queryKey: ["store", slug], queryFn: () => fetchStoreBySlug(slug) });
  const owner = storeQ.data ?? null;
  const itemsQ = useQuery({
    queryKey: ["store-items", owner?.id],
    enabled: !!owner?.id,
    queryFn: () => fetchStoreItems(owner!.id),
  });

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24 overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-teal/20 blur-[130px] glow-orb" />
        <div className="absolute bottom-0 -right-40 h-[520px] w-[520px] rounded-full bg-coral/20 blur-[130px] glow-orb-alt" />
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
        </Link>

        {storeQ.isLoading && (
          <div className="mt-10 text-sm text-muted-foreground">Loading store…</div>
        )}

        {!storeQ.isLoading && !owner && (
          <div className="mt-16 text-center space-y-2">
            <PackageOpen className="h-8 w-8 mx-auto text-muted-foreground" />
            <h1 className="font-display text-2xl font-black">Store not found</h1>
            <p className="text-sm text-muted-foreground">
              No LikeAir store uses the handle @{slug}.
            </p>
          </div>
        )}

        {owner && (
          <>
            <div className="mt-5 rounded-3xl border border-border bg-gradient-to-br from-surface via-surface-elevated to-surface p-5 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-teal/25 blur-3xl" />
              <div className="relative flex items-center gap-4">
                {owner.avatar_url ? (
                  <img
                    src={owner.avatar_url}
                    alt={owner.store_name ?? "Store"}
                    className="h-16 w-16 rounded-2xl object-cover border border-teal/30"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-surface-elevated grid place-items-center text-teal">
                    <StoreIcon className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className="font-display text-2xl font-black truncate">
                    {owner.store_name ?? owner.full_name ?? "Store"}
                  </h1>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-teal">@{owner.store_slug}</span>
                    {owner.verified && (
                      <span className="inline-flex items-center gap-1 text-whatsapp">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    )}
                    {(owner.region || owner.campus_id) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {owner.region ?? owner.campus_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {owner.store_bio && (
                <p className="relative mt-3 text-sm text-muted-foreground">{owner.store_bio}</p>
              )}
            </div>

            <div className="mt-5 flex gap-1 rounded-full bg-surface border border-border p-1">
              {(["products", "gigs"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-2 text-xs font-bold capitalize transition",
                    tab === t
                      ? "bg-teal text-teal-foreground glow-teal"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t} (
                  {t === "products"
                    ? (itemsQ.data?.products.length ?? 0)
                    : (itemsQ.data?.gigs.length ?? 0)}
                  )
                </button>
              ))}
            </div>

            <div className="mt-5">
              {tab === "products" ? (
                <div className="grid grid-cols-2 gap-3">
                  {(itemsQ.data?.products ?? []).map((p) => (
                    <ProductCard
                      key={p.id}
                      product={{ ...p, seller: owner as never }}
                      onOpen={(d) => setDetail({ kind: "product", data: d })}
                    />
                  ))}
                  {itemsQ.data && itemsQ.data.products.length === 0 && (
                    <div className="col-span-2 text-center text-xs text-muted-foreground py-10">
                      Nothing listed yet.
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(itemsQ.data?.gigs ?? []).map((g) => (
                    <GigCard
                      key={g.id}
                      gig={{ ...g, poster: owner as never }}
                      onOpen={(d) => setDetail({ kind: "gig", data: d })}
                    />
                  ))}
                  {itemsQ.data && itemsQ.data.gigs.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-10">
                      No gigs posted yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ItemDetailDrawer item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
