import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SilicofellerLogo } from "@/components/silicofeller-logo";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — SilicoFeller" },
      {
        name: "description",
        content: "Research, insights, and updates from the SilicoFeller team.",
      },
    ],
  }),
  component: BlogPage,
});

const POSTS = [
  {
    slug: "ai-quantum-chip-design-next-decade",
    tag: "Research",
    title: "AI in quantum chip design: the next decade",
    excerpt:
      "How large language models are reshaping the way engineers approach qubit topology and error-correction layout generation.",
    date: "May 2025",
  },
  {
    slug: "fault-tolerant-quantum-chips",
    tag: "Quantum",
    title: "The future of fault-tolerant quantum chips",
    excerpt:
      "Surface codes, cat qubits, and the race to build error-corrected processors at scale.",
    date: "Apr 2025",
  },
  {
    slug: "automated-qubit-layout-generation",
    tag: "Engineering",
    title: "Automated qubit-layout generation, end to end",
    excerpt:
      "A deep dive into how SilicoFeller generates production-ready GDS files from a single natural-language prompt.",
    date: "Mar 2025",
  },
  {
    slug: "insights-from-quantum-labs",
    tag: "Industry",
    title: "Insights from leading quantum labs on AI workflows",
    excerpt:
      "We spoke to researchers at five national labs. Here's what they said about adopting AI-assisted design tools.",
    date: "Feb 2025",
  },
] as const;

const TAG_COLORS: Record<string, string> = {
  Research: "#F26B3A",
  Quantum: "#8A7B25",
  Engineering: "#F26B3A",
  Industry: "#8A7B25",
};

function BlogPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0A0F]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" aria-label="SilicoFeller home" className="flex items-center">
            <SilicofellerLogo className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild size="sm" className="rounded-full bg-white text-black hover:bg-white/90">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="text-white/70 hover:text-white">
                  <Link to="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="rounded-full bg-white text-black hover:bg-white/90">
                  <Link to="/sign-up">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        <h1 className="mt-8 text-4xl font-semibold tracking-tight">
          From the SilicoFeller blog.
        </h1>
        <p className="mt-3 text-white/60">
          Research, engineering, and industry insights from our team.
        </p>

        {/* Posts grid */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {POSTS.map((p) => (
            <div
              key={p.slug}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-all hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_20px_60px_-20px_rgba(242,107,58,0.2)]"
            >
              <div className="aspect-[16/9] w-full rounded-lg bg-gradient-to-br from-[#0A0A0F] via-[#8A7B25] to-[#F26B3A]" />
              <div className="mt-4 flex items-center justify-between">
                <p
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: TAG_COLORS[p.tag] ?? "#F26B3A" }}
                >
                  {p.tag}
                </p>
                <span className="text-xs text-white/40">{p.date}</span>
              </div>
              <h2 className="mt-2 text-base font-semibold leading-snug text-white group-hover:text-[#F26B3A] transition-colors">
                {p.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{p.excerpt}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#F26B3A]">
                Read more <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}