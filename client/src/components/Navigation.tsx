import { useLocation } from "wouter";
import { Home, Clock, CheckCircle2, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: Home },
  { path: "/queued", label: "Queued", icon: Clock },
  { path: "/done", label: "Done", icon: CheckCircle2 },
  { path: "/add", label: "New", icon: Plus },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Navigation() {
  const [location, navigate] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 md:top-0 md:bottom-auto md:pb-0 md:pt-4 md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-around md:justify-start md:gap-1 h-16 px-2 rounded-2xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-2xl transition-colors duration-300">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2",
                  "px-3 md:px-4 py-2 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-[var(--foreground)] text-[var(--background)] shadow-inner"
                    : "text-[var(--glass-muted)] hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/5"
                )}
                title={item.label}
              >
                <Icon className={cn("w-5 h-5", isActive && "drop-shadow-glow")} />
                <span className="text-[10px] md:text-sm font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
