import React, { useRef, useState } from "react";
import { View, StyleSheet, Animated, StyleProp, ViewStyle, ImageStyle } from "react-native";
import { Image } from "expo-image";
import { SkeletonShimmer } from "./SkeletonShimmer";

export interface CropData {
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
  aspectRatio?: number;
}

interface Props {
  src: string;
  cropData?: string | null;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onAspectRatioDetected?: (ratio: number) => void;
}

export function CroppedImage({ src, cropData, style, containerStyle, onAspectRatioDetected }: Props) {
  const skeletonOpacity = useRef(new Animated.Value(1)).current;
  const [cw, setCw] = useState(0);
  const [ch, setCh] = useState(0);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);

  let crop: CropData | null = null;
  if (cropData) {
    try {
      crop = JSON.parse(cropData);
    } catch {}
  }

  const handleLoad = (e: any) => {
    Animated.timing(skeletonOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
    const w = e?.source?.width;
    const h = e?.source?.height;
    if (w && h) {
      setNatW(w);
      setNatH(h);
      if (crop?.aspectRatio) {
        onAspectRatioDetected?.(crop.aspectRatio);
      } else {
        onAspectRatioDetected?.(w / h);
      }
    }
  };

  let computedStyle: StyleProp<ImageStyle> = [styles.image, style];
  let fit: "cover" | "fill" = "cover";

  if (crop && cw > 0 && ch > 0 && natW > 0 && natH > 0) {
    const zoom = crop.zoom ?? 1;
    const offsetX = crop.offsetX ?? 0;
    const offsetY = crop.offsetY ?? 0;
    const baseScale = Math.max(cw / natW, ch / natH);
    const scale = baseScale * zoom;
    const drawW = natW * scale;
    const drawH = natH * scale;
    const ox = offsetX * drawW;
    const oy = offsetY * drawH;
    fit = "fill";
    computedStyle = [
      {
        position: "absolute",
        width: drawW,
        height: drawH,
        left: cw / 2 - drawW / 2 + ox,
        top: ch / 2 - drawH / 2 + oy,
      },
      style,
    ];
  }

  return (
    <View
      style={[styles.container, containerStyle]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setCw(width);
          setCh(height);
        }
      }}
    >
      <Image
        source={{ uri: src }}
        style={computedStyle}
        contentFit={fit}
        cachePolicy="memory-disk"
        priority="high"
        onLoad={handleLoad}
      />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: skeletonOpacity }]} pointerEvents="none">
        <SkeletonShimmer style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    width: "100%",
    height: "100%",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
