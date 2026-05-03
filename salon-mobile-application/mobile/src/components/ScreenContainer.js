import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import SalonInfoFab from "./SalonInfoFab";
import { LAYOUT, RADIUS } from "../constants/theme";

export default function ScreenContainer({ children, scroll = true }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const content = scroll ? (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {children}
      <View style={{ height: 64 }} />
    </ScrollView>
  ) : (
    <View style={styles.fixed}>
      {children}
      <View style={{ height: 64 }} />
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", android: undefined })}
      style={styles.root}
    >
      <View style={styles.bgAccentTop} pointerEvents="none" />
      <View style={styles.bgAccentRight} pointerEvents="none" />
      {content}
      <SalonInfoFab style={styles.logoFab} />
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background
    },
    scroll: {
      paddingHorizontal: LAYOUT.pageHorizontalPadding,
      paddingTop: LAYOUT.pageTopPadding
    },
    fixed: {
      flex: 1,
      paddingHorizontal: LAYOUT.pageHorizontalPadding,
      paddingTop: LAYOUT.pageTopPadding
    },
    bgAccentTop: {
      position: "absolute",
      top: -60,
      left: -40,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: `${colors.primary}18`
    },
    bgAccentRight: {
      position: "absolute",
      top: 140,
      right: -80,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: `${colors.accent}55`
    },
    logoFab: {
      position: "absolute",
      left: 16,
      bottom: 16,
      width: 50,
      height: 50,
      borderRadius: RADIUS.pill,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center"
    }
  });
