import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  PanResponder,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react-native";
import { useTheme } from "../contexts/ThemeContext";

export interface CropData {
  zoom: number;
  offsetX: number; // ox / drawW
  offsetY: number; // oy / drawH
}

interface ImageCropperModalProps {
  visible: boolean;
  src: string;
  frameHeight?: number;
  naturalRatio?: boolean;
  initialCropData?: CropData | null;
  onConfirm: (cropData: CropData) => void;
  onCancel: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4.0;

export function ImageCropperModal({
  visible,
  src,
  frameHeight = 112,
  naturalRatio = false,
  initialCropData,
  onConfirm,
  onCancel,
}: ImageCropperModalProps) {
  const { colors, theme } = useTheme();
  const screenW = Dimensions.get("window").width;
  const maxFrameW = Math.min(screenW - 60, 404);
  const maxFrameH = 380;

  const [containerW, setContainerW] = useState(maxFrameW);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [zoom, setZoom] = useState(initialCropData?.zoom ?? 1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  const offsetRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ ox: 0, oy: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Smooth zoom slider bar refs
  const barWidthRef = useRef(200);
  const [barWidth, setBarWidth] = useState(200);
  const sliderStartZoomRef = useRef(1);

  // Exact frame dimensions:
  // - For Category (naturalRatio=false): strict containerW x frameHeight (112px) matching Home card
  // - For Subcategory & Content (naturalRatio=true): exact photo aspect ratio (natW / natH)
  const { cw, ch } = useMemo(() => {
    if (!naturalRatio) {
      return { cw: containerW, ch: frameHeight };
    }
    if (natW > 0 && natH > 0) {
      const ratio = natW / natH;
      let w = containerW;
      let h = w / ratio;
      if (h > maxFrameH) {
        h = maxFrameH;
        w = h * ratio;
      }
      return { cw: Math.round(w), ch: Math.round(h) };
    }
    return { cw: containerW, ch: frameHeight };
  }, [naturalRatio, containerW, frameHeight, natW, natH]);

  const chRef = useRef(ch);
  chRef.current = ch;
  const cwRef = useRef(cw);
  cwRef.current = cw;
  const natRef = useRef({ w: natW, h: natH });
  natRef.current = { w: natW, h: natH };

  useEffect(() => {
    if (visible) {
      setImgLoaded(false);
      setZoom(initialCropData?.zoom ?? 1);
      setOffset({ x: 0, y: 0 });
      offsetRef.current = { x: 0, y: 0 };
    }
  }, [visible, src, initialCropData]);

  // Restore initial crop offset once image dimensions are known
  useEffect(() => {
    if (!imgLoaded || cw <= 0 || ch <= 0 || natW <= 0 || natH <= 0) return;
    if (initialCropData) {
      const baseScale = Math.max(cw / natW, ch / natH);
      const scale = baseScale * initialCropData.zoom;
      const drawW = natW * scale;
      const drawH = natH * scale;
      const ox = (initialCropData.offsetX || 0) * drawW;
      const oy = (initialCropData.offsetY || 0) * drawH;
      setOffset({ x: ox, y: oy });
      offsetRef.current = { x: ox, y: oy };
    }
  }, [imgLoaded, cw, ch, natW, natH]);

  const clampOffset = (nx: number, ny: number, z: number) => {
    const { w, h } = natRef.current;
    const curW = cwRef.current;
    const curH = chRef.current;
    if (w <= 0 || h <= 0 || curW <= 0 || curH <= 0) return { x: 0, y: 0 };
    const baseScale = Math.max(curW / w, curH / h);
    const scale = baseScale * z;
    const drawW = w * scale;
    const drawH = h * scale;
    const maxX = Math.max(0, (drawW - curW) / 2);
    const maxY = Math.max(0, (drawH - curH) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, nx)),
      y: Math.max(-maxY, Math.min(maxY, ny)),
    };
  };

  useEffect(() => {
    const clamped = clampOffset(offsetRef.current.x, offsetRef.current.y, zoom);
    offsetRef.current = clamped;
    setOffset(clamped);
  }, [zoom, ch, cw]);

  // PanResponder for dragging the image inside the crop frame
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStartRef.current = { ox: offsetRef.current.x, oy: offsetRef.current.y };
        },
        onPanResponderMove: (_, gestureState) => {
          const next = clampOffset(
            dragStartRef.current.ox + gestureState.dx,
            dragStartRef.current.oy + gestureState.dy,
            zoomRef.current
          );
          offsetRef.current = next;
          setOffset(next);
        },
      }),
    []
  );

  // Smooth pixel-accurate dragging bar for zoom
  const zoomBarPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const trackW = Math.max(1, barWidthRef.current);
          const localX = Math.max(0, Math.min(trackW, evt.nativeEvent.locationX));
          const ratio = localX / trackW;
          const nextZoom = +(MIN_ZOOM + ratio * (MAX_ZOOM - MIN_ZOOM)).toFixed(3);
          sliderStartZoomRef.current = nextZoom;
          setZoom(nextZoom);
        },
        onPanResponderMove: (_, gestureState) => {
          const trackW = Math.max(1, barWidthRef.current);
          const deltaZoom = (gestureState.dx / trackW) * (MAX_ZOOM - MIN_ZOOM);
          const nextZoom = +Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, sliderStartZoomRef.current + deltaZoom)
          ).toFixed(3);
          setZoom(nextZoom);
        },
      }),
    []
  );

  const handleConfirm = () => {
    if (natW <= 0 || natH <= 0 || cw <= 0 || ch <= 0) {
      onConfirm({ zoom: 1, offsetX: 0, offsetY: 0 });
      return;
    }
    const baseScale = Math.max(cw / natW, ch / natH);
    const scale = baseScale * zoom;
    const drawW = natW * scale;
    const drawH = natH * scale;
    const clamped = clampOffset(offset.x, offset.y, zoom);
    onConfirm({
      zoom: +zoom.toFixed(3),
      offsetX: drawW > 0 ? clamped.x / drawW : 0,
      offsetY: drawH > 0 ? clamped.y / drawH : 0,
    });
  };

  let imgBoxStyle: any = StyleSheet.absoluteFill;
  if (imgLoaded && natW > 0 && natH > 0 && cw > 0 && ch > 0) {
    const baseScale = Math.max(cw / natW, ch / natH);
    const scale = baseScale * zoom;
    const drawW = natW * scale;
    const drawH = natH * scale;
    const clamped = clampOffset(offset.x, offset.y, zoom);
    imgBoxStyle = {
      position: "absolute",
      width: drawW,
      height: drawH,
      left: cw / 2 - drawW / 2 + clamped.x,
      top: ch / 2 - drawH / 2 + clamped.y,
    };
  }

  const zoomFraction = Math.max(0, Math.min(1, (zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)));
  const thumbLeft = zoomFraction * Math.max(0, barWidth - 18);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View
        style={[
          styles.backdrop,
          Platform.OS === "web"
            ? ({ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as any)
            : null,
        ]}
      >
        <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Crop Cover Image</Text>
            <Pressable onPress={onCancel} hitSlop={10}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Measure full inner width */}
          <View
            style={styles.frameOuter}
            onLayout={(e) => {
              const w = Math.floor(e.nativeEvent.layout.width);
              if (w > 0) setContainerW(w);
            }}
          >
            {/* Crop Frame */}
            <View
              style={[styles.frameWrap, { width: cw, height: ch }]}
              {...panResponder.panHandlers}
            >
              <Image
                source={{ uri: src }}
                style={imgBoxStyle}
                contentFit="fill"
                onLoad={(e) => {
                  if (e.source.width && e.source.height) {
                    setNatW(e.source.width);
                    setNatH(e.source.height);
                  }
                  setImgLoaded(true);
                }}
              />

              {!imgLoaded && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                </View>
              )}

              {/* 3x3 Rule-of-thirds Grid */}
              <View style={styles.gridOverlay} pointerEvents="none">
                <View style={[styles.gridLineV, { left: "33.33%" }]} />
                <View style={[styles.gridLineV, { left: "66.66%" }]} />
                <View style={[styles.gridLineH, { top: "33.33%" }]} />
                <View style={[styles.gridLineH, { top: "66.66%" }]} />
              </View>

              <View style={styles.dragHintWrap} pointerEvents="none">
                <Text style={styles.dragHintText}>Drag to reposition</Text>
              </View>
            </View>
          </View>

          {/* Smooth Pixel-Accurate Dragging Zoom Bar */}
          <View style={styles.zoomRow}>
            <Pressable
              onPress={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.1).toFixed(2)))}
              style={styles.zoomIconBtn}
              hitSlop={8}
            >
              <ZoomOut size={18} color={colors.textMuted} />
            </Pressable>

            <View
              style={styles.sliderTouchArea}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0) {
                  barWidthRef.current = w;
                  setBarWidth(w);
                }
              }}
              {...zoomBarPanResponder.panHandlers}
            >
              <View
                style={[
                  styles.sliderTrack,
                  {
                    backgroundColor:
                      theme === "dark" ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.sliderFill,
                    {
                      width: `${zoomFraction * 100}%`,
                      backgroundColor: theme === "dark" ? "#FFFFFF" : "#111827",
                    },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.sliderThumb,
                  {
                    left: thumbLeft,
                    backgroundColor: theme === "dark" ? "#FFFFFF" : "#111827",
                  },
                ]}
              />
            </View>

            <Pressable
              onPress={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.1).toFixed(2)))}
              style={styles.zoomIconBtn}
              hitSlop={8}
            >
              <ZoomIn size={18} color={colors.textMuted} />
            </Pressable>

            <Text style={[styles.zoomPct, { color: colors.textMuted }]}>
              {Math.round(zoom * 100)}%
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={onCancel}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <X size={16} color={colors.textMuted} />
              <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: theme === "dark" ? "#FFFFFF" : "#111827",
                  borderColor: "transparent",
                },
              ]}
            >
              <Check size={16} color={theme === "dark" ? "#000000" : "#FFFFFF"} />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: theme === "dark" ? "#000000" : "#FFFFFF" },
                ]}
              >
                Use this crop
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Platform.OS === "web" ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  frameOuter: {
    width: "100%",
    alignItems: "center",
  },
  frameWrap: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000000",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    position: "relative",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  gridOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  dragHintWrap: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  dragHintText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "500",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  zoomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  zoomIconBtn: {
    padding: 4,
  },
  sliderTouchArea: {
    flex: 1,
    height: 28,
    justifyContent: "center",
    position: "relative",
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    borderRadius: 2,
  },
  sliderThumb: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    top: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  zoomPct: {
    fontSize: 12,
    fontWeight: "600",
    width: 40,
    textAlign: "right",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
