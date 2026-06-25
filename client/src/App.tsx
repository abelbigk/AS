import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CategoryDetail from "./pages/CategoryDetail";
import SubcategoryDetail from "./pages/SubcategoryDetail";
import Queued from "./pages/Queued";
import Done from "./pages/Done";
import Add from "./pages/Add";
import Settings from "./pages/Settings";
import Navigation from "./components/Navigation";
import { useAuth } from "./_core/hooks/useAuth";
import { useEffect } from "react";
import { trpc } from "./lib/trpc";
import { useLocation } from "wouter";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

const isOAuthConfigured = Boolean(import.meta.env.VITE_OAUTH_PORTAL_URL && import.meta.env.VITE_APP_ID);

import PullToRefresh from "./components/PullToRefresh";

function Router() {
  const { isAuthenticated, loading } = useAuth();
  const initCategories = trpc.categories.initializePredefined.useMutation();

  // Initialize predefined categories on first load
  useEffect(() => {
    if ((isAuthenticated || !isOAuthConfigured) && !initCategories.isPending) {
      initCategories.mutate();
    }
  }, [isAuthenticated]);

  // Still checking auth — don't flash 404
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // If OAuth is configured and user isn't logged in, show 404/login
  if (isOAuthConfigured && !isAuthenticated) {
    return <NotFound />;
  }

  return (
    <div className="flex flex-col min-h-screen text-foreground">
      <ScrollToTop />
      <div className="flex-1 pb-24 md:pb-0 md:pt-24">
        <PullToRefresh>
          <Switch>
            <Route path={"/"} component={Home} />
            <Route path={"/category/:id"} component={CategoryDetail} />
            <Route path={"/subcategory/:id"} component={SubcategoryDetail} />
            <Route path={"/queued"} component={Queued} />
            <Route path={"/done"} component={Done} />
            <Route path={"/add"} component={Add} />
            <Route path={"/settings"} component={Settings} />
            <Route path={"/404"} component={NotFound} />
            {/* Final fallback route */}
            <Route component={NotFound} />
          </Switch>
        </PullToRefresh>
      </div>
      <Navigation />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
