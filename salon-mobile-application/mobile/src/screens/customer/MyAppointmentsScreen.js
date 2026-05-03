import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ScreenContainer from "../../components/ScreenContainer";
import PrimaryButton from "../../components/PrimaryButton";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

export default function MyAppointmentsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/appointments");
      setAppointments(response.data.data || []);
    } catch (requestError) {
      setError("Unable to load appointments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [fetchAppointments])
  );

  const updateStatus = async (appointmentId, payload) => {
    try {
      await api.put(`/appointments/${appointmentId}`, payload);
      await fetchAppointments();
    } catch (requestError) {
      Alert.alert("Error", requestError?.response?.data?.message || "Could not update appointment");
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAppointments} />}
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading appointments..." />
          ) : error ? (
            <ErrorState title="Appointments unavailable" subtitle="Please retry." onRetry={fetchAppointments} />
          ) : (
            <EmptyState title="No appointments yet" subtitle="Your bookings will appear here." />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.badgeWrap}>
              <Text style={styles.badgeText}>ID #{item.appointmentNumber}</Text>
            </View>
            <Text style={styles.service}>{item.serviceId?.name || "Service"}</Text>
            <Text style={styles.meta}>Beautician: {item.staffId?.name || "N/A"}</Text>
            <Text style={styles.meta}>
              Date/Time: {item.date} {item.time}
            </Text>
            <Text style={styles.meta}>Status: {item.status}</Text>
            <View style={styles.row}>
              <PrimaryButton
                title="Cancel"
                variant="outline"
                style={styles.rowButton}
                onPress={() => updateStatus(item.appointmentNumber, { status: "cancelled" })}
              />
              <PrimaryButton
                title="Reschedule"
                style={styles.rowButton}
                onPress={() => navigation.navigate("RescheduleAppointment", { appointment: item })}
              />
            </View>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border
    },
    badgeWrap: {
      alignSelf: "flex-start",
      backgroundColor: `${colors.primary}20`,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 6
    },
    badgeText: {
      color: colors.primaryDark,
      fontWeight: "700",
      fontSize: 12
    },
    service: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text
    },
    meta: {
      color: colors.muted,
      marginTop: 4
    },
    row: {
      flexDirection: "row",
      gap: 10,
      marginTop: 10
    },
    rowButton: {
      flex: 1
    }
  });

