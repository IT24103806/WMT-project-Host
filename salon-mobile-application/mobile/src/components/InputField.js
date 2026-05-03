import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme";

export default function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = "default",
  error,
  editable = true,
  autoCapitalize = "none",
  maxLength,
  autoCorrect = false
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = !!secureTextEntry;
  const shouldMask = isPasswordField ? !showPassword : false;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error && styles.inputError, !editable && styles.inputDisabled]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={shouldMask}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          editable={editable}
        />
        {isPasswordField ? (
          <Pressable style={styles.eyeButton} onPress={() => setShowPassword((prev) => !prev)}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: { marginBottom: SPACING.md },
    label: {
      marginBottom: SPACING.xs,
      color: colors.text,
      fontSize: TYPOGRAPHY.md,
      fontFamily: FONTS.bodySemiBold
    },
    inputWrap: {
      backgroundColor: colors.inputBg || colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: RADIUS.lg,
      flexDirection: "row",
      alignItems: "center",
      minHeight: 46
    },
    input: {
      flex: 1,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm + 1,
      color: colors.text,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.md
    },
    inputError: {
      borderColor: colors.danger
    },
    inputDisabled: {
      opacity: 0.75
    },
    eyeButton: {
      paddingHorizontal: SPACING.sm + 2
    },
    error: {
      color: colors.danger,
      marginTop: SPACING.xs,
      fontSize: TYPOGRAPHY.sm,
      fontFamily: FONTS.body
    }
  });
