import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ScreenContainer from "../../components/ScreenContainer";
import PrimaryButton from "../../components/PrimaryButton";
import InputField from "../../components/InputField";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { RADIUS, SPACING, TYPOGRAPHY } from "../../constants/theme";

const money = (value) => `LKR ${Number(value || 0).toLocaleString()}`;

export default function ProductsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/inventory/products");
      setProducts(response.data.data || []);
    } catch (requestError) {
      setError("Unable to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [fetchProducts])
  );

  const groupedProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const visible = products.filter((item) => {
      if (!item.isActive) return false;
      if (!item._id || !String(item.name || "").trim() || !String(item.category || "").trim()) return false;
      if (!Number.isFinite(Number(item.price || 0)) || Number(item.price || 0) < 0) return false;
      if (!Number.isFinite(Number(item.stockQty || 0)) || Number(item.stockQty || 0) < 0) return false;
      if (!query) return true;
      return (
        String(item.name || "").toLowerCase().includes(query) ||
        String(item.category || "").toLowerCase().includes(query) ||
        String(item.description || "").toLowerCase().includes(query)
      );
    });

    const grouped = new Map();
    visible.forEach((item) => {
      const key = [
        String(item.name || "").trim().toLowerCase(),
        String(item.category || "").trim().toLowerCase(),
        Number(item.price || 0),
        String(item.description || "").trim().toLowerCase()
      ].join("|");

      if (!grouped.has(key)) {
        grouped.set(key, {
          groupKey: key,
          name: item.name,
          category: item.category,
          description: item.description,
          price: item.price,
          stockQty: 0,
          productImage: item.productImage || "",
          sources: []
        });
      }

      const entry = grouped.get(key);
      const stock = Math.max(0, Number(item.stockQty || 0));
      entry.stockQty += stock;
      if (!entry.productImage && item.productImage) {
        entry.productImage = item.productImage;
      }
      entry.sources.push({
        productId: item._id,
        stockQty: stock
      });
      grouped.set(key, entry);
    });

    return Array.from(grouped.values());
  }, [products, search]);

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={groupedProducts}
        keyExtractor={(item) => item.groupKey}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProducts} />}
        ListHeaderComponent={
          <InputField
            label="Search Products"
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, category, description"
          />
        }
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading products..." />
          ) : error ? (
            <ErrorState title="Products unavailable" subtitle="Please retry." onRetry={fetchProducts} />
          ) : (
            <EmptyState title="No products available" subtitle="Please check back later." />
          )
        }
        renderItem={({ item }) => {
          const outOfStock = Number(item.stockQty || 0) <= 0;
          return (
            <View style={styles.card}>
              {item.productImage ? (
                <Image source={{ uri: item.productImage }} style={styles.productImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderText}>No product image</Text>
                </View>
              )}
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>{money(item.price)}</Text>
              </View>
              <Text style={styles.meta}>Category: {item.category}</Text>
              <Text style={styles.meta}>{item.description || "No description available."}</Text>
              <Text style={[styles.meta, styles.stockMeta, outOfStock && { color: colors.danger }]}>
                Stock: {item.stockQty} {outOfStock ? "(Out of stock)" : ""}
              </Text>
              <View style={styles.stockButtonSpacer} />

              <PrimaryButton
                title={outOfStock ? "Out of Stock" : "Buy Now"}
                disabled={outOfStock}
                style={styles.buyButton}
                onPress={() => navigation.navigate("ProductCheckout", { productGroup: item })}
              />
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: SPACING.md,
      marginBottom: SPACING.md
    },
    rowBetween: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8
    },
    productImage: {
      width: "100%",
      height: 170,
      borderRadius: 10,
      marginBottom: 10
    },
    imagePlaceholder: {
      width: "100%",
      height: 120,
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background
    },
    imagePlaceholderText: {
      color: colors.muted,
      fontWeight: "600"
    },
    name: {
      color: colors.text,
      fontSize: TYPOGRAPHY.xl,
      fontWeight: "700",
      flex: 1
    },
    price: {
      color: colors.primaryDark,
      fontWeight: "800"
    },
    meta: {
      color: colors.muted,
      marginTop: 4
    },
    stockMeta: {
      marginBottom: 0
    },
    stockButtonSpacer: {
      height: SPACING.md + 6
    },
    buyButton: {
      marginTop: 0
    }
  });
