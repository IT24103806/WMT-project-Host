import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "../../components/ScreenContainer";
import PrimaryButton from "../../components/PrimaryButton";
import InputField from "../../components/InputField";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import DateTimeBar from "../../components/DateTimeBar";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { FONTS, LAYOUT, RADIUS, SPACING, TYPOGRAPHY } from "../../constants/theme";

export default function ServicesScreen({ navigation }) {
  const { colors, mode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const styles = createStyles(colors);
  const [services, setServices] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [greeting, setGreeting] = useState("Good morning");
  const [activeTab, setActiveTab] = useState("services");
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerTranslateX = useRef(new Animated.Value(-500)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const drawerWidth = Math.min(LAYOUT.sidebarWidth, width * 0.88);
  const appVersion = Constants.expoConfig?.version || "1.0.0";

  const categoryOptions = useMemo(() => {
    const categories = new Set(
      services.map((item) => item.category || "Uncategorized").filter(Boolean)
    );
    return ["All", ...Array.from(categories)];
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return services.filter((item) => {
      const category = item.category || "Uncategorized";
      const byCategory = categoryFilter === "All" || category === categoryFilter;
      const bySearch =
        !query ||
        String(item.name || "").toLowerCase().includes(query) ||
        String(item.description || "").toLowerCase().includes(query);
      return byCategory && bySearch;
    });
  }, [services, searchText, categoryFilter]);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [servicesRes, feedbackRes] = await Promise.all([api.get("/services"), api.get("/feedbacks")]);
      setServices(servicesRes.data.data || []);
      setFeedbacks(feedbackRes.data.data || []);
    } catch (err) {
      setError("Unable to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else if (hour >= 17) setGreeting("Good evening");
    else setGreeting("Good morning");
  }, []);

  const openDrawer = useCallback(() => {
    drawerTranslateX.setValue(-drawerWidth);
    backdropOpacity.setValue(0);
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(drawerTranslateX, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true })
    ]).start();
  }, [backdropOpacity, drawerTranslateX, drawerWidth]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerTranslateX, { toValue: -drawerWidth, duration: 180, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true })
    ]).start(() => setDrawerVisible(false));
  }, [backdropOpacity, drawerTranslateX, drawerWidth]);

  const edgeSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (evt, gestureState) =>
          !drawerVisible &&
          evt?.nativeEvent?.pageX <= 24 &&
          gestureState.dx > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 36) openDrawer();
        }
      }),
    [drawerVisible, openDrawer]
  );

  const drawerSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          drawerVisible &&
          gestureState.dx < -8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -40) closeDrawer();
        }
      }),
    [closeDrawer, drawerVisible]
  );

  const navigateFromDrawer = useCallback(
    (routeName) => {
      closeDrawer();
      setTimeout(() => navigation.navigate(routeName), 90);
    },
    [closeDrawer, navigation]
  );

  const openLink = useCallback(async (url) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Unable to open link", "Please try again.");
    }
  }, []);

  const menuItems = useMemo(
    () => [
      {
        key: "inventory",
        icon: "pricetag-outline",
        label: "Inventory",
        onPress: () => navigateFromDrawer("Products")
      },
      {
        key: "booking-history",
        icon: "time-outline",
        label: "My appointments",
        onPress: () => navigateFromDrawer("Appointments")
      },
      {
        key: "feedbacks",
        icon: "chatbubbles-outline",
        label: "Feedbacks",
        onPress: () => navigateFromDrawer("Feedbacks")
      },
      {
        key: "services",
        icon: "cut-outline",
        label: "Services",
        onPress: closeDrawer
      },
      {
        key: "wallet",
        icon: "wallet-outline",
        label: "My wallet",
        onPress: () => navigateFromDrawer("Payments")
      },
      {
        key: "offers",
        icon: "gift-outline",
        label: "Everyday Value offers",
        onPress: () => navigateFromDrawer("Offers")
      },
      {
        key: "open-location",
        icon: "location-outline",
        label: "Open location",
        onPress: () => openLink("https://maps.google.com/?q=Salon+Oski+Diyatalawa")
      },
      {
        key: "terms",
        icon: "document-text-outline",
        label: "Terms & Conditions",
        onPress: () => navigateFromDrawer("TermsConditions")
      },
      {
        key: "contact",
        icon: "headset-outline",
        label: "Contact Us",
        onPress: () => openLink("tel:0729300846")
      }
    ],
    [closeDrawer, navigateFromDrawer, openLink]
  );

  const handleLogout = useCallback(() => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          closeDrawer();
          await logout();
        }
      }
    ]);
  }, [closeDrawer, logout]);

  return (
    <>
      <View style={{ flex: 1 }}>
        <ScreenContainer scroll={false} showThemeToggle={false}>
          <FlatList
            data={activeTab === "services" ? filteredServices : feedbacks}
            keyExtractor={(item) => item._id}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchServices} />}
            ListHeaderComponent={
              <View style={styles.headerWrapper}>
                <View style={styles.topOptionsRow}>
                  <View />
                  <Pressable style={styles.topOptionsButton} onPress={openDrawer}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
                  </Pressable>
                </View>
                <DateTimeBar />
                <View style={styles.greetingCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.greetingTitle}>{greeting}</Text>
                    <Text style={styles.greetingName}>{user?.name || "Customer"}</Text>
                  </View>
                  <Pressable style={styles.profileIconButton} onPress={openDrawer}>
                    <Ionicons name="person-circle-outline" size={36} color={colors.primaryDark} />
                  </Pressable>
                </View>

                <View style={styles.tabContainer}>
                  <Pressable
                    style={[styles.tabButton, activeTab === "services" && styles.tabButtonActive]}
                    onPress={() => setActiveTab("services")}
                  >
                    <Text style={[styles.tabText, activeTab === "services" && styles.tabTextActive]}>
                      Services
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.tabButton, activeTab === "feedbacks" && styles.tabButtonActive]}
                    onPress={() => setActiveTab("feedbacks")}
                  >
                    <Text style={[styles.tabText, activeTab === "feedbacks" && styles.tabTextActive]}>
                      Feedbacks
                    </Text>
                  </Pressable>
                </View>

                {activeTab === "services" ? (
                  <View style={styles.filterWrap}>
                    <InputField
                      label="Search services"
                      value={searchText}
                      onChangeText={setSearchText}
                      placeholder="Search by name or description"
                    />
                    <FlatList
                      horizontal
                      data={categoryOptions}
                      keyExtractor={(item) => item}
                      showsHorizontalScrollIndicator={false}
                      renderItem={({ item }) => {
                        const active = item === categoryFilter;
                        return (
                          <Pressable
                            style={[styles.catChip, active && styles.catChipActive]}
                            onPress={() => setCategoryFilter(item)}
                          >
                            <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{item}</Text>
                          </Pressable>
                        );
                      }}
                    />
                  </View>
                ) : null}
              </View>
            }
            ListHeaderComponentStyle={{ marginBottom: 6 }}
            ListFooterComponent={loading ? <LoadingState label="Refreshing salon data..." /> : null}
            ListEmptyComponent={
              loading ? (
                <LoadingState label="Loading content..." />
              ) : error ? (
                <ErrorState title="Could not load services" subtitle="Check connection and retry." onRetry={fetchServices} />
              ) : (
                <EmptyState
                  title={activeTab === "services" ? "No services found" : "No feedbacks yet"}
                  subtitle="New items will appear here."
                />
              )
            }
            renderItem={({ item }) =>
              activeTab === "services" ? (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.price}>LKR {item.price}</Text>
                  </View>
                  <Text style={styles.description}>{item.description}</Text>
                  <Text style={styles.meta}>Duration: {item.duration} minutes</Text>
                  <PrimaryButton title="Book Appointment" onPress={() => navigation.navigate("BookAppointment", { service: item })} />
                </View>
              ) : (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.name}>{item.staffId?.name || "Beautician"}</Text>
                    <Text style={styles.price}>{item.rating}/5</Text>
                  </View>
                  <Text style={styles.description}>{item.comment || "No comment"}</Text>
                  <Text style={styles.meta}>From: {item.customerId?.name || "Customer"}</Text>
                </View>
              )
            }
          />
        </ScreenContainer>
        {!drawerVisible ? <View style={styles.edgeSwipeZone} {...edgeSwipeResponder.panHandlers} /> : null}
      </View>

      <Modal visible={drawerVisible} transparent animationType="none" onRequestClose={closeDrawer}>
        <View style={styles.drawerLayer}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer}>
            <Animated.View style={[styles.drawerBackdrop, { opacity: backdropOpacity }]} />
          </Pressable>

          <Animated.View
            {...drawerSwipeResponder.panHandlers}
            style={[
              styles.drawerPanel,
              {
                width: drawerWidth,
                transform: [{ translateX: drawerTranslateX }],
                paddingTop: SPACING.xl + SPACING.sm
              }
            ]}
          >
            <View style={styles.drawerHeader}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.drawerAvatar} />
              ) : (
                <Ionicons name="person-circle" size={54} color={colors.primary} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.drawerName}>{user?.name || "Customer"}</Text>
                <Text style={styles.drawerPhone}>{user?.phone || "No phone added"}</Text>
              </View>
              <Pressable onPress={() => navigateFromDrawer("Profile")}>
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={styles.menuWrap}>
              {menuItems.map((item) => (
                <Pressable key={item.key} style={styles.drawerItem} onPress={item.onPress}>
                  <Ionicons name={item.icon} size={24} color={colors.text} />
                  <Text style={styles.drawerItemLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.themeButton} onPress={toggleTheme}>
              <Ionicons
                name={mode === "dark" ? "sunny-outline" : "moon-outline"}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.themeButtonText}>{mode === "dark" ? "Switch to Light" : "Switch to Dark"}</Text>
            </Pressable>

            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={colors.buttonText} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </Pressable>

            <Text style={styles.versionText}>v{appVersion}</Text>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    headerWrapper: {
      marginBottom: SPACING.sm,
      paddingTop: SPACING.sm
    },
    topOptionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: SPACING.sm
    },
    topOptionsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center"
    },
    greetingCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.lg,
      paddingVertical: SPACING.sm + 1,
      paddingHorizontal: SPACING.sm + 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    profileIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent
    },
    greetingTitle: {
      fontSize: TYPOGRAPHY.xl,
      fontFamily: FONTS.heading,
      color: colors.primaryDark,
      lineHeight: TYPOGRAPHY.xxl + 2
    },
    greetingName: {
      fontSize: TYPOGRAPHY.xxl,
      fontFamily: FONTS.heading,
      color: colors.text,
      marginTop: SPACING.xs
    },
    tabContainer: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginTop: SPACING.sm
    },
    tabButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: "transparent"
    },
    tabButtonActive: {
      borderBottomColor: "#1E3A8A"
    },
    tabText: {
      color: colors.muted,
      fontSize: TYPOGRAPHY.lg,
      fontFamily: FONTS.bodyMedium
    },
    tabTextActive: {
      color: "#1E3A8A",
      fontFamily: FONTS.bodySemiBold
    },
    filterWrap: {
      marginTop: SPACING.sm,
      marginBottom: SPACING.xs
    },
    catChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingHorizontal: SPACING.sm + 2,
      paddingVertical: SPACING.xs + 2,
      marginRight: SPACING.sm
    },
    catChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary
    },
    catChipText: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.sm
    },
    catChipTextActive: {
      color: colors.buttonText
    },
    card: {
      backgroundColor: colors.card,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border
    },
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    name: {
      fontSize: TYPOGRAPHY.xl,
      fontFamily: FONTS.bodySemiBold,
      color: colors.text
    },
    price: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.lg
    },
    description: {
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.md,
      marginTop: SPACING.xs,
      marginBottom: SPACING.sm
    },
    meta: {
      color: colors.text,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.sm,
      marginBottom: SPACING.xs
    },
    drawerLayer: {
      flex: 1,
      justifyContent: "flex-start"
    },
    drawerBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.36)"
    },
    drawerPanel: {
      height: "100%",
      backgroundColor: colors.card,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingTop: SPACING.md,
      paddingHorizontal: SPACING.md
    },
    drawerHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      backgroundColor: colors.accent,
      borderRadius: RADIUS.md,
      padding: SPACING.sm + 1
    },
    drawerAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card
    },
    drawerName: {
      color: colors.text,
      fontSize: TYPOGRAPHY.xl,
      lineHeight: TYPOGRAPHY.xxl + 2,
      fontFamily: FONTS.heading
    },
    drawerPhone: {
      marginTop: 2,
      color: colors.text,
      fontFamily: FONTS.bodyMedium,
      fontSize: TYPOGRAPHY.sm
    },
    editText: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.md
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginTop: SPACING.sm,
      marginBottom: SPACING.xs
    },
    menuWrap: {
      paddingTop: 2
    },
    drawerItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      paddingVertical: SPACING.md
    },
    drawerItemLabel: {
      color: colors.text,
      fontSize: TYPOGRAPHY.md,
      fontFamily: FONTS.bodyMedium
    },
    versionText: {
      marginTop: SPACING.sm,
      marginBottom: SPACING.sm + 2,
      textAlign: "right",
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.sm
    },
    logoutButton: {
      marginTop: SPACING.sm,
      backgroundColor: colors.danger,
      borderRadius: RADIUS.md,
      minHeight: 40,
      paddingHorizontal: SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    logoutButtonText: {
      color: colors.buttonText,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.md
    },
    themeButton: {
      marginTop: "auto",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: RADIUS.md,
      minHeight: 40,
      paddingHorizontal: SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    themeButtonText: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.sm
    },
    edgeSwipeZone: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 22,
      zIndex: 10
    }
  });


