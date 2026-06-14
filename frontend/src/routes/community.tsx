import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Atom, Cpu, Code2, Sparkles, GitBranch, MessageSquare, LifeBuoy, Lightbulb,
  Users, MessagesSquare, Award, FolderGit2, ArrowRight, Calendar, MapPin,
  Star, TrendingUp, Eye, Reply, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SilicofellerLogo } from "@/components/silicofeller-logo";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — Silicofeller" },
      {
        name: "description",
        content:
          "Join 15,000+ quantum researchers, chip designers, and AI engineers building the future of quantum engineering together.",
      },
      { property: "og:title", content: "Silicofeller Community" },
      {
        property: "og:description",
        content: "Connect with quantum researchers, chip designers, and AI engineers.",
      },
    ],
  }),
  component: CommunityPage,
});

// ─── Animation variant ────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.05, ease: "easeOut" },
  }),
} as any;

function CSection({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-7xl px-6 md:px-10 ${className}`}>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function CommunityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <CommunityNav />
      <Hero />
      <Stats />
      <Channels />
      <Discussions />
      <Contributors />
      <Events />
      <Showcase />
      <Feedback />
      <CTA />
      <CommunityFooter />
    </div>
  );
}

// ─── Nav (uses existing SilicofellerLogo + auth) ──────────────────────────────
function CommunityNav() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <CSection className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="SilicoFeller home">
            <SilicofellerLogo />
          </Link>
          <Badge
            variant="secondary"
            className="rounded-full bg-accent-soft px-2 py-0 text-[10px] font-medium text-accent"
          >
            Community
          </Badge>
        </div>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a className="hover:text-foreground" href="#channels">Channels</a>
          <a className="hover:text-foreground" href="#discussions">Discussions</a>
          <a className="hover:text-foreground" href="#events">Events</a>
          <a className="hover:text-foreground" href="#showcase">Showcase</a>
          <Link to="/documentation" className="hover:text-foreground">Docs</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                <Link to="/designer">Open Designer</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                <Link to="/sign-up">Join Community</Link>
              </Button>
            </>
          )}
        </div>
      </CSection>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,theme(colors.violet.100/.5),transparent_60%)]" />
      <CSection className="relative grid gap-16 py-24 md:py-32 lg:grid-cols-12">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="lg:col-span-7"
        >
          <SectionLabel>15,247 members online now</SectionLabel>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl">
            Build the future of{" "}
            <span className="bg-gradient-to-r from-accent to-primary-glow bg-clip-text text-transparent">
              quantum engineering
            </span>{" "}
            together.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Connect with quantum researchers, chip designers, AI engineers, contributors, and
            industry experts shaping the next generation of computing.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-foreground px-6 text-background hover:bg-foreground/90"
            >
              <Link to="/sign-up">
                Join Community <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-border bg-background px-6"
              asChild
            >
              <a href="#discussions">Explore Discussions</a>
            </Button>
          </div>
          <div className="mt-12 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-violet-200 to-violet-400"
                />
              ))}
            </div>
            <span>Trusted by engineers at IBM, Google Quantum, Rigetti, and more.</span>
          </div>
        </motion.div>
        <HeroVisual />
      </CSection>
    </div>
  );
}

function HeroVisual() {
  const cards = [
    { name: "Dr. Aiko Tanaka", role: "Quantum Researcher · IBM", delta: "+128 pts", top: "0%", left: "10%" },
    { name: "Marcus Chen", role: "Chip Designer · Rigetti", delta: "Shipped QPU-v3", top: "32%", left: "55%" },
    { name: "Sara Okonkwo", role: "AI Engineer · Anthropic", delta: "Mentor", top: "62%", left: "8%" },
  ];
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={fadeUp}
      custom={1}
      className="relative h-[460px] lg:col-span-5"
    >
      <Card className="absolute inset-0 overflow-hidden rounded-3xl border-border bg-surface p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-accent" />
            Live community activity
          </div>
          <Badge variant="outline" className="rounded-full border-border text-[10px]">
            Realtime
          </Badge>
        </div>
        <ActivityChart />
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { v: "1.2k", l: "Posts today" },
            { v: "342", l: "PRs merged" },
            { v: "89", l: "Events" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-background p-3">
              <div className="text-lg font-semibold">{s.v}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </Card>
      {cards.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.15, duration: 0.6 }}
          className="absolute"
          style={{ top: c.top, left: c.left }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 4 + i, ease: "easeInOut" }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-background/95 px-3 py-2.5 shadow-[var(--shadow-card)] backdrop-blur"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-300 to-violet-500" />
            <div>
              <div className="text-xs font-semibold">{c.name}</div>
              <div className="text-[10px] text-muted-foreground">{c.role}</div>
            </div>
            <Badge className="ml-2 rounded-full bg-accent-soft text-[10px] font-medium text-accent hover:bg-accent-soft">
              {c.delta}
            </Badge>
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function ActivityChart() {
  const bars = [22, 38, 30, 52, 44, 68, 58, 80, 64, 92, 76, 88];
  return (
    <div className="mt-5 flex h-32 items-end gap-1.5">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ delay: i * 0.04, duration: 0.6, ease: "easeOut" }}
          className="flex-1 rounded-t-md bg-gradient-to-t from-accent/20 to-accent"
        />
      ))}
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { v: "15,000+", l: "Members", icon: Users },
    { v: "2,400+", l: "Discussions", icon: MessagesSquare },
    { v: "800+", l: "Contributors", icon: Award },
    { v: "120+", l: "Research Projects", icon: FolderGit2 },
  ];
  return (
    <CSection className="py-16 md:py-20">
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.l}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
          >
            <Card className="group relative overflow-hidden rounded-2xl border-border bg-surface p-6 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
              <div className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                <s.icon className="h-4 w-4" />
              </div>
              <div className="text-3xl font-semibold tracking-tight md:text-4xl">{s.v}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.l}</div>
            </Card>
          </motion.div>
        ))}
      </div>
    </CSection>
  );
}

// ─── Channels ─────────────────────────────────────────────────────────────────
function Channels() {
  const channels = [
    { name: "Quantum Research", desc: "Peer-reviewed discussions on theory & experiments.", icon: Atom, members: "3.2k", activity: "12 min ago" },
    { name: "Quantum Chip Design", desc: "Layouts, fabrication, and tape-out workflows.", icon: Cpu, members: "1.8k", activity: "4 min ago" },
    { name: "Qiskit Metal", desc: "Open EDA for superconducting circuits.", icon: GitBranch, members: "2.1k", activity: "Just now" },
    { name: "QCLang", desc: "Specification, compilers, and tooling.", icon: Code2, members: "960", activity: "21 min ago" },
    { name: "AI Engineering", desc: "Quantum × ML, optimization, and inference.", icon: Sparkles, members: "4.7k", activity: "2 min ago" },
    { name: "Open Source", desc: "Maintainers, RFCs, and contribution guides.", icon: GitBranch, members: "2.9k", activity: "8 min ago" },
    { name: "Product Feedback", desc: "Shape the roadmap with the team.", icon: Lightbulb, members: "1.4k", activity: "1 hr ago" },
    { name: "Help & Support", desc: "Get unblocked from the community.", icon: LifeBuoy, members: "5.3k", activity: "Just now" },
  ];
  return (
    <CSection id="channels" className="py-20 md:py-28">
      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <SectionLabel>Channels</SectionLabel>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Find your circle.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Specialized rooms for researchers, designers, and engineers.
          </p>
        </div>
        <Button variant="ghost" className="text-sm">
          Browse all channels <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {channels.map((c, i) => (
          <motion.div
            key={c.name}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i % 4}
          >
            <Card className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border-border bg-card p-5 transition-all duration-300 hover:border-accent/40 hover:shadow-[var(--shadow-glow)]">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent transition-transform group-hover:scale-110">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{c.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  {c.members}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {c.activity}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </CSection>
  );
}

// ─── Discussions ──────────────────────────────────────────────────────────────
function Discussions() {
  const items = [
    { title: "Best practices for coupling qubits in Qiskit Metal layouts", author: "marcus.chen", tags: ["Qiskit", "Quantum Chips"], replies: 48, views: "2.4k", time: "12m", hot: true },
    { title: "QCLang 0.7 RFC: pattern matching for gate sequences", author: "ai.tanaka", tags: ["QCLang", "Research"], replies: 31, views: "1.8k", time: "1h", hot: true },
    { title: "Comparing HFSS simulation results with measured QPU data", author: "s.okonkwo", tags: ["HFSS", "Research"], replies: 22, views: "1.1k", time: "3h", hot: false },
    { title: "Open source AI compiler for variational quantum circuits", author: "j.linwood", tags: ["AI", "QCLang"], replies: 67, views: "4.2k", time: "5h", hot: true },
    { title: "Tape-out checklist for first-time chip designers", author: "n.patel", tags: ["Quantum Chips"], replies: 14, views: "892", time: "yesterday", hot: false },
  ];
  return (
    <CSection id="discussions" className="py-20 md:py-28">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <SectionLabel>Trending</SectionLabel>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            What the community is discussing.
          </h2>
        </div>
        <Button variant="outline" className="hidden rounded-full md:inline-flex">
          New discussion
        </Button>
      </div>
      <Card className="overflow-hidden rounded-2xl border-border bg-card p-0">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5 text-accent" />
          Sorted by activity · last 24 hours
        </div>
        <ul className="divide-y divide-border">
          {items.map((d, i) => (
            <motion.li
              key={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
            >
              <a className="group block cursor-pointer px-5 py-5 transition-colors hover:bg-surface md:px-8 md:py-6">
                <div className="flex items-start gap-4">
                  <div className="hidden h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-violet-200 to-violet-400 md:block" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {d.hot && (
                        <Badge className="rounded-full bg-accent-soft px-2 py-0 text-[10px] text-accent hover:bg-accent-soft">
                          Hot
                        </Badge>
                      )}
                      <h3 className="truncate text-base font-medium tracking-tight transition-colors group-hover:text-accent">
                        {d.title}
                      </h3>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>by @{d.author}</span>
                      <span>·</span>
                      <span>{d.time}</span>
                      <div className="flex gap-1.5">
                        {d.tags.map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="rounded-md border-border bg-background px-1.5 py-0 text-[10px] font-normal"
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="hidden shrink-0 items-center gap-5 text-xs text-muted-foreground md:flex">
                    <span className="inline-flex items-center gap-1">
                      <Reply className="h-3.5 w-3.5" />
                      {d.replies}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {d.views}
                    </span>
                  </div>
                </div>
              </a>
            </motion.li>
          ))}
        </ul>
      </Card>
    </CSection>
  );
}

// ─── Contributors ─────────────────────────────────────────────────────────────
function Contributors() {
  const people = [
    { name: "Dr. Aiko Tanaka", role: "Quantum Researcher", score: 4820, badge: "Research Lead" },
    { name: "Marcus Chen", role: "Chip Designer", score: 3941, badge: "Core Contributor" },
    { name: "Sara Okonkwo", role: "AI Engineer", score: 3210, badge: "Mentor" },
    { name: "Jonas Linwood", role: "Compiler Engineer", score: 2870, badge: "Community Expert" },
  ];
  return (
    <CSection className="py-20 md:py-28">
      <div className="mb-10">
        <SectionLabel>Featured contributors</SectionLabel>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          The people moving the field forward.
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {people.map((p, i) => (
          <motion.div
            key={p.name}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
          >
            <Card className="group h-full overflow-hidden rounded-2xl border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-200 to-violet-500" />
                <div className="min-w-0">
                  <div className="truncate font-semibold tracking-tight">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.role}</div>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <Badge className="rounded-full bg-accent-soft text-[11px] font-medium text-accent hover:bg-accent-soft">
                  {p.badge}
                </Badge>
                <div className="text-right">
                  <div className="text-sm font-semibold">{p.score.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">points</div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </CSection>
  );
}

// ─── Events ───────────────────────────────────────────────────────────────────
function Events() {
  const events = [
    { title: "Quantum Chip Design Workshop", date: "Jun 24, 2026", attendees: "420 going", location: "San Francisco · In-person" },
    { title: "QCLang 0.7 Launch Livestream", date: "Jul 02, 2026", attendees: "2,180 going", location: "Online · YouTube" },
    { title: "Open Source Maintainers Meetup", date: "Jul 18, 2026", attendees: "260 going", location: "Berlin · In-person" },
  ];
  return (
    <CSection id="events" className="py-20 md:py-28">
      <div className="mb-10">
        <SectionLabel>Upcoming events</SectionLabel>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Where the community meets.
        </h2>
      </div>
      <div className="relative space-y-4">
        {events.map((e, i) => (
          <motion.div
            key={e.title}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
          >
            <Card className="grid items-center gap-6 rounded-2xl border-border bg-card p-6 md:grid-cols-[140px_1fr_auto]">
              <div className="rounded-xl border border-border bg-surface p-4 text-center">
                <div className="text-[10px] font-medium uppercase tracking-widest text-accent">
                  {e.date.split(",")[0].split(" ")[0]}
                </div>
                <div className="text-2xl font-semibold tracking-tight">
                  {e.date.split(" ")[1].replace(",", "")}
                </div>
                <div className="text-[10px] text-muted-foreground">{e.date.split(",")[1]}</div>
              </div>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{e.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {e.date}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {e.location}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {e.attendees}
                  </span>
                </div>
              </div>
              <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90">
                Join event
              </Button>
            </Card>
          </motion.div>
        ))}
      </div>
    </CSection>
  );
}

// ─── Showcase ─────────────────────────────────────────────────────────────────
function Showcase() {
  const projects = [
    { title: "Cryo-QPU Layout Studio", contributors: 18, stars: "1.2k", tech: ["Qiskit Metal", "HFSS"], hue: "from-violet-200 to-violet-500" },
    { title: "QCLang VS Code Extension", contributors: 9, stars: "842", tech: ["QCLang", "TypeScript"], hue: "from-indigo-200 to-violet-500" },
    { title: "AI Pulse Optimizer", contributors: 24, stars: "2.4k", tech: ["AI", "Quantum"], hue: "from-fuchsia-200 to-violet-500" },
  ];
  return (
    <CSection id="showcase" className="py-20 md:py-28">
      <div className="mb-10">
        <SectionLabel>Showcase</SectionLabel>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Built by the community.
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {projects.map((p, i) => (
          <motion.div
            key={p.title}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
          >
            <Card className="group overflow-hidden rounded-2xl border-border bg-card p-0 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
              <div className={`relative h-44 bg-gradient-to-br ${p.hue}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,.5),transparent_60%)]" />
                <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur">
                  <Star className="h-3 w-3 text-accent" /> {p.stars}
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-base font-semibold tracking-tight">{p.title}</h3>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-6 w-6 rounded-full border-2 border-card bg-gradient-to-br from-violet-200 to-violet-400" />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{p.contributors} contributors</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.tech.map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="rounded-md border-border bg-surface px-2 py-0 text-[10px] font-normal"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </CSection>
  );
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
function Feedback() {
  const quotes = [
    { name: "Lena Hoffmann", company: "Principal Engineer, Rigetti", quote: "The Silicofeller community is the single best place to discuss real-world QPU design challenges." },
    { name: "Daniel Park", company: "Research Scientist, IBM Quantum", quote: "RFC discussions here moved faster and were more rigorous than most academic forums I've been in." },
    { name: "Priya Nair", company: "Founder, Coherent Labs", quote: "We hired three of our first engineers from connections made in the Quantum Chip Design channel." },
  ];
  return (
    <CSection className="py-20 md:py-28">
      <div className="mb-10">
        <SectionLabel>What members say</SectionLabel>
        <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Trusted by engineers building the field.
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {quotes.map((q, i) => (
          <motion.div
            key={q.name}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
          >
            <Card className="h-full rounded-2xl border-border bg-card p-6">
              <MessageSquare className="h-5 w-5 text-accent" />
              <p className="mt-4 text-[15px] leading-relaxed text-foreground">"{q.quote}"</p>
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-200 to-violet-400" />
                <div>
                  <div className="text-sm font-semibold">{q.name}</div>
                  <div className="text-xs text-muted-foreground">{q.company}</div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </CSection>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <CSection className="py-20 md:py-28">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-8 py-20 text-center md:px-16">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 80% at 50% 100%, oklch(0.85 0.12 295 / 0.35), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(40% 60% at 50% 0%, oklch(0.9 0.08 295 / 0.25), transparent 70%)" }}
        />
        <div className="relative">
          <SectionLabel>Open invitation</SectionLabel>
          <h2 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Join the quantum engineering community.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
            Ship faster, learn deeper, and build alongside the people defining what's next.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-foreground px-7 text-background hover:bg-foreground/90"
            >
              <Link to="/sign-up">Join Community</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-border bg-background px-7"
              asChild
            >
              <a href="#discussions">Start Discussion</a>
            </Button>
          </div>
        </div>
      </div>
    </CSection>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function CommunityFooter() {
  return (
    <footer className="border-t border-border">
      <CSection className="flex flex-col items-center justify-between gap-4 py-10 text-xs text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-foreground text-background">
            <Atom className="h-3 w-3" />
          </div>
          <span>© 2026 Silicofeller. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <a className="hover:text-foreground cursor-pointer">Code of Conduct</a>
          <a className="hover:text-foreground cursor-pointer">Guidelines</a>
          <a className="hover:text-foreground cursor-pointer">Privacy</a>
        </div>
      </CSection>
    </footer>
  );
}
