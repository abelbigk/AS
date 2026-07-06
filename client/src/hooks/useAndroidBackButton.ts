import { useEffect } from "react";
import { useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";

/**
 * Custom hook to handle Android back button behavior
 * - Closes dialogs if any are open (by going back in history)
 * - Navigates back in history
 * - Exits app only if on home page
 * - Only works on native platforms (Android/iOS)
 */
export function useAndroidBackButton() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let backButtonListenerHandle: any;

    const setupBackButtonListener = async () => {
      try {
        // Dynamically import the App plugin only on native platforms
        const { App: CapacitorApp } = await import("@capacitor/app");

        backButtonListenerHandle = await CapacitorApp.addListener(
          "backButton",
          ({ canGoBack }) => {
            // Check if any dialog/modal is open by looking for history state
            // The useDialogBackButton hook pushes { dialog: "open" } to history
            const hasOpenDialog = window.history.state?.dialog === "open";

            if (hasOpenDialog) {
              // Go back to close the dialog
              window.history.back();
              return;
            }

            // If we're on home page (/), exit the app
            if (location === "/" || location === "/login") {
              CapacitorApp.exitApp();
              return;
            }

            // Otherwise, go back in history
            if (canGoBack) {
              window.history.back();
            } else {
              // If can't go back, go to home
              setLocation("/");
            }
          }
        );
      } catch (error) {
        console.error("Failed to setup back button listener:", error);
      }
    };

    setupBackButtonListener();

    // Cleanup listener on unmount
    return () => {
      if (backButtonListenerHandle) {
        backButtonListenerHandle.remove();
      }
    };
  }, [location, setLocation]);
}
