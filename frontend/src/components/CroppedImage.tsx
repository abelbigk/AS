import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle, ImageStyle } from "react-native";
import { Image } from "expo-image";

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
  let crop: CropData | null = null;
  if (cropData) {
    try {
      crop = JSON.parse(cropData);
    } catch {}
  }

  return (
    <View style={[styles.container, containerStyle]}>
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
        transition={200}
        cachePolicy="memory-disk"
      />
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
