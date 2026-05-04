import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

const emptyFeedbackForm = { appointmentId: "", rating: "", comment: "" };

function StarRating({ value, onChange, disabled = false, styles, colors }) {
  const numericValue = Number(value || 0);
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((rating) => {
        const selected = rating <= numericValue;
        return (
          <Pressable
            key={rating}
            style={styles.starButton}
            onPress={() => !disabled && onChange(String(rating))}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${rating} star${rating > 1 ? "s" : ""}`}
          >
            <Ionicons
              name={selected ? "star" : "star-outline"}
              size={30}
              color={selected ? colors.warning || "#f5b301" : colors.muted}
            />
          </Pressable>
        );
      })}
      <Text style={styles.ratingValue}>{numericValue ? `${numericValue}/5` : "Select rating"}</Text>
    </View>
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
  const [form, setForm] = useState(emptyFeedbackForm);
  const [reply, setReply] = useState({ appointmentId: "", message: "" });
  const [formErrors, setFormErrors] = useState({});
  const [replyErrors, setReplyErrors] = useState({});
  const [editingFeedbackId, setEditingFeedbackId] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);

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

  const userId = String(user?._id || user?.id || "");

  const isOwnFeedback = (item) => {
    const customerId = item?.customerId?._id || item?.customerId;
    return user?.role === "customer" && userId && String(customerId || "") === userId;
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const resetFeedbackForm = () => {
    setForm(emptyFeedbackForm);
    setFormErrors({});
    setEditingFeedbackId("");
  };

  const buildFeedbackPayload = () => {
    const cleaned = {
      appointmentId: trimText(form.appointmentId),
      rating: trimText(form.rating),
      comment: trimText(form.comment).replace(/\s+/g, " ")
    };
    const nextErrors = {
      appointmentId: editingFeedbackId ? "" : validateAppointmentNumber(cleaned.appointmentId),
      rating: validateRating(cleaned.rating),
      comment: validateLongText(cleaned.comment, "Feedback comment", { min: 5, max: 400 })
    };
    const activeErrors = Object.fromEntries(Object.entries(nextErrors).filter(([, value]) => Boolean(value)));
    setForm(cleaned);
    setFormErrors(activeErrors);
    if (Object.keys(activeErrors).length) {
      Alert.alert("Validation", Object.values(activeErrors)[0]);
      return null;
    }
    return cleaned;
  };

  const submitFeedback = async () => {
    const cleaned = buildFeedbackPayload();
    if (!cleaned) {
      return;
    }
    try {
      setSavingFeedback(true);
      if (editingFeedbackId) {
        await api.put(`/feedbacks/${editingFeedbackId}`, {
          rating: Number(cleaned.rating),
          comment: cleaned.comment
        });
      } else {
        await api.post("/feedbacks", {
          appointmentId: Number(cleaned.appointmentId),
          rating: Number(cleaned.rating),
          comment: cleaned.comment
        });
      }
      resetFeedbackForm();
      fetchAll();
    } catch (error) {
      Alert.alert("Failed", error?.response?.data?.message || "Could not save feedback");
    } finally {
      setSavingFeedback(false);
    }
  };

  const startEditFeedback = (item) => {
    if (!isOwnFeedback(item)) {
      Alert.alert("Not allowed", "You can edit only your own feedback.");
      return;
    }
    setEditingFeedbackId(item._id);
    setForm({
      appointmentId: String(item.appointmentId?.appointmentNumber || ""),
      rating: String(item.rating || ""),
      comment: item.comment || ""
    });
    setFormErrors({});
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

  const deleteFeedback = async (item) => {
    const canDelete = user?.role === "admin" || isOwnFeedback(item);
    if (!canDelete) {
      Alert.alert("Not allowed", "You can delete only your own feedback.");
      return;
    }
    try {
      await api.delete(`/feedbacks/${item._id}`);
      if (editingFeedbackId === item._id) {
        resetFeedbackForm();
      }
      fetchAll();
    } catch (error) {
      Alert.alert("Failed", error?.response?.data?.message || "Could not delete feedback");
    }
  };

  const confirmDeleteFeedback = (item) => {
    Alert.alert(
      "Delete feedback",
      "Delete this feedback permanently?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteFeedback(item) }
      ]
    );
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
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>{editingFeedbackId ? "Edit Feedback" : "Rate Beautician"}</Text>
                  {editingFeedbackId ? (
                    <Pressable onPress={resetFeedbackForm}>
                      <Text style={styles.cancelEditText}>Cancel</Text>
                    </Pressable>
                  ) : null}
                </View>
                {!editingFeedbackId ? (
                  <>
                    <Text style={styles.hint}>
                      Your appointment IDs:{" "}
                      {appointments.length
                        ? appointments.map((item) => item.appointmentNumber).join(", ")
                        : "No appointments"}
                    </Text>
                    <InputField
                      label="Appointment ID"
                      value={form.appointmentId}
                      onChangeText={(value) => updateFormField("appointmentId", value.replace(/\D/g, ""))}
                      placeholder="Enter appointment id"
                      keyboardType="number-pad"
                      error={formErrors.appointmentId}
                    />
                  </>
                ) : (
                  <Text style={styles.hint}>Editing appointment ID {form.appointmentId || "N/A"}</Text>
                )}
                <Text style={styles.label}>Rating</Text>
                <StarRating
                  value={form.rating}
                  onChange={(value) => updateFormField("rating", value)}
                  styles={styles}
                  colors={colors}
                />
                {!!formErrors.rating && <Text style={styles.errorText}>{formErrors.rating}</Text>}
                <InputField
                  label="Comment"
                  value={form.comment}
                  onChangeText={(value) => updateFormField("comment", value)}
                  placeholder="Share your feedback"
                  maxLength={400}
                  autoCapitalize="sentences"
                  error={formErrors.comment}
                />
                <PrimaryButton
                  title={editingFeedbackId ? "Save Feedback" : "Submit Feedback"}
                  onPress={submitFeedback}
                  loading={savingFeedback}
                />
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
        renderItem={({ item }) => {
          const ownFeedback = isOwnFeedback(item);
          return (
            <View style={styles.card}>
              <Text style={styles.meta}>Appointment ID: {item.appointmentId?.appointmentNumber || "N/A"}</Text>
              <StarRating value={String(item.rating || "")} disabled styles={styles} colors={colors} />
              <Text style={styles.meta}>Comment: {item.comment}</Text>
              <Text style={styles.meta}>Beautician: {item.staffId?.name || "N/A"}</Text>
              <Text style={styles.meta}>Customer: {item.customerId?.name || "N/A"}</Text>
              {(item.replies || []).map((entry) => (
                <Text key={entry._id} style={styles.reply}>
                  {entry.byRole}: {entry.message}
                </Text>
              ))}
              {ownFeedback || user?.role === "admin" ? (
                <View style={styles.actionRow}>
                  {ownFeedback ? (
                    <PrimaryButton
                      title="Edit"
                      variant="outline"
                      style={styles.actionButton}
                      onPress={() => startEditFeedback(item)}
                    />
                  ) : null}
                  <PrimaryButton
                    title="Delete"
                    style={styles.actionButton}
                    onPress={() => confirmDeleteFeedback(item)}
                  />
                </View>
              ) : null}
            </View>
          );
        }}
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
    formHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12
    },
    cancelEditText: {
      color: colors.primary,
      fontWeight: "700"
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
    starRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 12
    },
    starButton: {
      paddingVertical: 4,
      paddingRight: 2
    },
    ratingValue: {
      color: colors.text,
      fontWeight: "700",
      marginLeft: 6
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
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 10
    },
    actionButton: {
      flex: 1
    },
    errorText: {
      color: colors.danger,
      marginTop: -6,
      marginBottom: 8
    }
  });
