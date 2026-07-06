import React from "react";
import { X, Film, ImageIcon, Loader2 } from "lucide-react";
import { useUploadMetrics } from "../hooks/useUploadMetrics";

interface UploadProgressProps {
  pct: number;
  loadedBytes: number;
  totalBytes: number;
  isSubmitting: boolean;
  stage: 'idle' | 'cover' | 'saving_entry' | 'media' | 'processing';
  fileName?: string;
  onCancel?: () => void;
}

export default function UploadProgress({
  pct,
  loadedBytes,
  totalBytes,
  isSubmitting,
  stage,
  fileName = "Media file",
  onCancel,
}: UploadProgressProps) {
  const { speedStr, etaStr, loadedStr, totalStr } = useUploadMetrics(
    loadedBytes,
    totalBytes,
    isSubmitting
  );

  if (stage === 'idle') return null;

  const isProcessing = stage === 'processing' || stage === 'saving_entry';

  return (
    <div className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-sm transition-all animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0 border border-gray-200 dark:border-white/5">
          {isProcessing ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : fileName.match(/\.(mp4|mov|avi|mkv|webm)$/i) ? (
            <Film className="w-5 h-5 text-blue-500 animate-pulse" />
          ) : (
            <ImageIcon className="w-5 h-5 text-blue-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-white/80">
              {isProcessing ? "Processing on server..." : "Uploading to Cloud..."}
            </span>
            {!isProcessing && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            )}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-white/40 truncate mt-0.5">
            {fileName}
          </p>
        </div>
        {onCancel && !isProcessing && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="relative h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isProcessing
                ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 w-full animate-shimmer"
                : "bg-gradient-to-r from-blue-500 to-indigo-500"
            }`}
            style={{ width: isProcessing ? "100%" : `${pct}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-[10px] text-gray-500 dark:text-white/50 gap-1 sm:gap-0 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-900 dark:text-white font-bold">{pct}%</span>
            <span>•</span>
            <span>{isProcessing ? "Finalizing" : speedStr}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{isProcessing ? "Almost done" : etaStr}</span>
            <span>•</span>
            <span>{loadedStr} of {totalStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
