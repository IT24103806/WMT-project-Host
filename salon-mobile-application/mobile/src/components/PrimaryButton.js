import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme";

export default function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "solid",
  icon = null,
  style
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isDisabled = loading || disabled;
  return (
    <Pressable
      style={[
        styles.button,
        variant === "outline" && styles.outlineButton,
        variant === "success" && styles.successButton,
        isDisabled && styles.disabledButton,
        style
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? colors.primary : colors.buttonText} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.text, variant === "outline" && styles.outlineText]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    button: {
      backgroundColor: colors.primary,
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 46
    },
    outlineButton: {
      backgroundColor: colors.card,
      borderColor: colors.primary,
      borderWidth: 1.4
    },
    successButton: {
      backgroundColor: colors.success
    },
    text: {
      color: colors.buttonText,
      fontSize: TYPOGRAPHY.lg,
      fontFamily: FONTS.bodySemiBold
    },
    outlineText: {
      color: colors.primary
    },
    disabledButton: {
      opacity: 0.6
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.xs
    }
  });
