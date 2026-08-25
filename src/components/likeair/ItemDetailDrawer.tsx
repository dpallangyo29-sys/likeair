import { AnimatePresence, motion } from "motion/react";
import {
  X,
  MessageCircle,
  MapPin,
  Clock,
  BadgeCheck,
  Star,
  Zap,
  ShieldCheck,
  Flag,
} from "lucide-react";
import type { ProductRow, GigRow } from "@/lib/feed";
import { tzs, whatsappLink, timeAgo } from "@/lib/format";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { submitContentReport, type ContentReportReason } from "@/lib/content-reports";
import { toast } from "sonner";

type ItemDetail = { kind: "product"; data: ProductRow } | { kind: "gig"; data: GigRow };

export function ItemDetailDrawer({
  item,
  onClose,
  campusName,
}: {
  item: ItemDetail | null;
  onClose: () => void;
  campusName?: string;
}) {
  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-surface-elevated border-t border-border max-w-2xl mx-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 glass rounded-t-3xl">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-teal">
                {item.kind === "product" ? "Marketplace" : "Gig / Opportunity"}
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 grid place-items-center rounded-full bg-surface border border-border"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {item.kind === "product" ? (
              <ProductDetail p={item.data} campusName={campusName} />
            ) : (
              <GigDetail g={item.data} campusName={campusName} />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ProductDetail({ p, campusName }: { p: ProductRow; campusName?: string }) {
  const msg = `Hi, I saw your listing for ${p.title} on LikeAir, is it still available ?`;
  return (
    <div className="p-4 pb-10 space-y-4">
      {p.image_url && (
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
          <img src={p.image_url} alt={p.title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {timeAgo(p.created_at)}
        </span>
        {campusName && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {campusName}
          </span>
        )}
      </div>
      <h1 className="font-display text-2xl font-black">{p.title}</h1>
      <div className="inline-block rounded-full bg-coral text-coral-foreground px-3 py-1 text-sm font-black">
        {tzs(p.price)}
      </div>
      {p.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-line">{p.description}</p>
      )}

      {p.seller && (
        <div className="rounded-2xl bg-surface border border-border p-4 flex items-center gap-3">
          <img
            src={
              p.seller.avatar_url || `https://api.dicebear.com/7.x/thumbs/svg?seed=${p.seller.id}`
            }
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 font-semibold text-sm">
              {p.seller.full_name || "Campus Seller"}
              {p.seller.verified && <BadgeCheck className="h-4 w-4 text-teal" />}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              {p.seller.verified && (
                <span className="inline-flex items-center gap-1 text-teal">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-coral text-coral" /> LikeAir seller
              </span>
            </div>
          </div>
        </div>
      )}

      {p.whatsapp && (
        <a
          href={whatsappLink(p.whatsapp, msg)}
          target="_blank"
          rel="noreferrer"
          className="w-full rounded-xl bg-whatsapp text-whatsapp-foreground py-3 text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 transition"
        >
          <MessageCircle className="h-4 w-4" />
          Chat Seller on WhatsApp
        </a>
      )}
      <ReportButton targetType="product" targetId={p.id} />
    </div>
  );
}

function GigDetail({ g, campusName }: { g: GigRow; campusName?: string }) {
  const msg = `Hi, I'm interested in your gig "${g.title}" on LikeAir`;
  return (
    <div className="p-4 pb-10 space-y-4">
      {g.image_url && (
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
          <img src={g.image_url} alt={g.title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" /> {timeAgo(g.created_at)}
        </span>
        {campusName && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {campusName}
          </span>
        )}
        {g.urgent && (
          <span className="rounded-full bg-coral text-coral-foreground px-2 py-0.5 text-[10px] font-black flex items-center gap-1 shadow-sm">
            <Zap className="h-3 w-3" /> URGENT
          </span>
        )}
      </div>
      <h1 className="font-display text-2xl font-black leading-tight">{g.title}</h1>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget</div>
        <div className="font-display text-lg font-black text-coral">{g.budget || "Negotiable"}</div>
      </div>
      {g.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-line">{g.description}</p>
      )}
      {g.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {g.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-surface border border-border px-2.5 py-1 text-[11px] font-mono text-muted-foreground"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      {g.poster && (
        <div className="rounded-2xl bg-surface border border-border p-4 flex items-center gap-3">
          <img
            src={
              g.poster.avatar_url || `https://api.dicebear.com/7.x/thumbs/svg?seed=${g.poster.id}`
            }
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 font-semibold text-sm">
              {g.poster.full_name || "Campus Poster"}
              {g.poster.verified && <BadgeCheck className="h-4 w-4 text-teal" />}
            </div>
          </div>
        </div>
      )}
      {g.whatsapp && (
        <a
          href={whatsappLink(g.whatsapp, msg)}
          target="_blank"
          rel="noreferrer"
          className="w-full rounded-xl bg-whatsapp text-whatsapp-foreground py-3 text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 transition"
        >
          <MessageCircle className="h-4 w-4" />
          Apply / Chat on WhatsApp
        </a>
      )}
      <ReportButton targetType="gig" targetId={g.id} />
    </div>
  );
}

function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "product" | "gig";
  targetId: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ContentReportReason>("scam");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!user) {
      toast.error("Sign in to report a listing.");
      return;
    }
    setSending(true);
    try {
      await submitContentReport({
        reporterId: user.id,
        targetType,
        targetId,
        reason,
        details,
      });
      toast.success("Report submitted. Thank you for helping keep LikeAir safe.");
      setOpen(false);
      setDetails("");
    } catch (error) {
      toast.error(
        error instanceof Error && error.message.includes("duplicate")
          ? "You have already reported this listing."
          : "Could not submit report. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-border/60 pt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-coral transition"
        >
          <Flag className="h-3.5 w-3.5" /> Report this listing
        </button>
      ) : (
        <div className="rounded-2xl border border-coral/30 bg-coral/5 p-3 space-y-3">
          <div className="text-xs font-bold">What is wrong with this listing?</div>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as ContentReportReason)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-xs outline-none"
          >
            <option value="scam">Scam or suspicious behavior</option>
            <option value="fake">Fake or misleading product</option>
            <option value="spam">Spam</option>
            <option value="duplicate">Duplicate listing</option>
            <option value="wrong_category">Wrong category</option>
            <option value="inappropriate">Inappropriate content</option>
            <option value="other">Other</option>
          </select>
          <textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Add details (optional)"
            className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-xs outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl border border-border py-2 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={sending}
              className="flex-1 rounded-xl bg-coral py-2 text-xs font-bold text-coral-foreground disabled:opacity-60"
            >
              {sending ? "Sending..." : "Submit report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
