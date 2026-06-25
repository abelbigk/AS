import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: React.ReactNode;
}

export default function PullToRefresh({ children }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || isRefreshing) return;

    let startY = 0;
    let pulling = false;

    const handleStart = (clientY: number, target: HTMLElement) => {
      // Only initiate pull-to-refresh when at the very top of the page
      if (window.scrollY > 0) return;

      // Ignore if drag starts on interactive elements or draggable items (which have touchAction: 'none' set inline)
      let curr: HTMLElement | null = target;
      while (curr && curr !== element) {
        if (
          curr.style.touchAction === "none" ||
          curr.tagName === "BUTTON" ||
          curr.tagName === "INPUT" ||
          curr.tagName === "SELECT" ||
          curr.tagName === "TEXTAREA" ||
          curr.tagName === "A" ||
          curr.getAttribute("role") === "button"
        ) {
          return;
        }
        curr = curr.parentElement;
      }

      startY = clientY;
      pulling = true;
      setIsPulling(true);
    };

    const handleMove = (clientY: number, preventDefault: () => void) => {
      if (!pulling) return;
      const diff = clientY - startY;

      if (diff > 0) {
        // Prevent native browser refresh or elastic bounce to let our custom UI handle it
        preventDefault();
        
        // Apply resistance (elastic effect)
        const dist = Math.min(diff * 0.35, 80);
        setPullDistance(dist);
      } else {
        pulling = false;
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleEnd = () => {
      if (!pulling) return;
      pulling = false;
      setIsPulling(false);

      setPullDistance((prev) => {
        if (prev >= 50) {
          setIsRefreshing(true);
          
          setTimeout(() => {
            // Start sliding up
            setPullDistance(0);
            
            // Keep spinning until it has fully slid up and faded out (300ms transition)
            setTimeout(() => {
              setIsRefreshing(false);
              window.location.reload();
            }, 300);
          }, 800);
          
          return 50; // Lock to 50px during refresh
        }
        return 0;
      });
    };

    // Touch events
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      if (touch && target) handleStart(touch.clientY, target);
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        handleMove(touch.clientY, () => {
          if (e.cancelable) e.preventDefault();
        });
      }
    };

    const onTouchEnd = () => handleEnd();

    // Mouse events (for easy testing on desktop)
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (e.button !== 0) return;
      handleStart(e.clientY, target);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!pulling) return;
      handleMove(e.clientY, () => {
        if (e.cancelable) e.preventDefault();
      });
    };

    const onMouseUp = () => handleEnd();

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);

    element.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove, { passive: false });
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);

      element.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isRefreshing]);

  const showIndicator = pullDistance > 0 || isRefreshing;
  const progress = Math.min(pullDistance / 50, 1);
  const isTriggered = pullDistance >= 50;

  return (
    <div ref={containerRef} className="relative w-full min-h-screen select-none overflow-x-hidden">
      {/* Premium Refresh Indicator */}
      {showIndicator && (
        <div
          className="fixed left-1/2 z-50 flex items-center justify-center pointer-events-none"
          style={{
            top: `${Math.min(pullDistance - 36, 24)}px`,
            opacity: progress,
            transform: `translate3d(-50%, 0, 0) scale(${0.5 + progress * 0.5})`,
            transition: isPulling ? "none" : "all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          <div className={`p-2.5 rounded-full shadow-xl backdrop-blur-xl border transition-all duration-300 ${
            isTriggered || isRefreshing
              ? "bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/20"
              : "bg-white/90 dark:bg-zinc-800/90 border-gray-200 dark:border-white/10 text-gray-700 dark:text-white"
          }`}>
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              style={{
                transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)`,
                transition: isPulling ? "none" : "transform 0.2s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Main page wrapper that shifts down when pulling */}
      <div
        className="w-full min-h-screen"
        style={{
          transform: (pullDistance > 0 || isRefreshing) ? `translate3d(0, ${pullDistance}px, 0)` : "none",
          transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          // Pass down CSS variables for background counter-transformation
          ["--pull-distance" as any]: `${pullDistance}px`,
          ["--pull-transition" as any]: isPulling
            ? "none"
            : "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
