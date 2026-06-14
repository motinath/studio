import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SilicofellerLogo } from "@/components/silicofeller-logo";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/our-team")({
  head: () => ({
    meta: [
      { title: "Team — SilicoFeller" },
      {
        name: "description",
        content:
          "Meet the team behind SilicoFeller — quantum physicists, chip designers and AI researchers.",
      },
      { property: "og:title", content: "Team — SilicoFeller" },
      {
        property: "og:description",
        content: "Meet the minds building the design layer of the quantum stack.",
      },
    ],
  }),
  component: OurTeamPage,
});

type Member = { name: string; role: string; photo: string; isCeo?: boolean };

const TEAM: Member[] = [
  { name: "Manan", role: "Founder & CEO", photo: "/teams/CEO.jpeg", isCeo: true },
  { name: "Majeti Susanth", role: "Technical Lead & COO", photo: "/teams/sushanth.jpeg" },
  { name: "Motinath R", role: "Quantum(Hardware)", photo: "/teams/motinath.png" },
  { name: "Viswanath M", role: "AI and Automation", photo: "/teams/Viswanath M.jpeg" },
  { name: "Harshitha Kurra", role: "Quantum Research", photo: "/teams/Harshitha.jpeg" },
  { name: "Pushpam Raj", role: "AI and Automation", photo: "/teams/pushpam.jpeg" },
  { name: "Hema Sri Peddu", role: "Quantum Research", photo: "/teams/Hema Sri Peddu.jpeg" },
  { name: "Praveenya Karumuri", role: "Operational Manager", photo: "/teams/Praveenya.jpeg" },
  { name: "Aakash G", role: "AI and Automation", photo: "/teams/Aakash.jpeg" },
  { name: "Harshith G", role: "AI and Automation", photo: "/teams/harshith.jpeg" },
  { name: "Marthand Bhargav J", role: "AI and Automation", photo: "/teams/Bhargav.jpeg" },
  {
    name: "Pathan Eshrath Khanam",
    role: "Operational Manager",
    photo: "/teams/Pathan Eshrath.jpeg",
  },
  { name: "Monalisa Panigrahi", role: "AI and Automation", photo: "teams/monalisa1.png" },
  { name: "Patchava Hima Bindu", role: "Quantum Research", photo: "/teams/hima bindu.jpeg" },
  { name: "Muni Sankar", role: "Quantum Research", photo: "/teams/Muni.jpeg" },
  { name: "Bhargav Korupolu", role: "Quantum Software Developer", photo: "/teams/bhargav K.png" },
  { name: "Geepika G", role: "AI and Automation", photo: "/teams/geepika.png" },
  { name: "Sathwik Potu", role: "AI and Automation", photo: "/teams/Sathwik potu.jpeg" },
  { name: "Amrutha Varshini Manam", role: "AI and Automation", photo: "/teams/amrutha.jpeg" },
  { name: "Sathesh Kumar Itraju", role: "AI and Automation", photo: "/teams/sathesh1.png" },
  { name: "P Naga Yaswanth", role: "AI and Automation", photo: "/teams/yaswanth.jpeg" },
  { name: "G Naga Vamsi Subbarayudu", role: "AI and Automation", photo: "/teams/satya.jpeg" },
  { name: "Arasavelli Sai Sankar", role: "US Outreach", photo: "/teams/sai sankarr.jpeg" },
  { name: "Kiran sai Srinivas Patnaikuni", role: "US Outreach", photo: "/teams/srinivas.png" },

  
];

function OurTeamPage() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ordered = useMemo(() => {
    const ceo = TEAM.filter((m) => m.isCeo);
    const rest = TEAM.filter((m) => !m.isCeo);
    return [...ceo, ...rest];
  }, []);

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-black/10 bg-[#E8E6DE]/85 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl"
            : "border-b border-transparent bg-[#E8E6DE]/40 backdrop-blur-md"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 lg:px-10">
          <Link to="/" aria-label="SilicoFeller home" className="flex items-center">
            <SilicofellerLogo />
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-foreground/65 md:flex">
            <Link to="/" hash="about" className="transition-colors hover:text-foreground">
              About Us
            </Link>
            <Link to="/" hash="technology" className="transition-colors hover:text-foreground">
              Technology
            </Link>
            <Link to="/" hash="features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link to="/" hash="blog" className="transition-colors hover:text-foreground">
              Blog
            </Link>
            <Link to="/our-team" className="text-foreground transition-colors">
              Team
            </Link>
            <Link to="/" hash="contact" className="transition-colors hover:text-foreground">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button
                asChild
                className="h-9 rounded-full bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
              >
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button
                asChild
                className="h-9 rounded-full bg-foreground px-4 text-sm font-semibold text-background hover:bg-foreground/90"
              >
                <Link to="/sign-up">
                  Sign up <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <section className="px-6 py-16 lg:px-10 lg:py-24" style={{ background: "#E8E6DE" }}>
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#F26B3A]"></p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Meet the team
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-foreground/65">
            A blend of quantum physicists, chip designers and AI researchers building the design
            layer of the quantum stack.
          </p>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-10 lg:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {ordered.map((m, i) => (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: (i % 5) * 0.05 }}
                className="flex flex-col items-center text-center"
              >
                <div className="aspect-square w-32 overflow-hidden rounded-full bg-[#E8E6DE] sm:w-36">
                  <img
                    src={m.photo}
                    alt={m.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.05]"
                  />
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">{m.name}</p>
                <p className="mt-1 text-xs text-foreground/55">{m.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
