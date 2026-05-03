import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../../components/ScreenContainer";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";
import ErrorState from "../../components/ErrorState";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { RADIUS, SPACING, TYPOGRAPHY } from "../../constants/theme";
import { trimText, validateInventoryOrderFields } from "../../utils/validation";

const PAYMENT_METHODS = ["cash", "card", "online"];
const money = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

export default function ProductCheckoutScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const productGroup = route?.params?.productGroup || null;

  const [quantity, setQuantity] = useState("1");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [method, setMethod] = useState("online");
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(() => {
    const qty = Number(quantity || 0);
    return Number(productGroup?.price || 0) * (Number.isFinite(qty) ? qty : 0);
  }, [productGroup?.price, quantity]);

  const submit = async () => {
    if (submitting) return;
    if (!productGroup) return;

    const cleanedQuantity = trimText(quantity);
    const address = trimText(deliveryAddress).replace(/\s+/g, " ");
    const errors = validateInventoryOrderFields({
      product: productGroup,
      quantity: cleanedQuantity,
      deliveryAddress: address,
      method
    });
    setQuantity(cleanedQuantity);
    setDeliveryAddress(address);
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      Alert.alert("Validation", Object.values(errors)[0]);
      return;
    }

    const qty = Number(cleanedQuantity);
    let remaining = qty;
    const items = [];
    (productGroup.sources || []).forEach((source) => {
      if (remaining <= 0) return;
      const available = Number(source.stockQty || 0);
      const take = Math.min(available, remaining);
      if (take > 0) {
        items.push({ productId: source.productId, quantity: take });
        remaining -= take;
      }
    });

    if (remaining > 0 || !items.length) {
      Alert.alert("Validation", "Requested quantity exceeds available stock");
      return;
    }

    const executeOrder = async () => {
      try {
      setSubmitting(true);
      const createRes = await api.post("/inventory/orders", {
        items,
        method,
        deliveryAddress: address,
        note: "Product purchase from mobile checkout"
      });
      const orderId = createRes?.data?.data?._id;
      if (orderId) {
        await api.put(`/inventory/orders/${orderId}/status`, {
          status: "paid",
          method,
          note: "Order paid by customer"
        });
      }
      Alert.alert("Success", "Order placed successfully");
      navigation.goBack();
    } catch (requestError) {
      Alert.alert("Purchase failed", requestError?.response?.data?.message || "Try again");
    } finally {
      setSubmitting(false);
    }
    };

    Alert.alert(
      "Confirm product payment",
      method === "card" || method === "online"
        ? "This records the card/online payment and updates stock. Live gateway charging needs provider keys and backend endpoints."
        : "Record this cash payment and update stock?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm Payment", onPress: executeOrder }
      ]
    );
  };

  if (!productGroup) {
    return (
      <ScreenContainer>
        <ErrorState
          title="Checkout unavailable"
          subtitle="Product details were not found. Please go back and try again."
          onRetry={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.title}>{productGroup.name}</Text>
        <Text style={styles.meta}>Category: {productGroup.category}</Text>
        <Text style={styles.meta}>Unit Price: {money(productGroup.price)}</Text>
        <Text style={styles.meta}>Available Stock: {productGroup.stockQty}</Text>

        <InputField
          label="Quantity"
          value={quantity}
          onChangeText={(value) => {
            setQuantity(value);
            if (formErrors.quantity) setFormErrors((prev) => ({ ...prev, quantity: "" }));
          }}
          keyboardType="number-pad"
          placeholder="Enter quantity"
          error={formErrors.quantity}
        />
        <InputField
          label="Delivery Address"
          value={deliveryAddress}
          onChangeText={(value) => {
            setDeliveryAddress(value);
            if (formErrors.deliveryAddress) setFormErrors((prev) => ({ ...prev, deliveryAddress: "" }));
          }}
          placeholder="Enter address for delivery"
          error={formErrors.deliveryAddress}
          maxLength={160}
          autoCapitalize="sentences"
        />

        <Text style={styles.methodLabel}>Payment Method</Text>
        <View style={styles.methodRow}>
          {PAYMENT_METHODS.map((option) => {
            const active = method === option;
            return (
              <Pressable
                key={option}
                style={[styles.methodChip, active && styles.methodChipActive]}
                onPress={() => setMethod(option)}
              >
                <Text style={[styles.methodChipText, active && styles.methodChipTextActive]}>
                  {option.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.total}>Total: {money(total)}</Text>
        {method === "card" || method === "online" ? (
          <Text style={styles.gatewayNote}>Gateway-ready record flow. Provider setup is required for live card charging.</Text>
        ) : null}
        <PrimaryButton title="Confirm & Pay" loading={submitting} onPress={submit} />
      </View>
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: RADIUS.md,
      padding: SPACING.md
    },
    title: {
      color: colors.text,
      fontSize: TYPOGRAPHY.xxl,
      fontWeight: "800"
    },
    meta: {
      color: colors.muted,
      marginTop: 4
    },
    methodLabel: {
      color: colors.text,
      fontWeight: "700",
      marginTop: 4
    },
    methodRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
      marginBottom: 10
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
    total: {
      color: colors.primaryDark,
      fontWeight: "800",
      fontSize: TYPOGRAPHY.xl,
      marginBottom: SPACING.sm
    },
    gatewayNote: {
      color: colors.muted,
      fontSize: TYPOGRAPHY.xs,
      marginBottom: SPACING.sm
    }
  });
