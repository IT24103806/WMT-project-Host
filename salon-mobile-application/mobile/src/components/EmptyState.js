import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme";

export default function EmptyState({ title = "Nothing here yet", subtitle = "Try again later." }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name="file-tray-outline" size={24} color={colors.primaryDark} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      paddingVertical: SPACING.xl + 4,
      alignItems: "center"
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.sm
    },
    title: {
      color: colors.text,
      fontFamily: FONTS.heading,
      fontSize: TYPOGRAPHY.xl
    },
    subtitle: {
      color: colors.muted,
      marginTop: SPACING.xs,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.md
    }
  });
