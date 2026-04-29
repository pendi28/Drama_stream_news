import { Link, useLocation } from "wouter";
import { Search, Home, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const isWatch = loc.startsWith("/watch/");

  if (isWatch) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-4 sm:px-6 max-w-7xl w-full mx-auto pb-24 pt-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-lg">
            D
          </div>
          <span className="font-bold text-lg text-glow">DramaStream</span>
        </Link>
        <Link
          href="/search"
          className="hover-elevate w-10 h-10 rounded-full bg-card border border-card-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}

function BottomNav() {
  const [loc] = useLocation();
  const items = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/foryou", icon: Sparkles, label: "For You" },
    { href: "/search", icon: Search, label: "Search" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-white/5">
      <div className="max-w-7xl mx-auto grid grid-cols-3">
        {items.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/" ? loc === "/" : loc.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "py-3 flex flex-col items-center gap-0.5 text-[11px] transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
