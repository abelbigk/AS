import { useState, useRef, useEffect } from "react";
import { cn } from "../lib/utils";

// Must match ImageCropper's CropData exactly
interface CropData {
  zoom: number;
  offsetX: number; // ox / drawW
  offsetY: number; // oy / drawH
}

interface Props {
  src: string;
  cropData?: string | null;
  alt?: string;
  className?: string;
  naturalRatio?: boolean;
}

const HOTLINK_OK = ["images.unsplash.com", "res.cloudinary.com", "r2.dev"];
function proxySrc(url: string): string {
  // Don't proxy blob URLs - they're local browser references
  if (url.startsWith('blob:')) return url;
  
  try {
    const host = new URL(url).hostname;
    if (HOTLINK_OK.some(d => host.endsWith(d))) return url;
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  } catch { return url; }
}

export default function CroppedImage({ src, cropData, alt = "", className = "", naturalRatio = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  const [ch, setCh] = useState(0);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => { setCw(el.clientWidth); setCh(el.clientHeight); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  let crop: CropData | null = null;
  if (cropData) { try { crop = JSON.parse(cropData); } catch {} }

  if (!crop) {
    return <img src={proxySrc(src)} alt={alt} className={className || "w-full h-full object-cover"} />;
  }

  const { zoom, offsetX, offsetY } = crop;

  let imgStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" };

  if (cw > 0 && ch > 0 && natW > 0 && natH > 0) {
    // Exact same math as ImageCropper:
    // baseScale = max(cw/natW, ch/natH)
    // scale = baseScale * zoom
    // drawW = natW * scale,  drawH = natH * scale
    // ox = offsetX * drawW,  oy = offsetY * drawH
    // left = cw/2 - drawW/2 + ox
    // top  = ch/2 - drawH/2 + oy
    const baseScale = Math.max(cw / natW, ch / natH);
    const scale = baseScale * zoom;
    const drawW = natW * scale;
    const drawH = natH * scale;
    const ox = offsetX * drawW;
    const oy = offsetY * drawH;
    imgStyle = {
      position: "absolute",
      width: drawW,
      height: drawH,
      left: cw / 2 - drawW / 2 + ox,
      top: ch / 2 - drawH / 2 + oy,
      objectFit: "fill",
      maxWidth: "none",
      maxHeight: "none",
    };
  }

  return (
    <div ref={containerRef} className={cn("w-full overflow-hidden relative", naturalRatio ? "h-auto" : "h-full", !ch && !naturalRatio && "min-h-[100px]", className)}>
      {/* Ghost image to provide natural height in flexible layouts (like masonry) */}
      <img
        src={proxySrc(src)}
        alt=""
        className="w-full h-auto block opacity-0 pointer-events-none"
        draggable={false}
      />
      {/* The actual cropped image */}
      <img
        src={proxySrc(src)}
        alt={alt}
        style={imgStyle}
        draggable={false}
        onLoad={(e) => {
          const img = e.target as HTMLImageElement;
          setNatW(img.naturalWidth);
          setNatH(img.naturalHeight);
          if (containerRef.current) {
            setCw(containerRef.current.clientWidth);
            setCh(containerRef.current.clientHeight);
          }
        }}
      />
    </div>
  );
}
