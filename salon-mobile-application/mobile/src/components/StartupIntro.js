import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import SalonLogo from "./SalonLogo";
import { FONTS } from "../constants/theme";

export default function StartupIntro() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const slideUp = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, scale, slideUp]);

  return (
    <View style={styles.root}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <Animated.View
        style={[
          styles.content,
          {
            opacity,
            transform: [{ scale }, { translateY: slideUp }]
          }
        ]}
      >
        <SalonLogo size={108} />
        <Text style={styles.brand}>SALON OSKI</Text>
        <Text style={styles.tagline}>Style. Care. Confidence.</Text>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden"
    },
    glowTop: {
      position: "absolute",
      top: -120,
      left: -60,
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: `${colors.primary}28`
    },
    glowBottom: {
      position: "absolute",
      bottom: -140,
      right: -80,
      width: 300,
      height: 300,
      borderRadius: 150,
      backgroundColor: `${colors.accent}80`
    },
    content: {
      alignItems: "center"
    },
    brand: {
      marginTop: 14,
      color: colors.primaryDark,
      fontSize: 30,
      fontFamily: FONTS.heading,
      letterSpacing: 1.4
    },
    tagline: {
      marginTop: 6,
      color: colors.muted,
      fontSize: 14,
      fontFamily: FONTS.body
    }
  });
