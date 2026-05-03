import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import SalonLogo from "./SalonLogo";

const TIKTOK_URL = "https://www.tiktok.com/@o_s_k__i?_r=1&_t=ZS-92B1BbEk87b";
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61583009361014&sk=about";
const PHONE = "0729300846";

export default function SalonInfoFab({ style }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    translateY.setValue(20);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true })
    ]).start();
  }, [opacity, translateY, visible]);

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 20, duration: 180, useNativeDriver: true })
    ]).start(() => setVisible(false));
  };

  const openLink = async (url) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Unable to open link", "Please try again.");
    }
  };

  return (
    <>
      <Pressable style={[styles.logoFab, style]} onPress={() => setVisible(true)}>
        <SalonLogo size={42} />
      </Pressable>
      <Modal visible={visible} transparent animationType="none" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                opacity,
                transform: [{ translateY }]
              }
            ]}
          >
            <View style={styles.headerRow}>
              <SalonLogo size={52} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>SALON OSKI</Text>
                <Text style={styles.subtitle}>Diyatalawa</Text>
              </View>
            </View>

            <Pressable style={styles.linkButton} onPress={() => openLink(TIKTOK_URL)}>
              <Text style={styles.linkText}>Open TikTok Page</Text>
            </Pressable>
            <Pressable style={styles.linkButton} onPress={() => openLink(FACEBOOK_URL)}>
              <Text style={styles.linkText}>Open Facebook Page</Text>
            </Pressable>
            <Pressable style={styles.phoneButton} onPress={() => openLink(`tel:${PHONE}`)}>
              <Text style={styles.phoneText}>Call {PHONE}</Text>
            </Pressable>

            <Pressable style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    logoFab: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center"
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
      padding: 16
    },
    modalCard: {
      backgroundColor: colors.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12
    },
    title: {
      color: colors.primaryDark,
      fontWeight: "800",
      fontSize: 18
    },
    subtitle: {
      color: colors.muted
    },
    linkButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
      marginBottom: 8
    },
    linkText: {
      color: colors.text,
      fontWeight: "700"
    },
    phoneButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginTop: 2
    },
    phoneText: {
      color: colors.buttonText,
      fontWeight: "800",
      textAlign: "center"
    },
    closeButton: {
      marginTop: 10,
      paddingVertical: 8
    },
    closeText: {
      textAlign: "center",
      color: colors.muted,
      fontWeight: "700"
    }
  });
