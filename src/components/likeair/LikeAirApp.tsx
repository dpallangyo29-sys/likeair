import { lazy, Suspense, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  Store,
  ShoppingBag,
  Briefcase,
  Plus,
  MapPin,
  X,
  Info,
  LogIn,
  ChevronUp,
  Home,
  Bell,
  HandHelping,
  BadgeCheck,
  ShieldCheck,
  ArrowRight,
  Play,
  Pause,
} from "lucide-react";
import { createIntroMusicPlayer, type IntroMusicPlayer } from "@/lib/intro-music";
import { useQuery } from "@tanstack/react-query";
import { fetchCampuses, fetchGigs, fetchProducts, type GigRow, type ProductRow } from "@/lib/feed";
import { getEligiblePromotions, getPublicBusinesses, type EligiblePromotion } from "@/lib/business";
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
import {
  getCampusLastVisit,
  getCampusRemindersEnabled,
  setCampusLastVisit,
  setCampusRemindersEnabled,
} from "@/lib/campus-reminders";
import { normalizePhoneTZ } from "@/lib/phone";
import { timeAgo, tzs, whatsappLink } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ItemDetailDrawer = lazy(() =>
  import("./ItemDetailDrawer").then((module) => ({ default: module.ItemDetailDrawer })),
);

type MainTab = "today" | "market" | "gigs";
type DetailItem = { kind: "product"; data: ProductRow } | { kind: "gig"; data: GigRow };
const CAMPUS_TODAY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const FIRST_VISIT_KEY = "likeair.first-visit.completed.v1";
const FIRST_VISIT_LOCATION_KEY = "likeair.first-visit.location.v1";

function isRecentCampusPost(item: { created_at: string }) {
  const age = Date.now() - new Date(item.created_at).getTime();
  return age >= 0 && age <= CAMPUS_TODAY_MAX_AGE_MS;
}

function saveLocalLocationPreference(location: {
  campusId?: string | null;
  region?: string | null;
}) {
  if (typeof window === "undefined") return;
  if (location.campusId) {
    window.localStorage.setItem(FIRST_VISIT_LOCATION_KEY, `campus:${location.campusId}`);
  } else if (location.region) {
    window.localStorage.setItem(FIRST_VISIT_LOCATION_KEY, `region:${location.region}`);
  } else {
    window.localStorage.removeItem(FIRST_VISIT_LOCATION_KEY);
  }
}

export function LikeAirApp() {
  const { signedIn, user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();

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
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [lastVisitAt, setLastVisitAt] = useState<number | null>(null);

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
  const locationKey = region ? `region:${region}` : campusId ? `campus:${campusId}` : "all";

  useEffect(() => {
    setRecentSearches(getInterests().searches.slice(0, 6));
    setRemindersEnabled(getCampusRemindersEnabled());
  }, []);

  useEffect(() => {
    const previousVisit = getCampusLastVisit(locationKey);
    const visitTimestamp = previousVisit ?? Date.now();
    if (previousVisit === null) setCampusLastVisit(locationKey, visitTimestamp);
    setLastVisitAt(visitTimestamp);
  }, [locationKey]);

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
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(FIRST_VISIT_KEY) !== "1") {
      setOnboardingOpen(true);
      return;
    }
    if (!signedIn || !profile) return;
    const dismissed = window.localStorage.getItem("likeair.onboarding.dismissed") === "1";
    if (!profile.campus_id && !profile.region && !dismissed) setOnboardingOpen(true);
  }, [profile, signedIn]);

  const { data: campuses = [] } = useQuery({ queryKey: ["campuses"], queryFn: fetchCampuses });
  const activeCampus = campuses.find((c) => c.id === campusId) ?? null;
  useEffect(() => {
    if (typeof window === "undefined" || profileLoading || (signedIn && !profile)) return;
    if (profile?.campus_id || profile?.region || campusId || region) return;
    const savedLocation = window.localStorage.getItem(FIRST_VISIT_LOCATION_KEY);
    if (savedLocation?.startsWith("campus:")) {
      const savedCampusId = savedLocation.slice("campus:".length);
      if (campuses.some((campus) => campus.id === savedCampusId)) setCampusId(savedCampusId);
    } else if (savedLocation?.startsWith("region:")) {
      const savedRegion = savedLocation.slice("region:".length);
      if ((TZ_REGIONS as readonly string[]).includes(savedRegion)) setRegion(savedRegion);
    }
  }, [campuses, campusId, profile, profileLoading, region, signedIn]);
  const promotionsQ = useQuery({
    queryKey: ["eligible-promotions", locMode, activeCampus?.name, region],
    queryFn: () =>
      getEligiblePromotions(
        locMode === "region" ? (region ?? undefined) : (activeCampus?.name ?? undefined),
      ),
    staleTime: 60_000,
  });
  const businessesQ = useQuery({
    queryKey: ["public-business-directory"],
    queryFn: getPublicBusinesses,
    enabled: tab === "today",
    staleTime: 5 * 60_000,
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

  const todayProductsQ = useQuery({
    queryKey: ["today-products", campusId, region, debouncedQ],
    queryFn: () =>
      fetchProducts({
        campusId,
        region,
        category: "featured",
        q: debouncedQ || undefined,
        limit: 6,
      }),
    enabled: tab === "today",
    refetchInterval: tab === "today" && remindersEnabled ? 120_000 : false,
  });
  const todayGigsQ = useQuery({
    queryKey: ["today-gigs", campusId, region, debouncedQ],
    queryFn: () =>
      fetchGigs({
        campusId,
        region,
        category: "paid",
        q: debouncedQ || undefined,
        limit: 6,
      }),
    enabled: tab === "today",
    refetchInterval: tab === "today" && remindersEnabled ? 120_000 : false,
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
  const todayProducts = (todayProductsQ.data ?? []).filter(isRecentCampusPost);
  const todayGigs = (todayGigsQ.data ?? []).filter(isRecentCampusPost);
  const newCampusPostsCount =
    remindersEnabled && lastVisitAt !== null
      ? [...todayProducts, ...todayGigs].filter(
          (item) => new Date(item.created_at).getTime() > lastVisitAt,
        ).length
      : 0;

  function updateReminders(enabled: boolean) {
    setCampusRemindersEnabled(enabled);
    setRemindersEnabled(enabled);
    if (enabled) {
      const timestamp = Date.now();
      setCampusLastVisit(locationKey, timestamp);
      setLastVisitAt(timestamp);
    }
  }

  function markCampusUpdatesSeen() {
    const timestamp = Date.now();
    setCampusLastVisit(locationKey, timestamp);
    setLastVisitAt(timestamp);
  }

  // Log each visible item once per browser session to avoid inflating view counts
  // when React re-renders or when a page is appended.
  useEffect(() => {
    if (tab !== "market" && tab !== "today") return;
    const productsToTrack = tab === "today" ? todayProducts.slice(0, 8) : allProducts.slice(0, 8);
    productsToTrack.forEach((p) => {
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
  }, [tab, allProducts, todayProducts]);

  useEffect(() => {
    if (tab !== "gigs" && tab !== "today") return;
    const gigsToTrack = tab === "today" ? todayGigs.slice(0, 8) : allGigs.slice(0, 8);
    gigsToTrack.forEach((g) => {
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
  }, [tab, allGigs, todayGigs]);

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
                  alt="LikeAirGo"
                  className="h-full w-full"
                  width={36}
                  height={36}
                />
              </Link>
              <div className="leading-tight">
                <div className="font-display text-lg font-black tracking-tight">LikeAirGo</div>
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
                        tab === "gigs"
                          ? "Search gigs, skills… (finds tags too!)"
                          : "Search food, thrift, tech… (finds tags too!)"
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
                        saveLocalLocationPreference({});
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
                            saveLocalLocationPreference({ campusId: c.id });
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
                        saveLocalLocationPreference({});
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
                            saveLocalLocationPreference({ region: r });
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
        {tab !== "today" && (
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
        )}
      </header>

      {/* Hero strip */}
      <section className="mx-auto max-w-2xl px-4 pt-4">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface-elevated to-surface p-5">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-teal/25 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-coral/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-teal">
              <Sparkles className="h-3 w-3" />
              {tab === "today" ? "YOUR CAMPUS, TODAY" : "LIVE ON"}
            </div>
            <h1 className="mt-1 font-display text-2xl font-black leading-tight">
              {tab === "today"
                ? "Your campus, handled."
                : tab === "market"
                  ? "Buy, sell, hire, and hustle — around you."
                  : "Find your next gig — or the person who can help."}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground max-w-[85%]">
              {tab === "today"
                ? "Fresh listings, active opportunities, and approved local businesses around your campus."
                : tab === "market"
                  ? "Local products, services, and opportunities — shaped around your campus or region."
                  : "Micro-jobs, side hustles, freelance work, and local opportunities."}
            </p>
            {!signedIn && (
              <Link to="/auth" className="btn btn-primary mt-3">
                <LogIn className="h-3 w-3" />
                Join LikeAirGo — it's free
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
        {tab === "today" ? (
          <TodayHome
            campusLabel={activeCampus?.name ?? region ?? "All campuses"}
            signedIn={signedIn}
            remindersEnabled={remindersEnabled}
            newCampusPostsCount={newCampusPostsCount}
            onToggleReminders={updateReminders}
            onMarkUpdatesSeen={markCampusUpdatesSeen}
            onChooseCampus={() => setCampusOpen(true)}
            onExploreMarket={() => setTab("market")}
            products={todayProducts}
            gigs={todayGigs}
            productsLoading={todayProductsQ.isLoading}
            gigsLoading={todayGigsQ.isLoading}
            productsError={todayProductsQ.isError}
            gigsError={todayGigsQ.isError}
            onRetryProducts={() => todayProductsQ.refetch()}
            onRetryGigs={() => todayGigsQ.refetch()}
            businesses={businessesQ.data ?? []}
            businessesLoading={businessesQ.isLoading}
            businessesError={businessesQ.isError}
            onRetryBusinesses={() => businessesQ.refetch()}
            onOpenProduct={(product) => setDetail({ kind: "product", data: product })}
            onOpenGig={(gig) => setDetail({ kind: "gig", data: gig })}
          />
        ) : (
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
        )}
        {tab !== "today" && (
          <p className="mt-4 text-center text-[10px] tracking-widest text-muted-foreground/50 uppercase">
            ← Swipe to switch {tab === "market" ? "to Gigs" : "to Marketplace"} →
          </p>
        )}

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
            active={tab === "today"}
            onClick={() => setTab("today")}
            icon={<Home className="h-4 w-4" />}
            label="Today"
          />
          <TabButton
            active={tab === "market"}
            onClick={() => setTab("market")}
            icon={<Store className="h-4 w-4" />}
            label="Market"
          />
          <TabButton
            active={tab === "gigs"}
            onClick={() => setTab("gigs")}
            icon={<Briefcase className="h-4 w-4" />}
            label="Gigs"
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
          showTour={window.localStorage.getItem(FIRST_VISIT_KEY) !== "1"}
          onDone={async (location, interests) => {
            saveLocalPreferences(interests, location.campusId ?? location.region);
            saveLocalLocationPreference(location);
            if (user?.id) {
              const { error } = await supabase
                .from("profiles")
                .update({ campus_id: location.campusId ?? null, region: location.region ?? null })
                .eq("id", user.id);
              if (error) {
                console.error("Failed to save onboarding location:", error);
                toast.error("Preferences saved on this device, but not to your account.");
              }
            }
            if (location.campusId) {
              setCampusId(location.campusId);
              setRegion(null);
            } else {
              setRegion(null);
              if (location.region) setRegion(location.region);
              setCampusId(null);
            }
            window.localStorage.setItem(FIRST_VISIT_KEY, "1");
            window.localStorage.setItem("likeair.onboarding.dismissed", "1");
            setOnboardingOpen(false);
          }}
          onSkip={() => {
            window.localStorage.setItem(FIRST_VISIT_KEY, "1");
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

function PromotionStrip({ promotions }: { promotions: EligiblePromotion[] }) {
  const [selectedPromotion, setSelectedPromotion] = useState<EligiblePromotion | null>(null);
  const selectedPhone = normalizePhoneTZ(selectedPromotion?.business_phone ?? "");

  return (
    <>
      <section className="mb-4 rounded-2xl border border-teal/30 bg-teal/5 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-widest text-teal">
          <Sparkles className="h-3 w-3" /> FREE BUSINESS PROMOTIONS
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {promotions.map((promotion) => (
            <button
              key={promotion.id}
              type="button"
              onClick={() => setSelectedPromotion(promotion)}
              className="min-w-[230px] flex-1 overflow-hidden rounded-xl border border-border bg-surface text-left transition hover:border-teal/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              aria-label={`View promotion ${promotion.title} from ${promotion.business_name}`}
            >
              {promotion.image_url && (
                <img src={promotion.image_url} alt="" className="h-24 w-full object-cover" />
              )}
              <div className="p-3">
                <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-teal">
                  Free promotion · Tap for details
                </div>
                <div className="text-sm font-bold line-clamp-2">{promotion.title}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {promotion.category} · {promotion.location}
                </div>
                {promotion.message && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {promotion.message}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-teal">
                  <Store className="h-3 w-3" />
                  {promotion.business_name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
      <Dialog
        open={selectedPromotion !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPromotion(null);
        }}
      >
        {selectedPromotion && (
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            {selectedPromotion.image_url && (
              <img
                src={selectedPromotion.image_url}
                alt=""
                className="max-h-64 w-full rounded-xl object-cover"
              />
            )}
            <DialogHeader>
              <div className="text-[10px] font-bold uppercase tracking-widest text-teal">
                Free promotion · {selectedPromotion.category} · {selectedPromotion.location}
              </div>
              <DialogTitle>{selectedPromotion.title}</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap">
                {selectedPromotion.message ||
                  "Contact the business to learn more about this offer."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              {selectedPromotion.business_logo_url ? (
                <img
                  src={selectedPromotion.business_logo_url}
                  alt=""
                  className="h-11 w-11 rounded-lg object-cover"
                />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-teal/10 text-teal">
                  <BadgeCheck className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{selectedPromotion.business_name}</div>
                <div className="text-[11px] text-muted-foreground">Approved LikeAirGo business</div>
              </div>
              <BadgeCheck className="ml-auto h-4 w-4 shrink-0 text-teal" aria-label="Verified" />
            </div>
            {selectedPhone ? (
              <a
                href={whatsappLink(
                  selectedPhone,
                  `Hi, I saw your promotion "${selectedPromotion.title}" on LikeAirGo.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-3 text-sm font-bold text-white"
              >
                Contact on WhatsApp <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">
                This business has not provided a contact number.
              </p>
            )}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

type PublicBusiness = Awaited<ReturnType<typeof getPublicBusinesses>>[number];

function TodayHome({
  campusLabel,
  signedIn,
  remindersEnabled,
  newCampusPostsCount,
  onToggleReminders,
  onMarkUpdatesSeen,
  onChooseCampus,
  onExploreMarket,
  products,
  gigs,
  productsLoading,
  gigsLoading,
  productsError,
  gigsError,
  onRetryProducts,
  onRetryGigs,
  businesses,
  businessesLoading,
  businessesError,
  onRetryBusinesses,
  onOpenProduct,
  onOpenGig,
}: {
  campusLabel: string;
  signedIn: boolean;
  remindersEnabled: boolean;
  newCampusPostsCount: number;
  onToggleReminders: (enabled: boolean) => void;
  onMarkUpdatesSeen: () => void;
  onChooseCampus: () => void;
  onExploreMarket: () => void;
  products: ProductRow[];
  gigs: GigRow[];
  productsLoading: boolean;
  gigsLoading: boolean;
  productsError: boolean;
  gigsError: boolean;
  onRetryProducts: () => void;
  onRetryGigs: () => void;
  businesses: PublicBusiness[];
  businessesLoading: boolean;
  businessesError: boolean;
  onRetryBusinesses: () => void;
  onOpenProduct: (product: ProductRow) => void;
  onOpenGig: (gig: GigRow) => void;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-teal">
              Today on
            </div>
            <h2 className="mt-1 truncate font-display text-lg font-black">{campusLabel}</h2>
          </div>
          <button
            onClick={onChooseCampus}
            className="shrink-0 rounded-full border border-border px-3 py-2 text-[11px] font-bold text-muted-foreground hover:border-teal/50 hover:text-teal"
          >
            Change
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Recent marketplace posts, active opportunities, and an approved provider directory.
        </p>
      </section>

      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3">
        <PostAction
          signedIn={signedIn}
          intent="need"
          icon={<HandHelping className="h-5 w-5" />}
          label="Need help?"
          detail="Post a request"
        />
        <PostAction
          signedIn={signedIn}
          intent="offer"
          icon={<Briefcase className="h-5 w-5" />}
          label="Offer help"
          detail="Share a skill"
        />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold">Campus reminders</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {remindersEnabled
                ? "On for this device. Today checks for new posts while open and shows recent updates when you return."
                : "Opt in to see recent posts since your last visit. This setting stays on this device."}
            </p>
            <button
              onClick={() => onToggleReminders(!remindersEnabled)}
              className="mt-3 rounded-full border border-teal/30 bg-teal/5 px-3 py-1.5 text-[11px] font-bold text-teal hover:bg-teal/10"
            >
              {remindersEnabled ? "Turn reminders off" : "Turn reminders on"}
            </button>
          </div>
        </div>
        {remindersEnabled && newCampusPostsCount > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-coral/30 bg-coral/5 p-3">
            <p className="text-xs font-semibold">
              {newCampusPostsCount} new {newCampusPostsCount === 1 ? "post" : "posts"} since you
              last checked.
            </p>
            <button
              onClick={onMarkUpdatesSeen}
              className="shrink-0 text-[10px] font-bold text-coral hover:underline"
            >
              Mark seen
            </button>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-coral">
              THIS WEEK
            </div>
            <h2 className="mt-1 font-display text-lg font-black">Recent finds & opportunities</h2>
          </div>
          <button
            onClick={onExploreMarket}
            className="text-[11px] font-bold text-teal hover:underline"
          >
            Marketplace
          </button>
        </div>
        {(productsLoading || gigsLoading) && (
          <div className="rounded-2xl border border-border bg-surface p-4 text-xs text-muted-foreground">
            Loading fresh campus posts…
          </div>
        )}
        {productsError && (
          <ErrorState label="We couldn’t load today’s listings." onRetry={onRetryProducts} />
        )}
        {gigsError && (
          <ErrorState label="We couldn’t load today’s opportunities." onRetry={onRetryGigs} />
        )}
        {!productsLoading && !gigsLoading && !productsError && !gigsError && (
          <div className="space-y-2">
            {products.length === 0 && gigs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                No posts from the last week yet. Explore the full marketplace or be the first to
                share something useful.
              </div>
            ) : (
              <>
                {products.slice(0, 2).map((product) => (
                  <TodayProductCard
                    key={`product:${product.id}`}
                    product={product}
                    onOpen={() => onOpenProduct(product)}
                  />
                ))}
                {gigs.slice(0, 2).map((gig) => (
                  <TodayGigCard key={`gig:${gig.id}`} gig={gig} onOpen={() => onOpenGig(gig)} />
                ))}
              </>
            )}
          </div>
        )}
      </section>

      <BusinessDirectory
        businesses={businesses}
        loading={businessesLoading}
        error={businessesError}
        onRetry={onRetryBusinesses}
      />
    </div>
  );
}

function PostAction({
  signedIn,
  intent,
  icon,
  label,
  detail,
}: {
  signedIn: boolean;
  intent: "need" | "offer";
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  const className =
    "flex min-h-24 items-center gap-3 rounded-2xl border border-teal/25 bg-teal/5 p-4 text-left transition hover:border-teal/60 hover:bg-teal/10";
  const content = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{detail}</span>
      </span>
    </>
  );

  return signedIn ? (
    <Link to="/post" search={{ kind: "gig", intent }} className={className}>
      {content}
    </Link>
  ) : (
    <Link to="/auth" search={{ next: `/post?kind=gig&intent=${intent}` }} className={className}>
      {content}
    </Link>
  );
}

function TodayProductCard({ product, onOpen }: { product: ProductRow; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition hover:border-teal/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="truncate">{product.category}</span>
          <span>·</span>
          <span>{timeAgo(product.created_at)} ago</span>
        </div>
        <div className="mt-1 truncate text-sm font-bold">{product.title}</div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          {product.seller?.verified && (
            <span title="LikeAirGo-verified account">
              <BadgeCheck aria-hidden="true" className="h-3 w-3 text-teal" />
            </span>
          )}
          <span className="truncate">{product.seller?.full_name ?? "Campus seller"}</span>
          {product.seller?.business_verified && (
            <span className="text-whatsapp">Verified business</span>
          )}
        </div>
      </div>
      <div className="shrink-0 rounded-full bg-coral/10 px-2.5 py-1 text-xs font-black text-coral">
        {tzs(product.price)}
      </div>
    </button>
  );
}

function TodayGigCard({ gig, onOpen }: { gig: GigRow; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full rounded-2xl border border-border bg-surface p-3 text-left transition hover:border-teal/40"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {gig.urgent && <span className="font-black text-coral">URGENT ·</span>}
          <span>{gig.categories?.[0] ?? "Opportunity"}</span>
          <span>·</span>
          <span>{timeAgo(gig.created_at)} ago</span>
        </div>
        <span className="shrink-0 text-xs font-black text-teal">{gig.budget || "Negotiable"}</span>
      </div>
      <div className="mt-1 text-sm font-bold">{gig.title}</div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        {gig.poster?.verified && (
          <span title="LikeAirGo-verified account">
            <BadgeCheck aria-hidden="true" className="h-3 w-3 text-teal" />
          </span>
        )}
        <span>{gig.poster?.full_name ?? "Campus poster"}</span>
        {gig.poster?.business_verified && <span className="text-whatsapp">Verified business</span>}
      </div>
    </button>
  );
}

function BusinessDirectory({
  businesses,
  loading,
  error,
  onRetry,
}: {
  businesses: PublicBusiness[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <section>
      <div className="mb-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-teal">
          Campus essentials
        </div>
        <h2 className="mt-1 font-display text-lg font-black">Approved business directory</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Check each approved provider’s stated location and offer before contacting.
        </p>
      </div>
      {loading && (
        <div className="rounded-2xl border border-border bg-surface p-4 text-xs text-muted-foreground">
          Loading verified providers…
        </div>
      )}
      {error && <ErrorState label="We couldn’t load the local directory." onRetry={onRetry} />}
      {!loading && !error && businesses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
          The directory is growing. Approved local businesses will appear here.
        </div>
      )}
      {!loading && !error && businesses.length > 0 && (
        <div className="space-y-2">
          {businesses.slice(0, 5).map((business) => {
            const phone = normalizePhoneTZ(business.phone);
            return (
              <article
                key={business.id}
                className="rounded-2xl border border-border bg-surface p-3"
              >
                <div className="flex items-start gap-3">
                  {business.logo_url ? (
                    <img
                      src={business.logo_url}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal">
                      <BadgeCheck className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-sm font-bold">
                      <span className="truncate">{business.business_name}</span>
                      <span title="Approved by LikeAirGo">
                        <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-teal" />
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {business.category} · {business.location}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                      {business.offer}
                    </p>
                    {phone && (
                      <a
                        href={whatsappLink(
                          phone,
                          `Hi, I found ${business.business_name} in LikeAirGo's campus essentials directory.`,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-whatsapp hover:underline"
                      >
                        Contact on WhatsApp <ArrowRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function OnboardingPrompt({
  campuses,
  showTour,
  onDone,
  onSkip,
}: {
  campuses: { id: string; name: string }[];
  showTour: boolean;
  onDone: (
    location: { campusId: string; region?: never } | { campusId?: never; region: string },
    interests: string[],
  ) => Promise<void>;
  onSkip: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [tourStep, setTourStep] = useState(showTour ? 0 : -1);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const musicPlayerRef = useRef<IntroMusicPlayer | null>(null);
  const stopMusic = useCallback(() => {
    musicPlayerRef.current?.stop();
    musicPlayerRef.current = null;
    setMusicPlaying(false);
  }, []);
  useEffect(() => stopMusic, [stopMusic]);
  useEffect(() => {
    if (!videoPlaying) return;
    const timer = window.setTimeout(
      () => {
        if (tourStep >= 2) {
          setVideoPlaying(false);
          stopMusic();
        } else {
          setTourStep((step) => step + 1);
        }
      },
      shouldReduceMotion ? 5200 : 3400,
    );
    return () => window.clearTimeout(timer);
  }, [shouldReduceMotion, stopMusic, tourStep, videoPlaying]);
  const tourSlides = [
    {
      eyebrow: "FIND YOUR NEXT FAVOURITE",
      title: "A marketplace made for campus life.",
      description:
        "Discover products and local services from people around your campus. Browse first, then reach out when something feels right.",
      icon: <ShoppingBag className="h-8 w-8" />,
      color: "text-teal",
    },
    {
      eyebrow: "MAKE SOMETHING HAPPEN",
      title: "Turn skills into opportunities.",
      description:
        "Find a quick gig, offer a skill, or ask your community for a hand. Your next opportunity can start with one post.",
      icon: <Briefcase className="h-8 w-8" />,
      color: "text-coral",
    },
    {
      eyebrow: "CONNECT WITH CONFIDENCE",
      title: "You’re in control of the next step.",
      description:
        "Read listing details, check who you’re contacting, and arrange exchanges thoughtfully. LikeAirGo helps you discover; you choose who to trust.",
      icon: <ShieldCheck className="h-8 w-8" />,
      color: "text-whatsapp",
    },
  ];
  const options = [
    ["market", "Marketplace"],
    ["paid", "Gigs"],
    ["design", "Creative"],
    ["tech & electronics", "Electronics"],
    ["food, snacks & bites", "Food"],
    ["tutoring", "Education"],
    ["general", "Services"],
  ];
  const regions = TZ_REGIONS;
  const isRegion = TZ_REGIONS.some((region) => region === location);

  function toggleInterest(value: string) {
    setInterests((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-background/85 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-visit-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface-elevated shadow-2xl">
        {tourStep >= 0 ? (
          <div className="p-5 sm:p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/likeair_logo.svg" alt="" className="h-8 w-8" />
                <span className="font-display text-sm font-black">LIKEAIR QUICK TOUR</span>
              </div>
              <button
                onClick={onSkip}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-background"
              >
                Skip
              </button>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => {
                  if (videoPlaying) setVideoPlaying(false);
                  else {
                    setTourStep(0);
                    setVideoPlaying(true);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal/5 px-3 py-2 text-xs font-bold text-teal hover:bg-teal/10"
              >
                {videoPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {videoPlaying ? "Pause intro" : "Watch animated intro"}
              </button>
              <button
                onClick={async () => {
                  if (musicPlayerRef.current) {
                    stopMusic();
                    return;
                  }
                  try {
                    const player = createIntroMusicPlayer();
                    musicPlayerRef.current = player;
                    await player.context.resume();
                    if (musicPlayerRef.current === player) setMusicPlaying(true);
                  } catch (error) {
                    musicPlayerRef.current?.stop();
                    musicPlayerRef.current = null;
                    console.error("Could not start the original intro music:", error);
                    toast.error("Music could not start. You can still play the silent intro.");
                  }
                }}
                aria-pressed={musicPlaying}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-teal/40 hover:text-foreground"
              >
                <span aria-hidden="true">{musicPlaying ? "♫" : "♪"}</span>
                {musicPlaying ? "Music on" : "Play original music"}
              </button>
            </div>
            <div className="mb-5 flex gap-1.5" aria-label={`Step ${tourStep + 1} of 3`}>
              {tourSlides.map((slide, index) => (
                <div
                  key={slide.eyebrow}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    index <= tourStep ? "bg-teal" : "bg-border",
                  )}
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={tourStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="min-h-[265px] rounded-2xl border border-border bg-background/60 p-5"
              >
                <div className="relative mx-auto mb-5 grid h-24 w-24 place-items-center rounded-[2rem] border border-current/20 bg-surface shadow-lg">
                  <div
                    className={cn(
                      "absolute inset-2 rounded-[1.5rem] bg-current/10",
                      tourSlides[tourStep].color,
                    )}
                  />
                  <div className={cn("relative", tourSlides[tourStep].color)}>
                    {tourSlides[tourStep].icon}
                  </div>
                  <motion.div
                    aria-hidden
                    className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-teal"
                    animate={
                      shouldReduceMotion
                        ? { opacity: 1 }
                        : { scale: [1, 1.35, 1], opacity: [0.7, 1, 0.7] }
                    }
                    transition={{ duration: 1.8, repeat: shouldReduceMotion ? 0 : Infinity }}
                  />
                </div>
                <div className="text-center">
                  <div
                    className={cn(
                      "text-[10px] font-black tracking-[0.18em]",
                      tourSlides[tourStep].color,
                    )}
                  >
                    {tourSlides[tourStep].eyebrow}
                  </div>
                  <h2
                    id="first-visit-title"
                    className="mt-2 font-display text-xl font-black leading-tight"
                  >
                    {tourSlides[tourStep].title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {tourSlides[tourStep].description}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setVideoPlaying(false);
                  setTourStep((step) => Math.max(0, step - 1));
                }}
                disabled={tourStep === 0}
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-background disabled:invisible"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <span className="text-[11px] text-muted-foreground">
                {tourStep + 1} / {tourSlides.length}
              </span>
              <button
                onClick={() => {
                  if (videoPlaying) setVideoPlaying(false);
                  if (tourStep === tourSlides.length - 1) {
                    setTourStep(-1);
                    stopMusic();
                  } else setTourStep((step) => step + 1);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-teal px-4 py-2.5 text-xs font-black text-teal-foreground"
              >
                {tourStep === tourSlides.length - 1 ? "Choose my campus" : "Next"}
                {tourStep === tourSlides.length - 1 ? (
                  <MapPin className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-3 text-center text-[10px] text-muted-foreground">
              Original animated intro with optional synth music. Skip any time and explore freely.
            </p>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-teal">MAKE IT YOURS</div>
                <h2 id="first-visit-title" className="mt-1 font-display text-2xl font-black">
                  What should we show you?
                </h2>
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
        )}
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
          search={{}}
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
