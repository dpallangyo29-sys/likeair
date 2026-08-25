import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Sparkles,
  Store,
  Briefcase,
  ShieldCheck,
  MessageCircle,
  Zap,
  HelpCircle,
  Download,
  Smartphone,
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About LikeAir — How it works & FAQs" },
      {
        name: "description",
        content:
          "Learn how LikeAir works — a P2P campus marketplace and gig board for Gen-Z students in Tanzania. Selling, posting gigs, safety, and more.",
      },
      { property: "og:title", content: "About LikeAir" },
      {
        property: "og:description",
        content: "How LikeAir works — sell, hustle, and hire on your campus.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AboutPage,
});

const faqs = [
  {
    q: "How do I sell something on LikeAir?",
    a: "Sign up (free), tap the Post button, choose 'Product', add a photo, title, price and your WhatsApp number. Buyers reach out directly via WhatsApp — no middleman.",
  },
  {
    q: "How do I post a gig or hire someone?",
    a: "Hit the Post button and pick 'Gig'. Add a title, budget optional, tags, and a short brief. People see it in the Gigs & Ops feed and apply through WhatsApp.",
  },
  {
    q: "Do I need to sign up to browse?",
    a: "No. Browsing is free and anonymous. You need an account to post, save, or express interest in a gig. Direct contact currently happens through WhatsApp.",
  },
  {
    q: "Is LikeAir free?",
    a: "Yes — 100% free while we grow. When the community is ready, we'll add optional 'boost' promotions with mobile-money top-ups. Basic posting stays free.",
  },
  {
    q: "Are my credentials safe?",
    a: "Yes. Your credentials are stored privately and never shown on your listings. Public profiles only show your name, avatar, and campus.",
  },
  {
    q: "How does the personalized feed work?",
    a: "LikeAir quietly learns what you tap, save, and search — then re-orders the feed so the most relevant listings for you show first. No accounts required for personalization.",
  },
  {
    q: "How do I stay safe?",
    a: "Meet in public spaces and coordinate safely. Verify the seller's rating & posts. Never send money before you see the item. Trust WhatsApp in touch before big purchases.",
  },
  {
    q: "How do I get the LikeAir App?",
    a: "Our official app can be accessed through download on our site, download the signed APK from the 'Get the LikeAir App' section on this page. Open the downloaded file, allow your browser or file manager or device to install apps when it asks, then tap Install. Only install LikeAir App downloaded from this official LikeAir site.",
  },
];

function AboutPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-teal/15 blur-[120px]" />
        <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-coral/15 blur-[120px]" />
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
            ABOUT LIKEAIR
          </div>
          <h1 className="mt-1 font-display text-4xl font-black leading-tight">
            The{" "}
            <span className="bg-gradient-to-r from-teal to-coral bg-clip-text text-transparent">
              feed
            </span>{" "}
            for what you actually need.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            LikeAir is a peer-to-peer marketplace and gig board built for what you need and exactly
            built for you. Sell your thing. Rent what want. But what you need. Find & Hire. All
            within your stance.
          </p>
        </div>

        {/* Pillars */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Pillar icon={<Store className="h-4 w-4" />} title="Campus Marketplace" tint="teal">
            Food, thrift, fashion, tech, furniture, electronics, beauty, books & academia — sold,
            near you. Every listing links to WhatsApp for direct chat.
          </Pillar>
          <Pillar
            icon={<Briefcase className="h-4 w-4" />}
            title="Gigs & Opportunities"
            tint="coral"
          >
            Micro-jobs, side hustles, part-time gigs and even employment posts posted by different
            people and local brands. Skill-based, you-first.
          </Pillar>
          <Pillar
            icon={<MessageCircle className="h-4 w-4" />}
            title="WhatsApp-native"
            tint="whatsapp"
          >
            No new inbox to learn. Every card has a green button that opens WhatsApp with a
            pre-filled greeting.
          </Pillar>
          <Pillar
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Trust-aware profiles"
            tint="teal"
          >
            Your credentials stay protected. Public profiles show only the information needed to
            help people recognize and contact you.
          </Pillar>
        </div>

        {/* How it works */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-black">How it works</h2>
          <ol className="mt-4 space-y-3">
            {[
              {
                t: "Pick your location",
                d: "Open LikeAir and choose your location or area. The feed re-orders to show what's near you.",
              },
              {
                t: "Browse or search",
                d: "Swipe through Marketplace and Gigs. Search or filter by category, hostel or budget.",
              },
              {
                t: "Sign up when ready",
                d: "Sign up (your email, number or Google) to post, save items, and contact posters.",
              },
              {
                t: "Chat on WhatsApp",
                d: "Tap the green button — LikeAir opens WhatsApp with a pre-filled message. Deal directly, safely, at your space.",
              },
              {
                t: "Get discovered",
                d: "Post once, get seen forever. The algorithm quietly re-ranks based on interest.",
              },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-3 rounded-2xl bg-surface border border-border p-4">
                <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-teal to-coral grid place-items-center text-background font-black text-sm">
                  {i + 1}
                </div>
                <div>
                  <div className="font-display font-bold">{s.t}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        <section className="mt-10">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-teal" />
            <h2 className="font-display text-2xl font-black">FAQs</h2>
          </div>
          <div className="mt-4 space-y-2">
            {faqs.map((f) => (
              <details key={f.q} className="rounded-2xl bg-surface border border-border p-4 group">
                <summary className="cursor-pointer font-semibold text-sm flex items-center justify-between gap-3">
                  {f.q}
                  <Zap className="h-3.5 w-3.5 text-teal group-open:rotate-90 transition" />
                </summary>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-border bg-gradient-to-br from-teal/10 via-transparent to-coral/10 p-6 text-center">
          <div className="font-display text-2xl font-black">Ready to jump in?</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign up free — post your first item or gig in under a minute.
          </p>
          <Link to="/auth" className="btn btn-primary mt-4">
            Get started
          </Link>
        </section>

        <section className="mt-8 rounded-3xl border border-teal/30 bg-surface p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal/15 text-teal">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold tracking-widest text-teal">
                COMING TO YOUR PHONE
              </div>
              <h2 className="mt-1 font-display text-2xl font-black">Get the LikeAir App</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The official LikeAir app will make your experience of the platform and discovering
                around you even easier. Download only the signed APK published officially here by
                LikeAir.
              </p>
            </div>
          </div>
          <a
            href="/downloads/likeair.apk"
            download="LikeAir.apk"
            aria-disabled="true"
            onClick={(event) => {
              event.preventDefault();
            }}
            className="mt-5 flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm font-bold text-muted-foreground"
          >
            <Download className="h-4 w-4" /> Download here
          </a>
          <div className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface-elevated p-3">
              <strong className="text-foreground">1. Download</strong>
              <p className="mt-1">Get the APK from this official page.</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-3">
              <strong className="text-foreground">2. Allow install</strong>
              <p className="mt-1">Allow installation if your device asks for it.</p>
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-3">
              <strong className="text-foreground">3. Install</strong>
              <p className="mt-1">Open the installed APK file, tap Install, then launch LikeAir.</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-2 sm:grid-cols-2 text-xs">
          <Link
            to="/terms"
            className="rounded-2xl bg-surface border border-border p-4 hover:border-teal/40 transition"
          >
            <div className="font-display font-bold text-sm">Terms &amp; Conditions</div>
            <div className="text-muted-foreground mt-1">
              What you can post, how deals work, and the rules of the road.
            </div>
          </Link>
          <Link
            to="/privacy"
            className="rounded-2xl bg-surface border border-border p-4 hover:border-coral/40 transition"
          >
            <div className="font-display font-bold text-sm">Privacy</div>
            <div className="text-muted-foreground mt-1">
              What we collect, why, and how you stay in control of your data.
            </div>
          </Link>
        </section>

        <footer className="mt-10 mb-6 text-center text-[10px] tracking-[0.2em] text-muted-foreground/70 uppercase">
          Powered by Aura Prime Co.
        </footer>
      </div>
    </div>
  );
}

function Pillar({
  icon,
  title,
  children,
  tint,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tint: "teal" | "coral" | "whatsapp";
}) {
  const tintClass =
    tint === "teal"
      ? "text-teal border-teal/30"
      : tint === "coral"
        ? "text-coral border-coral/30"
        : "text-whatsapp border-whatsapp/30";
  return (
    <div className={`rounded-2xl bg-surface border p-4 ${tintClass}`}>
      <div className="flex items-center gap-2">
        {icon}
        <div className="font-display font-bold text-sm text-foreground">{title}</div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
