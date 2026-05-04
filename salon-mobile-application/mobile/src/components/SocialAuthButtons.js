import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { ResponseType } from "expo-auth-session";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { FONTS } from "../constants/theme";

WebBrowser.maybeCompleteAuthSession();

const isExpoProxyRedirect = (uri) => String(uri || "").startsWith("https://auth.expo.io/");

const buildExpoProxyStartUrl = ({ authUrl, proxyRedirectUri, returnUrl }) =>
  `${proxyRedirectUri}/start?authUrl=${encodeURIComponent(authUrl)}&returnUrl=${encodeURIComponent(returnUrl)}`;

export default function SocialAuthButtons({
  preferredName = "",
  preferredTitle = "Mr",
  preferredPhone = ""
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { socialLogin } = useAuth();
  const [busyProvider, setBusyProvider] = useState("");
  const handledGoogleTokenRef = useRef("");
  const googleWebClientId =
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const googleIosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  const googleRedirectUri =
    process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || "https://auth.expo.io/@eranga_m/salon-management-app";
  const hasGoogleClient = Boolean(googleWebClientId || googleAndroidClientId || googleIosClientId);

  const [googleRequest, googleResponse, promptGoogle] = Google.useAuthRequest({
    webClientId: googleWebClientId,
    androidClientId: googleAndroidClientId,
    iosClientId: googleIosClientId,
    responseType: ResponseType.Token,
    scopes: ["openid", "profile", "email"],
    redirectUri: googleRedirectUri,
    selectAccount: true
  });

  const completeGoogleLogin = async (response) => {
    if (response?.type !== "success") return;
    const idToken = response?.params?.id_token || response?.authentication?.idToken || "";
    const accessToken = response?.params?.access_token || response?.authentication?.accessToken || "";
    const tokenKey = idToken || accessToken;
    if (!tokenKey) {
      Alert.alert("Google login failed", "No Google authentication token was received. Please try again.");
      return;
    }
    if (handledGoogleTokenRef.current === tokenKey) {
      return;
    }
    try {
      setBusyProvider("google");
      await socialLogin({
        provider: "google",
        idToken,
        accessToken,
        name: preferredName,
        title: preferredTitle,
        phone: preferredPhone
      });
      handledGoogleTokenRef.current = tokenKey;
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Unable to login with Google right now.";
      Alert.alert("Google login failed", message);
    } finally {
      setBusyProvider("");
    }
  };

  useEffect(() => {
    completeGoogleLogin(googleResponse);
  }, [googleResponse]);

  const startGoogle = async () => {
    if (!googleRequest || busyProvider) return;
    handledGoogleTokenRef.current = "";
    if (!String(googleRequest.url || "").includes("redirect_uri=")) {
      Alert.alert("Google login config error", "redirect_uri is missing from auth request.");
      return;
    }
    if (isExpoProxyRedirect(googleRedirectUri)) {
      const returnUrl = AuthSession.getDefaultReturnUrl();
      const result = await WebBrowser.openAuthSessionAsync(
        buildExpoProxyStartUrl({
          authUrl: googleRequest.url,
          proxyRedirectUri: googleRedirectUri,
          returnUrl
        }),
        returnUrl
      );
      if (result.type === "success" && result.url) {
        await completeGoogleLogin(googleRequest.parseReturnUrl(result.url));
      } else if (result.type !== "cancel") {
        Alert.alert("Google login failed", "Google sign-in was not completed. Please try again.");
      }
      return;
    }
    await promptGoogle();
  };

  const isBusy = Boolean(busyProvider);

  return (
    <View style={styles.container}>
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or continue with Google</Text>
        <View style={styles.divider} />
      </View>

      {!hasGoogleClient ? (
        <Text style={styles.warningText}>
          Missing Google auth env value. Please restart Expo after updating `.env`.
        </Text>
      ) : null}

      <Pressable
        style={[styles.socialBtn, styles.googleBtn, (!googleRequest || isBusy) && styles.disabledBtn]}
        disabled={!googleRequest || isBusy}
        onPress={startGoogle}
      >
        <Text style={styles.googleBtnText}>
          {busyProvider === "google" ? "Connecting..." : "Continue with Google"}
        </Text>
      </Pressable>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      marginTop: 12
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      flex: 1
    },
    dividerText: {
      marginHorizontal: 8,
      color: colors.muted,
      fontFamily: FONTS.body
    },
    socialBtn: {
      borderRadius: 10,
      borderWidth: 1,
      paddingVertical: 12,
      alignItems: "center",
      marginBottom: 8
    },
    googleBtn: {
      borderColor: "#dadce0",
      backgroundColor: "#ffffff"
    },
    googleBtnText: {
      color: "#1f1f1f",
      fontFamily: FONTS.bodySemiBold
    },
    disabledBtn: {
      opacity: 0.6
    },
    warningText: {
      color: colors.danger,
      marginBottom: 8,
      fontFamily: FONTS.body
    }
  });
