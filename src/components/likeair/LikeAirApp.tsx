import { lazy, Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDown,
  Search,
  Sparkles,
  Store,
  Briefcase,
  Plus,
  MapPin,
  X,
  Info,
  LogIn,
  ChevronUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchCampuses, fetchGigs, fetchProducts, type GigRow, type ProductRow } from "@/lib/feed";
import { marketCategories, gigCategories } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { personalizedSort } from "@/lib/interest";
import { getInterests, saveLocalPreferences, track } from "@/lib/tracking";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { TZ_REGIONS } from "@/lib/regions";
import { useDebouncedValue } from "@/lib/debounce";
import { deduplicateItems } from "@/lib/pagination";
import { toggleItemLike, getUserLikesMap, getUserSavesMap, toggleItemSave } from "@/lib/engagement";
import { getAnonSessionId } from "@/lib/session";
import { expressGigInterest, getUserGigInterestIds } from "@/lib/gig-interests";
import { ProductCard } from "./ProductCard";
import { GigCard } from "./GigCard";
import { ThemeToggle } from "./ThemeToggle";
import { toast } from "sonner";
import { getEligiblePromotions, type Promotion } from "@/lib/business";

const ItemDetailDrawer = lazy(() =>
  import("./ItemDetailDrawer").then((module) => ({ default: module.ItemDetailDrawer })),
);

type MainTab = "market" | "gigs";
type DetailItem = { kind: "product"; data: ProductRow } | { kind: "gig"; data: GigRow };

export function LikeAirApp() {
  const { signedIn, user } = useAuth();
  const { profile } = useProfile();

  const [campusId, setCampusId] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const [locMode, setLocMode] = useState<"campus" | "region">("campus");
  const [campusOpen, setCampusOpen] = useState(false);
  const [tab, setTab] = useState<MainTab>("market");
  const [marketCat, setMarketCat] = useState("featured");
  const [gigCat, setGigCat] = useState("paid");
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Pagination state
  const [productPage, setProductPage] = useState(0);
  const [gigPage, setGigPage] = useState(0);
  const [allProducts, setAllProducts] = useState<ProductRow[]>([]);
  const [allGigs, setAllGigs] = useState<GigRow[]>([]);
  const viewedItemsRef = useRef(new Set<string>());

  // Likes state
  const [userLikes, setUserLikes] = useState<Map<string, Set<string>>>(new Map());
  const [userSaves, setUserSaves] = useState<Map<string, Set<string>>>(new Map());
  const [interestedGigs, setInterestedGigs] = useState<Set<string>>(new Set());
  const [sessionId] = useState(() => getAnonSessionId());

  // Debounce search input (reduces API calls)
  const debouncedQ = useDebouncedValue(q, 300);

  useEffect(() => {
    setRecentSearches(getInterests().searches.slice(0, 6));
  }, []);

  useEffect(() => {
    if (profile?.campus_id) {
      setCampusId(profile.campus_id);
      setRegion(null);
    } else if (profile?.region) {
      setRegion(profile.region);
      setCampusId(null);
    }
  }, [profile]);

  useEffect(() => {
    if (typeof window === "undefined" || !signedIn || !profile) return;
    const dismissed = window.localStorage.getItem("likeair.onboarding.dismissed") === "1";
    if (!profile.campus_id && !profile.region && !dismissed) setOnboardingOpen(true);
  }, [profile, signedIn]);

  const { data: campuses = [] } = useQuery({ queryKey: ["campuses"], queryFn: fetchCampuses });
  const activeCampus = campuses.find((c) => c.id === campusId) ?? null;
  const promotionsQ = useQuery({
    queryKey: ["eligible-promotions", activeCampus?.name, region],
    queryFn: () => getEligiblePromotions(region ?? activeCampus?.name ?? undefined),
    staleTime: 60_000,
  });

  // Likes require authenticated ownership; browser session IDs are not trusted.
  useEffect(() => {
    if (!signedIn || !user?.id) {
      setUserLikes(new Map());
      return;
    }
    getUserLikesMap(user.id).then(setUserLikes).catch(console.error);
  }, [signedIn, user?.id]);

  useEffect(() => {
    const channel = supabase
      .channel("likeair-feed-counters")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          const updated = payload.new as ProductRow;
          setAllProducts((items) =>
            items.map((item) =>
              item.id === updated.id
                ? { ...item, like_count: updated.like_count, view_count: updated.view_count }
                : item,
            ),
          );
        },
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "gigs" }, (payload) => {
        const updated = payload.new as GigRow;
        setAllGigs((items) =>
          items.map((item) =>
            item.id === updated.id
              ? { ...item, like_count: updated.like_count, view_count: updated.view_count }
              : item,
          ),
        );
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!signedIn || !user?.id) {
      setInterestedGigs(new Set());
      return;
    }
    getUserGigInterestIds(
      user.id,
      allGigs.map((gig) => gig.id),
    )
      .then(setInterestedGigs)
      .catch(console.error);
  }, [allGigs, signedIn, user?.id]);

  useEffect(() => {
    if (!signedIn || !user?.id) {
      setUserSaves(new Map());
      return;
    }
    getUserSavesMap(user.id).then(setUserSaves).catch(console.error);
  }, [signedIn, user?.id]);

  // Fetch products with pagination
  const productsQ = useQuery({
    queryKey: ["products", campusId, region, marketCat, debouncedQ, productPage],
    queryFn: () =>
      fetchProducts({
        campusId,
        region,
        category: marketCat,
        q: debouncedQ || undefined,
        offset: productPage * 20,
        limit: 20,
      }),
    enabled: tab === "market",
  });

  // Fetch gigs with pagination
  const gigsQ = useQuery({
    queryKey: ["gigs", campusId, region, gigCat, debouncedQ, gigPage],
    queryFn: () =>
      fetchGigs({
        campusId,
        region,
        category: gigCat,
        q: debouncedQ || undefined,
        offset: gigPage * 20,
        limit: 20,
      }),
    enabled: tab === "gigs",
  });

  // Update all items when new page loads
  useEffect(() => {
    if (productPage === 0) {
      setAllProducts(productsQ.data ?? []);
    } else if (productsQ.data) {
      setAllProducts((prev) => deduplicateItems(prev, productsQ.data));
    }
  }, [productsQ.data, productPage]);

  useEffect(() => {
    if (gigPage === 0) {
      setAllGigs(gigsQ.data ?? []);
    } else if (gigsQ.data) {
      setAllGigs((prev) => deduplicateItems(prev, gigsQ.data));
    }
  }, [gigsQ.data, gigPage]);

  // Reset pagination when search/filters change
  useEffect(() => {
    setProductPage(0);
    setAllProducts([]);
  }, [debouncedQ, marketCat, campusId, region]);

  useEffect(() => {
    setGigPage(0);
    setAllGigs([]);
  }, [debouncedQ, gigCat, campusId, region]);

  const sortedProducts = useMemo(
    () => personalizedSort(allProducts, { activeCampus: campusId }),
    [allProducts, campusId],
  );
  const sortedGigs = useMemo(
    () => personalizedSort(allGigs, { activeCampus: campusId }),
    [allGigs, campusId],
  );

  // Log each visible item once per browser session to avoid inflating view counts
  // when React re-renders or when a page is appended.
  useEffect(() => {
    if (tab !== "market") return;
    allProducts.slice(0, 8).forEach((p) => {
      const key = `product:${p.id}`;
      if (viewedItemsRef.current.has(key)) return;
      viewedItemsRef.current.add(key);
      track({
        event: "view",
        itemType: "product",
        itemId: p.id,
        category: p.category,
        campus: p.campus_id,
      });
    });
  }, [tab, allProducts]);

  useEffect(() => {
    if (tab !== "gigs") return;
    allGigs.slice(0, 8).forEach((g) => {
      const key = `gig:${g.id}`;
      if (viewedItemsRef.current.has(key)) return;
      viewedItemsRef.current.add(key);
      track({
        event: "view",
        itemType: "gig",
        itemId: g.id,
        category: g.categories?.[0] ?? null,
        campus: g.campus_id,
      });
    });
  }, [tab, allGigs]);

  // Handle likes
  const handleProductLike = useCallback(
    async (productId: string) => {
      if (!user?.id) {
        window.location.href = "/auth";
        return;
      }
      try {
        const result = await toggleItemLike(user.id, "product", productId);
        if (result.success) {
          setUserLikes((prev) => {
            const newMap = new Map(prev);
            if (!newMap.has("product")) newMap.set("product", new Set());
            const productLikes = newMap.get("product")!;

            if (result.liked) {
              productLikes.add(productId);
            } else {
              productLikes.delete(productId);
            }
            return newMap;
          });

          // Update user interests in background
        }
      } catch (error) {
        console.error("Error toggling like:", error);
      }
    },
    [user?.id],
  );

  const handleGigLike = useCallback(
    async (gigId: string) => {
      if (!user?.id) {
        window.location.href = "/auth";
        return;
      }
      try {
        const result = await toggleItemLike(user.id, "gig", gigId);
        if (result.success) {
          setUserLikes((prev) => {
            const newMap = new Map(prev);
            if (!newMap.has("gig")) newMap.set("gig", new Set());
            const gigLikes = newMap.get("gig")!;

            if (result.liked) {
              gigLikes.add(gigId);
            } else {
              gigLikes.delete(gigId);
            }
            return newMap;
          });

          // Update user interests in background
        }
      } catch (error) {
        console.error("Error toggling like:", error);
      }
    },
    [user?.id],
  );

  const handleGigInterested = useCallback(
    async (gigId: string) => {
      if (!user?.id) return;
      try {
        await expressGigInterest(user.id, gigId);
        setInterestedGigs((current) => new Set(current).add(gigId));
        toast.success("Interest sent to the gig owner.");
      } catch (error) {
        console.error("Error expressing gig interest:", error);
        toast.error("Could not send your interest. Please try again.");
      }
    },
    [user?.id],
  );

  const handleProductSave = useCallback(
    async (productId: string) => {
      if (!user?.id) {
        window.location.href = "/auth";
        return;
      }
      const result = await toggleItemSave(user.id, "product", productId);
      if (!result.success) return;
      setUserSaves((prev) => {
        const next = new Map(prev);
        const ids = new Set(next.get("product") ?? []);
        if (result.saved) ids.add(productId);
        else ids.delete(productId);
        next.set("product", ids);
        return next;
      });
    },
    [user?.id],
  );

  const handleGigSave = useCallback(
    async (gigId: string) => {
      if (!user?.id) {
        window.location.href = "/auth";
        return;
      }
      const result = await toggleItemSave(user.id, "gig", gigId);
      if (!result.success) return;
      setUserSaves((prev) => {
        const next = new Map(prev);
        const ids = new Set(next.get("gig") ?? []);
        if (result.saved) ids.add(gigId);
        else ids.delete(gigId);
        next.set("gig", ids);
        return next;
      });
    },
    [user?.id],
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-28 overflow-x-hidden">
      {/* Ambient glows — richer, layered, less "white" feel */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--teal)_18%,transparent),transparent_55%),radial-gradient(ellipse_at_bottom_right,color-mix(in_oklab,var(--coral)_18%,transparent),transparent_55%)]" />
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-teal/25 blur-[130px] glow-orb" />
        <div className="absolute top-1/3 -right-40 h-[520px] w-[520px] rounded-full bg-coral/25 blur-[130px] glow-orb-alt" />
        <div className="absolute bottom-0 left-1/3 h-[460px] w-[460px] rounded-full bg-whatsapp/15 blur-[130px] glow-pulse" />
      </div>

      {/* Sticky Glass Header */}
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link to="/" className="relative h-9 w-9 rounded-xl overflow-hidden">
                <img
                  src="/likeair_logo.svg"
                  alt="LikeAir"
                  className="h-full w-full"
                  width={36}
                  height={36}
                />
              </Link>
              <div className="leading-tight">
                <div className="font-display text-lg font-black tracking-tight">LikeAir</div>
                <button
                  onClick={() => setCampusOpen((v) => !v)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-teal transition"
                >
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[180px]">
                    {locMode === "region"
                      ? (region ?? "All regions")
                      : (activeCampus?.name ?? "All")}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen((v) => !v)}
                className="h-9 w-9 grid place-items-center rounded-full bg-surface border border-border hover:border-teal/40 transition active:scale-95"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>
              <ThemeToggle />
              <Link
                to="/about"
                className="h-9 w-9 grid place-items-center rounded-full bg-surface border border-border hover:border-coral/40 transition active:scale-95"
              >
                <Info className="h-4 w-4" />
              </Link>
              {signedIn ? (
                <Link
                  to="/profile"
                  className="h-9 w-9 overflow-hidden rounded-full bg-teal text-teal-foreground glow-teal active:scale-95 transition"
                  aria-label="Open your profile"
                >
                  <img
                    src={
                      profile?.avatar_url ||
                      `https://api.dicebear.com/7.x/thumbs/svg?seed=${user?.id ?? "likeair"}`
                    }
                    alt=""
                    className="h-full w-full object-cover"
                    width={36}
                    height={36}
                  />
                </Link>
              ) : (
                <Link to="/auth" className="btn btn-primary hidden sm:inline-flex">
                  <LogIn className="h-3.5 w-3.5" />
                  Sign in
                </Link>
              )}
            </div>
          </div>

          {/* Search bar with smart suggestions */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-2xl bg-surface border border-border overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <input
                      autoFocus
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && q.trim()) {
                          track({ event: "search", search: q.trim() });
                          setRecentSearches(getInterests().searches.slice(0, 6));
                        }
                      }}
                      placeholder={
                        tab === "market"
                          ? "Search food, thrift, tech… (finds tags too!)"
                          : "Search gigs, skills… (finds tags too!)"
                      }
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                    {q && (
                      <button
                        onClick={() => setQ("")}
                        className="text-muted-foreground hover:text-foreground transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Search suggestions & recent searches */}
                  {q ? (
                    <div className="max-h-48 overflow-y-auto p-2 flex flex-col gap-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                        Smart search · tags, partial matches & typos
                      </div>
                    </div>
                  ) : recentSearches.length > 0 ? (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Recent searches
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((search) => (
                          <button
                            key={search}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setQ(search)}
                            className="rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs hover:border-teal/40 hover:text-teal transition"
                          >
                            {search}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Campus dropdown */}
          <AnimatePresence>
            {campusOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-3 rounded-2xl bg-surface-elevated border border-border overflow-hidden"
              >
                {/* Location mode — open to everyone: filter by campus or by region */}
                <div className="flex gap-1 p-1.5 border-b border-border">
                  <button
                    onClick={() => setLocMode("campus")}
                    className={cn(
                      "flex-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition",
                      locMode === "campus"
                        ? "bg-teal text-teal-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    Campuses
                  </button>
                  <button
                    onClick={() => setLocMode("region")}
                    className={cn(
                      "flex-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition",
                      locMode === "region"
                        ? "bg-coral text-coral-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    Regions
                  </button>
                </div>

                {locMode === "campus" ? (
                  <>
                    <button
                      onClick={() => {
                        setCampusId(null);
                        setRegion(null);
                        setCampusOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-surface transition",
                        !campusId && "text-teal",
                      )}
                    >
                      <span>All campuses</span>
                      <span className="text-[10px] font-mono text-muted-foreground">ALL</span>
                    </button>
                    <div className="max-h-64 overflow-y-auto">
                      {campuses.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setCampusId(c.id);
                            setRegion(null);
                            setCampusOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-surface transition",
                            c.id === campusId && "text-teal",
                          )}
                        >
                          <span>{c.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {c.short}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setRegion(null);
                        setCampusId(null);
                        setCampusOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-surface transition",
                        !region && "text-coral",
                      )}
                    >
                      <span>All regions</span>
                      <span className="text-[10px] font-mono text-muted-foreground">ALL</span>
                    </button>
                    <div className="max-h-64 overflow-y-auto">
                      {TZ_REGIONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setRegion(r);
                            setCampusId(null);
                            setCampusOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-surface transition",
                            r === region && "text-coral",
                          )}
                        >
                          <span>{r}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Category strip */}
        <div className="mx-auto max-w-2xl px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {(tab === "market" ? marketCategories : gigCategories).map((c) => {
              const active = tab === "market" ? marketCat === c.id : gigCat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    if (tab === "market") setMarketCat(c.id);
                    else setGigCat(c.id);
                    track({ event: "category", category: c.id });
                  }}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-xs font-semibold border transition whitespace-nowrap",
                    active
                      ? "bg-teal text-teal-foreground border-teal glow-teal"
                      : "bg-surface text-foreground/80 border-border hover:border-teal/40",
                  )}
                >
                  <span className="mr-1">{c.emoji}</span>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Hero strip */}
      <section className="mx-auto max-w-2xl px-4 pt-4">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface-elevated to-surface p-5">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-teal/25 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-coral/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-teal">
              <Sparkles className="h-3 w-3" />
              LIVE ON
            </div>
            <h1 className="mt-1 font-display text-2xl font-black leading-tight">
              {tab === "market"
                ? "Buy, sell, hire, and hustle — around you."
                : "Find your next gig — or the person who can help."}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground max-w-[85%]">
              {tab === "market"
                ? "Local products, services, and opportunities — shaped around your campus or region."
                : "Micro-jobs, side hustles, freelance work, and local opportunities."}
            </p>
            {!signedIn && (
              <Link to="/auth" className="btn btn-primary mt-3">
                <LogIn className="h-3 w-3" />
                Join LikeAir — it's free
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Feed — swipe left/right to switch between Marketplace and Gigs */}
      <main className="mx-auto max-w-2xl px-4 pt-5">
        {promotionsQ.data && promotionsQ.data.length > 0 && (
          <PromotionStrip promotions={promotionsQ.data} />
        )}
        <motion.div
          key={tab}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={(_, info) => {
            const threshold = 80;
            if (info.offset.x < -threshold && tab === "market") setTab("gigs");
            else if (info.offset.x > threshold && tab === "gigs") setTab("market");
          }}
          initial={{ opacity: 0, x: tab === "market" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="touch-pan-y"
        >
          {tab === "market" ? (
            <div className="grid grid-cols-2 gap-3">
              {productsQ.isLoading && productPage === 0 && <SkeletonGrid />}
              {productsQ.isError && (
                <ErrorState
                  label="We couldn't load marketplace listings."
                  onRetry={() => productsQ.refetch()}
                />
              )}
              {!productsQ.isLoading &&
                !productsQ.isError &&
                sortedProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onOpen={(d) => setDetail({ kind: "product", data: d })}
                    onLike={signedIn ? handleProductLike : undefined}
                    onSave={signedIn ? handleProductSave : undefined}
                    isLiked={userLikes.get("product")?.has(p.id) ?? false}
                    isSaved={userSaves.get("product")?.has(p.id) ?? false}
                  />
                ))}
              {!productsQ.isLoading && !productsQ.isError && sortedProducts.length === 0 && (
                <EmptyState
                  label={q ? `No matches for "${q}".` : "No listings yet. Be the first!"}
                />
              )}
              {!productsQ.isLoading &&
                !productsQ.isError &&
                productsQ.data &&
                productsQ.data.length === 20 && (
                  <div className="col-span-2">
                    <button
                      onClick={() => setProductPage((p) => p + 1)}
                      disabled={productsQ.isFetching}
                      className="w-full rounded-xl border border-teal/30 bg-teal/5 py-3 text-sm font-semibold text-teal hover:bg-teal/10 transition disabled:opacity-50"
                    >
                      {productsQ.isFetching ? "Loading..." : "Load More Listings"}
                    </button>
                  </div>
                )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {gigsQ.isLoading && gigPage === 0 && <SkeletonList />}
              {gigsQ.isError && (
                <ErrorState
                  label="We couldn't load gigs right now."
                  onRetry={() => gigsQ.refetch()}
                />
              )}
              {!gigsQ.isLoading &&
                !gigsQ.isError &&
                sortedGigs.map((g) => (
                  <GigCard
                    key={g.id}
                    gig={g}
                    onOpen={(d) => setDetail({ kind: "gig", data: d })}
                    onLike={signedIn ? handleGigLike : undefined}
                    onSave={signedIn ? handleGigSave : undefined}
                    onInterested={signedIn ? handleGigInterested : undefined}
                    isLiked={userLikes.get("gig")?.has(g.id) ?? false}
                    isSaved={userSaves.get("gig")?.has(g.id) ?? false}
                    isInterested={interestedGigs.has(g.id)}
                  />
                ))}
              {!gigsQ.isLoading && !gigsQ.isError && sortedGigs.length === 0 && (
                <EmptyState
                  label={q ? `No gigs match "${q}".` : "No gigs here yet. Post one below!"}
                />
              )}
              {!gigsQ.isLoading && !gigsQ.isError && gigsQ.data && gigsQ.data.length === 20 && (
                <button
                  onClick={() => setGigPage((p) => p + 1)}
                  disabled={gigsQ.isFetching}
                  className="rounded-xl border border-teal/30 bg-teal/5 py-3 text-sm font-semibold text-teal hover:bg-teal/10 transition disabled:opacity-50"
                >
                  {gigsQ.isFetching ? "Loading..." : "Load More Gigs"}
                </button>
              )}
            </div>
          )}
        </motion.div>

        <p className="mt-4 text-center text-[10px] tracking-widest text-muted-foreground/50 uppercase">
          ← Swipe to switch {tab === "market" ? "to Gigs" : "to Marketplace"} →
        </p>

        <footer className="pt-10 pb-2 text-center space-y-2">
          <div className="flex justify-center gap-3 text-[10px] uppercase tracking-widest">
            <Link to="/about" className="text-muted-foreground/70 hover:text-teal transition">
              About
            </Link>
            <span className="text-muted-foreground/30">·</span>
            <Link to="/terms" className="text-muted-foreground/70 hover:text-teal transition">
              Terms
            </Link>
            <span className="text-muted-foreground/30">·</span>
            <Link to="/privacy" className="text-muted-foreground/70 hover:text-teal transition">
              Privacy
            </Link>
          </div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground/70 uppercase">
            Powered by Aura Prime Co.
          </p>
        </footer>
      </main>

      {/* Floating Post button */}
      <Link
        to={signedIn ? "/post" : "/auth"}
        className="btn btn-coral pwa-post fixed right-5 z-30 px-5 py-3 text-sm"
      >
        <Plus className="h-4 w-4" />
        Post
      </Link>

      {/* Bottom Tab Nav */}
      <nav className="pwa-nav fixed left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md">
        <div className="glass rounded-full p-1.5 flex items-center gap-1 shadow-2xl">
          <TabButton
            active={tab === "market"}
            onClick={() => setTab("market")}
            icon={<Store className="h-4 w-4" />}
            label="Marketplace"
          />
          <TabButton
            active={tab === "gigs"}
            onClick={() => setTab("gigs")}
            icon={<Briefcase className="h-4 w-4" />}
            label="Gigs & Ops"
          />
        </div>
      </nav>

      {detail && (
        <Suspense fallback={null}>
          <ItemDetailDrawer
            item={detail}
            onClose={() => setDetail(null)}
            campusName={campuses.find((c) => c.id === detail.data.campus_id)?.name}
          />
        </Suspense>
      )}

      {onboardingOpen && (
        <OnboardingPrompt
          campuses={campuses}
          onDone={async (location, interests) => {
            saveLocalPreferences(interests, location.campusId ?? location.region);
            if (user?.id) {
              const { error } = await supabase
                .from("profiles")
                .update({ campus_id: location.campusId ?? null, region: location.region ?? null })
                .eq("id", user.id);
              if (error) console.error("Failed to save onboarding location:", error);
            }
            if (location.campusId) {
              setCampusId(location.campusId);
              setRegion(null);
            } else {
              setRegion(null);
              if (location.region) setRegion(location.region);
              setCampusId(null);
            }
            setOnboardingOpen(false);
          }}
          onSkip={() => {
            window.localStorage.setItem("likeair.onboarding.dismissed", "1");
            setOnboardingOpen(false);
          }}
        />
      )}

      {/* Signed-in tag */}
      {signedIn && user && (
        <div className="fixed top-3 right-3 z-50 text-[10px] font-mono text-teal/70 pointer-events-none">
          @{(user.email ?? "").split("@")[0]}
        </div>
      )}
    </div>
  );
}

function PromotionStrip({ promotions }: { promotions: Promotion[] }) {
  return (
    <section className="mb-4 rounded-2xl border border-teal/30 bg-teal/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-widest text-teal">
        <Sparkles className="h-3 w-3" /> PROMOTED ON LIKEAIR
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {promotions.map((promotion) => (
          <article key={promotion.id} className="min-w-[230px] flex-1 overflow-hidden rounded-xl border border-border bg-surface">
            {promotion.image_url && <img src={promotion.image_url} alt="" className="h-24 w-full object-cover" />}
            <div className="p-3">
              <div className="text-sm font-bold line-clamp-2">{promotion.title}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">{promotion.category} · {promotion.location}</div>
              {promotion.message && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{promotion.message}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function OnboardingPrompt({
  campuses,
  onDone,
  onSkip,
}: {
  campuses: { id: string; name: string }[];
  onDone: (
    location: { campusId: string; region?: never } | { campusId?: never; region: string },
    interests: string[],
  ) => Promise<void>;
  onSkip: () => void;
}) {
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const options = [
    ["market", "Marketplace"],
    ["paid", "Gigs"],
    ["design", "Creative"],
    ["tech & electronics", "Electronics"],
    ["food, snacks & bites", "Food"],
    ["tutoring", "Education"],
    ["general", "Services"],
  ];
  const regions = ["Dar es Salaam", "Arusha", "Dodoma", "Mbeya", "Mwanza"];
  const isRegion = regions.includes(location);

  function toggleInterest(value: string) {
    setInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 px-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface-elevated p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-teal">MAKE IT YOURS</div>
            <h2 className="mt-1 font-display text-2xl font-black">What should we show you?</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a place and a few interests. You can change them later from your profile.
            </p>
          </div>
          <button
            onClick={onSkip}
            aria-label="Skip setup"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Campus or city
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm outline-none focus:border-teal/60"
            >
              <option value="">Choose a place...</option>
              {campuses
                .filter((campus) => !campus.id.startsWith("custom:"))
                .map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              <optgroup label="Cities / regions">
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <div className="pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Interests
          </div>
          <div className="flex flex-wrap gap-2">
            {options.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleInterest(value)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold transition",
                  interests.includes(value)
                    ? "border-teal bg-teal text-teal-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-teal/50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 rounded-xl border border-border py-3 text-xs font-bold text-muted-foreground"
          >
            Skip for now
          </button>
          <button
            disabled={!location}
            onClick={() =>
              onDone(isRegion ? { region: location } : { campusId: location }, interests)
            }
            className="flex-1 rounded-xl bg-teal py-3 text-xs font-black text-teal-foreground disabled:opacity-40"
          >
            Personalize feed
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex-1 flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition",
        active
          ? "bg-teal text-teal-foreground glow-teal"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <div className="mb-3 text-3xl">✨</div>
      {label}
      <div className="mt-4">
        <Link
          to="/post"
          className="inline-flex items-center gap-1.5 rounded-full bg-teal text-teal-foreground px-4 py-2 text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" /> Post something
        </Link>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-surface border border-border overflow-hidden animate-pulse"
        >
          <div className="aspect-[4/5] bg-surface-elevated" />
          <div className="p-3 space-y-2">
            <div className="h-3 w-3/4 bg-surface-elevated rounded" />
            <div className="h-2 w-1/2 bg-surface-elevated rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
function SkeletonList() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-surface border border-border p-4 h-40 animate-pulse"
        />
      ))}
    </>
  );
}

function ErrorState({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className="col-span-full rounded-2xl border border-coral/30 bg-coral/5 p-6 text-center">
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">Check your connection and try again.</div>
      <button
        onClick={onRetry}
        className="mt-4 rounded-full bg-coral px-4 py-2 text-xs font-bold text-coral-foreground"
      >
        Retry
      </button>
    </div>
  );
}
