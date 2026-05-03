import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";
import { clearAuth, getLoginMeta, getStoredUser, getToken, persistAuth, recordLoginMeta } from "../services/authStorage";
import { enrichUserManagementData } from "../services/userManagement";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const storedToken = await getToken();
        const storedUser = await getStoredUser();
        if (!storedToken || !storedUser) {
          setToken(null);
          setUser(null);
          return;
        }

        const storedLoginMeta = await getLoginMeta(storedUser);
        const normalizedStoredUser = enrichUserManagementData({ ...storedUser, ...storedLoginMeta });
        setToken(storedToken);
        setUser(normalizedStoredUser);

        const meRes = await api.get("/auth/me");
        if (meRes?.data?.user) {
          const loginMeta = await getLoginMeta(meRes.data.user);
          const normalizedUser = enrichUserManagementData({ ...meRes.data.user, ...loginMeta });
          setUser(normalizedUser);
          await persistAuth(storedToken, normalizedUser);
        }
      } catch (error) {
        await clearAuth();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrapAuth();
  }, []);

  const register = async (payload) => {
    // Registration should not auto-login the user.
    await api.post("/auth/register", payload);
    setToken(null);
    setUser(null);
    await clearAuth();
  };

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { token: authToken, user: authUser } = response.data;
    const loginMeta = await recordLoginMeta(authUser);
    const normalizedUser = enrichUserManagementData({ ...authUser, ...loginMeta });
    setToken(authToken);
    setUser(normalizedUser);
    await persistAuth(authToken, normalizedUser);
  };

  const socialLogin = async ({ provider, idToken, accessToken, name, title, phone }) => {
    const response = await api.post("/auth/social", {
      provider,
      idToken,
      accessToken,
      name,
      title,
      phone
    });
    const { token: authToken, user: authUser } = response.data;
    const loginMeta = await getLoginMeta(authUser);
    const normalizedUser = enrichUserManagementData({ ...authUser, ...loginMeta });
    setToken(authToken);
    setUser(normalizedUser);
    await persistAuth(authToken, normalizedUser);
  };

  const updateProfile = async ({ name, title, email, phone, profileImageAsset }) => {
    const formData = new FormData();
    if (typeof name === "string") formData.append("name", name);
    if (typeof title === "string") formData.append("title", title);
    if (typeof email === "string") formData.append("email", email);
    if (typeof phone === "string") formData.append("phone", phone);

    if (profileImageAsset?.uri) {
      formData.append("profileImage", {
        uri: profileImageAsset.uri,
        name: profileImageAsset.fileName || `profile-${Date.now()}.jpg`,
        type: profileImageAsset.mimeType || "image/jpeg"
      });
    }

    const response = await api.put("/auth/me", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    const loginMeta = await getLoginMeta(response.data.user);
    const updatedUser = enrichUserManagementData({ ...response.data.user, ...loginMeta });
    setUser(updatedUser);
    if (token) {
      await persistAuth(token, updatedUser);
    }
    return updatedUser;
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await clearAuth();
  };

  const forgotPassword = async (email) => {
    const response = await api.post("/auth/forgot-password", { email: String(email || "").trim() });
    return response.data;
  };

  const resetPassword = async ({ token: resetToken, newPassword }) => {
    const response = await api.post("/auth/reset-password", {
      token: resetToken,
      newPassword
    });
    return response.data;
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    const response = await api.put("/auth/change-password", {
      currentPassword,
      newPassword
    });
    return response.data;
  };

  const deactivateMyAccount = async () => {
    await api.put("/auth/me/status", { isActive: false });
    await logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        socialLogin,
        updateProfile,
        logout,
        forgotPassword,
        resetPassword,
        changePassword,
        deactivateMyAccount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
