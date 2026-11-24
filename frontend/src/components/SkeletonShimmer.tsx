import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, StyleProp, ViewStyle } from "react-native";

interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export function SkeletonShimmer({ style, borderRadius = 12 }: SkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.shimmer,
          {
            borderRadius,
            opacity: pulseAnim,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  shimmer: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
});
