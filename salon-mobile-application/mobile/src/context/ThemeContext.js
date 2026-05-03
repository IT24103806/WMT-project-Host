import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DARK_COLORS } from "../constants/theme";
import { LIGHT_COLORS } from "../constants/theme";

const THEME_KEY = "salon_theme_mode";
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState("dark");

  useEffect(() => {
    const loadTheme = async () => {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored === "light" || stored === "dark") {
        setMode(stored);
      } else {
        setMode("dark");
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  const colors = mode === "dark" ? DARK_COLORS : LIGHT_COLORS;
  const value = useMemo(() => ({ mode, colors, toggleTheme }), [mode, colors]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
