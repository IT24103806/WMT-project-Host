import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Linking, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import ScreenContainer from "../../components/ScreenContainer";
import PrimaryButton from "../../components/PrimaryButton";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import api from "../../services/api";
import { getToken } from "../../services/authStorage";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { RADIUS, SPACING, TYPOGRAPHY } from "../../constants/theme";
import { validatePaymentMethod, validatePositiveAmount } from "../../utils/validation";

const PAYMENT_METHODS = ["cash", "card", "online"];
const PAYMENT_METHOD_LABELS = {
  cash: "CASH",
  card: "CARD",
  online: "ONLINE"
};
const STATUS_STYLES = {
  unpaid: "unpaid",
  paid: "paid",
  refunded: "refunded"
};

const toCanonicalStatus = (status) => {
  const value = String(status || "").toLowerCase();
  if (value === "paid") return "paid";
  if (value === "refunded") return "refunded";
  return "unpaid";
};

const money = (value) => `LKR ${Number(value || 0).toLocaleString()}`;
const pad2 = (value) => String(value).padStart(2, "0");
const monthKey = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;

const resolveWritableDirectory = () => {
  const legacyDocument = FileSystem.documentDirectory;
  if (typeof legacyDocument === "string" && legacyDocument.length) return legacyDocument;

  const legacyCache = FileSystem.cacheDirectory;
  if (typeof legacyCache === "string" && legacyCache.length) return legacyCache;

  const newDocument = FileSystem.Paths?.document?.uri;
  if (typeof newDocument === "string" && newDocument.length) return newDocument;

  const newCache = FileSystem.Paths?.cache?.uri;
  if (typeof newCache === "string" && newCache.length) return newCache;

  return "";
};

const openPdfUri = async (uri) => {
  if (!uri) throw new Error("Missing file uri");

  if (Platform.OS === "android" && typeof FileSystem.getContentUriAsync === "function") {
    try {
      const contentUri = await FileSystem.getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        type: "application/pdf",
        flags: 1
      });
      return;
    } catch (intentError) {
      // Continue to other fallbacks.
    }
  }

  try {
    await Linking.openURL(uri);
    return;
  } catch (directError) {
    // Continue to Android fallback below.
  }

  if (Platform.OS === "android" && typeof FileSystem.getContentUriAsync === "function") {
    const contentUri = await FileSystem.getContentUriAsync(uri);
    try {
      await Linking.openURL(contentUri);
      return;
    } catch (contentError) {
      // Fall through to share fallback.
    }
  }

  // Final fallback: use native share sheet, which grants temporary file read permission.
  await sharePdfUri(uri);
};

const sharePdfUri = async (uri) => {
  if (!uri) throw new Error("Missing file uri");
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle: "Share Receipt PDF",
    UTI: "com.adobe.pdf"
  });
};

const savePdfToDownloads = async (sourceUri, filenameBase = "receipt") => {
  if (Platform.OS !== "android") {
    throw new Error("Save to Downloads is currently available on Android only");
  }
  const SAF = FileSystem.StorageAccessFramework;
  if (!SAF?.requestDirectoryPermissionsAsync || !SAF?.createFileAsync) {
    throw new Error("Downloads access is not available on this device");
  }

  const permission = await SAF.requestDirectoryPermissionsAsync();
  if (!permission.granted || !permission.directoryUri) {
    throw new Error("Downloads folder permission was not granted");
  }

  const safeName = String(filenameBase || `receipt-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const destinationUri = await SAF.createFileAsync(
    permission.directoryUri,
    `${safeName}.pdf`,
    "application/pdf"
  );
  const fileBase64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64
  });
  await FileSystem.writeAsStringAsync(destinationUri, fileBase64, {
    encoding: FileSystem.EncodingType.Base64
  });
  return destinationUri;
};

export default function PaymentScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";

  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [productOrders, setProductOrders] = useState([]);
  const [methodByAppointment, setMethodByAppointment] = useState({});
  const [summary, setSummary] = useState(null);
  const [adminProductOrders, setAdminProductOrders] = useState([]);
  const [dailyReport, setDailyReport] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [yearCursor, setYearCursor] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [receiptBusyId, setReceiptBusyId] = useState("");

  const fetchCustomerData = useCallback(async () => {
    const [appointmentsRes, paymentsRes, ordersRes] = await Promise.all([
      api.get("/appointments"),
      api.get("/payments"),
      api.get("/inventory/orders/my")
    ]);
    setAppointments(appointmentsRes.data.data || []);
    setPayments(paymentsRes.data.data || []);
    setProductOrders(ordersRes.data.data || []);
  }, []);

  const fetchStaffData = useCallback(async () => {
    const [paymentsRes, ordersRes] = await Promise.all([
      api.get("/payments"),
      api.get("/inventory/orders/my")
    ]);
    setPayments(paymentsRes.data.data || []);
    setProductOrders(ordersRes.data.data || []);
  }, []);

  const fetchAdminData = useCallback(async () => {
    const month = monthKey(monthCursor);
    const year = yearCursor;
    const [paymentsRes, summaryRes, dailyRes, monthlyRes, ordersRes] = await Promise.all([
      api.get("/payments"),
      api.get("/payments/summary"),
      api.get(`/payments/reports/daily?month=${month}`),
      api.get(`/payments/reports/monthly?year=${year}`),
      api.get("/inventory/orders")
    ]);
    setPayments(paymentsRes.data.data || []);
    setSummary(summaryRes.data.data || null);
    setDailyReport(dailyRes.data.data || []);
    setMonthlyReport(monthlyRes.data.data || []);
    setAdminProductOrders(ordersRes.data.data || []);
  }, [monthCursor, yearCursor]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      if (isAdmin) {
        await fetchAdminData();
      } else if (isStaff) {
        await fetchStaffData();
      } else {
        await fetchCustomerData();
      }
    } catch (requestError) {
      setError("Unable to load payment data");
    } finally {
      setLoading(false);
    }
  }, [fetchAdminData, fetchCustomerData, fetchStaffData, isAdmin, isStaff]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const paymentsByAppointment = useMemo(() => {
    const map = new Map();
    payments.forEach((payment) => {
      const id = payment?.appointmentId?._id || payment?.appointmentId;
      if (id) map.set(String(id), payment);
    });
    return map;
  }, [payments]);

  const getPaymentMethodLabel = (method) => PAYMENT_METHOD_LABELS[method] || String(method || "online").toUpperCase();

  const validatePayableAmount = (amount) => {
    const text = String(Number(amount || 0));
    return validatePositiveAmount(text, "Payment amount");
  };

  const confirmRecordPayment = ({ title, message, onConfirm }) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm Payment", onPress: onConfirm }
    ]);
  };

  const payAppointment = async (appointment) => {
    if (busyId) return;
    const selectedMethod = methodByAppointment[appointment._id] || "online";
    const methodError = validatePaymentMethod(selectedMethod);
    const amount = Number(appointment?.serviceId?.price || 0);
    const amountError = validatePayableAmount(amount);
    if (!appointment?._id) {
      Alert.alert("Payment unavailable", "Appointment record was not found.");
      return;
    }
    if (methodError || amountError) {
      Alert.alert("Validation", methodError || amountError);
      return;
    }
    confirmRecordPayment({
      title: "Confirm booking payment",
      message:
        selectedMethod === "card" || selectedMethod === "online"
          ? "This app records the card/online payment against the booking. A real gateway can be connected when provider keys and backend endpoints are configured."
          : "Record this cash payment against the booking?",
      onConfirm: () => submitAppointmentPayment(appointment, selectedMethod, amount)
    });
  };

  const submitAppointmentPayment = async (appointment, selectedMethod, amount) => {
    try {
      setBusyId(String(appointment._id));
      const currentPayment = paymentsByAppointment.get(String(appointment._id));
      let paymentId = currentPayment?._id;
      if (toCanonicalStatus(currentPayment?.status) === "paid") {
        Alert.alert("Already paid", "This booking payment is already completed.");
        return;
      }

      if (!paymentId) {
        const createRes = await api.post("/payments", {
          appointmentId: appointment._id,
          amount,
          method: selectedMethod
        });
        paymentId = createRes?.data?.data?._id;
      }

      if (paymentId) {
        await api.put(`/payments/${paymentId}/status`, {
          status: "paid",
          method: selectedMethod,
          note: "Payment completed from mobile app"
        });
      }

      Alert.alert("Success", "Payment completed");
      await fetchData();
    } catch (requestError) {
      Alert.alert("Payment failed", requestError?.response?.data?.message || "Try again");
    } finally {
      setBusyId("");
    }
  };

  const updatePaymentStatus = async (paymentId, status) => {
    if (busyId) return;
    if (!paymentId || !["unpaid", "paid", "refunded"].includes(status)) {
      Alert.alert("Validation", "Select a valid payment status");
      return;
    }
    try {
      setBusyId(String(paymentId));
      await api.put(`/payments/${paymentId}/status`, { status, note: `Marked as ${status}` });
      await fetchData();
    } catch (requestError) {
      Alert.alert("Update failed", requestError?.response?.data?.message || "Could not update payment");
    } finally {
      setBusyId("");
    }
  };

  const payProductOrder = async (order) => {
    if (busyId) return;
    const status = toCanonicalStatus(order?.status);
    const method = String(order?.method || "online").toLowerCase();
    const amountError = validatePayableAmount(order?.total);
    const methodError = validatePaymentMethod(method);
    if (!order?._id) {
      Alert.alert("Payment unavailable", "Product order record was not found.");
      return;
    }
    if (status === "paid") {
      Alert.alert("Already paid", "This product order payment is already completed.");
      return;
    }
    if (methodError || amountError) {
      Alert.alert("Validation", methodError || amountError);
      return;
    }
    confirmRecordPayment({
      title: "Confirm inventory payment",
      message:
        method === "card" || method === "online"
          ? "This app records the card/online product payment and deducts stock through the backend. A real gateway can be connected when provider keys and backend endpoints are configured."
          : "Record this cash payment and deduct product stock?",
      onConfirm: () => submitProductOrderPayment(order, method)
    });
  };

  const submitProductOrderPayment = async (order, method) => {
    try {
      setBusyId(String(order._id));
      await api.put(`/inventory/orders/${order._id}/status`, {
        status: "paid",
        method,
        note: "Order paid from payments screen"
      });
      Alert.alert("Success", "Product order payment completed");
      await fetchData();
    } catch (requestError) {
      Alert.alert("Payment failed", requestError?.response?.data?.message || "Try again");
    } finally {
      setBusyId("");
    }
  };

  const downloadPdfReceipt = async ({ endpoint, filenameBase, busyKey }) => {
    try {
      setReceiptBusyId(busyKey);
      const token = await getToken();
      const apiBase = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
      const baseDir = resolveWritableDirectory();
      if (!baseDir) {
        throw new Error("Unable to access device storage");
      }
      const safeFileName = String(filenameBase || `receipt-${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueSuffix = Date.now();
      const normalizedBase = baseDir.endsWith("/") ? baseDir : `${baseDir}/`;
      const targetUri = `${normalizedBase}${safeFileName}-${uniqueSuffix}.pdf`;
      const result = await FileSystem.downloadAsync(`${apiBase}${endpoint}`, targetUri, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (Number(result?.status) !== 200) {
        throw new Error(`Could not download receipt (${result?.status || "request failed"})`);
      }
      Alert.alert("Receipt downloaded", "Your PDF receipt is ready.", [
        { text: "OK", style: "cancel" },
        {
          text: "Open PDF",
          onPress: async () => {
            try {
              await openPdfUri(result.uri);
            } catch (openError) {
              Alert.alert("Open failed", "Could not open directly. Try Share PDF.");
            }
          }
        },
        {
          text: "Share PDF",
          onPress: async () => {
            try {
              await sharePdfUri(result.uri);
            } catch (shareError) {
              Alert.alert("Share failed", "Could not share the PDF file from this device.");
            }
          }
        },
        {
          text: "Save to Downloads",
          onPress: async () => {
            try {
              const savedUri = await savePdfToDownloads(result.uri, `${safeFileName}-${uniqueSuffix}`);
              Alert.alert("Saved to Downloads", "Receipt saved in your Downloads folder.");
            } catch (saveError) {
              Alert.alert("Save failed", saveError?.message || "Could not save PDF to Downloads.");
            }
          }
        }
      ]);
    } catch (requestError) {
      Alert.alert("Download failed", requestError?.message || "Could not download receipt");
    } finally {
      setReceiptBusyId("");
    }
  };

  const downloadAppointmentReceipt = async (payment) => {
    const paymentId = String(payment?._id || "");
    if (!paymentId) {
      Alert.alert("Receipt unavailable", "Payment record was not found.");
      return;
    }
    await downloadPdfReceipt({
      endpoint: `/payments/${paymentId}/receipt`,
      filenameBase: `payment-receipt-${payment?.invoiceNumber || paymentId}`,
      busyKey: `payment-${paymentId}`
    });
  };

  const downloadOrderReceipt = async (order) => {
    const orderId = String(order?._id || "");
    if (!orderId) {
      Alert.alert("Receipt unavailable", "Order record was not found.");
      return;
    }
    await downloadPdfReceipt({
      endpoint: `/inventory/orders/${orderId}/receipt`,
      filenameBase: `order-receipt-${order?.invoiceNumber || orderId}`,
      busyKey: `order-${orderId}`
    });
  };

  const reportDailyRows = useMemo(
    () => dailyReport.filter((row) => row.transactions > 0),
    [dailyReport]
  );
  const reportMonthlyRows = useMemo(
    () => monthlyReport.filter((row) => row.transactions > 0 || row.paidAmount > 0 || row.refundedAmount > 0),
    [monthlyReport]
  );

  const renderCustomerCard = ({ item }) => {
    const payment = paymentsByAppointment.get(String(item._id));
    const status = toCanonicalStatus(payment?.status);
    const method = methodByAppointment[item._id] || payment?.method || "online";
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.service}>{item.serviceId?.name || "Service"}</Text>
          <Text style={[styles.statusPill, styles[`status_${STATUS_STYLES[status]}`]]}>{status.toUpperCase()}</Text>
        </View>
        <Text style={styles.meta}>Amount: {money(payment?.amount ?? item.serviceId?.price ?? 0)}</Text>
        <Text style={styles.meta}>Invoice: {payment?.invoiceNumber || "Will be generated on payment"}</Text>
        <Text style={styles.meta}>Receipt/Txn: {payment?.transactionId || "-"}</Text>
        <Text style={styles.meta}>Payment method</Text>
        <View style={styles.methodRow}>
          {PAYMENT_METHODS.map((option) => {
            const active = option === method;
            return (
              <Pressable
                key={`${item._id}-${option}`}
                style={[styles.methodChip, active && styles.methodChipActive]}
                onPress={() => setMethodByAppointment((prev) => ({ ...prev, [item._id]: option }))}
              >
                <Text style={[styles.methodChipText, active && styles.methodChipTextActive]}>
                  {getPaymentMethodLabel(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {method === "card" || method === "online" ? (
          <Text style={styles.gatewayNote}>Gateway-ready record flow. Provider keys/endpoints are needed for live charging.</Text>
        ) : null}
        <PrimaryButton
          title={status === "paid" ? "Paid" : "Pay Now"}
          disabled={status === "paid"}
          loading={busyId === String(item._id)}
          onPress={() => payAppointment(item)}
        />
        {(status === "paid" || status === "refunded") && payment ? (
          <PrimaryButton
            title="Download PDF Receipt"
            variant="outline"
            style={styles.receiptButton}
            loading={receiptBusyId === `payment-${payment._id}`}
            onPress={() => downloadAppointmentReceipt(payment)}
          />
        ) : null}
      </View>
    );
  };

  const renderAdminHeader = () => (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.sectionTitle}>Accounting Dashboard</Text>
      <View style={styles.summaryGrid}>
        <SummaryCard label="Net Revenue" value={money(summary?.netRevenue || 0)} styles={styles} />
        <SummaryCard label="Paid Amount" value={money(summary?.paidAmount || 0)} styles={styles} />
        <SummaryCard label="Refunded" value={money(summary?.refundedAmount || 0)} styles={styles} />
        <SummaryCard label="Unpaid" value={money(summary?.unpaidAmount || 0)} styles={styles} />
      </View>
      <View style={styles.summaryGrid}>
        <SummaryCard label="Transactions" value={String(summary?.totalTransactions || 0)} styles={styles} />
        <SummaryCard label="Paid Count" value={String(summary?.paidCount || 0)} styles={styles} />
        <SummaryCard label="Unpaid Count" value={String(summary?.unpaidCount || 0)} styles={styles} />
        <SummaryCard label="Refund Count" value={String(summary?.refundedCount || 0)} styles={styles} />
      </View>

      <View style={styles.reportCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.reportTitle}>Daily Report ({monthKey(monthCursor)})</Text>
          <View style={styles.navWrap}>
            <Pressable style={styles.navBtn} onPress={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>
              <Text style={styles.navText}>{"<"}</Text>
            </Pressable>
            <Pressable style={styles.navBtn} onPress={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>
              <Text style={styles.navText}>{">"}</Text>
            </Pressable>
          </View>
        </View>
        {reportDailyRows.length ? reportDailyRows.slice(-10).map((row) => (
          <View key={row.date} style={styles.reportRow}>
            <Text style={styles.meta}>{row.date}</Text>
            <Text style={styles.meta}>{money(row.netRevenue)}</Text>
          </View>
        )) : <Text style={styles.meta}>No transactions in this month.</Text>}
      </View>

      <View style={styles.reportCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.reportTitle}>Monthly Report ({yearCursor})</Text>
          <View style={styles.navWrap}>
            <Pressable style={styles.navBtn} onPress={() => setYearCursor((prev) => prev - 1)}>
              <Text style={styles.navText}>{"<"}</Text>
            </Pressable>
            <Pressable style={styles.navBtn} onPress={() => setYearCursor((prev) => prev + 1)}>
              <Text style={styles.navText}>{">"}</Text>
            </Pressable>
          </View>
        </View>
        {reportMonthlyRows.length ? reportMonthlyRows.map((row) => (
          <View key={row.month} style={styles.reportRow}>
            <Text style={styles.meta}>{row.month}</Text>
            <Text style={styles.meta}>{money(row.netRevenue)}</Text>
          </View>
        )) : <Text style={styles.meta}>No monthly transactions for this year.</Text>}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Transactions</Text>
    </View>
  );

  const renderCustomerFooter = () => (
    <View style={{ marginTop: 6, paddingBottom: 20 }}>
      <Text style={styles.sectionTitle}>Product Orders</Text>
      {!productOrders.length ? (
        <Text style={styles.meta}>No product orders yet.</Text>
      ) : (
        productOrders.map((order) => {
          const status = toCanonicalStatus(order.status);
          return (
            <View key={order._id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.service}>Order #{order.invoiceNumber || order._id?.slice(-6)}</Text>
                <Text style={[styles.statusPill, styles[`status_${STATUS_STYLES[status]}`]]}>{status.toUpperCase()}</Text>
              </View>
              <Text style={styles.meta}>Items: {(order.items || []).map((row) => `${row.name} x${row.quantity}`).join(", ")}</Text>
              <Text style={styles.meta}>Amount: {money(order.total)}</Text>
              <Text style={styles.meta}>Delivery: {order.deliveryAddress || "N/A"}</Text>
              <Text style={styles.meta}>Method: {String(order.method || "online").toUpperCase()}</Text>
              {["card", "online"].includes(String(order.method || "").toLowerCase()) && status !== "paid" ? (
                <Text style={styles.gatewayNote}>Provider checkout is not configured yet; this records payment after confirmation.</Text>
              ) : null}
              <Text style={styles.meta}>Receipt/Txn: {order.transactionId || "-"}</Text>
              <PrimaryButton
                title={status === "paid" ? "Paid" : "Mark as Paid"}
                disabled={status === "paid"}
                loading={busyId === String(order._id)}
                onPress={() => payProductOrder(order)}
              />
              {(status === "paid" || status === "refunded") ? (
                <PrimaryButton
                  title="Download PDF Receipt"
                  variant="outline"
                  style={styles.receiptButton}
                  loading={receiptBusyId === `order-${order._id}`}
                  onPress={() => downloadOrderReceipt(order)}
                />
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );

  const staffAppointmentSummary = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        const status = toCanonicalStatus(payment?.status);
        const amount = Number(payment?.amount || 0);
        if (status === "paid") acc.paid += amount;
        if (status === "refunded") acc.refunded += amount;
        return acc;
      },
      { paid: 0, refunded: 0 }
    );
  }, [payments]);

  const staffInventorySummary = useMemo(() => {
    return productOrders.reduce(
      (acc, order) => {
        const status = toCanonicalStatus(order?.status);
        const amount = Number(order?.total || 0);
        if (status === "paid") acc.paid += amount;
        if (status === "refunded") acc.refunded += amount;
        return acc;
      },
      { paid: 0, refunded: 0 }
    );
  }, [productOrders]);

  const renderStaffHeader = () => {
    const appointmentCredited = staffAppointmentSummary.paid - staffAppointmentSummary.refunded;
    const inventorySpent = staffInventorySummary.paid - staffInventorySummary.refunded;
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={styles.sectionTitle}>Beautician Payments</Text>
        <View style={styles.summaryGrid}>
          <SummaryCard label="Appointment Credited" value={money(appointmentCredited)} styles={styles} />
          <SummaryCard label="Inventory Products" value={money(inventorySpent)} styles={styles} />
        </View>
        <View style={styles.summaryGrid}>
          <SummaryCard label="Appointment Payments" value={String(payments.length)} styles={styles} />
          <SummaryCard label="Inventory Orders" value={String(productOrders.length)} styles={styles} />
        </View>
        <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Appointment Credits</Text>
      </View>
    );
  };

  const renderStaffCard = ({ item }) => {
    const status = toCanonicalStatus(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.service}>{item.appointmentId?.serviceId?.name || "Service"}</Text>
          <Text style={[styles.statusPill, styles[`status_${STATUS_STYLES[status]}`]]}>{status.toUpperCase()}</Text>
        </View>
        <Text style={styles.meta}>Customer: {item.appointmentId?.userId?.name || "N/A"}</Text>
        <Text style={styles.meta}>Amount: {money(item.amount)}</Text>
        <Text style={styles.meta}>Method: {String(item.method || "").toUpperCase()}</Text>
        <Text style={styles.meta}>Invoice: {item.invoiceNumber || "-"}</Text>
        <Text style={styles.meta}>Receipt/Txn: {item.transactionId || "-"}</Text>
        {(status === "paid" || status === "refunded") ? (
          <PrimaryButton
            title="Download PDF Receipt"
            variant="outline"
            style={styles.receiptButton}
            loading={receiptBusyId === `payment-${item._id}`}
            onPress={() => downloadAppointmentReceipt(item)}
          />
        ) : null}
      </View>
    );
  };

  const renderStaffFooter = () => (
    <View style={{ paddingBottom: 20 }}>
      <Text style={styles.sectionTitle}>Inventory Product Orders</Text>
      {!productOrders.length ? (
        <Text style={styles.meta}>No inventory product orders yet.</Text>
      ) : (
        productOrders.map((order) => {
          const status = toCanonicalStatus(order.status);
          return (
            <View key={order._id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.service}>Order #{order.invoiceNumber || order._id?.slice(-6)}</Text>
                <Text style={[styles.statusPill, styles[`status_${STATUS_STYLES[status]}`]]}>{status.toUpperCase()}</Text>
              </View>
              <Text style={styles.meta}>Items: {(order.items || []).map((row) => `${row.name} x${row.quantity}`).join(", ")}</Text>
              <Text style={styles.meta}>Amount: {money(order.total)}</Text>
              <Text style={styles.meta}>Method: {String(order.method || "online").toUpperCase()}</Text>
              <Text style={styles.meta}>Receipt/Txn: {order.transactionId || "-"}</Text>
              {(status === "paid" || status === "refunded") ? (
                <PrimaryButton
                  title="Download PDF Receipt"
                  variant="outline"
                  style={styles.receiptButton}
                  loading={receiptBusyId === `order-${order._id}`}
                  onPress={() => downloadOrderReceipt(order)}
                />
              ) : null}
            </View>
          );
        })
      )}
    </View>
  );

  const renderAdminFooter = () => (
    <View style={{ paddingBottom: 20 }}>
      <Text style={styles.sectionTitle}>Product Sales Transactions</Text>
      {!adminProductOrders.length ? (
        <Text style={styles.meta}>No product sales transactions yet.</Text>
      ) : (
        adminProductOrders.map((order) => {
          const status = toCanonicalStatus(order.status);
          return (
            <View key={order._id} style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.service}>Order #{order.invoiceNumber || order._id?.slice(-6)}</Text>
                <Text style={[styles.statusPill, styles[`status_${STATUS_STYLES[status]}`]]}>{status.toUpperCase()}</Text>
              </View>
              <Text style={styles.meta}>Customer: {order.customerId?.name || "N/A"}</Text>
              <Text style={styles.meta}>Items: {(order.items || []).map((row) => `${row.name} x${row.quantity}`).join(", ")}</Text>
              <Text style={styles.meta}>Amount: {money(order.total)}</Text>
              <Text style={styles.meta}>Delivery: {order.deliveryAddress || "N/A"}</Text>
              <Text style={styles.meta}>Method: {String(order.method || "online").toUpperCase()}</Text>
              <Text style={styles.meta}>Receipt/Txn: {order.transactionId || "-"}</Text>
            </View>
          );
        })
      )}
    </View>
  );

  const renderAdminCard = ({ item }) => {
    const status = toCanonicalStatus(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.service}>{item.appointmentId?.serviceId?.name || "Service"}</Text>
          <Text style={[styles.statusPill, styles[`status_${STATUS_STYLES[status]}`]]}>{status.toUpperCase()}</Text>
        </View>
        <Text style={styles.meta}>Customer: {item.appointmentId?.userId?.name || "N/A"}</Text>
        <Text style={styles.meta}>Amount: {money(item.amount)}</Text>
        <Text style={styles.meta}>Method: {String(item.method || "").toUpperCase()}</Text>
        <Text style={styles.meta}>Invoice: {item.invoiceNumber || "-"}</Text>
        <Text style={styles.meta}>Receipt/Txn: {item.transactionId || "-"}</Text>
        <View style={styles.actionRow}>
          <PrimaryButton
            title="Mark Paid"
            disabled={status === "paid"}
            style={styles.actionButton}
            loading={busyId === String(item._id)}
            onPress={() => updatePaymentStatus(item._id, "paid")}
          />
          <PrimaryButton
            title="Mark Unpaid"
            variant="outline"
            style={styles.actionButton}
            loading={busyId === String(item._id)}
            onPress={() => updatePaymentStatus(item._id, "unpaid")}
          />
          <PrimaryButton
            title="Refund"
            variant="outline"
            style={styles.actionButton}
            loading={busyId === String(item._id)}
            onPress={() => updatePaymentStatus(item._id, "refunded")}
          />
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={isAdmin ? payments : isStaff ? payments : appointments}
        keyExtractor={(item) => String(item._id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
        ListHeaderComponent={isAdmin ? renderAdminHeader : isStaff ? renderStaffHeader : null}
        ListFooterComponent={isAdmin ? renderAdminFooter : isStaff ? renderStaffFooter : renderCustomerFooter}
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading payment data..." />
          ) : error ? (
            <ErrorState title="Could not load payments" subtitle="Please retry." onRetry={fetchData} />
          ) : (
            <EmptyState
              title={isAdmin ? "No transactions yet" : isStaff ? "No staff payment records" : "No payment records"}
              subtitle={
                isAdmin
                  ? "Payments will appear here."
                  : isStaff
                  ? "Appointment credits and inventory product orders will appear here."
                  : "Payments for bookings will appear here."
              }
            />
          )
        }
        renderItem={isAdmin ? renderAdminCard : isStaff ? renderStaffCard : renderCustomerCard}
      />
    </ScreenContainer>
  );
}

function SummaryCard({ label, value, styles }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    sectionTitle: {
      color: colors.primaryDark,
      fontWeight: "800",
      fontSize: TYPOGRAPHY.xxl,
      marginBottom: SPACING.sm
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
      borderWidth: 1,
      borderColor: colors.border
    },
    service: {
      fontSize: TYPOGRAPHY.lg,
      fontWeight: "700",
      color: colors.text
    },
    meta: {
      color: colors.muted,
      marginTop: 4
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8
    },
    statusPill: {
      fontSize: 11,
      fontWeight: "700",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      overflow: "hidden"
    },
    status_unpaid: {
      color: colors.primaryDark,
      backgroundColor: `${colors.primary}22`
    },
    status_paid: {
      color: colors.success,
      backgroundColor: `${colors.success}22`
    },
    status_refunded: {
      color: colors.danger,
      backgroundColor: `${colors.danger}22`
    },
    methodRow: {
      flexDirection: "row",
      gap: 8,
      marginVertical: 10
    },
    methodChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    methodChipActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}22`
    },
    methodChipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "700"
    },
    methodChipTextActive: {
      color: colors.primaryDark
    },
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8
    },
    summaryCard: {
      width: "48%",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 10
    },
    summaryLabel: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 4
    },
    summaryValue: {
      color: colors.text,
      fontSize: TYPOGRAPHY.xl,
      fontWeight: "800"
    },
    reportCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 10,
      marginBottom: 8
    },
    reportTitle: {
      color: colors.text,
      fontWeight: "700"
    },
    reportRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6
    },
    navWrap: {
      flexDirection: "row",
      gap: 6
    },
    navBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3
    },
    navText: {
      color: colors.primaryDark,
      fontWeight: "700"
    },
    actionRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10
    },
    actionButton: {
      flex: 1,
      minHeight: 42,
      paddingVertical: 9
    },
    receiptButton: {
      marginTop: SPACING.sm
    },
    gatewayNote: {
      color: colors.muted,
      fontSize: TYPOGRAPHY.xs,
      marginTop: -4,
      marginBottom: SPACING.sm
    }
  });
