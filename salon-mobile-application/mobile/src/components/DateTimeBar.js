import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme";

const formatDateTime = (value) => {
  const date = value.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });
  const time = value.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  return { date, time };
};

export default function DateTimeBar() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const labels = useMemo(() => formatDateTime(now), [now]);

  return (
    <View style={styles.card}>
      <Text style={styles.date}>{labels.date}</Text>
      <Text style={styles.time}>{labels.time}</Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.lg,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      marginBottom: SPACING.sm
    },
    date: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.md
    },
    time: {
      marginTop: 2,
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.xl
    }
  });
