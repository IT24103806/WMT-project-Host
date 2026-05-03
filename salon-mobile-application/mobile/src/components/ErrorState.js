import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PrimaryButton from "./PrimaryButton";
import { useTheme } from "../context/ThemeContext";
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme";

export default function ErrorState({
  title = "Something went wrong",
  subtitle = "Please try again.",
  actionLabel = "Retry",
  onRetry
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {onRetry ? (
        <View style={{ marginTop: 12, minWidth: 140 }}>
          <PrimaryButton title={actionLabel} onPress={onRetry} />
        </View>
      ) : null}
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
      backgroundColor: `${colors.danger}20`,
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
