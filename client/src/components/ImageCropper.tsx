import { useRef, useState, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";
import CroppedImage from "./CroppedImage";

export interface CropData {
  zoom: number;
  offsetX: number; // ox / drawW  (fraction of image draw width at time of crop)
  offsetY: number; // oy / drawH
}

interface Props {
  src: string;
  frameHeight: number;
  initialCropData?: CropData | null;
  onConfirm: (cropData: CropData) => void;
  onCancel: () => void;
  flushMargin?: string;
  naturalRatio?: boolean;
}

export default function ImageCropper({ src, frameHeight, initialCropData, onConfirm, onCancel, flushMargin = "", naturalRatio = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [cw, setCw] = useState(0);
  const [ch, setCh] = useState(frameHeight);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [confirmedCrop, setConfirmedCrop] = useState<CropData | null>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Measure container — canvas pixel size = CSS size = cw
  useEffect(() => {
    if (!wrapRef.current) return;
    const measure = () => {
      const w = Math.floor(wrapRef.current!.clientWidth);
      if (w > 0) setCw(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Load image
  useEffect(() => {
    if (!src) return;
    setImgLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      if (naturalRatio && wrapRef.current) {
        const w = wrapRef.current.clientWidth;
        if (w > 0) {
          const ratio = img.height / img.width;
          setCh(w * ratio); 
        }
      }
      setImgLoaded(true);
    };
    img.onerror = () => {
      // Try without crossOrigin
      const img2 = new Image();
      img2.onload = () => { imgRef.current = img2; setImgLoaded(true); };
      img2.src = src;
    };
    img.src = src;
  }, [src]);

  // Restore initial crop once both image and container are ready
  useEffect(() => {
    if (!imgLoaded || cw === 0 || !imgRef.current) return;
    if (initialCropData) {
      const img = imgRef.current;
      const baseScale = Math.max(cw / img.width, ch / img.height);
      const scale = baseScale * initialCropData.zoom;
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      setZoom(initialCropData.zoom);
      setOffset({ x: initialCropData.offsetX * drawW, y: initialCropData.offsetY * drawH });
    } else {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [imgLoaded, cw]); // only on first load

  // Draw — canvas pixel size === cw × ch, CSS size === cw × ch (exact match)
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !imgRef.current || cw === 0) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const img = imgRef.current;
    const baseScale = Math.max(cw / img.width, ch / img.height);
    const scale = baseScale * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const maxX = Math.max(0, (drawW - cw) / 2);
    const maxY = Math.max(0, (drawH - ch) / 2);
    const ox = Math.max(-maxX, Math.min(maxX, offset.x));
    const oy = Math.max(-maxY, Math.min(maxY, offset.y));
    
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, cw / 2 - drawW / 2 + ox, ch / 2 - drawH / 2 + oy, drawW, drawH);
  }, [imgLoaded, zoom, offset, cw, ch]);

  // Pointer coords: canvas CSS px === canvas pixel px (no scaling needed)
  const getPoint = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    const p = getPoint(e);
    dragStart.current = { x: p.x, y: p.y, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !imgRef.current) return;
    const p = getPoint(e);
    const nx = dragStart.current.ox + (p.x - dragStart.current.x);
    const ny = dragStart.current.oy + (p.y - dragStart.current.y);
    const img = imgRef.current;
    const baseScale = Math.max(cw / img.width, ch / img.height);
    const scale = baseScale * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const maxX = Math.max(0, (drawW - cw) / 2);
    const maxY = Math.max(0, (drawH - ch) / 2);
    setOffset({ x: Math.max(-maxX, Math.min(maxX, nx)), y: Math.max(-maxY, Math.min(maxY, ny)) });
  }, [zoom, cw, ch]);

  const onPointerUp = () => { dragging.current = false; };

  const buildCropData = (): CropData => {
    const img = imgRef.current!;
    const baseScale = Math.max(cw / img.width, ch / img.height);
    const scale = baseScale * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const maxX = Math.max(0, (drawW - cw) / 2);
    const maxY = Math.max(0, (drawH - ch) / 2);
    const ox = Math.max(-maxX, Math.min(maxX, offset.x));
    const oy = Math.max(-maxY, Math.min(maxY, offset.y));
    return { zoom, offsetX: ox / drawW, offsetY: oy / drawH };
  };

  const handleConfirm = () => {
    if (!imgRef.current) return;
    const cropData = buildCropData();
    setConfirmedCrop(cropData);
    onConfirm(cropData);
  };

  const originalUrl = src.includes("/api/image-proxy?url=")
    ? decodeURIComponent(src.split("/api/image-proxy?url=")[1])
    : src;

  const padClass = flushMargin === "-mx-6" ? "px-6" : flushMargin === "-mx-4" ? "px-4" : "";

  return (
    <div ref={wrapRef} className={`flex flex-col gap-3 ${flushMargin ? flushMargin : "w-full"}`}>
      {/* Canvas — pixel size = CSS size = cw × ch */}
      <div className={`relative overflow-hidden bg-black/40 ${flushMargin ? "rounded-none" : "rounded-xl"}`} style={{ height: ch }}>
        {cw > 0 && (
          <canvas
            ref={canvasRef}
            width={cw * (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)}
            height={ch * (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)}
            style={{ width: cw, height: ch, display: "block" }}
            className="cursor-grab active:cursor-grabbing touch-none select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        )}
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/10" />)}
        </div>
        <div className="absolute inset-0 pointer-events-none border-2 border-white/40 rounded-xl" />
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/50 text-xs pointer-events-none whitespace-nowrap">
          Drag to reposition
        </p>
      </div>

      {/* Zoom */}
      <div className={`flex items-center gap-3 ${padClass}`}>
        <button type="button" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="text-white/60 hover:text-white transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <input type="range" min={0.5} max={4} step={0.05} value={zoom}
          onChange={e => setZoom(parseFloat(e.target.value))}
          className="flex-1 accent-white h-1" />
        <button type="button" onClick={() => setZoom(z => Math.min(4, +(z + 0.1).toFixed(2)))} className="text-white/60 hover:text-white transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-white/40 text-xs w-10 text-right">{Math.round(zoom * 100)}%</span>
      </div>

      {/* Actions */}
      <div className={`flex gap-2 ${padClass}`}>
        <button type="button" onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white/70 hover:bg-white/20 text-sm transition-all">
          <X className="w-4 h-4" /> Cancel
        </button>
        <button type="button" onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/25 border border-white/30 text-white hover:bg-white/35 text-sm font-medium transition-all">
          <Check className="w-4 h-4" /> Use this crop
        </button>
      </div>

      {/* Result preview */}
      {confirmedCrop && (
        <div className={`space-y-1 ${padClass}`}>
          <p className="text-white/50 text-xs">Result preview</p>
          <div className={`overflow-hidden ${flushMargin ? `${flushMargin} rounded-none` : "rounded-xl"}`} style={{ height: ch }}>
            <CroppedImage src={originalUrl} cropData={JSON.stringify(confirmedCrop)} />
          </div>
        </div>
      )}
    </div>
  );
}
