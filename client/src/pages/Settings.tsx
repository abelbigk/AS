import { useEffect, useState, useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Moon, Sun, Monitor, Loader2, Lock, LogOut, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import ContentCard from "@/components/ContentCard";
import CategorizeContentDialog from "@/components/CategorizeContentDialog";
import type { ContentItem } from "@/types";
import { useAuth } from "@/_core/hooks/useAuth";

const DARK_IMAGE = "https://images.unsplash.com/photo-1550684376-efcbd6e3f031?w=1600&q=80";
const LIGHT_IMAGE = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80";

const THEME_OPTIONS = [
  { value: "light", label: "Light Mode", icon: Sun, desc: "Clean & bright" },
  { value: "dark", label: "Dark Mode", icon: Moon, desc: "Sleek & modern" },
] as const;

// Helper function to calculate time remaining from JWT token
function getTokenTimeRemaining(): string | null {
  const token = localStorage.getItem("auth_token");
  if (!token) return null;

  try {
    // Decode JWT payload (middle part of token)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp; // expiration timestamp in seconds
    
    if (!exp) return null;
    
    const now = Math.floor(Date.now() / 1000);
    const remainingSeconds = exp - now;
    
    if (remainingSeconds <= 0) return "Expired";
    
    const days = Math.floor(remainingSeconds / 86400);
    const hours = Math.floor((remainingSeconds % 86400) / 3600);
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      const minutes = Math.floor(remainingSeconds / 60);
      return `${minutes}m`;
    }
  } catch {
    return null;
  }
}

export default function Settings() {
  const { theme, setTheme: setThemeContext } = useTheme();
  const { user, logout } = useAuth();
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark">(
    (theme as "light" | "dark") || "dark"
  );
  const [contentToCategorize, setContentToCategorize] = useState<ContentItem | null>(null);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<string | null>(null);
  
  // Update session time every minute
  useEffect(() => {
    const updateTime = () => setSessionTimeRemaining(getTokenTimeRemaining());
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);
  
  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const setThemeMutation = trpc.preferences.setTheme.useMutation({
    onSuccess: () => toast.success("Theme updated"),
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to change password");
    },
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

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("auth_token");
      toast.success("Logged out successfully");
      window.location.href = "/login";
    } catch (error) {
      toast.error("Failed to logout");
    }
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

          {/* Account Section */}
          <div className="rounded-2xl bg-white dark:bg-white/10 backdrop-blur-sm border border-gray-200 dark:border-white/15 p-6 mt-4">
            <h2 className="text-xl font-semibold font-playfair text-gray-900 dark:text-white mb-5">Account</h2>
            
            {user && (
              <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                <p className="text-sm text-gray-500 dark:text-white/50 mb-1">Logged in as</p>
                <p className="font-semibold text-gray-900 dark:text-white">{user.username}</p>
              </div>
            )}

            {/* Change Password */}
            <div className="space-y-3">
              {!showChangePassword ? (
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="group w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 dark:border-white/10 hover:border-gray-900 dark:hover:border-white transition-all bg-white dark:bg-black/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-gray-900 dark:group-hover:bg-white transition-colors">
                      <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-white dark:group-hover:text-black transition-colors" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">Change Password</p>
                      <p className="text-xs text-gray-500 dark:text-white/50">Update your password</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="p-5 rounded-xl border-2 border-gray-900 dark:border-white bg-gray-50 dark:bg-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Change Password</h3>
                    <button
                      onClick={() => {
                        setShowChangePassword(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="text-sm text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                  
                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:border-gray-900 dark:focus:border-white text-sm"
                        placeholder="Enter current password"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:border-gray-900 dark:focus:border-white text-sm"
                        placeholder="Enter new password"
                        minLength={6}
                        required
                      />
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-1">
                        Minimum 6 characters
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:border-gray-900 dark:focus:border-white text-sm"
                        placeholder="Confirm new password"
                        minLength={6}
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg hover:bg-black dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Changing Password...</span>
                        </>
                      ) : (
                        <span>Change Password</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="group w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-900 dark:border-white hover:bg-gray-900 dark:hover:bg-white transition-all bg-white dark:bg-black/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-900 dark:bg-white group-hover:bg-white dark:group-hover:bg-black flex items-center justify-center transition-colors">
                    <LogOut className="w-5 h-5 text-white dark:text-black group-hover:text-black dark:group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">Logout</p>
                    <p className="text-xs text-gray-500 dark:text-white/50 group-hover:text-white/70 dark:group-hover:text-black/50 transition-colors">Sign out of your account</p>
                  </div>
                </div>
              </button>

              {/* Session Time Remaining */}
              {sessionTimeRemaining && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500 dark:text-white/40">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Session expires in {sessionTimeRemaining}</span>
                </div>
              )}
            </div>
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
