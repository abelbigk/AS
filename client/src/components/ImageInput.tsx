import { useState, useEffect, useRef } from "react";
import { ImagePlus, Link, X } from "lucide-react";
import ImageCropper from "./ImageCropper";
import CroppedImage from "./CroppedImage";

export function resolveImageUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "unsplash.com" && u.pathname.startsWith("/photos/")) {
      const slug = u.pathname.split("/photos/")[1]?.split("?")[0] ?? "";
      const parts = slug.split("-");
      const photoId = parts[parts.length - 1];
      if (photoId) return `https://images.unsplash.com/photo-${photoId}?w=1600&q=80`;
    }
    return url;
  } catch { return url; }
}

export interface CropData {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface ImageResult {
  url: string;
  cropData?: CropData;
  file?: File;
  blob?: Blob;
}

interface ImageInputProps {
  currentPreview?: string;
  currentCropData?: string | null;
  frameHeight: number;
  onResult: (result: ImageResult) => void;
  onClear: () => void;
  label?: string;
  flushMargin?: string;
  disableCrop?: boolean;
  naturalRatio?: boolean;
}

function proxyUrl(url: string): string {
  // Don't proxy blob URLs - they're local browser references
  if (url.startsWith('blob:')) return url;
  
  const HOTLINK_OK = ["images.unsplash.com", "res.cloudinary.com", "r2.dev"];
  try {
    const host = new URL(url).hostname;
    if (HOTLINK_OK.some(d => host.endsWith(d))) return url;
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  } catch { return url; }
}

export default function ImageInput({
  currentPreview,
  currentCropData,
  frameHeight,
  onResult,
  onClear,
  label = "Cover Image",
  flushMargin = "",
  disableCrop = false,
  naturalRatio = false,
}: ImageInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(320);
  const [tab, setTab] = useState<"file" | "url">("file");
  const [urlInput, setUrlInput] = useState("");
  const [cropSrc, setCropSrc] = useState("");  // URL being cropped right now
  const [pendingFile, setPendingFile] = useState<{ file: File; blob: Blob } | null>(null);
  const [currentFile, setCurrentFile] = useState<{ file: File; blob: Blob } | null>(null); // Track the current file
  const [showCropper, setShowCropper] = useState(false);

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(e => setContainerW(e[0].contentRect.width));
    ro.observe(containerRef.current);
    setContainerW(containerRef.current.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Only pre-fill URL input when first opening edit
  const prevPreview = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevPreview.current;
    prevPreview.current = currentPreview;
    if (!prev && currentPreview && currentPreview.startsWith("http")) {
      setTab("url");
      setUrlInput(currentPreview);
    }
    if (!currentPreview) {
      setTab("file");
      setUrlInput("");
    }
  }, [currentPreview]);

  const openCropper = (originalUrl: string, fileData?: { file: File; blob: Blob }) => {
    const resolved = resolveImageUrl(originalUrl);
    setCropSrc(resolved);
    if (fileData) setPendingFile(fileData);
    setShowCropper(true);
  };

  if (showCropper && cropSrc) {
    let initCrop = null;
    try {
      if (currentCropData && currentPreview === cropSrc) {
        initCrop = JSON.parse(currentCropData);
      }
    } catch {}
    return (
      <div ref={containerRef}>
        <ImageCropper
          src={proxyUrl(cropSrc)}
          frameHeight={frameHeight}
          naturalRatio={naturalRatio}
          initialCropData={initCrop}
          onConfirm={(cropData) => {
            onResult({ url: cropSrc, cropData, file: pendingFile?.file, blob: pendingFile?.blob });
            setShowCropper(false);
            setCropSrc("");
            setPendingFile(null);
          }}
          onCancel={() => { setShowCropper(false); setCropSrc(""); setPendingFile(null); }}
          flushMargin={flushMargin}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Current image preview */}
      {currentPreview && (
        <div className={`relative overflow-hidden group ${flushMargin ? `${flushMargin} rounded-none` : "rounded-xl"}`} style={naturalRatio ? { height: "auto" } : { height: frameHeight }}>
          {!disableCrop ? (
            <CroppedImage src={currentPreview} cropData={currentCropData} naturalRatio={naturalRatio} />
          ) : (
            <img src={proxyUrl(resolveImageUrl(currentPreview))} className="w-full h-auto block" alt="" />
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            {!disableCrop && (
              <button type="button" onClick={() => openCropper(currentPreview, currentFile ?? undefined)}
                className="bg-black/60 backdrop-blur rounded-full p-1.5 text-white hover:bg-black/80 transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/></svg>
              </button>
            )}
            <button type="button" onClick={() => { setCurrentFile(null); onClear(); }}
              className="bg-black/60 backdrop-blur rounded-full p-1.5 text-white hover:bg-black/80 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent py-2 px-3">
            <p className="text-white/70 text-xs">Replace below ↓</p>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-0.5 gap-0.5">
        <button type="button" onClick={() => setTab("file")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${tab === "file" ? "bg-gray-900 dark:bg-white/20 text-white dark:text-white" : "text-gray-500 dark:text-white/40 hover:text-gray-800 dark:hover:text-white/70"}`}>
          <ImagePlus className="w-3.5 h-3.5" /> {currentPreview ? "Replace with file" : "Upload"}
        </button>
        <button type="button" onClick={() => setTab("url")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${tab === "url" ? "bg-gray-900 dark:bg-white/20 text-white dark:text-white" : "text-gray-500 dark:text-white/40 hover:text-gray-800 dark:hover:text-white/70"}`}>
          <Link className="w-3.5 h-3.5" /> {currentPreview ? "Replace with URL" : "URL"}
        </button>
      </div>

      {tab === "file" ? (
        <label className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-white/20 cursor-pointer hover:border-gray-400 dark:hover:border-white/40 transition-colors">
          <ImagePlus className="w-6 h-6 text-gray-400 dark:text-white/40 mb-1" />
          <span className="text-gray-400 dark:text-white/40 text-sm">{label}</span>
          <input type="file" accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fileData = { file, blob: file };
              setCurrentFile(fileData); // Store for later cropping
              onResult({ url: URL.createObjectURL(file), file, blob: file });
              e.target.value = "";
            }}
            className="hidden" />
        </label>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col gap-2">
            <input
              type="url"
              placeholder="https://i.pinimg.com/... or unsplash.com/photos/..."
              value={urlInput}
              onChange={(e) => {
                const val = e.target.value;
                setUrlInput(val);
                if (val.trim().startsWith("http")) {
                  onResult({ url: resolveImageUrl(val.trim()) });
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:border-gray-400 dark:focus:border-white/40"
            />
            <div className="flex gap-2">
              <button type="button"
                onClick={async () => {
                  const trimmed = urlInput.trim();
                  if (!trimmed) return;
                  const finalUrl = resolveImageUrl(trimmed);
                  try {
                    const res = await fetch(proxyUrl(finalUrl));
                    const blob = await res.blob();
                    onResult({ file: new File([blob], "image.webp", { type: blob.type }), blob, url: finalUrl });
                  } catch {
                    onResult({ url: finalUrl });
                  }
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-900 dark:bg-white/20 text-white text-sm hover:bg-gray-800 dark:hover:bg-white/30 transition-all font-medium text-center">
                Add
              </button>
              {!disableCrop && (
                <button type="button"
                  onClick={() => {
                    if (!urlInput.trim()) return;
                    openCropper(urlInput.trim());
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 text-gray-700 dark:text-white text-sm hover:bg-gray-200 dark:hover:bg-white/20 transition-all text-center">
                  Crop
                </button>
              )}
            </div>
          </div>
          {/* Live preview of typed URL */}
          {urlInput.trim() && (
            <div className={`overflow-hidden bg-white/5 ${flushMargin ? `${flushMargin} rounded-none` : "rounded-xl"}`} style={naturalRatio ? {} : { height: frameHeight }}>
              <img
                src={proxyUrl(resolveImageUrl(urlInput.trim()))}
                className={`w-full ${naturalRatio ? "h-auto object-contain" : "h-full object-cover"}`}
                alt="URL Preview"
                onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
