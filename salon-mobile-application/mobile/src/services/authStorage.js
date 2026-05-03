import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "salon_token";
const USER_KEY = "salon_user";
const LOGIN_META_KEY = "salon_login_meta";

export const persistAuth = async (token, user) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
};

export const getToken = async () => AsyncStorage.getItem(TOKEN_KEY);

export const getStoredUser = async () => {
  const value = await AsyncStorage.getItem(USER_KEY);
  return value ? JSON.parse(value) : null;
};

export const recordLoginMeta = async (user) => {
  const userKey = String(user?.id || user?._id || user?.email || "current");
  const value = await AsyncStorage.getItem(LOGIN_META_KEY);
  const allMeta = value ? JSON.parse(value) : {};
  const previous = allMeta[userKey] || {};
  const next = {
    loginCount: Number(previous.loginCount || user?.loginCount || 0) + 1,
    lastLoginAt: new Date().toISOString()
  };
  allMeta[userKey] = next;
  await AsyncStorage.setItem(LOGIN_META_KEY, JSON.stringify(allMeta));
  return next;
};

export const getLoginMeta = async (user) => {
  const userKey = String(user?.id || user?._id || user?.email || "current");
  const value = await AsyncStorage.getItem(LOGIN_META_KEY);
  const allMeta = value ? JSON.parse(value) : {};
  return allMeta[userKey] || {};
};
