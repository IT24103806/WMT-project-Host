export const trimText = (value) => String(value || "").trim();

export const normalizeEmail = (value) => trimText(value).toLowerCase();

export const normalizeReferralCode = (value) =>
  trimText(value)
    .replace(/\s+/g, "")
    .toUpperCase();

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(value));

export const validateName = (value, label = "Name") => {
  const text = trimText(value).replace(/\s+/g, " ");
  if (!text) return `${label} is required`;
  if (text.length < 2) return `${label} must be at least 2 characters`;
  if (text.length > 80) return `${label} must be 80 characters or less`;
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(text)) {
    return `${label} can contain only letters, spaces, apostrophes, hyphens, and periods`;
  }
  return "";
};

export const validateEmail = (value, { required = true } = {}) => {
  const text = trimText(value);
  if (!text) return required ? "Email is required" : "";
  if (/\s/.test(text)) return "Email cannot contain spaces";
  if (!isValidEmail(text)) return "Enter a valid email address";
  return "";
};

export const validatePhone = (value, { required = true } = {}) => {
  const text = trimText(value);
  if (!text) return required ? "Phone number is required" : "";
  if (!/^\d+$/.test(text)) return "Phone number must contain digits only";
  if (text.length !== 10) return "Phone number must be exactly 10 digits";
  if (!text.startsWith("0")) return "Phone number must start with 0";
  return "";
};

export const validatePassword = (value, label = "Password") => {
  const text = String(value || "");
  if (!text) return `${label} is required`;
  if (!text.trim()) return `${label} cannot be blank`;
  if (text.length < 6) return `${label} must be at least 6 characters`;
  if (!/[A-Za-z]/.test(text) || !/\d/.test(text)) {
    return `${label} must include at least one letter and one number`;
  }
  return "";
};

export const validateRequiredPassword = (value, label = "Password") => {
  const text = String(value || "");
  if (!text) return `${label} is required`;
  if (!text.trim()) return `${label} cannot be blank`;
  return "";
};

export const validateConfirmPassword = (password, confirm, label = "Passwords") => {
  if (!String(confirm || "")) return "Please confirm your password";
  if (password !== confirm) return `${label} do not match`;
  return "";
};

export const validateReferralCode = (value) => {
  const code = normalizeReferralCode(value);
  if (!code) return "";
  if (!/^[A-Z0-9]{4,16}$/.test(code)) {
    return "Referral code must be 4-16 letters or numbers";
  }
  return "";
};

export const validateResetCode = (value) => {
  const code = trimText(value);
  if (!code) return "Reset code is required";
  if (!/^\d{6}$/.test(code)) return "Reset code must be exactly 6 digits";
  return "";
};

export const validateBeauticianRole = (value) => {
  const text = trimText(value).replace(/\s+/g, " ");
  if (!text) return "Beautician role is required";
  if (text.length < 2) return "Beautician role must be at least 2 characters";
  if (text.length > 60) return "Beautician role must be 60 characters or less";
  if (!/^[A-Za-z][A-Za-z &/'-]*$/.test(text)) {
    return "Beautician role can contain only letters, spaces, &, apostrophes, hyphens, and slashes";
  }
  return "";
};

export const compactName = (value) => trimText(value).replace(/\s+/g, " ");

export const validateInventoryName = (value, label = "Product name") => {
  const text = compactName(value);
  if (!text) return `${label} is required`;
  if (text.length < 2) return `${label} must be at least 2 characters`;
  if (text.length > 80) return `${label} must be 80 characters or less`;
  if (!/^[A-Za-z0-9][A-Za-z0-9 .,&'()/-]*$/.test(text)) {
    return `${label} can contain only letters, numbers, spaces, and basic punctuation`;
  }
  return "";
};

export const validateInventoryCategory = (value) => {
  const text = compactName(value);
  if (!text) return "Category is required";
  if (text.length < 2) return "Category must be at least 2 characters";
  if (text.length > 50) return "Category must be 50 characters or less";
  if (!/^[A-Za-z0-9][A-Za-z0-9 .,&'()/-]*$/.test(text)) {
    return "Category can contain only letters, numbers, spaces, and basic punctuation";
  }
  return "";
};

export const validateOptionalInventoryText = (value, label, maxLength = 300) => {
  const text = trimText(value);
  if (!text) return "";
  if (text.length > maxLength) return `${label} must be ${maxLength} characters or less`;
  return "";
};

export const validateNonNegativeMoney = (value, label = "Price") => {
  const text = trimText(value);
  if (!text) return `${label} is required`;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return `${label} must be a valid amount with up to 2 decimals`;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) return `${label} must be zero or greater`;
  if (amount > 10000000) return `${label} is too large`;
  return "";
};

export const validateIntegerQuantity = (
  value,
  {
    label = "Quantity",
    required = true,
    min = 0,
    max = 999999
  } = {}
) => {
  const text = trimText(value);
  if (!text) return required ? `${label} is required` : "";
  if (!/^\d+$/.test(text)) return `${label} must be a whole number`;
  const quantity = Number(text);
  if (!Number.isSafeInteger(quantity)) return `${label} must be a valid whole number`;
  if (quantity < min) return `${label} must be ${min === 1 ? "at least 1" : `${min} or greater`}`;
  if (quantity > max) return `${label} cannot exceed ${max}`;
  return "";
};

export const validateDeliveryAddress = (value) => {
  const text = trimText(value).replace(/\s+/g, " ");
  if (!text) return "Delivery address is required";
  if (text.length < 5) return "Delivery address must be at least 5 characters";
  if (text.length > 160) return "Delivery address must be 160 characters or less";
  return "";
};

export const validatePaymentMethod = (value, allowed = ["cash", "card", "online"]) => {
  const method = trimText(value).toLowerCase();
  return allowed.includes(method) ? "" : "Select a valid payment method";
};

export const validateRequiredId = (value, label) => {
  const text = trimText(value);
  return text ? "" : `${label} is required`;
};

export const validatePositiveAmount = (value, label = "Amount") => {
  const text = trimText(value);
  if (!text) return `${label} is required`;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return `${label} must be a valid amount with up to 2 decimals`;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount <= 0) return `${label} must be greater than zero`;
  if (amount > 10000000) return `${label} is too large`;
  return "";
};

export const validatePositiveInteger = (value, label) =>
  validateIntegerQuantity(value, { label, min: 1 });

export const validateLongText = (value, label, { required = true, min = 2, max = 300 } = {}) => {
  const text = trimText(value).replace(/\s+/g, " ");
  if (!text) return required ? `${label} is required` : "";
  if (text.length < min) return `${label} must be at least ${min} characters`;
  if (text.length > max) return `${label} must be ${max} characters or less`;
  return "";
};

export const validateUrl = (value, { required = false, label = "URL" } = {}) => {
  const text = trimText(value);
  if (!text) return required ? `${label} is required` : "";
  try {
    const parsed = new URL(text);
    if (!["http:", "https:"].includes(parsed.protocol)) return `${label} must start with http or https`;
  } catch (error) {
    return `${label} must be a valid web address`;
  }
  return "";
};

export const validateAppointmentNumber = (value) =>
  validateIntegerQuantity(value, { label: "Appointment ID", min: 1, max: 999999 });

export const validateRating = (value) => {
  const error = validateIntegerQuantity(value, { label: "Rating", min: 1, max: 5 });
  return error || "";
};

export const validateBookingDateText = (value) => {
  const text = trimText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "Date must be selected";
  const parsed = new Date(`${text}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Select a valid date";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed < today) return "Date cannot be in the past";
  return "";
};

export const validateInventoryOrderFields = ({ product, quantity, deliveryAddress, method }) => {
  const errors = {
    quantity: validateIntegerQuantity(quantity, { label: "Quantity", min: 1 }),
    deliveryAddress: validateDeliveryAddress(deliveryAddress),
    method: validatePaymentMethod(method)
  };
  const stockQty = Number(product?.stockQty || 0);
  const qty = Number(trimText(quantity));

  if (!product) {
    errors.product = "Please choose a product to order";
  } else if (!Number.isFinite(stockQty) || stockQty <= 0) {
    errors.product = "Selected product is out of stock";
  } else if (!errors.quantity && qty > stockQty) {
    errors.quantity = "Requested quantity exceeds available stock";
  }

  return Object.fromEntries(Object.entries(errors).filter(([, message]) => Boolean(message)));
};
