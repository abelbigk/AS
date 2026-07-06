export interface CropData {
  zoom: number;
  offsetX: number; // in display pixels
  offsetY: number;
  sourceUrl: string;
}

export function encodeCropData(data: CropData): string {
  return JSON.stringify(data);
}

export function decodeCropData(json: string | null | undefined): CropData | null {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

/**
 * Given a crop data object, returns CSS style to apply to an <img>
 * inside a container with overflow:hidden to simulate the crop.
 */
export function cropToStyle(crop: CropData, containerW: number, containerH: number): React.CSSProperties {
  const scale = crop.zoom;
  const tx = crop.offsetX;
  const ty = crop.offsetY;
  return {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    transform: `scale(${scale}) translate(${tx / scale}px, ${ty / scale}px)`,
    transformOrigin: "center center",
  };
}
