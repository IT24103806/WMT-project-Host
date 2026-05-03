import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import {
  trimText,
  validateAppointmentNumber,
  validateLongText,
  validateRating
} from "../../utils/validation";

const RATING_OPTIONS = ["1", "2", "3", "4", "5"];

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

export default function FeedbackScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user } = useAuth();

  const [feedbacks, setFeedbacks] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRatingPicker, setShowRatingPicker] = useState(false);
  const [form, setForm] = useState({ appointmentId: "", rating: "5", comment: "" });
  const [reply, setReply] = useState({ appointmentId: "", message: "" });
  const [formErrors, setFormErrors] = useState({});
  const [replyErrors, setReplyErrors] = useState({});

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const requests = [api.get("/feedbacks")];
      if (user?.role === "customer") {
        requests.push(api.get("/appointments"));
      }
      const [feedbackRes, appointmentsRes] = await Promise.all(requests);
      setFeedbacks(feedbackRes.data.data || []);
      if (appointmentsRes) {
        setAppointments(appointmentsRes.data.data || []);
      }
    } catch (error) {
      setError("Unable to load feedback data");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const submitFeedback = async () => {
    const cleaned = {
      appointmentId: trimText(form.appointmentId),
      rating: trimText(form.rating),
      comment: trimText(form.comment).replace(/\s+/g, " ")
    };
    const nextErrors = {
      appointmentId: validateAppointmentNumber(cleaned.appointmentId),
      rating: validateRating(cleaned.rating),
      comment: validateLongText(cleaned.comment, "Feedback comment", { min: 5, max: 400 })
    };
    const activeErrors = Object.fromEntries(Object.entries(nextErrors).filter(([, value]) => Boolean(value)));
    setForm(cleaned);
    setFormErrors(activeErrors);
    if (Object.keys(activeErrors).length) {
      Alert.alert("Validation", Object.values(activeErrors)[0]);
      return;
    }
    try {
      await api.post("/feedbacks", {
        appointmentId: Number(cleaned.appointmentId),
        rating: Number(cleaned.rating),
        comment: cleaned.comment
      });
      setForm({ appointmentId: "", rating: "5", comment: "" });
      setFormErrors({});
      fetchAll();
    } catch (error) {
      Alert.alert("Failed", error?.response?.data?.message || "Could not submit feedback");
    }
  };

  const submitReply = async () => {
    const cleaned = {
      appointmentId: trimText(reply.appointmentId),
      message: trimText(reply.message).replace(/\s+/g, " ")
    };
    const nextErrors = {
      appointmentId: validateAppointmentNumber(cleaned.appointmentId),
      message: validateLongText(cleaned.message, "Reply message", { min: 2, max: 400 })
    };
    const activeErrors = Object.fromEntries(Object.entries(nextErrors).filter(([, value]) => Boolean(value)));
    setReply(cleaned);
    setReplyErrors(activeErrors);
    if (Object.keys(activeErrors).length) {
      Alert.alert("Validation", Object.values(activeErrors)[0]);
      return;
    }
    try {
      await api.post(`/feedbacks/appointment/${Number(cleaned.appointmentId)}/reply`, {
        message: cleaned.message
      });
      setReply({ appointmentId: "", message: "" });
      setReplyErrors({});
      fetchAll();
    } catch (error) {
      Alert.alert("Failed", error?.response?.data?.message || "Could not submit reply");
    }
  };

  const deleteFeedback = async (id) => {
    try {
      await api.delete(`/feedbacks/${id}`);
      fetchAll();
    } catch (error) {
      Alert.alert("Failed", error?.response?.data?.message || "Could not delete feedback");
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={feedbacks}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} />}
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading feedback..." />
          ) : error ? (
            <ErrorState title="Could not load feedbacks" subtitle="Please retry." onRetry={fetchAll} />
          ) : (
            <EmptyState title="No feedback entries" subtitle="Feedback records will show up here." />
          )
        }
        ListHeaderComponent={
          <View>
            {user?.role === "customer" ? (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Rate Beautician</Text>
                <Text style={styles.hint}>
                  Your appointment IDs:{" "}
                  {appointments.length
                    ? appointments.map((item) => item.appointmentNumber).join(", ")
                    : "No appointments"}
                </Text>
                <InputField
                  label="Appointment ID"
                  value={form.appointmentId}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, appointmentId: value.replace(/\D/g, "") }))}
                  placeholder="Enter appointment id"
                  keyboardType="number-pad"
                  error={formErrors.appointmentId}
                />
                <Text style={styles.label}>Rating</Text>
                <Pressable style={styles.pickerField} onPress={() => setShowRatingPicker(true)}>
                  <Text style={styles.pickerText}>{form.rating}</Text>
                </Pressable>
                {!!formErrors.rating && <Text style={styles.errorText}>{formErrors.rating}</Text>}
                <InputField
                  label="Comment"
                  value={form.comment}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, comment: value }))}
                  placeholder="Share your feedback"
                  maxLength={400}
                  autoCapitalize="sentences"
                  error={formErrors.comment}
                />
                <PrimaryButton title="Submit Feedback" onPress={submitFeedback} />
              </View>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Reply to Feedback</Text>
                <InputField
                  label="Appointment ID"
                  value={reply.appointmentId}
                  onChangeText={(value) => setReply((prev) => ({ ...prev, appointmentId: value.replace(/\D/g, "") }))}
                  placeholder="Enter appointment id"
                  keyboardType="number-pad"
                  error={replyErrors.appointmentId}
                />
                <InputField
                  label="Reply"
                  value={reply.message}
                  onChangeText={(value) => setReply((prev) => ({ ...prev, message: value }))}
                  placeholder="Type your reply"
                  maxLength={400}
                  autoCapitalize="sentences"
                  error={replyErrors.message}
                />
                <PrimaryButton title="Send Reply" onPress={submitReply} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.meta}>Appointment ID: {item.appointmentId?.appointmentNumber || "N/A"}</Text>
            <Text style={styles.meta}>Rating: {item.rating}/5</Text>
            <Text style={styles.meta}>Comment: {item.comment}</Text>
            <Text style={styles.meta}>Beautician: {item.staffId?.name || "N/A"}</Text>
            <Text style={styles.meta}>Customer: {item.customerId?.name || "N/A"}</Text>
            {(item.replies || []).map((entry) => (
              <Text key={entry._id} style={styles.reply}>
                {entry.byRole}: {entry.message}
              </Text>
            ))}
            {user?.role === "admin" ? (
              <PrimaryButton
                title="Delete Feedback"
                style={{ marginTop: 8 }}
                onPress={() => deleteFeedback(item._id)}
              />
            ) : null}
          </View>
        )}
      />
      <PickerModal
        visible={showRatingPicker}
        title="Select Rating"
        options={RATING_OPTIONS}
        styles={styles}
        onSelect={(value) => {
          setForm((prev) => ({ ...prev, rating: value }));
          setShowRatingPicker(false);
        }}
        onClose={() => setShowRatingPicker(false)}
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
    formTitle: {
      color: colors.text,
      fontWeight: "700",
      marginBottom: 8
    },
    hint: {
      color: colors.muted,
      marginBottom: 8
    },
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
    card: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10
    },
    meta: {
      color: colors.text,
      marginBottom: 4
    },
    reply: {
      color: colors.muted,
      marginTop: 4
    },
    errorText: {
      color: colors.danger,
      marginTop: -6,
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
