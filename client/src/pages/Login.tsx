import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Lock, User } from "lucide-react";

const DARK_IMAGE = "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80";
const LIGHT_IMAGE = "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1600&q=80";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Detect if running in mobile app
  const isMobileApp = /Capacitor/.test(navigator.userAgent);
  const sessionDuration = isMobileApp ? "1 year" : "7 days";

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      toast.success("Welcome back!");
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message || "Login failed");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Account created! Please login.");
      setIsRegistering(false);
      setPassword("");
    },
    onError: (error) => {
      toast.error(error.message || "Registration failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (isRegistering) {
      registerMutation.mutate({
        username: username.trim(),
        password,
        name: username.trim(),
      });
    } else {
      loginMutation.mutate({
        username: username.trim(),
        password,
      });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="relative min-h-screen page-enter">
      {/* Blurred background matching app style */}
      <div className="fixed inset-0 -z-10">
        {/* Dark mode background */}
        <img src={DARK_IMAGE} alt="" className="hidden dark:block w-full h-full object-cover" />
        <div className="hidden dark:block absolute inset-0 backdrop-blur-xl bg-black/55" />
        {/* Light mode background */}
        <img src={LIGHT_IMAGE} alt="" className="block dark:hidden w-full h-full object-cover" />
        <div className="block dark:hidden absolute inset-0 backdrop-blur-xl bg-white/65" />
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md">
          {/* Header matching app style */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-playfair text-gray-900 dark:text-white drop-shadow-lg mb-2">
              {isRegistering ? "Create Account" : "Welcome"}
            </h1>
            <p className="text-gray-600 dark:text-white/60 text-base">
              {isRegistering ? "Register to get started" : "Sign in to continue"}
            </p>
          </div>

          {/* Form card matching app style */}
          <div className="rounded-2xl bg-white dark:bg-white/10 backdrop-blur-sm border border-gray-200 dark:border-white/15 p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-gray-400 dark:text-white/40" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="Enter username"
                    disabled={isLoading}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-gray-400 dark:text-white/40" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="Enter password"
                    disabled={isLoading}
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    required
                    minLength={6}
                  />
                </div>
                {isRegistering && (
                  <p className="text-xs text-gray-500 dark:text-white/50 mt-2">
                    Minimum 6 characters
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:bg-black dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-white focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isRegistering ? "Creating..." : "Signing In..."}</span>
                  </>
                ) : (
                  <span>{isRegistering ? "Create Account" : "Sign In"}</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white dark:bg-white/10 text-gray-500 dark:text-white/50">
                  or
                </span>
              </div>
            </div>

            {/* Toggle Register/Login */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setPassword("");
                }}
                disabled={isLoading}
                className="text-sm text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white font-medium disabled:opacity-50 transition-colors"
              >
                {isRegistering 
                  ? "Already have an account? Sign in" 
                  : "Don't have an account? Register"}
              </button>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-500 dark:text-white/40 mt-6">
            Session remains active for {sessionDuration}
          </p>
        </div>
      </div>
    </div>
  );
}
