import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import {
  compactName,
  trimText,
  validateLongText,
  validatePositiveAmount,
  validatePositiveInteger,
  validateUrl
} from "../../utils/validation";

const CATEGORY_OPTIONS = ["Hair / Hair treatments", "Face / Facial"];
const initialForm = {
  id: "",
  name: "",
  description: "",
  price: "",
  duration: "",
  image: "",
  category: "Face / Facial"
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

export default function ManageServicesScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/services");
      setServices(response.data.data || []);
    } catch (error) {
      setError("Could not load services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const submit = async () => {
    const cleaned = {
      ...form,
      name: compactName(form.name),
      description: trimText(form.description).replace(/\s+/g, " "),
      price: trimText(form.price),
      duration: trimText(form.duration),
      image: trimText(form.image)
    };
    const nextErrors = {
      name: validateLongText(cleaned.name, "Service name", { min: 2, max: 80 }),
      description: validateLongText(cleaned.description, "Description", { min: 8, max: 300 }),
      price: validatePositiveAmount(cleaned.price, "Price"),
      duration: validatePositiveInteger(cleaned.duration, "Duration"),
      image: validateUrl(cleaned.image, { required: false, label: "Image URL" }),
      category: CATEGORY_OPTIONS.includes(cleaned.category) ? "" : "Select a valid category"
    };
    const activeErrors = Object.fromEntries(Object.entries(nextErrors).filter(([, value]) => Boolean(value)));
    setForm(cleaned);
    setErrors(activeErrors);
    if (Object.keys(activeErrors).length) {
      Alert.alert("Validation", Object.values(activeErrors)[0]);
      return;
    }
    try {
      const payload = {
        name: cleaned.name,
        description: cleaned.description,
        price: Number(cleaned.price),
        duration: Number(cleaned.duration),
        image: cleaned.image,
        category: cleaned.category
      };
      if (cleaned.id) {
        await api.put(`/services/${cleaned.id}`, payload);
      } else {
        await api.post("/services", payload);
      }
      setForm(initialForm);
      setErrors({});
      await fetchServices();
    } catch (error) {
      Alert.alert("Error", error?.response?.data?.message || "Save failed");
    }
  };

  const removeService = async (id) => {
    try {
      await api.delete(`/services/${id}`);
      await fetchServices();
    } catch (error) {
      Alert.alert("Error", "Delete failed");
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={services}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchServices} />}
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading services..." />
          ) : error ? (
            <ErrorState title="Service list unavailable" subtitle="Please retry." onRetry={fetchServices} />
          ) : (
            <EmptyState title="No services created" subtitle="Create the first service from this screen." />
          )
        }
        ListHeaderComponent={
          <View style={styles.formCard}>
            <InputField
              label="Name"
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
              autoCapitalize="words"
              maxLength={80}
              error={errors.name}
            />
            <InputField
              label="Description"
              value={form.description}
              onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))}
              autoCapitalize="sentences"
              maxLength={300}
              error={errors.description}
            />
            <InputField
              label="Price (LKR)"
              value={form.price}
              onChangeText={(value) => setForm((prev) => ({ ...prev, price: value }))}
              keyboardType="decimal-pad"
              error={errors.price}
            />
            <InputField
              label="Duration (min)"
              value={form.duration}
              onChangeText={(value) => setForm((prev) => ({ ...prev, duration: value }))}
              keyboardType="number-pad"
              error={errors.duration}
            />
            <InputField
              label="Image URL"
              value={form.image}
              onChangeText={(value) => setForm((prev) => ({ ...prev, image: value }))}
              keyboardType="url"
              error={errors.image}
            />
            <Text style={styles.label}>Category</Text>
            <Pressable style={styles.pickerField} onPress={() => setShowCategoryPicker(true)}>
              <Text style={styles.pickerText}>{form.category}</Text>
            </Pressable>
            {!!errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
            <PrimaryButton title={form.id ? "Update Service" : "Create Service"} onPress={submit} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>Category: {item.category || "Face / Facial"}</Text>
            <Text style={styles.meta}>LKR {item.price} | {item.duration} min</Text>
            <View style={styles.row}>
              <PrimaryButton
                title="Edit"
                variant="outline"
                style={styles.rowButton}
                onPress={() => {
                  setForm({
                    id: item._id,
                    name: item.name,
                    description: item.description,
                    price: String(item.price),
                    duration: String(item.duration),
                    image: item.image || "",
                    category: item.category || "Face / Facial"
                  });
                  setErrors({});
                }}
              />
              <PrimaryButton title="Delete" style={styles.rowButton} onPress={() => removeService(item._id)} />
            </View>
          </View>
        )}
      />
      <PickerModal
        visible={showCategoryPicker}
        title="Select Service Category"
        options={CATEGORY_OPTIONS}
        styles={styles}
        onSelect={(value) => {
          setForm((prev) => ({ ...prev, category: value }));
          setShowCategoryPicker(false);
        }}
        onClose={() => setShowCategoryPicker(false)}
      />
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.primaryDark,
      marginBottom: 12
    },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12
    },
    itemCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10
    },
    name: { fontWeight: "700", fontSize: 16, color: colors.text },
    meta: { color: colors.muted, marginVertical: 4 },
    label: {
      marginBottom: 6,
      color: colors.text,
      fontWeight: "600"
    },
    pickerField: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      backgroundColor: colors.card,
      marginBottom: 12
    },
    pickerText: {
      color: colors.text
    },
    row: { flexDirection: "row", gap: 10, marginTop: 8 },
    rowButton: { flex: 1, paddingVertical: 11 },
    errorText: {
      color: colors.danger,
      marginTop: -4,
      marginBottom: 8
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
    }
  });
