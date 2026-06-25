import { useRef, useEffect, useState } from "react";

export function useUploadMetrics(loadedBytes: number, totalBytes: number, isSubmitting: boolean) {
  const startTimeRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<{ time: number; loaded: number } | null>(null);
  const speedRef = useRef<number>(0);
  
  const [metrics, setMetrics] = useState({
    speed: 0,
    eta: 0,
  });

  useEffect(() => {
    if (!isSubmitting) {
      startTimeRef.current = null;
      lastUpdateRef.current = null;
      speedRef.current = 0;
      setMetrics({ speed: 0, eta: 0 });
      return;
    }

    const now = Date.now();

    if (!startTimeRef.current) {
      startTimeRef.current = now;
      lastUpdateRef.current = { time: now, loaded: loadedBytes };
      setMetrics({ speed: 0, eta: 0 });
      return;
    }

    const lastUpdate = lastUpdateRef.current;
    let currentSpeed = speedRef.current;

    if (lastUpdate) {
      const elapsedSinceLast = (now - lastUpdate.time) / 1000;
      
      // Update speed at most once every 50ms to keep it highly responsive
      if (elapsedSinceLast >= 0.05 || loadedBytes >= totalBytes) {
        const bytesSentSinceLast = loadedBytes - lastUpdate.loaded;
        const calculatedSpeed = elapsedSinceLast > 0 ? bytesSentSinceLast / elapsedSinceLast : 0;
        
        if (speedRef.current === 0) {
          currentSpeed = calculatedSpeed;
        } else {
          // Exponential moving average (alpha = 0.35)
          currentSpeed = speedRef.current * 0.65 + calculatedSpeed * 0.35;
        }
        
        speedRef.current = currentSpeed;
        lastUpdateRef.current = { time: now, loaded: loadedBytes };
      }
    }

    const remainingBytes = totalBytes - loadedBytes;
    const currentEta = currentSpeed > 0 ? remainingBytes / currentSpeed : 0;

    setMetrics({
      speed: currentSpeed,
      eta: currentEta,
    });
  }, [loadedBytes, totalBytes, isSubmitting]);

  // Formatting helpers
  const formatBytes = (bytes: number) => {
    if (bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const speedStr = metrics.speed > 0 ? `${formatBytes(metrics.speed)}/s` : "Calculating...";
  const etaStr =
    metrics.eta > 0
      ? metrics.eta < 60
        ? `About ${Math.round(metrics.eta)} seconds remaining`
        : `About ${Math.round(metrics.eta / 60)} minutes remaining`
      : "Calculating...";
  const loadedStr = formatBytes(loadedBytes);
  const totalStr = formatBytes(totalBytes);

  return {
    speedStr,
    etaStr,
    loadedStr,
    totalStr,
  };
}
