import React, { useEffect, useState } from "react";
import { Text, TextInput } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  PlayfairDisplay_700Bold
} from "@expo-google-fonts/playfair-display";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold
} from "@expo-google-fonts/poppins";
import { AuthProvider } from "./src/context/AuthContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import AppNavigator from "./src/navigation/AppNavigator";
import StartupIntro from "./src/components/StartupIntro";
import { TYPOGRAPHY } from "./src/constants/theme";

function RootApp() {
  const { mode } = useTheme();
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  if (showIntro) {
    return (
      <>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <StartupIntro />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold
  });

  useEffect(() => {
    if (!fontsLoaded) return;

    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = [
      { fontFamily: "Poppins_400Regular", fontSize: TYPOGRAPHY.md },
      Text.defaultProps.style
    ];

    TextInput.defaultProps = TextInput.defaultProps || {};
    TextInput.defaultProps.style = [
      { fontFamily: "Poppins_400Regular", fontSize: TYPOGRAPHY.md },
      TextInput.defaultProps.style
    ];
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootApp />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
