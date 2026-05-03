import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import ScreenContainer from "../../components/ScreenContainer";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";
import SocialAuthButtons from "../../components/SocialAuthButtons";
import { FONTS } from "../../constants/theme";
import { SLOT_OPTIONS } from "../../constants/slots";
import {
  compactName,
  normalizeEmail,
  normalizeReferralCode,
  validateConfirmPassword,
  validateBeauticianRole,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
  validateReferralCode
} from "../../utils/validation";

const formatSlotsLabel = (slots) => {
  if (!slots?.length) return "Select available slots";
  if (slots.length <= 2) return slots.join(", ");
  return `${slots.slice(0, 2).join(", ")} +${slots.length - 2}`;
};

export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "Mr",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer",
    phone: "",
    referredByCode: "",
    staffRole: "",
    availableSlots: []
  });
  const [errors, setErrors] = useState({});
  const [slotsModalVisible, setSlotsModalVisible] = useState(false);

  const validate = () => {
    const nextErrors = {};
    const nameError = validateName(form.name, "Full name");
    const emailError = validateEmail(form.email);
    const passwordError = validatePassword(form.password);
    const confirmPasswordError = validateConfirmPassword(form.password, form.confirmPassword);
    const phoneError = validatePhone(form.phone);
    const referralError = validateReferralCode(form.referredByCode);
    if (nameError) nextErrors.name = nameError;
    if (!["Mr", "Mrs", "Ms", "Dr"].includes(form.title)) nextErrors.title = "Select a valid title";
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;
    if (confirmPasswordError) nextErrors.confirmPassword = confirmPasswordError;
    if (!["customer", "staff"].includes(form.role)) nextErrors.role = "Role must be customer or beautician";
    if (phoneError) nextErrors.phone = phoneError;
    if (referralError) nextErrors.referredByCode = referralError;
    if (form.role === "staff") {
      const staffRoleError = validateBeauticianRole(form.staffRole);
      if (staffRoleError) nextErrors.staffRole = staffRoleError;
    }
    if (form.role === "staff" && !form.availableSlots.length) {
      nextErrors.availableSlots = "Please select at least one available slot";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      await register({
        name: compactName(form.name),
        title: form.title,
        email: normalizeEmail(form.email),
        password: form.password,
        role: form.role,
        phone: form.phone.trim(),
        referredByCode: normalizeReferralCode(form.referredByCode) || undefined,
        staffRole: form.role === "staff" ? compactName(form.staffRole) : undefined,
        availableSlots: form.role === "staff" ? form.availableSlots : undefined
      });
      Alert.alert("Registration successful", "Please login with your credentials.", [
        { text: "OK", onPress: () => navigation.navigate("Login") }
      ]);
    } catch (error) {
      const responseData = error?.response?.data;
      const statusCode = error?.response?.status;
      const isNetworkError = !statusCode && /network error/i.test(String(error?.message || ""));
      const validationMessage = Array.isArray(responseData?.errors)
        ? responseData.errors.map((item) => item.msg).join("\n")
        : null;
      const serviceUnavailableMessage =
        statusCode === 503
          ? "Backend is temporarily unavailable. Please make sure the API server is running, then try again."
          : null;
      const networkUnavailableMessage = isNetworkError
        ? "Cannot reach the backend server. Please check internet access, ensure the backend is running, and verify EXPO_PUBLIC_API_URL."
        : null;
      Alert.alert(
        "Registration failed",
        validationMessage ||
          serviceUnavailableMessage ||
          networkUnavailableMessage ||
          responseData?.message ||
          error?.message ||
          "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Create Your Account</Text>
      <Text style={styles.subtitle}>Book appointments with your favorite stylist.</Text>
      <Text style={styles.roleLabel}>Title</Text>
      <View style={styles.roleRow}>
        {["Mr", "Mrs", "Ms", "Dr"].map((title) => (
          <Pressable
            key={title}
            style={[styles.roleOption, form.title === title && styles.roleOptionActive]}
            onPress={() => setForm((prev) => ({ ...prev, title }))}
          >
            <Text style={[styles.roleText, form.title === title && styles.roleTextActive]}>{title}</Text>
          </Pressable>
        ))}
      </View>
      {!!errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

      <InputField
        label="Name"
        value={form.name}
        onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
        placeholder="Full name"
        autoCapitalize="words"
        error={errors.name}
      />

      <InputField
        label="Email"
        value={form.email}
        onChangeText={(value) => setForm((prev) => ({ ...prev, email: value.replace(/\s/g, "") }))}
        placeholder="Enter email"
        keyboardType="email-address"
        error={errors.email}
      />

      <InputField
        label="Password"
        value={form.password}
        onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
        placeholder="Minimum 6 characters with letters and numbers"
        secureTextEntry
        error={errors.password}
      />

      <InputField
        label="Confirm Password"
        value={form.confirmPassword}
        onChangeText={(value) => setForm((prev) => ({ ...prev, confirmPassword: value }))}
        placeholder="Re-enter password"
        secureTextEntry
        error={errors.confirmPassword}
      />

      <Text style={styles.roleLabel}>Role</Text>
      <View style={styles.roleRow}>
        <Pressable
          style={[styles.roleOption, styles.roleOptionWide, form.role === "customer" && styles.roleOptionActive]}
          onPress={() => setForm((prev) => ({ ...prev, role: "customer" }))}
        >
          <Text style={[styles.roleText, form.role === "customer" && styles.roleTextActive]}>
            Customer
          </Text>
        </Pressable>
        <Pressable
          style={[styles.roleOption, styles.roleOptionWide, form.role === "staff" && styles.roleOptionActive]}
          onPress={() => setForm((prev) => ({ ...prev, role: "staff" }))}
        >
          <Text style={[styles.roleText, form.role === "staff" && styles.roleTextActive]}>Beautician</Text>
        </Pressable>
      </View>
      {!!errors.role && <Text style={styles.errorText}>{errors.role}</Text>}

      {form.role === "staff" ? (
        <View>
          <InputField
            label="Beautician Role"
            value={form.staffRole}
            onChangeText={(value) => setForm((prev) => ({ ...prev, staffRole: value }))}
            placeholder="Hairdresser"
            autoCapitalize="words"
            error={errors.staffRole}
          />
          <Text style={styles.roleLabel}>Available Slots</Text>
          <Pressable style={styles.slotSelector} onPress={() => setSlotsModalVisible(true)}>
            <Text style={form.availableSlots.length ? styles.slotText : styles.slotPlaceholder}>
              {formatSlotsLabel(form.availableSlots)}
            </Text>
          </Pressable>
          {!!errors.availableSlots && <Text style={styles.errorText}>{errors.availableSlots}</Text>}
        </View>
      ) : null}

      <InputField
        label="Phone"
        value={form.phone}
        onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value.replace(/\D/g, "").slice(0, 10) }))}
        placeholder="07xxxxxxxx"
        keyboardType="phone-pad"
        maxLength={10}
        error={errors.phone}
      />

      <InputField
        label="Referral Code (optional)"
        value={form.referredByCode}
        onChangeText={(value) => setForm((prev) => ({ ...prev, referredByCode: normalizeReferralCode(value) }))}
        placeholder="Friend's referral code"
        autoCapitalize="characters"
        maxLength={16}
        error={errors.referredByCode}
      />

      <SocialAuthButtons preferredName={form.name} preferredTitle={form.title} preferredPhone={form.phone} />
      <PrimaryButton title="Register" onPress={onSubmit} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          Login
        </Text>
      </View>

      <Modal visible={slotsModalVisible} transparent animationType="slide" onRequestClose={() => setSlotsModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Available Slots</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {SLOT_OPTIONS.map((slot) => {
                const active = form.availableSlots.includes(slot);
                return (
                  <Pressable
                    key={slot}
                    style={[styles.slotOption, active && styles.slotOptionActive]}
                    onPress={() =>
                      setForm((prev) => ({
                        ...prev,
                        availableSlots: active
                          ? prev.availableSlots.filter((item) => item !== slot)
                          : [...prev.availableSlots, slot]
                      }))
                    }
                  >
                    <Text style={[styles.slotOptionText, active && styles.slotOptionTextActive]}>{slot}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <PrimaryButton title="Done" onPress={() => setSlotsModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    title: {
      fontSize: 30,
      fontFamily: FONTS.heading,
      marginBottom: 4,
      color: colors.primaryDark
    },
    subtitle: {
      color: colors.muted,
      marginBottom: 12,
      fontFamily: FONTS.body
    },
    roleLabel: {
      marginBottom: 6,
      color: colors.text,
      fontSize: 14,
      fontFamily: FONTS.bodySemiBold
    },
    roleRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 10
    },
    roleOption: {
      minWidth: "22%",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center"
    },
    roleOptionWide: {
      minWidth: "48%",
      flex: 1
    },
    roleOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary
    },
    roleText: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold
    },
    roleTextActive: {
      color: colors.buttonText
    },
    errorText: {
      color: colors.danger,
      marginBottom: 8
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 18
    },
    footerText: { color: colors.muted, marginRight: 6, fontFamily: FONTS.body },
    link: { color: colors.primary, fontFamily: FONTS.bodySemiBold }
    ,
    slotSelector: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginBottom: 10
    },
    slotText: {
      color: colors.text,
      fontFamily: FONTS.body
    },
    slotPlaceholder: {
      color: colors.muted,
      fontFamily: FONTS.body
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end"
    },
    modalCard: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16
    },
    modalTitle: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold,
      fontSize: 16,
      marginBottom: 10
    },
    slotOption: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
      marginBottom: 8
    },
    slotOptionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary
    },
    slotOptionText: {
      color: colors.text,
      fontFamily: FONTS.bodySemiBold
    },
    slotOptionTextActive: {
      color: colors.buttonText
    }
  });
