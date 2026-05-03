import React, { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import PrimaryButton from "../../components/PrimaryButton";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { SLOT_OPTIONS } from "../../constants/slots";
import { validateBookingDateText } from "../../utils/validation";

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isBeforeToday = (dateText) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(`${dateText}T00:00:00`);
  return selected < today;
};

function PickerModal({ visible, title, options, onSelect, onClose, styles }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 260 }}>
            {options.map((option) => (
              <Pressable key={option} style={styles.optionButton} onPress={() => onSelect(option)}>
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <PrimaryButton title="Close" variant="outline" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

export default function RescheduleAppointmentScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const appointment = route?.params?.appointment || null;
  const appointmentRef = appointment?.appointmentNumber || appointment?._id || "";

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: String(appointment?.date || ""),
    time: String(appointment?.time || "")
  });
  const [errors, setErrors] = useState({});

  const dateOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 30; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      options.push(formatDate(date));
    }
    return options;
  }, []);

  const availableSlots = useMemo(() => {
    const slots = Array.isArray(appointment?.staffId?.availableSlots) ? appointment.staffId.availableSlots : [];
    return slots.length ? slots : SLOT_OPTIONS;
  }, [appointment]);

  const submit = async () => {
    if (!appointmentRef) {
      Alert.alert("Error", "Invalid appointment");
      return;
    }
    const nextErrors = {
      date: validateBookingDateText(form.date),
      time: availableSlots.includes(form.time) ? "" : "Please select a valid available slot"
    };
    const activeErrors = Object.fromEntries(Object.entries(nextErrors).filter(([, value]) => Boolean(value)));
    setErrors(activeErrors);
    if (Object.keys(activeErrors).length) {
      Alert.alert("Validation", Object.values(activeErrors)[0]);
      return;
    }

    try {
      setLoading(true);
      await api.put(`/appointments/${appointmentRef}`, {
        date: form.date,
        time: form.time,
        status: "rescheduled"
      });
      Alert.alert("Success", "Appointment rescheduled");
      navigation.goBack();
    } catch (requestError) {
      Alert.alert("Error", requestError?.response?.data?.message || "Could not reschedule appointment");
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) {
    return (
      <ScreenContainer>
        <Text style={styles.errorText}>Appointment not found.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Reschedule Appointment</Text>
        <Text style={styles.meta}>Appointment ID: #{appointment.appointmentNumber}</Text>
        <Text style={styles.meta}>Service: {appointment.serviceId?.name || "Service"}</Text>
        <Text style={styles.meta}>Beautician: {appointment.staffId?.name || "N/A"}</Text>

        <Text style={[styles.label, { marginTop: 12 }]}>New Date</Text>
        <Pressable style={styles.pickerField} onPress={() => setShowDatePicker(true)}>
          <Text style={form.date ? styles.pickerText : styles.pickerPlaceholder}>
            {form.date || "Select date"}
          </Text>
        </Pressable>
        {!!errors.date && <Text style={styles.fieldError}>{errors.date}</Text>}

        <Text style={[styles.label, { marginTop: 10 }]}>New Time</Text>
        <Pressable style={styles.pickerField} onPress={() => setShowTimePicker(true)}>
          <Text style={form.time ? styles.pickerText : styles.pickerPlaceholder}>
            {form.time || "Select time slot"}
          </Text>
        </Pressable>
        {!!errors.time && <Text style={styles.fieldError}>{errors.time}</Text>}

        <View style={{ marginTop: 12 }}>
          <PrimaryButton title="Reschedule Appointment" onPress={submit} loading={loading} />
        </View>
      </View>

      <PickerModal
        visible={showDatePicker}
        title="Select Date"
        options={dateOptions}
        styles={styles}
        onSelect={(date) => {
          setForm((prev) => ({ ...prev, date }));
          setErrors((prev) => ({ ...prev, date: "" }));
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />
      <PickerModal
        visible={showTimePicker}
        title="Select Time Slot"
        options={availableSlots}
        styles={styles}
        onSelect={(time) => {
          setForm((prev) => ({ ...prev, time }));
          setErrors((prev) => ({ ...prev, time: "" }));
          setShowTimePicker(false);
        }}
        onClose={() => setShowTimePicker(false)}
      />
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    formCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    sectionTitle: {
      fontWeight: "800",
      marginBottom: 8,
      color: colors.primaryDark,
      fontSize: 20
    },
    label: {
      color: colors.text,
      marginBottom: 6,
      fontWeight: "600"
    },
    meta: {
      color: colors.muted,
      marginTop: 4
    },
    pickerField: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      backgroundColor: colors.card
    },
    pickerText: {
      color: colors.text
    },
    pickerPlaceholder: {
      color: colors.muted
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
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 10
    },
    optionButton: {
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8
    },
    optionText: {
      color: colors.text
    },
    errorText: {
      color: colors.danger,
      fontSize: 16
    },
    fieldError: {
      color: colors.danger,
      marginTop: 6
    }
  });
