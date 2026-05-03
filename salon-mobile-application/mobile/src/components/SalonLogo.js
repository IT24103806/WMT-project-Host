import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { FONTS } from "../constants/theme";

const LOCAL_LOGO = require("../../assets/salon-logo.jpeg");
const RAW_LOGO_URI = process.env.EXPO_PUBLIC_SALON_LOGO_URL || "";

export default function SalonLogo({ size = 44, showName = false }) {
  const { colors } = useTheme();
  const logoUri = useMemo(() => String(RAW_LOGO_URI || "").trim(), []);
  const [localFailed, setLocalFailed] = useState(false);
  const [remoteFailed, setRemoteFailed] = useState(false);
  const styles = createStyles(colors, size);

  useEffect(() => {
    setLocalFailed(false);
    setRemoteFailed(false);
  }, [logoUri]);

  return (
    <View style={styles.wrap}>
      {!localFailed ? (
        <Image
          source={LOCAL_LOGO}
          style={styles.image}
          resizeMode="contain"
          onError={() => setLocalFailed(true)}
        />
      ) : logoUri && !remoteFailed ? (
        <Image
          source={{ uri: logoUri }}
          style={styles.image}
          resizeMode="contain"
          onError={() => setRemoteFailed(true)}
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>SO</Text>
        </View>
      )}
      {showName ? <Text style={styles.name}>SALON OSKI</Text> : null}
    </View>
  );
}

const createStyles = (colors, size) =>
  StyleSheet.create({
    wrap: {
      alignItems: "center",
      justifyContent: "center"
    },
    image: {
      width: size,
      height: size,
      borderRadius: size / 2
    },
    fallback: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center"
    },
    fallbackText: {
      color: "#fff",
      fontFamily: FONTS.bodyBold
    },
    name: {
      marginTop: 4,
      color: colors.primaryDark,
      fontFamily: FONTS.heading,
      fontSize: 12
    }
  });
