import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, ArrowLeft, Mail, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

// Validation helpers
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

// Only same-origin relative paths may be used as a post-sign-in redirect.
function safeNext(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//"))
    return undefined;
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = safeNext(s.next);
    return next ? { next } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — LikeAir" },
      {
        name: "description",
        content: "Sign in to LikeAir to post items, gigs, and connect with your campus.",
      },
      { property: "og:title", content: "LikeAir — Join the campus feed" },
      {
        property: "og:description",
        content: "Sign in to unlock posting, saving, and personalized campus discovery.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { signedIn } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  function goNext() {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/" });
  }

  useEffect(() => {
    if (signedIn) goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!email || !isValidEmail(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!password || !isValidPassword(password)) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (mode === "up") {
      if (!fullName?.trim()) {
        toast.error("Please enter your full name.");
        return;
      }
      if (!acceptedTerms) {
        toast.error("Please accept the Terms & Privacy Policy to continue.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "up") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: next ? window.location.origin + next : window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        if (!data.session) {
          // Email confirmation is required on this project — no active session yet,
          // so we can't write to profiles (RLS) and shouldn't pretend sign-up finished.
          toast.success("Check your email to confirm your account, then sign in.");
          setEmail("");
          setPassword("");
          setFullName("");
          setPhone("");
          setAcceptedTerms(false);
          setMode("in");
          return;
        }

        // We have an active session — safe to save the extra signup fields.
        // (full_name/avatar are already set by the on_auth_user_created DB trigger;
        // this fills in phone + terms which the trigger doesn't know about.)
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user!.id,
          full_name: fullName || null,
          phone: phone || null,
          terms_accepted_at: new Date().toISOString(),
        });
        if (profileError) {
          console.error("[auth] profile upsert failed", profileError);
        }
        toast.success("Welcome to LikeAir! 🎉");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in successfully! 👋");
      }
      goNext();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong";
      // Provide more helpful error messages
      if (errorMsg.includes("already registered")) {
        toast.error("This email is already registered. Try signing in instead.");
      } else if (errorMsg.includes("Invalid login")) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-teal/15 blur-[120px]" />
        <div className="absolute bottom-0 -right-40 h-[500px] w-[500px] rounded-full bg-coral/15 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-md px-5 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-teal transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to feed
        </Link>

        <div className="mt-6">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-teal">
            <Sparkles className="h-3 w-3" />
            {mode === "up" ? "CREATE ACCOUNT" : "SIGN IN"}
          </div>
          <h1 className="mt-1 font-display text-3xl font-black">
            {mode === "up" ? "Join LikeAir" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "up"
              ? "Sign up is optional — but you'll need it to post, save, and message."
              : "Sign in to unlock posting and saved items."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "up" && (
            <>
              <Field label="Full name">
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Baraka M."
                  disabled={loading}
                />
              </Field>
              <Field label="Phone number (Tanzania) — optional">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="0712 000 000"
                  inputMode="tel"
                  disabled={loading}
                />
              </Field>
            </>
          )}
          <Field label="Email" icon={<Mail className="h-3.5 w-3.5 text-muted-foreground" />}>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="your email"
              disabled={loading}
              autoComplete={mode === "in" ? "email" : "off"}
            />
          </Field>
          <Field label="Password" icon={<Lock className="h-3.5 w-3.5 text-muted-foreground" />}>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Min. 6 characters"
              disabled={loading}
              autoComplete={mode === "in" ? "current-password" : "new-password"}
            />
          </Field>

          {mode === "up" && (
            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-teal"
                disabled={loading}
              />
              <span>
                I agree to LikeAir's{" "}
                <Link
                  to="/terms"
                  className="text-teal underline hover:text-teal/80"
                  target="_blank"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="text-teal underline hover:text-teal/80"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
          )}

          <button
            disabled={loading || (mode === "up" && !acceptedTerms)}
            type="submit"
            className="w-full rounded-2xl bg-teal text-teal-foreground py-3 text-sm font-black glow-teal disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Please wait…" : mode === "up" ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          {mode === "up" ? "Already have an account?" : "New to LikeAir?"}{" "}
          <button
            className="text-teal font-semibold"
            onClick={() => setMode(mode === "up" ? "in" : "up")}
          >
            {mode === "up" ? "Sign in" : "Create one"}
          </button>
        </p>

        <p className="mt-6 text-center text-[10px] text-muted-foreground/70">
          Your data stays private & secured.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="rounded-xl bg-surface border border-border px-3 py-2.5 focus-within:border-teal/60 transition">
        {children}
      </div>
    </label>
  );
}

