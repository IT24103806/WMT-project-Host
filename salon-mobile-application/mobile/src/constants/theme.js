export const LIGHT_COLORS = {
  primary: "#D1708F",
  primaryDark: "#A54E6D",
  accent: "#F3D7E1",
  background: "#FFF9FB",
  card: "#FFFFFF",
  text: "#2F2330",
  muted: "#8B7285",
  danger: "#C23A4A",
  success: "#2F9E6D",
  border: "#F1E2E8",
  buttonText: "#FFFFFF",
  shadow: "rgba(165,78,109,0.12)",
  tabBar: "#FFFFFF",
  inputBg: "#FFFFFF"
};

export const DARK_COLORS = {
  primary: "#E18EA8",
  primaryDark: "#C16C8A",
  accent: "#533744",
  background: "#181318",
  card: "#231C23",
  text: "#F7EEF3",
  muted: "#B89FAE",
  danger: "#FF8B97",
  success: "#52CF97",
  border: "#3A2C36",
  buttonText: "#FFFFFF",
  shadow: "rgba(0,0,0,0.4)",
  tabBar: "#231C23",
  inputBg: "#2B222B"
};

export const FONTS = {
  heading: "PlayfairDisplay_700Bold",
  body: "Poppins_400Regular",
  bodyMedium: "Poppins_500Medium",
  bodySemiBold: "Poppins_600SemiBold",
  bodyBold: "Poppins_700Bold"
};

export const UI_SCALE = 0.92;
const s = (value) => Math.round(value * UI_SCALE);

export const TYPOGRAPHY = {
  xs: s(11),
  sm: s(12),
  md: s(14),
  lg: s(16),
  xl: s(18),
  xxl: s(22),
  display: s(26)
};

export const SPACING = {
  xs: s(4),
  sm: s(8),
  md: s(12),
  lg: s(16),
  xl: s(20)
};

export const RADIUS = {
  sm: s(10),
  md: s(12),
  lg: s(14),
  pill: 999
};

export const LAYOUT = {
  sidebarWidth: 290,
  pageHorizontalPadding: s(16),
  pageTopPadding: s(28)
};
