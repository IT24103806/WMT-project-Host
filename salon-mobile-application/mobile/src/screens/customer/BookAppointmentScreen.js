import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { SLOT_OPTIONS } from "../../constants/slots";
import {
  trimText,
  validateBookingDateText,
  validateLongText,
  validateRequiredId
} from "../../utils/validation";

const BASE_SLOTS = SLOT_OPTIONS;
const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

const dayStart = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const formatDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseDate = (dateText) => {
  const [y, m, d] = String(dateText || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};

const displayDate = (dateText) => {
  const d = parseDate(dateText);
  if (!d) return "Choose date";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const buildGrid = (y, m) => {
  const first = new Date(y, m, 1).getDay();
  const count = new Date(y, m + 1, 0).getDate();
  const grid = [];
  for (let i = 0; i < first; i += 1) grid.push(null);
  for (let d = 1; d <= count; d += 1) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
};

function SimpleModal({ visible, title, children, onClose, styles }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {children}
          <PrimaryButton title="Close" variant="outline" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

export default function BookAppointmentScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const today = dayStart(new Date());
  const { service } = route.params || {};
  const selectedRouteServiceId = String(service?._id || service?.id || "");
  const treatmentLocked = Boolean(selectedRouteServiceId);

  const [staffList, setStaffList] = useState([]);
  const [services, setServices] = useState([]);
  const [staffModal, setStaffModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);
  const [calendarModal, setCalendarModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    serviceId: selectedRouteServiceId,
    staffId: "",
    date: formatDate(today),
    time: "",
    description: ""
  });
  const [errors, setErrors] = useState({});
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const selectedStaff = useMemo(() => staffList.find((s) => String(s._id) === String(form.staffId)), [staffList, form.staffId]);
  const selectedService = useMemo(
    () => services.find((s) => String(s._id) === String(form.serviceId)) || service || null,
    [services, form.serviceId, service]
  );
  const grid = useMemo(() => buildGrid(cursor.year, cursor.month), [cursor]);
  const selectedDate = parseDate(form.date) || today;
  const selectedPrice = Number(selectedService?.price || 0);
  const availableTimeSlots = useMemo(() => {
    const slots = Array.isArray(selectedStaff?.availableSlots) ? selectedStaff.availableSlots : [];
    return slots.length ? slots : BASE_SLOTS;
  }, [selectedStaff]);

  useEffect(() => {
    const load = async () => {
      try {
        const [staffRes, servicesRes] = await Promise.all([api.get("/staff"), api.get("/services")]);
        const loadedStaff = staffRes.data.data || [];
        const loadedServices = servicesRes.data.data || [];
        setStaffList(loadedStaff);
        setServices(loadedServices);
        if (!selectedRouteServiceId && !form.serviceId && loadedServices.length) {
          setForm((prev) => ({ ...prev, serviceId: loadedServices[0]._id }));
        }
      } catch (error) {
        Alert.alert("Error", "Unable to load appointment details");
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedRouteServiceId) return;
    setForm((prev) => ({ ...prev, serviceId: selectedRouteServiceId }));
  }, [selectedRouteServiceId]);

  const setDateSafe = (date) => {
    if (dayStart(date) < today) {
      Alert.alert("Validation", "Previous dates cannot be selected");
      return;
    }
    setForm((prev) => ({ ...prev, date: formatDate(date) }));
  };

  const stepDate = (delta) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    setDateSafe(next);
  };

  const validate = () => {
    const cleaned = {
      ...form,
      description: trimText(form.description).replace(/\s+/g, " ")
    };
    const nextErrors = {
      serviceId: validateRequiredId(cleaned.serviceId, "Service"),
      staffId: validateRequiredId(cleaned.staffId, "Beautician"),
      date: validateBookingDateText(cleaned.date),
      time: availableTimeSlots.includes(cleaned.time) ? "" : "Select a valid time slot",
      description: validateLongText(cleaned.description, "Appointment note", {
        required: false,
        min: 2,
        max: 300
      })
    };
    const activeErrors = Object.fromEntries(Object.entries(nextErrors).filter(([, value]) => Boolean(value)));
    setForm(cleaned);
    setErrors(activeErrors);
    if (Object.keys(activeErrors).length) {
      Alert.alert("Validation", Object.values(activeErrors)[0]);
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      await api.post("/appointments", {
        serviceId: form.serviceId,
        staffId: form.staffId,
        date: form.date,
        time: form.time,
        description: form.description
      });
      Alert.alert("Success", "Appointment created");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.message || "Failed to create appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.title}>Create an Appointment</Text>

      <Text style={styles.label}>Treatment Selection</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {services.map((item) => {
          const active = String(item._id) === String(form.serviceId);
          return (
            <Pressable
              key={item._id}
              disabled={treatmentLocked}
              style={[styles.chip, active && styles.chipActive, treatmentLocked && styles.chipDisabled]}
              onPress={() => setForm((p) => ({ ...p, serviceId: item._id }))}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {!!errors.serviceId && <Text style={styles.errorText}>{errors.serviceId}</Text>}
      {treatmentLocked ? <Text style={styles.lockHint}>Treatment is locked to the selected service.</Text> : null}

      <Text style={styles.label}>Beautician Selection</Text>
      <Pressable style={styles.dropdown} onPress={() => setStaffModal(true)}>
        <Text style={selectedStaff ? styles.dropdownText : styles.placeholder}>
          {selectedStaff ? `${selectedStaff.name} (${selectedStaff.role})` : "Select Beautician"}
        </Text>
        <Text style={styles.arrow}>v</Text>
      </Pressable>
      {!!errors.staffId && <Text style={styles.errorText}>{errors.staffId}</Text>}

      <Text style={styles.label}>Date Selection</Text>
      <View style={styles.dateRow}>
        <Pressable style={styles.sideBtn} onPress={() => stepDate(-1)}>
          <Text style={styles.sideBtnText}>{"<"}</Text>
        </Pressable>
        <Pressable style={styles.dateCenter} onPress={() => setCalendarModal(true)}>
          <Text style={styles.dateCenterText}>{displayDate(form.date)}</Text>
        </Pressable>
        <Pressable style={styles.sideBtn} onPress={() => stepDate(1)}>
          <Text style={styles.sideBtnText}>{">"}</Text>
        </Pressable>
      </View>
      {!!errors.date && <Text style={styles.errorText}>{errors.date}</Text>}

      <Text style={styles.label}>Time Selection</Text>
      <Pressable
        style={styles.dropdown}
        onPress={() => {
          if (!selectedStaff) {
            Alert.alert("Select beautician", "Please select beautician first");
            return;
          }
          if (!availableTimeSlots.length) {
            Alert.alert("No slots", "No available time slots are configured for this beautician.");
            return;
          }
          setTimeModal(true);
        }}
      >
        <Text style={form.time ? styles.dropdownText : styles.placeholder}>{form.time || "Select Time"}</Text>
        <Text style={styles.arrow}>v</Text>
      </Pressable>
      {!!errors.time && <Text style={styles.errorText}>{errors.time}</Text>}

      <InputField
        label="Appointment Note"
        value={form.description}
        onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
        placeholder="Add request notes (optional)"
        maxLength={300}
        autoCapitalize="sentences"
        error={errors.description}
      />

      <View style={styles.summary}>
        <Text style={styles.summaryText}>Selected: {selectedService?.name || "-"}</Text>
        <Text style={styles.summaryText}>Price: LKR {selectedPrice}</Text>
      </View>

      <PrimaryButton title="Create Appointment" onPress={onSubmit} loading={loading} />

      <SimpleModal visible={staffModal} title="Select Beautician" onClose={() => setStaffModal(false)} styles={styles}>
        <ScrollView style={{ maxHeight: 260 }}>
          {staffList.map((staff) => (
            <Pressable
              key={staff._id}
              style={styles.option}
              onPress={() => {
                setForm((prev) => ({ ...prev, staffId: staff._id, time: "" }));
                setErrors((prev) => ({ ...prev, staffId: "", time: "" }));
                setStaffModal(false);
              }}
            >
              <Text style={styles.optionText}>{staff.name} ({staff.role})</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SimpleModal>

      <SimpleModal visible={timeModal} title="Select Time" onClose={() => setTimeModal(false)} styles={styles}>
        <ScrollView style={{ maxHeight: 260 }}>
          {availableTimeSlots.map((slot) => (
            <Pressable
              key={slot}
              style={styles.option}
              onPress={() => {
                setForm((prev) => ({ ...prev, time: slot }));
                setErrors((prev) => ({ ...prev, time: "" }));
                setTimeModal(false);
              }}
            >
              <Text style={styles.optionText}>{slot}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SimpleModal>

      <Modal visible={calendarModal} transparent animationType="fade" onRequestClose={() => setCalendarModal(false)}>
        <View style={styles.calendarBackdrop}>
          <View style={styles.calendarCard}>
            <Text style={styles.calendarTitle}>SELECT DATE</Text>
            <Text style={styles.calendarDateHead}>
              {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </Text>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarMonth}>{new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</Text>
              <View style={{ flexDirection: "row", gap: 18 }}>
                <Pressable onPress={() => setCursor((p) => (p.month === 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: p.month - 1 }))}>
                  <Text style={styles.calArrow}>{"<"}</Text>
                </Pressable>
                <Pressable onPress={() => setCursor((p) => (p.month === 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: p.month + 1 }))}>
                  <Text style={styles.calArrow}>{">"}</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.weekRow}>
              {WEEK_DAYS.map((d, i) => (
                <Text key={`${d}-${i}`} style={styles.weekLabel}>{d}</Text>
              ))}
            </View>
            <View style={styles.grid}>
              {grid.map((day, idx) => {
                if (!day) return <View key={`e-${idx}`} style={styles.cell} />;
                const cellDate = new Date(cursor.year, cursor.month, day);
                const disabled = dayStart(cellDate) < today;
                const active = dayStart(cellDate).getTime() === dayStart(selectedDate).getTime();
                return (
                  <Pressable key={`${day}-${idx}`} disabled={disabled} style={[styles.cell, active && styles.activeCell]} onPress={() => setDateSafe(cellDate)}>
                    <Text style={[styles.cellText, disabled && styles.disabledText, active && styles.activeText]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.calendarActions}>
              <Pressable onPress={() => setCalendarModal(false)}>
                <Text style={styles.actionText}>CANCEL</Text>
              </Pressable>
              <Pressable onPress={() => setCalendarModal(false)}>
                <Text style={styles.actionText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    title: { color: colors.primaryDark, fontSize: 30, fontWeight: "800", marginBottom: 12 },
    label: { color: colors.text, fontSize: 16, marginBottom: 8 },
    chip: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 14, marginRight: 8 },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipDisabled: { opacity: 0.72 },
    chipText: { color: colors.text, fontWeight: "600" },
    chipTextActive: { color: colors.buttonText },
    lockHint: { color: colors.muted, marginBottom: 10 },
    errorText: { color: colors.danger, marginTop: -6, marginBottom: 8 },
    dropdown: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    dropdownText: { color: colors.text, fontSize: 16, flex: 1 },
    placeholder: { color: colors.muted, fontSize: 16, flex: 1 },
    arrow: { color: colors.primaryDark, fontSize: 18, fontWeight: "700", marginLeft: 8 },
    dateRow: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 12, flexDirection: "row", alignItems: "center" },
    sideBtn: { width: 56, alignItems: "center", justifyContent: "center", paddingVertical: 14 },
    sideBtnText: { color: colors.primaryDark, fontSize: 22, fontWeight: "700" },
    dateCenter: { flex: 1, alignItems: "center", paddingVertical: 14 },
    dateCenterText: { color: colors.text, fontSize: 16 },
    summary: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 10 },
    summaryText: { color: colors.text },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
    modalCard: { backgroundColor: colors.background, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
    modalTitle: { color: colors.text, fontWeight: "700", fontSize: 18, marginBottom: 10 },
    option: { backgroundColor: colors.card, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 8 },
    optionText: { color: colors.text },
    calendarBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 },
    calendarCard: { backgroundColor: colors.background, borderRadius: 12, overflow: "hidden", paddingBottom: 10 },
    calendarTitle: { backgroundColor: colors.primaryDark, color: "#D8DCFF", paddingHorizontal: 14, paddingTop: 10, fontSize: 12, letterSpacing: 1 },
    calendarDateHead: { backgroundColor: colors.primaryDark, color: "#FFFFFF", paddingHorizontal: 14, paddingBottom: 14, fontSize: 34 },
    calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 12 },
    calendarMonth: { color: colors.text, fontSize: 18 },
    calArrow: { color: colors.text, fontSize: 26 },
    weekRow: { flexDirection: "row", marginTop: 10 },
    weekLabel: { width: `${100 / 7}%`, textAlign: "center", color: colors.muted },
    grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 6, paddingBottom: 8 },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 20 },
    activeCell: { backgroundColor: colors.primaryDark },
    cellText: { color: colors.text, fontSize: 16 },
    disabledText: { color: colors.border },
    activeText: { color: "#FFFFFF", fontWeight: "700" },
    calendarActions: { flexDirection: "row", justifyContent: "flex-end", gap: 20, paddingHorizontal: 16, paddingTop: 4 },
    actionText: { color: colors.primaryDark, fontWeight: "700", fontSize: 15 }
  });
