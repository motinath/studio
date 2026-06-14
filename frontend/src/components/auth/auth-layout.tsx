import { Link } from "@tanstack/react-router";
import { SilicofellerLogo } from "@/components/silicofeller-logo";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      {/* ambient gradient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 lg:px-10">
          <Link to="/sign-in" aria-label="Silicofeller home">
            <SilicofellerLogo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#" className="transition-colors hover:text-foreground">
              Platform
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Docs
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Contact
            </a>
          </nav>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="flex flex-col items-center justify-between gap-2 border-t border-border/60 px-6 py-5 text-xs text-muted-foreground sm:flex-row lg:px-10">
          <p>© {new Date().getFullYear()} Silicofeller, Inc. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground">
              Terms
            </a>
            <a href="#" className="hover:text-foreground">
              Security
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
