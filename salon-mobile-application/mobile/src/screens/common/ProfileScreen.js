import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../../components/ScreenContainer";
import PrimaryButton from "../../components/PrimaryButton";
import InputField from "../../components/InputField";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../services/api";
import {
  buildUserManagementSummary,
  getAccountStatusMeta,
  isRestrictedBeauticianAccount
} from "../../services/userManagement";
import { FONTS, RADIUS, SPACING, TYPOGRAPHY } from "../../constants/theme";
import {
  compactName,
  normalizeEmail,
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
  validateRequiredPassword
} from "../../utils/validation";

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
};

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user, updateProfile, logout, changePassword, deactivateMyAccount } = useAuth();
  const [form, setForm] = useState({ title: "Mr", name: "", email: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    setForm({
      title: user?.title || "Mr",
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || ""
    });
    setSelectedImage(null);
    setIsEditing(false);
    setErrors({});
  }, [user]);

  const loadSummaryData = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const [appointmentsRes, feedbacksRes] = await Promise.allSettled([
        api.get("/appointments"),
        api.get("/feedbacks")
      ]);
      if (appointmentsRes.status === "fulfilled") {
        setAppointments(appointmentsRes.value?.data?.data || []);
      }
      if (feedbacksRes.status === "fulfilled") {
        setFeedbacks(feedbacksRes.value?.data?.data || []);
      }
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  useFocusEffect(
    useCallback(() => {
      loadSummaryData();
    }, [loadSummaryData])
  );

  const userSummary = useMemo(
    () => buildUserManagementSummary({ user, appointments, feedbacks }),
    [appointments, feedbacks, user]
  );
  const statusMeta = getAccountStatusMeta(userSummary.metrics.accountStatus);
  const restrictedBeautician = isRestrictedBeauticianAccount(userSummary.user);
  const earnedBadges = userSummary.earnedBadges;
  const nextBadge = userSummary.nextBadge;

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow media access to upload profile picture");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const onSave = async () => {
    const nextErrors = {};
    const nameError = validateName(form.name, "Full name");
    const emailError = validateEmail(form.email);
    const phoneError = validatePhone(form.phone);
    if (nameError) nextErrors.name = nameError;
    if (!["Mr", "Mrs", "Ms", "Dr"].includes(form.title)) nextErrors.title = "Select a valid title";
    if (emailError) nextErrors.email = emailError;
    if (phoneError) nextErrors.phone = phoneError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      setSaving(true);
      await updateProfile({
        name: compactName(form.name),
        title: form.title,
        email: normalizeEmail(form.email),
        phone: form.phone.trim(),
        profileImageAsset: selectedImage
      });
      setSelectedImage(null);
      setIsEditing(false);
      setErrors({});
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      Alert.alert("Update failed", error?.response?.data?.message || "Please try again");
    } finally {
      setSaving(false);
    }
  };

  const onCancelEdit = () => {
    setForm({
      title: user?.title || "Mr",
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || ""
    });
    setSelectedImage(null);
    setIsEditing(false);
    setErrors({});
  };

  const onChangePassword = async () => {
    const nextErrors = {};
    const currentError = validateRequiredPassword(passwordForm.currentPassword, "Current password");
    const newError = validatePassword(passwordForm.newPassword, "New password");
    const confirmError = validateConfirmPassword(passwordForm.newPassword, passwordForm.confirmPassword);
    if (currentError) nextErrors.currentPassword = currentError;
    if (newError) nextErrors.newPassword = newError;
    if (confirmError) nextErrors.confirmPassword = confirmError;
    setPasswordErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      setChangingPassword(true);
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({});
      setShowPasswordSection(false);
      Alert.alert("Success", "Password changed successfully");
    } catch (error) {
      Alert.alert("Failed", error?.response?.data?.message || "Could not change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const onDeactivateAccount = () => {
    Alert.alert(
      "Deactivate account",
      "Your account will be deactivated and you'll be logged out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              await deactivateMyAccount();
            } catch (error) {
              Alert.alert("Failed", error?.response?.data?.message || "Could not deactivate account");
            }
          }
        }
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={[styles.statusCard, styles[`${statusMeta.tone}StatusCard`]]}>
        <View style={styles.statusTopRow}>
          <Text style={styles.statusLabel}>{statusMeta.label}</Text>
          <Text style={styles.statusRole}>{user?.role === "staff" ? "Beautician" : user?.role || "Customer"}</Text>
        </View>
        <Text style={styles.statusMessage}>{statusMeta.message}</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.sectionTitle}>Profile Summary</Text>
            <Text style={styles.summaryHint}>{summaryLoading ? "Refreshing summary..." : "Rewards update from your account activity."}</Text>
          </View>
          <View style={styles.pointsPill}>
            <Text style={styles.pointsValue}>{userSummary.metrics.loyaltyPoints}</Text>
            <Text style={styles.pointsLabel}>pts</Text>
          </View>
        </View>
        <View style={styles.metricGrid}>
          <SummaryMetric label="Referral Code" value={userSummary.metrics.referralCode} styles={styles} />
          <SummaryMetric label="Referrals" value={userSummary.metrics.referralsCompleted} styles={styles} />
          <SummaryMetric label="Appointments" value={userSummary.metrics.completedAppointments} styles={styles} />
          <SummaryMetric label="Reviews" value={userSummary.metrics.reviewsSubmitted} styles={styles} />
          <SummaryMetric label="Badges" value={userSummary.metrics.badgesEarned} styles={styles} />
          <SummaryMetric label="Logins" value={userSummary.metrics.loginCount || "N/A"} styles={styles} />
        </View>
        <Text style={styles.lastLogin}>Last login: {formatDateTime(userSummary.metrics.lastLoginAt)}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Referral Rewards</Text>
        <View style={styles.referralCodeBox}>
          <Text style={styles.referralCode}>{userSummary.metrics.referralCode}</Text>
          <Text style={styles.referralCaption}>Share this code when inviting new customers.</Text>
        </View>
        <Text style={styles.item}>Completed referrals: {userSummary.metrics.referralsCompleted}</Text>
        <Text style={styles.item}>Referral reward points: {userSummary.metrics.referralRewards}</Text>
        {userSummary.metrics.referredBy ? <Text style={styles.item}>Referred by: {userSummary.metrics.referredBy}</Text> : null}
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.sectionTitle}>Achievement Badges</Text>
          <Text style={styles.badgeCount}>{earnedBadges.length}/{userSummary.badges.length}</Text>
        </View>
        <View style={styles.badgeGrid}>
          {userSummary.badges.map((badge) => (
            <View key={badge.key} style={[styles.badgeTile, badge.earned && styles.badgeTileEarned]}>
              <Text style={[styles.badgeTitle, badge.earned && styles.badgeTitleEarned]}>{badge.title}</Text>
              <Text style={styles.badgeDescription}>{badge.description}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(badge.progress * 100)}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {badge.earned ? "Earned" : `${badge.current}/${badge.target}`}
              </Text>
            </View>
          ))}
        </View>
        {nextBadge ? (
          <Text style={styles.nextBadge}>
            Next: {nextBadge.title} needs {nextBadge.remaining} more.
          </Text>
        ) : (
          <Text style={styles.nextBadge}>All badges earned.</Text>
        )}
      </View>

      {restrictedBeautician ? (
        <View style={styles.restrictedCard}>
          <Text style={styles.restrictedTitle}>Staff actions restricted</Text>
          <Text style={styles.restrictedText}>
            Appointment, feedback, inventory, and payment tools become available after approval.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.imageWrap}>
          {selectedImage?.uri || user?.profileImage ? (
            <Image source={{ uri: selectedImage?.uri || user?.profileImage }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          {isEditing ? (
            <PrimaryButton
              title="Upload Photo"
              variant="outline"
              onPress={pickImage}
              style={styles.uploadButton}
            />
          ) : null}
        </View>
        <Text style={styles.label}>Title</Text>
        <View style={styles.row}>
          {["Mr", "Mrs", "Ms", "Dr"].map((title) => (
            <PrimaryButton
              key={title}
              title={title}
              variant={form.title === title ? "solid" : "outline"}
              style={styles.rowBtn}
              disabled={!isEditing}
              onPress={() => setForm((prev) => ({ ...prev, title }))}
            />
          ))}
        </View>
        {!!errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        <InputField
          label="Name"
          value={form.name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
          placeholder="Your name"
          editable={isEditing}
          autoCapitalize="words"
          error={errors.name}
        />
        <InputField
          label="Email"
          value={form.email}
          onChangeText={(value) => setForm((prev) => ({ ...prev, email: value.replace(/\s/g, "") }))}
          placeholder="Enter email"
          editable={isEditing}
          keyboardType="email-address"
          error={errors.email}
        />
        <InputField
          label="Phone"
          value={form.phone}
          onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value.replace(/\D/g, "").slice(0, 10) }))}
          placeholder="07xxxxxxxx"
          editable={isEditing}
          keyboardType="phone-pad"
          maxLength={10}
          error={errors.phone}
        />
        <Text style={styles.item}>Role: {user?.role}</Text>
        <Text style={styles.item}>Account Status: {statusMeta.label}</Text>
      </View>
      <PrimaryButton
        title={showPasswordSection ? "Hide Change Password" : "Change Password"}
        variant="outline"
        onPress={() => {
          if (showPasswordSection) {
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setPasswordErrors({});
            setShowPasswordSection(false);
          } else {
            setShowPasswordSection(true);
          }
        }}
      />
      {showPasswordSection ? (
        <>
          <View style={{ height: 10 }} />
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Change Password</Text>
            <InputField
              label="Current Password"
              value={passwordForm.currentPassword}
              onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, currentPassword: value }))}
              secureTextEntry
              placeholder="Enter current password"
              error={passwordErrors.currentPassword}
            />
            <InputField
              label="New Password"
              value={passwordForm.newPassword}
              onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
              secureTextEntry
              placeholder="Minimum 6 characters with letters and numbers"
              error={passwordErrors.newPassword}
            />
            <InputField
              label="Confirm New Password"
              value={passwordForm.confirmPassword}
              onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
              secureTextEntry
              placeholder="Re-enter new password"
              error={passwordErrors.confirmPassword}
            />
            <PrimaryButton
              title="Update Password"
              variant="outline"
              onPress={onChangePassword}
              loading={changingPassword}
            />
          </View>
        </>
      ) : null}
      <View style={{ height: 10 }} />
      {isEditing ? (
        <>
          <PrimaryButton title="Save Profile" onPress={onSave} loading={saving} />
          <View style={{ height: 10 }} />
          <PrimaryButton title="Cancel" variant="outline" onPress={onCancelEdit} />
          <View style={{ height: 10 }} />
        </>
      ) : (
        <>
          <PrimaryButton title="Edit Profile" onPress={() => setIsEditing(true)} />
          <View style={{ height: 10 }} />
        </>
      )}
      <PrimaryButton title="Logout" onPress={logout} />
      <View style={{ height: 10 }} />
      <PrimaryButton title="Deactivate Account" variant="outline" onPress={onDeactivateAccount} />
    </ScreenContainer>
  );
}

function SummaryMetric({ label, value, styles }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    title: {
      fontSize: TYPOGRAPHY.xxl,
      fontWeight: "800",
      color: colors.primaryDark,
      marginBottom: SPACING.md
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.sm,
      padding: SPACING.md,
      marginBottom: SPACING.md
    },
    statusCard: {
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1
    },
    successStatusCard: {
      backgroundColor: `${colors.success}14`,
      borderColor: `${colors.success}55`
    },
    warningStatusCard: {
      backgroundColor: `${colors.primary}18`,
      borderColor: `${colors.primary}66`
    },
    dangerStatusCard: {
      backgroundColor: `${colors.danger}14`,
      borderColor: `${colors.danger}55`
    },
    statusTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: SPACING.sm,
      alignItems: "center"
    },
    statusLabel: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.lg
    },
    statusRole: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.sm,
      textTransform: "capitalize"
    },
    statusMessage: {
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.sm,
      marginTop: SPACING.xs
    },
    summaryCard: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.md,
      marginBottom: SPACING.md
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: SPACING.sm,
      marginBottom: SPACING.sm
    },
    summaryHint: {
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.xs,
      marginTop: 2
    },
    pointsPill: {
      minWidth: 72,
      borderRadius: RADIUS.md,
      backgroundColor: `${colors.primary}20`,
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      alignItems: "center"
    },
    pointsValue: {
      color: colors.primaryDark,
      fontFamily: FONTS.heading,
      fontSize: TYPOGRAPHY.xxl
    },
    pointsLabel: {
      color: colors.muted,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.xs
    },
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: SPACING.sm
    },
    metricCard: {
      width: "47.5%",
      backgroundColor: colors.background,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.sm
    },
    metricValue: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.lg
    },
    metricLabel: {
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.xs,
      marginTop: 2
    },
    lastLogin: {
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.xs,
      marginTop: SPACING.sm
    },
    referralCodeBox: {
      backgroundColor: colors.background,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.md,
      marginBottom: SPACING.sm
    },
    referralCode: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodyBold,
      fontSize: TYPOGRAPHY.xl,
      letterSpacing: 0
    },
    referralCaption: {
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.xs,
      marginTop: 2
    },
    badgeCount: {
      color: colors.primaryDark,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.sm
    },
    badgeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: SPACING.sm
    },
    badgeTile: {
      width: "47.5%",
      backgroundColor: colors.background,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.sm
    },
    badgeTileEarned: {
      borderColor: `${colors.success}66`,
      backgroundColor: `${colors.success}12`
    },
    badgeTitle: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.sm
    },
    badgeTitleEarned: {
      color: colors.success
    },
    badgeDescription: {
      color: colors.muted,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.xs,
      marginTop: 2,
      minHeight: 32
    },
    progressTrack: {
      height: 6,
      borderRadius: RADIUS.pill,
      backgroundColor: colors.border,
      overflow: "hidden",
      marginTop: SPACING.xs
    },
    progressFill: {
      height: "100%",
      borderRadius: RADIUS.pill,
      backgroundColor: colors.primary
    },
    progressText: {
      color: colors.muted,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.xs,
      marginTop: 4
    },
    nextBadge: {
      color: colors.text,
      fontFamily: FONTS.bodyMedium,
      fontSize: TYPOGRAPHY.sm,
      marginTop: SPACING.sm
    },
    restrictedCard: {
      backgroundColor: `${colors.danger}12`,
      borderColor: `${colors.danger}55`,
      borderWidth: 1,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.md
    },
    restrictedTitle: {
      color: colors.danger,
      fontFamily: FONTS.bodySemiBold,
      fontSize: TYPOGRAPHY.md
    },
    restrictedText: {
      color: colors.text,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.sm,
      marginTop: 2
    },
    imageWrap: {
      alignItems: "center",
      marginBottom: 14
    },
    uploadButton: {
      marginTop: 10,
      paddingHorizontal: 24,
      minWidth: 170
    },
    image: {
      width: 92,
      height: 92,
      borderRadius: 46,
      marginBottom: 8
    },
    placeholder: {
      width: 92,
      height: 92,
      borderRadius: 46,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8
    },
    placeholderText: {
      color: colors.muted
    },
    item: {
      color: colors.text,
      marginBottom: 6
    },
    sectionTitle: {
      marginTop: SPACING.xs + 2,
      marginBottom: SPACING.sm,
      color: colors.primaryDark,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.lg
    },
    label: {
      marginBottom: 8,
      color: colors.text,
      fontWeight: "600"
    },
    errorText: {
      color: colors.danger,
      marginTop: -4,
      marginBottom: 8,
      fontFamily: FONTS.body,
      fontSize: TYPOGRAPHY.sm
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 10
    },
    rowBtn: {
      minWidth: "22%",
      flex: 1
    }
  });
