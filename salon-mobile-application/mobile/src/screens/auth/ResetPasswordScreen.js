import React, { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { FONTS } from "../../constants/theme";
import { validateConfirmPassword, validatePassword, validateResetCode } from "../../utils/validation";

export default function ResetPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { resetPassword } = useAuth();
  const [form, setForm] = useState({ token: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const nextErrors = {};
    const tokenError = validateResetCode(form.token);
    const passwordError = validatePassword(form.password, "New password");
    const confirmError = validateConfirmPassword(form.password, form.confirm);
    if (tokenError) nextErrors.token = tokenError;
    if (passwordError) nextErrors.password = passwordError;
    if (confirmError) nextErrors.confirm = confirmError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      return;
    }

    try {
      setLoading(true);
      await resetPassword({ token: form.token.trim(), newPassword: form.password });
      Alert.alert("Success", "Password reset successful", [
        { text: "Go to Login", onPress: () => navigation.navigate("Login") }
      ]);
    } catch (error) {
      Alert.alert("Failed", error?.response?.data?.message || "Please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Use the 6-digit reset code and set a new password.</Text>
      <InputField
        label="Reset Code"
        value={form.token}
        onChangeText={(value) => setForm((prev) => ({ ...prev, token: value.replace(/\D/g, "").slice(0, 6) }))}
        placeholder="Enter 6-digit code"
        keyboardType="numeric"
        maxLength={6}
        error={errors.token}
      />
      <InputField
        label="New Password"
        value={form.password}
        onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
        placeholder="Minimum 6 characters"
        secureTextEntry
        error={errors.password}
      />
      <InputField
        label="Confirm Password"
        value={form.confirm}
        onChangeText={(value) => setForm((prev) => ({ ...prev, confirm: value }))}
        placeholder="Re-enter password"
        secureTextEntry
        error={errors.confirm}
      />
      <PrimaryButton title="Reset Password" onPress={onSubmit} loading={loading} />
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    title: {
      color: colors.primaryDark,
      fontSize: 30,
      fontFamily: FONTS.heading,
      marginBottom: 6
    },
    subtitle: {
      color: colors.muted,
      marginBottom: 12,
      fontFamily: FONTS.body
    }
  });
