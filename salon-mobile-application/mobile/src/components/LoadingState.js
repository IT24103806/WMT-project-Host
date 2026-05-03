import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme";

export default function LoadingState({ label = "Loading..." }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
        <Text style={styles.badgeText}>Salon OSKI</Text>
      </View>
      <ActivityIndicator color={colors.primaryDark} size="small" />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: SPACING.xl + 6
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.accent,
      borderRadius: RADIUS.pill,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs + 2,
      marginBottom: SPACING.sm
    },
    badgeText: {
      color: colors.primaryDark,
      fontSize: TYPOGRAPHY.sm,
      fontFamily: FONTS.bodySemiBold
    },
    text: {
      marginTop: SPACING.sm,
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.md
    }
  });
