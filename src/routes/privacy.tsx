import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — LikeAir" },
      {
        name: "description",
        content:
          "What LikeAir collects, why, how long we keep it, and how you stay in control of your data.",
      },
      { property: "og:title", content: "LikeAir — Privacy" },
      { property: "og:description", content: "Your data, your rights on LikeAir." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-teal/15 blur-[120px] glow-orb" />
        <div className="absolute bottom-0 -left-40 h-[500px] w-[500px] rounded-full bg-coral/15 blur-[120px] glow-orb" />
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
            <ShieldCheck className="h-3 w-3" />
            PRIVACY
          </div>
          <h1 className="mt-1 font-display text-4xl font-black leading-tight">
            Your data.{" "}
            <span className="bg-gradient-to-r from-teal to-coral bg-clip-text text-transparent">
              Your rules.
            </span>
          </h1>
          <p className="mt-2 text-[11px] text-muted-foreground">
            This page is maintained by Aura Prime Co. for LikeAir. It is not an independent
            certification.
          </p>
        </div>

        <div className="mt-8 space-y-4 text-sm leading-relaxed">
          <Card title="What we collect">
            <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
              <li>
                <span className="text-foreground">Account basics</span>: email or Google identity,
                and the display name/avatar you choose.
              </li>
              <li>
                <span className="text-foreground">Listings</span>: titles, prices, photos and text
                you post yourself.
              </li>
              <li>
                <span className="text-foreground">Behaviour signals</span>: taps, opens, saves,
                searches, categories. Used to re-rank your feed.
              </li>
            </ul>
          </Card>

          <Card title="What we don't collect">
            <p className="text-xs text-muted-foreground">
              We do not sell your data. We do not track you on other websites. We do not read your
              WhatsApp chats — the WhatsApp button just opens WhatsApp with a pre-filled greeting.
            </p>
          </Card>

          <Card title="How we use it">
            <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
              <li>Run the marketplace and gig board.</li>
              <li>Rank your feed so it feels alive and relevant.</li>
              <li>Check listings for fraud, stolen photos, or policy violations.</li>
              <li>Contact you about your account or important updates.</li>
            </ul>
          </Card>

          <Card title="Who sees what">
            <p className="text-xs text-muted-foreground">
              Publicly visible on a listing: your display name, avatar, campus, listing details, and
              the WhatsApp number you attached to that post. Private to you: your sensitive
              credentials, saved posts, ledger, and behavioural signals. Private records can be
              accessed only when investigating abuse.
            </p>
          </Card>

          <Card title="Where we store it">
            <p className="text-xs text-muted-foreground">
              LikeAir runs on Supabase database and storage with Row-Level Security enabled. Listing
              photos and avatars are public media because they appear in the public feed; do not
              upload sensitive documents. Backend traffic is encrypted in transit.
            </p>
          </Card>

          <Card title="How long we keep it">
            <p className="text-xs text-muted-foreground">
              As long as your account is active. Delete a post and it's gone from the public feed
              immediately. Delete your account (email{" "}
              <a className="text-teal underline" href="mailto:hello@likeair.app">
                hello@likeair.app
              </a>
              ) and we remove your profile and listings within 30 days, subject to legal holds.
            </p>
          </Card>

          <Card title="Your controls">
            <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
              <li>Browse anonymously without an account.</li>
              <li>
                Edit or delete any post from{" "}
                <Link to="/profile" className="text-teal underline">
                  Profile → My Posts
                </Link>
                .
              </li>
              <li>
                Remove your credentials at any time; you'll just lose the filters they unlock.
              </li>
              <li>Request full deletion by email.</li>
            </ul>
          </Card>

          <Card title="AI checks">
            <p className="text-xs text-muted-foreground">
              LikeAir may enable an AI check on marketplace photos to flag stock images, fake
              photos, or images copied from the internet. When enabled, the image is scanned once at
              upload; we don't sell it or use it to train third-party models. This check is advisory
              and does not replace moderation.
            </p>
          </Card>

          <Card title="Money &amp; ads">
            <p className="text-xs text-muted-foreground">
              Boosts are not live yet. When they launch, transactions will be processed by regulated
              payment providers. We'll show you receipts inside your billing portal and never share
              it.
            </p>
          </Card>

          <Card title="Contact">
            <p className="text-xs text-muted-foreground">
              Questions or a data request? Email{" "}
              <a className="text-teal underline" href="mailto:hello@likeair.app">
                hello@likeair.app
              </a>
              .
            </p>
          </Card>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-xs">
          <Link
            to="/terms"
            className="rounded-full bg-surface border border-border px-4 py-2 hover:border-teal/40 transition"
          >
            Read Terms →
          </Link>
          <Link
            to="/about"
            className="rounded-full bg-surface border border-border px-4 py-2 hover:border-coral/40 transition"
          >
            About LikeAir
          </Link>
        </div>

        <footer className="mt-10 mb-6 text-center text-[10px] tracking-[0.2em] text-muted-foreground/70 uppercase">
          Powered by Aura Prime Co.
        </footer>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-4">
      <div className="font-display font-bold text-sm">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
