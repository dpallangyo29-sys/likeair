import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScrollText } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — LikeAir" },
      {
        name: "description",
        content:
          "The rules of the road for buyers, sellers, gig posters and advertisers on LikeAir.",
      },
      { property: "og:title", content: "LikeAir — Terms & Conditions" },
      {
        property: "og:description",
        content: "Your rights, responsibilities and limits when using LikeAir.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-teal/15 blur-[120px] glow-orb" />
        <div className="absolute bottom-0 -right-40 h-[500px] w-[500px] rounded-full bg-coral/15 blur-[120px] glow-orb" />
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
            <ScrollText className="h-3 w-3" />
            TERMS &amp; CONDITIONS
          </div>
          <h1 className="mt-1 font-display text-4xl font-black leading-tight">
            The rules of the{" "}
            <span className="bg-gradient-to-r from-teal to-coral bg-clip-text text-transparent">
              LikeAir
            </span>
            .
          </h1>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Last updated: 17 Aug 2026 · Maintained by Aura Prime Co. for LikeAir.
          </p>
        </div>

        <div className="mt-8 space-y-4 text-sm leading-relaxed">
          <Section n="1" title="Who we are">
            LikeAir is a peer-to-peer marketplace and gig board operated by Aura Prime Co. for
            university students in Tanzania. LikeAir is a platform — it hosts listings and connects
            people. It is not a party to any deal between a buyer and a seller, or between a gig
            poster and a worker.
          </Section>
          <Section n="2" title="Who can use LikeAir">
            You must be at least 18 person, or a registered student at a Tanzanian university if you
            are a student. By signing up you confirm the information you give us — is yours and
            true. One person, one account.
          </Section>
          <Section n="3" title="What you can post">
            You may post products, gigs, or advertisements that are legal, honestly described, and
            belong to you (or which you are authorised to sell/offer). Photos must be your own.
            Prices must be accurate at posting time.
          </Section>
          <Section n="4" title="What you may NOT post">
            Weapons, drugs, counterfeit goods, stolen items, adult content, hate speech, scams,
            MLM/pyramid schemes, cheating services, or anything that violates Tanzanian law.
            Impersonation and fake reviews are forbidden. Anything suspicious from an account will
            be automaticlly flagged by our systems. We remove violating content and may suspend
            accounts.
          </Section>
          <Section n="5" title="How deals work">
            Buyers and sellers arrange payment and delivery directly (usually via WhatsApp and
            mobile money). LikeAir does not hold funds, escrow deals, or guarantee outcomes. Meet in
            safe, public places. Verify the item before you pay.
          </Section>
          <Section n="6" title="Your content, your rights">
            You keep ownership of everything you post. You grant LikeAir a limited licence to
            display, cache, and promote your content within the app so others can discover it. You
            can delete your posts at any time from your Profile.
          </Section>
          <Section n="7" title="Personalized feed">
            LikeAir quietly learns what you tap, save, search, and skip, and re-orders the feed to
            show what's most relevant to you. This runs on-device signals and anonymous events. See
            our Privacy page for the full picture.
          </Section>
          <Section n="8" title="Fees, boosts and ads">
            Posting is free while we grow. In the future, optional boosts and advertisements will be
            paid for by mobile money and deducted per impression or click. Basic posting will always
            have a free tier. You will see prices clearly before you pay.
          </Section>
          <Section n="9" title="Trust &amp; safety">
            We may use automated checks (including AI image checks) to flag suspicious listings such
            as fake photos and images or the ones taken from the internet. We may remove content,
            limit reach, or suspend accounts that break these rules. Report abuse to{" "}
            <a className="text-teal underline" href="mailto:hello@likeair.app">
              hello@likeair.app
            </a>
            .
          </Section>
          <Section n="10" title="Liability">
            LikeAir is provided "as is". We do our best but we are not responsible for the quality
            of any item, the outcome of any gig, or the behaviour of other users. Deal at your own
            risk and always meet safely.
          </Section>
          <Section n="11" title="Changes">
            We may update these terms as the app grows. Continuing to use LikeAir after an update
            means you accept the new terms.
          </Section>
          <Section n="12" title="Contact">
            Aura Prime Co., Arusha, Tanzania ·{" "}
            <a className="text-teal underline" href="mailto:hello@likeair.app">
              hello@likeair.app
            </a>
          </Section>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 text-xs">
          <Link
            to="/privacy"
            className="rounded-full bg-surface border border-border px-4 py-2 hover:border-teal/40 transition"
          >
            Read Privacy →
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

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-4">
      <div className="flex items-start gap-3">
        <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-teal to-coral grid place-items-center text-background text-[11px] font-black">
          {n}
        </div>
        <div>
          <div className="font-display font-bold">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}
