import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppDataProvider } from "./contexts/AppDataContext";
import Home from "./pages/Home";
import CategoryDetail from "./pages/CategoryDetail";
import SubcategoryDetail from "./pages/SubcategoryDetail";
import Queued from "./pages/Queued";
import Done from "./pages/Done";
import Add from "./pages/Add";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
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

import PullToRefresh from "./components/PullToRefresh";
import { useAndroidBackButton } from "./hooks/useAndroidBackButton";

function Router() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();
  const initCategories = trpc.categories.initializePredefined.useMutation();
  
  // Handle Android back button
  useAndroidBackButton();

  // Initialize predefined categories on first load after auth
  useEffect(() => {
    if (isAuthenticated && !initCategories.isPending) {
      initCategories.mutate();
    }
  }, [isAuthenticated]);

  // Still checking auth — show loading spinner
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // If not authenticated and not on login page, show login
  if (!isAuthenticated && location !== "/login") {
    return <Login />;
  }

  // If authenticated and on login page, redirect to home
  if (isAuthenticated && location === "/login") {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen text-foreground">
      <ScrollToTop />
      <div className="flex-1 pb-24 md:pb-0 md:pt-24">
        <PullToRefresh>
          <Switch>
            <Route path={"/login"} component={Login} />
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
      {isAuthenticated && <Navigation />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <AppDataProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AppDataProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
