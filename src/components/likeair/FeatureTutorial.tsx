import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  LockKeyhole,
  Pause,
  Play,
  ShoppingBag,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { createIntroMusicPlayer, type IntroMusicPlayer } from "@/lib/intro-music";
import { cn } from "@/lib/utils";

const steps = [
  {
    label: "Browse",
    title: "Find a listing worth keeping.",
    description:
      "Explore the Marketplace feed. Open a listing to see its details before you decide.",
    screen: "market",
  },
  {
    label: "Sign in",
    title: "Sign in to save it to your account.",
    description:
      "Saving is available to LikeAirGo members. Sign in or create your free account, then return to the listing.",
    screen: "signin",
  },
  {
    label: "Save",
    title: "Tap the bookmark on the listing.",
    description:
      "Choose Save on a product or gig. The bookmark fills in to show it has been saved.",
    screen: "saved",
  },
  {
    label: "Find later",
    title: "Your saved items live in your profile.",
    description:
      "Open your profile and choose Saved to revisit products and gigs or remove an item.",
    screen: "profile",
  },
] as const;

export function FeatureTutorial() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const playerRef = useRef<IntroMusicPlayer | null>(null);

  const stopMusic = useCallback(() => {
    playerRef.current?.stop();
    playerRef.current = null;
    setMusicOn(false);
  }, []);

  useEffect(() => stopMusic, [stopMusic]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(
      () => {
        if (step === steps.length - 1) {
          setPlaying(false);
          stopMusic();
        } else setStep((current) => current + 1);
      },
      reduceMotion ? 5000 : 3800,
    );
    return () => window.clearTimeout(timer);
  }, [playing, reduceMotion, step, stopMusic]);

  async function toggleMusic() {
    if (playerRef.current) {
      stopMusic();
      return;
    }
    try {
      const player = createIntroMusicPlayer();
      playerRef.current = player;
      await player.context.resume();
      if (playerRef.current === player) setMusicOn(true);
    } catch (error) {
      playerRef.current?.stop();
      playerRef.current = null;
      console.error("Could not start tutorial music:", error);
      toast.error("Music could not start. The tutorial is still available without sound.");
    }
  }

  function changeStep(nextStep: number) {
    setPlaying(false);
    setStep(Math.max(0, Math.min(steps.length - 1, nextStep)));
    if (nextStep >= steps.length - 1) stopMusic();
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-4 py-6 pb-12 text-foreground sm:py-10">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-teal/15 blur-[120px]" />
        <div className="absolute -right-40 top-1/2 h-[500px] w-[500px] rounded-full bg-coral/15 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to LikeAirGo
        </Link>

        <header className="mt-7">
          <div className="text-[10px] font-black tracking-[0.2em] text-teal">
            QUICK TUTORIAL · 15 SEC
          </div>
          <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">
            Save a listing and find it later
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            A short click-by-click guide to saving products and gigs. This demo is illustrative; it
            won’t change your account or save a real listing.
          </p>
        </header>

        <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal/10 text-teal">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs font-bold">Save & find listings</div>
                <div className="text-[10px] text-muted-foreground">Products and gigs</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (playing) setPlaying(false);
                  else {
                    setStep(0);
                    setPlaying(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal/30 bg-teal/5 px-3 py-2 text-[11px] font-bold text-teal hover:bg-teal/10"
              >
                {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {playing ? "Pause" : "Play tutorial"}
              </button>
              <button
                onClick={toggleMusic}
                aria-label={musicOn ? "Turn music off" : "Play optional original music"}
                aria-pressed={musicOn}
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-teal"
              >
                {musicOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[1.1fr_0.9fr]">
            <div className="relative flex min-h-[285px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-background p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={steps[step].screen}
                  initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="w-full max-w-xs"
                >
                  <DemoScreen screen={steps[step].screen} />
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-3 right-3 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Demo · not a live account
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div>
                <div className="flex gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
                  {steps.map((item, index) => (
                    <button
                      key={item.label}
                      onClick={() => changeStep(index)}
                      aria-label={`Go to step ${index + 1}: ${item.label}`}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        index <= step ? "bg-teal" : "bg-border",
                      )}
                    />
                  ))}
                </div>
                <div className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-teal">
                  STEP {step + 1} · {steps[step].label}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                  >
                    <h2 className="mt-2 font-display text-2xl font-black leading-tight">
                      {steps[step].title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {steps[step].description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="mt-7 flex items-center justify-between">
                <button
                  onClick={() => changeStep(step - 1)}
                  disabled={step === 0}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-background disabled:invisible"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {step + 1} of {steps.length}
                </span>
                <button
                  onClick={() => changeStep((step + 1) % steps.length)}
                  className="inline-flex items-center gap-1 rounded-full bg-teal px-4 py-2.5 text-xs font-black text-teal-foreground"
                >
                  {step === steps.length - 1 ? "Replay" : "Next"}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/50 px-4 py-4 sm:px-6">
            <p className="text-[10px] text-muted-foreground">
              Optional original synth music · Starts only when you turn it on
            </p>
            {step === 0 && (
              <Link
                to="/"
                className="rounded-full border border-border px-3 py-2 text-[11px] font-bold hover:border-teal/40"
              >
                Browse listings
              </Link>
            )}
            {step === 1 && (
              <Link
                to="/auth"
                className="rounded-full border border-border px-3 py-2 text-[11px] font-bold hover:border-teal/40"
              >
                Sign in or join free
              </Link>
            )}
            {step === 2 && (
              <Link
                to="/"
                className="rounded-full border border-border px-3 py-2 text-[11px] font-bold hover:border-teal/40"
              >
                Try it on a listing
              </Link>
            )}
            {step === 3 && (
              <Link
                to="/profile"
                className="rounded-full border border-border px-3 py-2 text-[11px] font-bold hover:border-teal/40"
              >
                Open Saved items
              </Link>
            )}
          </div>
        </section>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
          Only use music when you choose to play it. The animation works silently and can be paused
          or stepped through manually.
        </p>
      </div>
    </main>
  );
}

function DemoScreen({ screen }: { screen: (typeof steps)[number]["screen"] }) {
  const reduceMotion = useReducedMotion();
  if (screen === "signin") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 text-center shadow-lg">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-teal/10 text-teal">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <div className="mt-3 text-sm font-black">Join LikeAirGo</div>
        <p className="mt-1 text-[10px] text-muted-foreground">Free account · Takes a moment</p>
        <div className="mt-4 rounded-xl bg-teal px-3 py-2 text-[10px] font-black text-teal-foreground">
          Sign in or create account
        </div>
      </div>
    );
  }

  if (screen === "profile") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-lg">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <CircleUserRound className="h-7 w-7 text-teal" />
          <div>
            <div className="text-xs font-black">Your Profile</div>
            <div className="text-[9px] text-muted-foreground">Identity · My Posts · Saved</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 rounded-full border border-border bg-background p-1 text-center text-[9px] font-bold">
          <span className="py-2 text-muted-foreground">Identity</span>
          <span className="py-2 text-muted-foreground">My Posts</span>
          <span className="rounded-full bg-teal py-2 text-teal-foreground">Saved</span>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-teal/25 bg-teal/5 p-3">
          <Bookmark className="h-4 w-4 fill-teal text-teal" />
          <div className="text-[10px] font-bold">Your saved products & gigs</div>
          <Check className="ml-auto h-4 w-4 text-teal" />
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <ShoppingBag className="h-4 w-4 text-teal" />
        <span className="text-[10px] font-black">
          {screen === "market" ? "Marketplace" : "Listing"}
        </span>
        <span className="ml-auto rounded-full bg-teal/10 px-2 py-1 text-[8px] font-bold text-teal">
          CAMPUS PICK
        </span>
      </div>
      <div className="p-3">
        <div className="flex gap-3 rounded-xl border border-border bg-background p-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal/25 to-coral/25 text-xl">
            🎧
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-black">Wireless headphones</div>
            <div className="mt-1 text-[9px] text-muted-foreground">Electronics · Near you</div>
            <div className="mt-2 text-[10px] font-black text-teal">45,000 TZS</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-background px-3 py-2">
          <span className="text-[9px] text-muted-foreground">Seller listing</span>
          <motion.span
            key={screen}
            animate={screen === "saved" && !reduceMotion ? { scale: [1, 1.12, 1] } : undefined}
            transition={{ duration: 0.45 }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[9px] font-black",
              screen === "saved" ? "bg-teal/15 text-teal" : "border border-border text-foreground",
            )}
          >
            <Bookmark className={cn("h-3 w-3", screen === "saved" && "fill-current")} />
            {screen === "saved" ? "Saved" : "Save"}
          </motion.span>
        </div>
        {screen === "saved" && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            className="mt-3 h-1 rounded-full bg-teal"
          />
        )}
      </div>
    </div>
  );
}
