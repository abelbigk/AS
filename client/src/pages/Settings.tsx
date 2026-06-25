import { useEffect, useState, useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Moon, Sun, Monitor, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ContentCard from "@/components/ContentCard";
import CategorizeContentDialog from "@/components/CategorizeContentDialog";
import type { ContentItem } from "@/types";

const DARK_IMAGE = "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=1600&q=80";
const LIGHT_IMAGE = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80";

const THEME_OPTIONS = [
  { value: "light", label: "Light Mode", icon: Sun, desc: "Clean & bright" },
  { value: "dark", label: "Dark Mode", icon: Moon, desc: "Sleek & modern" },
] as const;

export default function Settings() {
  const { theme, setTheme: setThemeContext } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark">(
    (theme as "light" | "dark") || "dark"
  );
  const [contentToCategorize, setContentToCategorize] = useState<ContentItem | null>(null);

  const setThemeMutation = trpc.preferences.setTheme.useMutation({
    onSuccess: () => toast.success("Theme updated"),
  });

  const { data: uncategorizedContent, isLoading: uncategorizedLoading } = trpc.content.listUncategorized.useQuery();

  useEffect(() => {
    setSelectedTheme((theme as "light" | "dark") || "dark");
  }, [theme]);

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setSelectedTheme(newTheme);
    setThemeContext?.(newTheme);
    setThemeMutation.mutate(newTheme);
  };

  return (
    <div className="relative min-h-screen page-enter">
      {/* Blurred background */}
      <div className="fixed inset-0 -z-10">
        {/* Dark mode background — abstract dark waves */}
        <img src={DARK_IMAGE} alt="" className="hidden dark:block w-full h-full object-cover" />
        <div className="hidden dark:block absolute inset-0 backdrop-blur-xl bg-black/55" />
        {/* Light mode background — bright clean office */}
        <img src={LIGHT_IMAGE} alt="" className="block dark:hidden w-full h-full object-cover" />
        <div className="block dark:hidden absolute inset-0 backdrop-blur-xl bg-white/65" />
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        {/* Header */}
        <div className="mb-10 pt-2">
          <h1 className="text-4xl md:text-5xl font-bold font-playfair text-gray-900 dark:text-white drop-shadow-lg">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-white/60 text-base mt-2">Customize your experience</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Theme */}
          <div className="rounded-2xl bg-white dark:bg-white/10 backdrop-blur-sm border border-gray-200 dark:border-white/15 p-6">
            <h2 className="text-xl font-semibold font-playfair text-gray-900 dark:text-white mb-5">Theme</h2>
            <div className="grid grid-cols-2 gap-4">
              {THEME_OPTIONS.map((option) => {
                const isSelected = selectedTheme === option.value;
                const isLight = option.value === "light";
                return (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value)}
                    disabled={setThemeMutation.isPending}
                    className={cn(
                      "group relative flex flex-col items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all overflow-hidden",
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-lg shadow-blue-500/10"
                        : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10"
                    )}
                  >
                    {/* Mock UI Preview */}
                    <div className={cn(
                      "w-full h-24 rounded-lg border shadow-sm flex flex-col overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]",
                      isLight ? "bg-gray-50 border-gray-200" : "bg-zinc-950 border-white/10"
                    )}>
                      {/* Mock Header */}
                      <div className={cn(
                        "h-6 w-full flex items-center px-2 gap-1.5",
                        isLight ? "bg-white border-b border-gray-100" : "bg-zinc-900 border-b border-white/5"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full", isLight ? "bg-gray-200" : "bg-white/10")} />
                        <div className={cn("w-2 h-2 rounded-full", isLight ? "bg-gray-200" : "bg-white/10")} />
                      </div>
                      {/* Mock Body */}
                      <div className="flex-1 p-2 flex gap-2">
                        {/* Sidebar */}
                        <div className={cn("w-1/3 h-full rounded", isLight ? "bg-gray-200/50" : "bg-white/5")} />
                        {/* Content area */}
                        <div className="flex-1 flex flex-col gap-1.5">
                          <div className={cn("w-full h-3 rounded", isLight ? "bg-blue-100" : "bg-blue-500/20")} />
                          <div className={cn("w-2/3 h-2 rounded", isLight ? "bg-gray-200" : "bg-white/10")} />
                          <div className={cn("w-1/2 h-2 rounded", isLight ? "bg-gray-200" : "bg-white/10")} />
                        </div>
                      </div>
                    </div>

                    {/* Text info */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <option.icon className={cn("w-5 h-5", isSelected ? "text-blue-500" : "text-gray-500 dark:text-gray-400")} />
                        <span className={cn(
                          "font-semibold",
                          isSelected ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                        )}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {option.desc}
                      </p>
                    </div>

                    {/* Selected Check */}
                    {isSelected && (
                      <div className="absolute top-4 right-4 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Uncategorized Content */}
          <div className="rounded-2xl bg-white dark:bg-white/10 backdrop-blur-sm border border-gray-200 dark:border-white/15 p-6 mt-4">
            <h2 className="text-xl font-semibold font-playfair text-gray-900 dark:text-white mb-2">Contents not categorized</h2>
            <p className="text-sm text-gray-500 dark:text-white/60 mb-6">
              These items were removed from their categories but not deleted. You can edit them to assign them to new categories.
            </p>
            
            {uncategorizedLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : uncategorizedContent && uncategorizedContent.length > 0 ? (
              <div className="columns-2 gap-3 space-y-0">
                {uncategorizedContent.map((item, index) => (
                  <div key={item.id}
                    style={{ animationDelay: `${index * 40}ms` }}
                    className="stagger-item mb-3">
                    <ContentCard item={item} onCategorize={() => setContentToCategorize(item)} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                <Monitor className="w-10 h-10 text-gray-300 dark:text-white/20 mb-3" />
                <p className="text-gray-500 dark:text-white/50 text-sm">All your contents are neatly categorized</p>
              </div>
            )}
          </div>

        </div>
      </div>
      <CategorizeContentDialog 
        content={contentToCategorize} 
        onClose={() => setContentToCategorize(null)} 
      />
    </div>
  );
}
