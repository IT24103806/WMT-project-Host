import React, { useState } from "react";
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";
import { useTheme } from "../../context/ThemeContext";
import SalonLogo from "../../components/SalonLogo";
import SalonInfoFab from "../../components/SalonInfoFab";
import { FONTS } from "../../constants/theme";
import SocialAuthButtons from "../../components/SocialAuthButtons";
import { normalizeEmail, validateEmail, validateRequiredPassword } from "../../utils/validation";

const SALON_BG =
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80";

export default function LoginScreen({ navigation }) {
  const { colors, mode } = useTheme();
  const styles = createStyles(colors, mode);
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const nextErrors = {};
    const emailError = validateEmail(form.email);
    const passwordError = validateRequiredPassword(form.password);
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      await login(normalizeEmail(form.email), form.password);
    } catch (error) {
      const responseData = error?.response?.data;
      const validationMessage = Array.isArray(responseData?.errors)
        ? responseData.errors.map((item) => item.msg).join("\n")
        : null;
      Alert.alert(
        "Login failed",
        validationMessage || responseData?.message || error?.message || "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={{ uri: SALON_BG }} style={styles.bg}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: undefined })}
          style={styles.root}
        >
          <View>
            <View style={styles.header}>
              <SalonLogo size={78} />
              <Text style={styles.brand}>SALON OSKI</Text>
              <Text style={styles.welcome}>Welcome</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            <View style={styles.card}>
              <InputField
                label="Email"
                value={form.email}
                onChangeText={(value) => setForm((prev) => ({ ...prev, email: value.replace(/\s/g, "") }))}
                placeholder="Enter email"
                keyboardType="email-address"
                error={errors.email}
              />
              <InputField
                label="Password"
                value={form.password}
                onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                placeholder="Enter password"
                secureTextEntry
                error={errors.password}
              />
              <Text style={styles.forgotLink} onPress={() => navigation.navigate("ForgotPassword")}>
                Forgot password?
              </Text>
              <PrimaryButton title="Login" onPress={onSubmit} loading={loading} />
              <SocialAuthButtons />
              <View style={styles.footer}>
                <Text style={styles.footerText}>No account yet?</Text>
                <Text style={styles.link} onPress={() => navigation.navigate("Register")}>
                  Register
                </Text>
              </View>
            </View>
          </View>
          <SalonInfoFab style={styles.logoFab} />
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const createStyles = (colors, mode) =>
  StyleSheet.create({
    bg: {
      flex: 1
    },
    overlay: {
      flex: 1,
      backgroundColor: mode === "dark" ? "rgba(0,0,0,0.62)" : "rgba(255,255,255,0.62)"
    },
    root: {
      flex: 1,
      padding: 18,
      justifyContent: "center"
    },
    header: {
      marginBottom: 18,
      alignItems: "center"
    },
    brand: {
      fontSize: 30,
      fontFamily: FONTS.heading,
      color: colors.text,
      letterSpacing: 1
    },
    welcome: {
      marginTop: 6,
      fontSize: 24,
      fontFamily: FONTS.heading,
      color: colors.primaryDark
    },
    subtitle: {
      marginTop: 4,
      color: colors.muted,
      fontFamily: FONTS.body
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 14
    },
    footerText: { color: colors.muted, marginRight: 6, fontFamily: FONTS.body },
    link: { color: colors.primary, fontFamily: FONTS.bodySemiBold },
    forgotLink: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodySemiBold,
      marginBottom: 10,
      textAlign: "right"
    },
    logoFab: {
      position: "absolute",
      left: 18,
      bottom: 18,
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center"
    }
  });
