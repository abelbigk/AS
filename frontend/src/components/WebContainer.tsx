import React from "react";
import { View, Platform, useWindowDimensions, StyleSheet } from "react-native";

interface WebContainerProps {
  children: React.ReactNode;
}

export function WebContainer({ children }: WebContainerProps) {
  const { width } = useWindowDimensions();

  if (Platform.OS !== "web") {
    return <View style={styles.flex}>{children}</View>;
  }

  const maxWidth = 768; // comfortable modern desktop max-width
  const shouldConstrain = width > maxWidth;

  if (!shouldConstrain) {
    return <View style={styles.flex}>{children}</View>;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.innerContainer, { width: maxWidth, maxWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  outerContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "#0A0A0A",
  },
  innerContainer: {
    flex: 1,
    height: "100%",
  },
});
