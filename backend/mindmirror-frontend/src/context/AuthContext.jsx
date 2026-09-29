/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get("/accounts/me/");
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      setUser(null);
      return null;
    }
  };

  // Initialize auth state by verifying stored access token
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access");
      if (token) {
        await fetchCurrentUser();
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    const response = await api.post("/accounts/login/", {
      username,
      password,
    });

    const { access, refresh } = response.data;
    localStorage.setItem("access", access);
    localStorage.setItem("refresh", refresh);

    // Fetch current user details with profile
    return await fetchCurrentUser();
  };

  const register = async (username, email, password, role = "patient", extraData = {}) => {
    const payload = {
      username,
      email,
      password,
      role,
      ...extraData,
    };
    const response = await api.post("/accounts/register/", payload);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  };

  const isAdmin = !!user?.is_staff;
  const isProvider = user?.profile?.role === "provider";
  const isPatient = user ? user?.profile?.role === "patient" && !isAdmin : false;

  const value = {
    user,
    profile: user?.profile || null,
    role: user?.profile?.role || "patient",
    isAdmin,
    isProvider,
    isPatient,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    refreshUser: fetchCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
