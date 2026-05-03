import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import ScreenContainer from "../../components/ScreenContainer";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";
import LoadingState from "../../components/LoadingState";
import EmptyState from "../../components/EmptyState";
import ErrorState from "../../components/ErrorState";
import api from "../../services/api";
import { getToken } from "../../services/authStorage";
import { useTheme } from "../../context/ThemeContext";
import {
  compactName,
  normalizeEmail,
  trimText,
  validateEmail,
  validateIntegerQuantity,
  validateInventoryCategory,
  validateInventoryName,
  validateNonNegativeMoney,
  validateOptionalInventoryText,
  validatePhone
} from "../../utils/validation";

const initialForm = {
  id: "",
  name: "",
  description: "",
  category: "",
  price: "",
  stockQty: "",
  reorderLevel: "5",
  supplierName: "",
  supplierPhone: "",
  supplierEmail: "",
  productImage: ""
};

const money = (value) => `LKR ${Number(value || 0).toLocaleString()}`;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const sanitizeProductForm = (form) => ({
  ...form,
  name: compactName(form.name),
  description: trimText(form.description),
  category: compactName(form.category),
  price: trimText(form.price),
  stockQty: trimText(form.stockQty),
  reorderLevel: trimText(form.reorderLevel),
  supplierName: compactName(form.supplierName),
  supplierPhone: trimText(form.supplierPhone),
  supplierEmail: normalizeEmail(form.supplierEmail)
});

const inferMimeType = (asset) => {
  const mime = String(asset?.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return mime;
  const uri = String(asset?.uri || "").toLowerCase();
  if (uri.endsWith(".png")) return "image/png";
  if (uri.endsWith(".webp")) return "image/webp";
  if (uri.endsWith(".heic")) return "image/heic";
  if (uri.endsWith(".heif")) return "image/heif";
  return "image/jpeg";
};

const buildProductFormData = (form, selectedImage, audience) => {
  const payload = new FormData();
  payload.append("name", form.name);
  payload.append("description", form.description);
  payload.append("category", form.category);
  payload.append("audience", audience);
  payload.append("price", String(Number(form.price)));
  payload.append("stockQty", String(Number(form.stockQty)));
  payload.append("reorderLevel", String(Number(form.reorderLevel)));
  if (form.supplierName) payload.append("supplierName", form.supplierName);
  if (form.supplierPhone) payload.append("supplierPhone", form.supplierPhone);
  if (form.supplierEmail) payload.append("supplierEmail", form.supplierEmail);

  if (selectedImage?.uri) {
    payload.append("productImage", {
      uri: selectedImage.uri,
      name: selectedImage.fileName || `product-${Date.now()}.jpg`,
      type: inferMimeType(selectedImage)
    });
  }

  return payload;
};

const extractExtension = (asset) => {
  const uri = String(asset?.uri || "").toLowerCase();
  const uriMatch = uri.match(/\.([a-z0-9]+)(?:\?|$)/i);
  if (uriMatch?.[1]) return uriMatch[1];
  const mime = inferMimeType(asset);
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("heif")) return "heif";
  return "jpg";
};

const normalizeImageAsset = async (asset) => {
  const sourceUri = String(asset?.uri || "");
  if (!sourceUri) return asset;
  if (sourceUri.startsWith("file://")) return asset;

  const ext = extractExtension(asset);
  const destination = `${FileSystem.cacheDirectory}inventory-upload-${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return { ...asset, uri: destination };
};

const buildProductJsonPayload = (form, audience) => ({
  name: form.name,
  description: form.description,
  category: form.category,
  audience,
  price: Number(form.price),
  stockQty: Number(form.stockQty),
  reorderLevel: Number(form.reorderLevel),
  supplierName: form.supplierName,
  supplierPhone: form.supplierPhone,
  supplierEmail: form.supplierEmail
});

  const uploadWithImage = async ({ method, productId, payload }) => {
  const token = await getToken();
  const apiBase = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
  const endpoint = method === "PUT" ? `/inventory/products/${productId}` : "/inventory/products";
  const url = `${apiBase}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      Accept: "application/json"
    },
    body: payload
  });

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const validationMessage = Array.isArray(data?.errors)
      ? data.errors.map((item) => item.msg).join("\n")
      : "";
    throw new Error(validationMessage || data?.message || `Upload failed (${response.status})`);
  }

  return data;
};

export default function ManageInventoryScreen({ audience = "customer", reportTitle = "Inventory Report" }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [products, setProducts] = useState([]);
  const [report, setReport] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const lowStockProducts = useMemo(
    () => products.filter((item) => Number(item.stockQty || 0) <= Number(item.reorderLevel || 0)),
    [products]
  );

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [productsRes, reportRes] = await Promise.all([
        api.get("/inventory/products", { params: { audience } }),
        api.get("/inventory/report", { params: { audience } })
      ]);
      setProducts(productsRes.data.data || []);
      setReport(reportRes.data.data || null);
    } catch (requestError) {
      setError("Could not load inventory data");
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const validateForm = (currentForm) => {
    const cleaned = sanitizeProductForm(currentForm);
    const errors = {
      name: validateInventoryName(cleaned.name),
      description: validateOptionalInventoryText(cleaned.description, "Description", 300),
      category: validateInventoryCategory(cleaned.category),
      price: validateNonNegativeMoney(cleaned.price, "Price"),
      stockQty: validateIntegerQuantity(cleaned.stockQty, { label: "Stock quantity", min: 0 }),
      reorderLevel: validateIntegerQuantity(cleaned.reorderLevel, { label: "Reorder level", min: 0 }),
      supplierName: validateOptionalInventoryText(cleaned.supplierName, "Supplier name", 80),
      supplierPhone: validatePhone(cleaned.supplierPhone, { required: false }),
      supplierEmail: validateEmail(cleaned.supplierEmail, { required: false })
    };

    const duplicate = products.some((item) => {
      if (String(item._id || "") === String(cleaned.id || "")) return false;
      return (
        compactName(item.name).toLowerCase() === cleaned.name.toLowerCase() &&
        compactName(item.category).toLowerCase() === cleaned.category.toLowerCase() &&
        String(item.audience || audience || "customer").toLowerCase() === String(audience || "customer").toLowerCase()
      );
    });
    if (!errors.name && !errors.category && duplicate) {
      errors.name = "A product with this name and category already exists in this inventory";
    }

    return {
      cleaned,
      errors: Object.fromEntries(Object.entries(errors).filter(([, message]) => Boolean(message)))
    };
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow media access to upload product image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.55,
      allowsEditing: false
    });
    if (!result.canceled && result.assets?.[0]) {
      const picked = await normalizeImageAsset(result.assets[0]);
      if (Number(picked.fileSize || 0) > MAX_UPLOAD_BYTES) {
        Alert.alert("Image too large", "Please choose an image smaller than 12MB.");
        return;
      }
      setSelectedImage(picked);
    }
  };

  const submit = async () => {
    const { cleaned, errors } = validateForm(form);
    setForm(cleaned);
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      Alert.alert("Validation", Object.values(errors)[0]);
      return;
    }

    try {
      setSaving(true);
      const requestConfig = { timeout: 60000 };
      const hasImage = Boolean(selectedImage?.uri);
      const payload = hasImage
        ? buildProductFormData(cleaned, selectedImage, audience)
        : buildProductJsonPayload(cleaned, audience);

      if (cleaned.id) {
        if (hasImage) {
          await uploadWithImage({ method: "PUT", productId: cleaned.id, payload });
        } else {
          await api.put(`/inventory/products/${cleaned.id}`, payload, requestConfig);
        }
      } else {
        if (hasImage) {
          await uploadWithImage({ method: "POST", payload });
        } else {
          await api.post("/inventory/products", payload, requestConfig);
        }
      }
      setForm(initialForm);
      setFormErrors({});
      setSelectedImage(null);
      await fetchAll();
    } catch (requestError) {
      const validationMessage = Array.isArray(requestError?.response?.data?.errors)
        ? requestError.response.data.errors.map((item) => item.msg).join("\n")
        : null;
      const timeoutMessage =
        requestError?.code === "ECONNABORTED"
          ? "Upload timed out. Try a smaller image or better connection."
          : null;
      const networkMessage =
        !requestError?.response &&
        /(network error|network request failed|failed to fetch)/i.test(String(requestError?.message || ""))
          ? "Cannot reach backend. Check backend server is running and EXPO_PUBLIC_API_URL is correct."
          : null;
      Alert.alert(
        "Error",
        validationMessage ||
          requestError?.response?.data?.message ||
          timeoutMessage ||
          networkMessage ||
          requestError?.message ||
          "Save failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/inventory/products/${id}`);
      await fetchAll();
    } catch (requestError) {
      Alert.alert("Error", requestError?.response?.data?.message || "Delete failed");
    }
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <ScreenContainer scroll={false}>
      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} />}
        ListEmptyComponent={
          loading ? (
            <LoadingState label="Loading inventory..." />
          ) : error ? (
            <ErrorState title="Inventory unavailable" subtitle="Please retry." onRetry={fetchAll} />
          ) : (
            <EmptyState title="No products yet" subtitle="Create products to start inventory tracking." />
          )
        }
        ListHeaderComponent={
          <View>
            <View style={styles.reportCard}>
              <Text style={styles.reportTitle}>{reportTitle}</Text>
              <Text style={styles.meta}>Products: {report?.summary?.totalProducts || 0}</Text>
              <Text style={styles.meta}>Low stock alerts: {report?.summary?.lowStockCount || 0}</Text>
              <Text style={styles.meta}>Stock units: {report?.summary?.totalStockUnits || 0}</Text>
              <Text style={styles.meta}>Stock value: {money(report?.summary?.totalStockValue || 0)}</Text>
              <Text style={styles.meta}>Product sales net revenue: {money(report?.orderSummary?.netRevenue || 0)}</Text>
            </View>

            {lowStockProducts.length ? (
              <View style={styles.reportCard}>
                <Text style={styles.reportTitle}>Low Stock Alerts</Text>
                {lowStockProducts.slice(0, 5).map((item) => (
                  <Text key={item._id} style={styles.meta}>
                    {item.name}: {item.stockQty} left (reorder at {item.reorderLevel})
                  </Text>
                ))}
              </View>
            ) : null}

            <View style={styles.formCard}>
              <View style={styles.imageWrap}>
                {selectedImage?.uri || form.productImage ? (
                  <Image source={{ uri: selectedImage?.uri || form.productImage }} style={styles.previewImage} />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>No image selected</Text>
                  </View>
                )}
                <PrimaryButton
                  title="Upload Product Image"
                  variant="outline"
                  onPress={pickImage}
                />
              </View>

              <InputField
                label="Product Name"
                value={form.name}
                onChangeText={(value) => updateFormField("name", value)}
                error={formErrors.name}
                maxLength={80}
                autoCapitalize="words"
              />
              <InputField
                label="Description"
                value={form.description}
                onChangeText={(value) => updateFormField("description", value)}
                error={formErrors.description}
                maxLength={300}
                autoCapitalize="sentences"
              />
              <InputField
                label="Category"
                value={form.category}
                onChangeText={(value) => updateFormField("category", value)}
                placeholder="Hair care, Skin care, Accessories..."
                error={formErrors.category}
                maxLength={50}
                autoCapitalize="words"
              />
              <InputField
                label="Price (LKR)"
                value={form.price}
                onChangeText={(value) => updateFormField("price", value)}
                keyboardType="decimal-pad"
                error={formErrors.price}
              />
              <InputField
                label="Stock Quantity"
                value={form.stockQty}
                onChangeText={(value) => updateFormField("stockQty", value)}
                keyboardType="number-pad"
                error={formErrors.stockQty}
              />
              <InputField
                label="Reorder Level"
                value={form.reorderLevel}
                onChangeText={(value) => updateFormField("reorderLevel", value)}
                keyboardType="number-pad"
                error={formErrors.reorderLevel}
              />
              <InputField
                label="Supplier Name"
                value={form.supplierName}
                onChangeText={(value) => updateFormField("supplierName", value)}
                error={formErrors.supplierName}
                maxLength={80}
                autoCapitalize="words"
              />
              <InputField
                label="Supplier Phone"
                value={form.supplierPhone}
                onChangeText={(value) => updateFormField("supplierPhone", value)}
                keyboardType="phone-pad"
                error={formErrors.supplierPhone}
                maxLength={10}
              />
              <InputField
                label="Supplier Email"
                value={form.supplierEmail}
                onChangeText={(value) => updateFormField("supplierEmail", value)}
                keyboardType="email-address"
                error={formErrors.supplierEmail}
              />
              <PrimaryButton
                title={form.id ? "Update Product" : "Create Product"}
                onPress={submit}
                loading={saving}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isLow = Number(item.stockQty || 0) <= Number(item.reorderLevel || 0);
          return (
            <View style={styles.itemCard}>
              {item.productImage ? <Image source={{ uri: item.productImage }} style={styles.itemImage} /> : null}
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>Category: {item.category}</Text>
              <Text style={styles.meta}>Price: {money(item.price)}</Text>
              <Text style={styles.meta}>
                Stock: {item.stockQty} {isLow ? "(LOW)" : ""}
              </Text>
              <Text style={styles.meta}>Supplier: {item.supplierName || "N/A"}</Text>
              <Text style={styles.meta}>Usage tracked: {item.usageCount || 0}</Text>
              <View style={styles.row}>
                <PrimaryButton
                  title="Edit"
                  variant="outline"
                  style={styles.rowButton}
                onPress={() => {
                  setSelectedImage(null);
                  setFormErrors({});
                  setForm({
                      id: item._id,
                      name: item.name || "",
                      description: item.description || "",
                      category: item.category || "",
                      price: String(item.price ?? ""),
                      stockQty: String(item.stockQty ?? ""),
                      reorderLevel: String(item.reorderLevel ?? "5"),
                      supplierName: item.supplierName || "",
                      supplierPhone: item.supplierPhone || "",
                      supplierEmail: item.supplierEmail || "",
                      productImage: item.productImage || ""
                    });
                  }}
                />
                <PrimaryButton title="Delete" style={styles.rowButton} onPress={() => remove(item._id)} />
              </View>
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    reportCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border
    },
    reportTitle: {
      color: colors.primaryDark,
      fontWeight: "800",
      marginBottom: 6,
      fontSize: 16
    },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12
    },
    imageWrap: {
      marginBottom: 10
    },
    previewImage: {
      width: "100%",
      height: 180,
      borderRadius: 10,
      marginBottom: 8
    },
    placeholder: {
      width: "100%",
      height: 120,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
      backgroundColor: colors.background
    },
    placeholderText: {
      color: colors.muted
    },
    itemCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10
    },
    itemImage: {
      width: "100%",
      height: 150,
      borderRadius: 10,
      marginBottom: 10
    },
    name: { fontWeight: "700", fontSize: 16, color: colors.text },
    meta: { color: colors.muted, marginVertical: 3 },
    row: { flexDirection: "row", gap: 10, marginTop: 8 },
    rowButton: { flex: 1, paddingVertical: 11 }
  });
