import { useEffect, useRef } from "react";

/**
 * Hook to handle browser back button for dialogs.
 * When the dialog is open, it pushes a history state and listens for popstate events.
 * When back button is pressed, it calls the onClose callback.
 *
 * Uses a ref for the callback so it is never stale and never causes the effect to re-run.
 *
 * @param open - Whether the dialog is currently open
 * @param onClose - Callback to close the dialog (may be an inline function; will not cause re-runs)
 */
export function useDialogBackButton(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  // Keep the ref up-to-date without triggering the effect
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    // Push a dummy history entry so back button triggers popstate
    window.history.pushState({ dialog: "open" }, "");

    const handlePopState = () => {
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // If dialog was closed by something other than the back button (e.g. clicking outside,
      // close button), we need to pop the dummy history entry we added.
      if (window.history.state?.dialog === "open") {
        window.history.back();
      }
    };
    // Only re-run when `open` changes — NOT when onClose changes (it's kept in a ref)
  }, [open]);
}
