import { motion } from "motion/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Zap, Heart, Eye, Bookmark, UserPlus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { GigRow } from "@/lib/feed";
import { deadlineLabel, whatsappLink, timeAgo } from "@/lib/format";
import { recordRecentlyViewed, track } from "@/lib/tracking";
import { cn } from "@/lib/utils";

function GigCardComponent({
  gig,
  onOpen,
  onLike,
  onSave,
  onInterested,
  isLiked = false,
  isSaved = false,
  isInterested = false,
}: {
  gig: GigRow;
  onOpen: (g: GigRow) => void;
  onLike?: (gigId: string) => void;
  onSave?: (gigId: string) => void;
  onInterested?: (gigId: string) => void;
  isLiked?: boolean;
  isSaved?: boolean;
  isInterested?: boolean;
}) {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(gig.like_count ?? 0);
  const [saved, setSaved] = useState(Boolean(isSaved));

  useEffect(() => setLiked(isLiked), [isLiked]);
  useEffect(() => setLikeCount(gig.like_count ?? 0), [gig.like_count]);
  useEffect(() => setSaved(Boolean(isSaved)), [isSaved]);

  const msg = useMemo(
    () => `Hi, I'm interested in your gig post "${gig.title}" on LikeAir, is it still available?`,
    [gig.title],
  );
  const poster = gig.poster;
  const cat = gig.categories?.[0] ?? null;
  const isPromoted = Boolean(gig.promoted_until && new Date(gig.promoted_until) > new Date());
  const deadline = deadlineLabel(gig.deadline_at);

  const handleClick = useCallback(() => {
    recordRecentlyViewed({
      id: gig.id,
      type: "gig",
      title: gig.title,
      subtitle: gig.budget || "Negotiable",
      imageUrl: gig.image_url,
      whatsapp: gig.whatsapp,
    });
    track({ event: "tap", itemType: "gig", itemId: gig.id, category: cat, campus: gig.campus_id });
    onOpen(gig);
  }, [gig, cat, onOpen]);

  const handleLike = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!onLike) return;
      const next = !liked;
      setLiked(next);
      setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)));
      onLike?.(gig.id);
    },
    [gig.id, liked, onLike],
  );

  const handleSave = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!onSave) return;
      setSaved((value) => !value);
      onSave?.(gig.id);
      track({
        event: "save",
        itemType: "gig",
        itemId: gig.id,
        category: cat,
        campus: gig.campus_id,
      });
    },
    [cat, gig.campus_id, gig.id, onSave],
  );

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className={cn(
        "cursor-pointer rounded-2xl bg-card border overflow-hidden hover:border-teal/40 transition",
        gig.urgent ? "border-coral/40" : "border-border",
      )}
    >
      {gig.image_url && (
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={gig.image_url}
            alt={gig.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          {isPromoted && (
            <div className="absolute top-2 left-2 rounded-full bg-yellow-500 text-yellow-950 px-2 py-0.5 text-[10px] font-black flex items-center gap-1">
              <Zap className="h-3 w-3" /> PROMO
            </div>
          )}
        </div>
      )}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          {poster?.store_slug ? (
            <Link
              to="/store/$slug"
              params={{ slug: poster.store_slug }}
              onClick={(event) => event.stopPropagation()}
              className="flex items-center gap-2 min-w-0 hover:opacity-80 transition group flex-1"
            >
              <img
                src={
                  poster.avatar_url ||
                  "https://api.dicebear.com/7.x/thumbs/svg?seed=" + (poster.id ?? "x")
                }
                alt={poster.full_name || "Poster"}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-border bg-surface group-hover:ring-teal transition"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-xs font-semibold truncate group-hover:text-teal transition">
                  <span className="truncate">{poster.full_name || "Campus Poster"}</span>
                  {poster.verified && <span className="text-teal">✓</span>}
                  {poster.business_verified && <span className="text-[9px] text-whatsapp">Business</span>}
                </div>
                <div className="text-[10px] text-muted-foreground font-semibold">
                  {poster.verified ? "Verified" : "New"} • {timeAgo(gig.created_at)}
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <img
                src={
                  poster?.avatar_url ||
                  "https://api.dicebear.com/7.x/thumbs/svg?seed=" + (poster?.id ?? "x")
                }
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-2 ring-border bg-surface"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-xs font-semibold truncate">
                  <span className="truncate">{poster?.full_name || "Campus Poster"}</span>
                  {poster?.verified && <span className="text-teal">✓</span>}
                  {poster?.business_verified && <span className="text-[9px] text-whatsapp">Business</span>}
                </div>
                <div className="text-[10px] text-muted-foreground font-semibold">
                  {poster?.verified ? "Verified" : "New"} • {timeAgo(gig.created_at)}
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 shrink-0">
            {gig.urgent && (
              <span className="rounded-full bg-coral text-coral-foreground px-2 py-0.5 text-[10px] font-black flex items-center gap-1">
                <Zap className="h-3 w-3" /> URGENT
              </span>
            )}
          </div>
        </div>
        <h3 className="font-display text-base font-bold leading-snug">{gig.title}</h3>
        {deadline && <div className="text-[11px] font-semibold text-coral">{deadline}</div>}
        {gig.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {gig.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 transition ${liked ? "text-coral" : "hover:text-coral/70"}`}
            aria-label={liked ? "Unlike gig" : "Like gig"}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
            <span>{likeCount}</span>
          </button>
          <div className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            <span>{gig.view_count ?? 0}</span>
          </div>
          <button
            onClick={handleSave}
            aria-label={saved ? "Remove from saved" : "Save gig"}
            className={`ml-auto flex items-center gap-1 transition ${saved ? "text-teal" : "hover:text-teal/80"}`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
            <span>{saved ? "Saved" : "Save"}</span>
          </button>
        </div>
        {gig.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {gig.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-elevated border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget</div>
            <div className="font-display text-sm font-black text-coral">
              {gig.budget || "Negotiable"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onInterested ? (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onInterested(gig.id);
                }}
                disabled={isInterested}
                className="rounded-xl border border-teal/40 px-3 py-2.5 text-xs font-bold text-teal hover:bg-teal/10 transition disabled:opacity-70"
              >
                <UserPlus className="mr-1 inline h-3.5 w-3.5" />
                {isInterested ? "Interested" : "I'm interested"}
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={(event) => event.stopPropagation()}
                className="rounded-xl border border-border px-3 py-2.5 text-xs font-bold text-muted-foreground hover:border-teal/40 transition"
              >
                Sign in to apply
              </Link>
            )}
            {gig.whatsapp && (
              <a
                href={whatsappLink(gig.whatsapp, msg)}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  event.stopPropagation();
                  track({
                    event: "whatsapp",
                    itemType: "gig",
                    itemId: gig.id,
                    category: cat,
                    campus: gig.campus_id,
                  });
                }}
                className="rounded-xl bg-whatsapp text-whatsapp-foreground px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 hover:brightness-110 transition"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Apply / Chat
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const GigCard = /* @__PURE__ */ React.memo(GigCardComponent);
