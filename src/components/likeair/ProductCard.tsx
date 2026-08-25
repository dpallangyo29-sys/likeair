import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, BadgeCheck, Flame, Clock, Heart, Eye, Zap, Bookmark } from "lucide-react";
import type { ProductRow } from "@/lib/feed";
import { tzs, whatsappLink, timeAgo } from "@/lib/format";
import { recordRecentlyViewed, track } from "@/lib/tracking";

function ProductCardComponent({
  product,
  onOpen,
  onLike,
  onSave,
  isLiked = false,
  isSaved = false,
}: {
  product: ProductRow;
  onOpen: (p: ProductRow) => void;
  onLike?: (productId: string) => void;
  onSave?: (productId: string) => void;
  isLiked?: boolean;
  isSaved?: boolean;
}) {
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(product.like_count ?? 0);
  const [saved, setSaved] = useState(Boolean(isSaved));

  useEffect(() => {
    setLiked(isLiked);
  }, [isLiked]);

  useEffect(() => {
    setLikeCount(product.like_count ?? 0);
  }, [product.like_count]);

  useEffect(() => {
    setSaved(Boolean(isSaved));
  }, [isSaved]);

  const msg = useMemo(
    () => `Hi, I saw your listing for ${product.title} on LikeAir, is it still available ?`,
    [product.title],
  );
  const seller = product.seller;
  const image =
    product.image_url ||
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=70";

  // Check if product is boosted
  const isPromoted =
    (product.promoted_until && new Date(product.promoted_until) > new Date()) || false;

  const handleClick = useCallback(() => {
    recordRecentlyViewed({
      id: product.id,
      type: "product",
      title: product.title,
      subtitle: tzs(product.price),
      imageUrl: product.image_url,
      whatsapp: product.whatsapp,
    });
    track({
      event: "tap",
      itemType: "product",
      itemId: product.id,
      category: product.category,
      campus: product.campus_id,
    });
    onOpen(product);
  }, [product, onOpen]);

  const handleSave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onSave) return;
      const next = !saved;
      setSaved(next);
      onSave?.(product.id);
      track({
        event: "save",
        itemType: "product",
        itemId: product.id,
        category: product.category,
        campus: product.campus_id,
      });
    },
    [onSave, product.id, product.category, product.campus_id, saved],
  );

  const handleLike = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onLike) return;
      setLiked(!liked);
      setLikeCount(liked ? likeCount - 1 : likeCount + 1);
      onLike?.(product.id);
      track({ event: "tap", itemType: "product", itemId: product.id });
    },
    [liked, likeCount, product, onLike],
  );

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="cursor-pointer rounded-2xl bg-card border border-border overflow-hidden flex flex-col hover:border-teal/40 transition"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={image}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 top-0 p-2 flex items-start justify-between gap-1">
          <div className="flex gap-1 flex-wrap">
            {product.hot && (
              <span className="rounded-full bg-coral text-coral-foreground px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                <Flame className="h-3 w-3" /> HOT
              </span>
            )}
            {product.featured && !product.hot && (
              <span className="rounded-full bg-teal text-teal-foreground px-2 py-0.5 text-[10px] font-bold">
                FEATURED
              </span>
            )}
            {isPromoted && (
              <span className="rounded-full bg-yellow-500 text-yellow-950 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1">
                <Zap className="h-3 w-3" /> PROMOTED
              </span>
            )}
          </div>
          <span className="rounded-full bg-background/70 backdrop-blur px-2 py-0.5 text-[10px] flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {timeAgo(product.created_at)}
          </span>
        </div>
        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-background/90 to-transparent">
          <div className="rounded-full bg-coral text-coral-foreground px-2.5 py-1 text-xs font-black inline-block">
            {tzs(product.price)}
          </div>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="text-sm font-semibold leading-tight line-clamp-2">{product.title}</h3>

        {/* Engagement Stats */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 transition ${liked ? "text-coral" : "hover:text-coral/70"}`}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
            <span>{likeCount}</span>
          </button>
          <div className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            <span>{product.view_count ?? 0}</span>
          </div>
          <button
            onClick={handleSave}
            aria-label={saved ? "Remove from saved" : "Save listing"}
            className={`ml-auto flex items-center gap-1 transition ${saved ? "text-teal" : "hover:text-teal/80"}`}
          >
            <Bookmark className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
            <span>{saved ? "Saved" : "Save"}</span>
          </button>
        </div>

        {seller?.store_slug ? (
          <Link
            to="/store/$slug"
            params={{ slug: seller.store_slug }}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 mt-auto hover:opacity-80 transition group"
          >
            <img
              src={
                seller?.avatar_url ||
                "https://api.dicebear.com/7.x/thumbs/svg?seed=" + (seller?.id ?? "x")
              }
              alt={seller?.full_name || "Seller"}
              className="h-6 w-6 rounded-full object-cover bg-surface group-hover:ring-2 group-hover:ring-teal transition"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold truncate group-hover:text-teal transition">
                  {seller?.full_name || "Campus Seller"}
                </span>
                {seller?.verified && <BadgeCheck className="h-3 w-3 text-teal shrink-0" />}
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2 mt-auto">
            <img
              src={
                seller?.avatar_url ||
                "https://api.dicebear.com/7.x/thumbs/svg?seed=" + (seller?.id ?? "x")
              }
              alt=""
              className="h-6 w-6 rounded-full object-cover bg-surface"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold truncate">
                  {seller?.full_name || "Campus Seller"}
                </span>
                {seller?.verified && <BadgeCheck className="h-3 w-3 text-teal shrink-0" />}
              </div>
            </div>
          </div>
        )}
        {product.whatsapp ? (
          <a
            href={whatsappLink(product.whatsapp, msg)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              track({
                event: "whatsapp",
                itemType: "product",
                itemId: product.id,
                category: product.category,
                campus: product.campus_id,
              });
            }}
            className="w-full rounded-xl bg-whatsapp text-whatsapp-foreground py-2 text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-110 transition"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Chat on WhatsApp
          </a>
        ) : (
          <Link
            to="/auth"
            className="w-full rounded-xl bg-surface-elevated border border-border py-2 text-xs font-semibold text-center text-muted-foreground"
          >
            Sign in to contact
          </Link>
        )}
      </div>
    </motion.div>
  );
}

export const ProductCard = /* @__PURE__ */ React.memo(ProductCardComponent);
