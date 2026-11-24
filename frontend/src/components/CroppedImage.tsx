import React, { useRef } from "react";
import { View, StyleSheet, Animated, StyleProp, ViewStyle, ImageStyle } from "react-native";
import { Image } from "expo-image";
import { SkeletonShimmer } from "./SkeletonShimmer";

interface CropData {
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
}

interface Props {
  src: string;
  cropData?: string | null;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function CroppedImage({ src, cropData, style, containerStyle }: Props) {
  // Fade the skeleton OUT when the image is ready — no opacity manipulation on the image itself
  const skeletonOpacity = useRef(new Animated.Value(1)).current;

  const handleLoad = () => {
    Animated.timing(skeletonOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  let crop: CropData | null = null;
  if (cropData) {
    try {
      crop = JSON.parse(cropData);
    } catch {}
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Image always renders at full opacity — no flash or gap */}
      <Image
        source={{ uri: src }}
        style={[
          styles.image,
          style,
          crop?.zoom && crop.zoom !== 1
            ? {
                transform: [
                  { scale: crop.zoom },
                  { translateX: (crop.offsetX || 0) * 100 },
                  { translateY: (crop.offsetY || 0) * 100 },
                ],
              }
            : undefined,
        ]}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        onLoad={handleLoad}
      />
      {/* Skeleton sits on top and fades out when image is ready */}
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
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
