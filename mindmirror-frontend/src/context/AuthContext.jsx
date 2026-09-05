/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state by verifying stored access token
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("access");
      if (token) {
        try {
          const response = await api.get("/accounts/me/");
          setUser(response.data);
        } catch (error) {
          console.error("Failed to fetch current user on init:", error);
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          setUser(null);
        }
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

    // Fetch current user details
    const userResponse = await api.get("/accounts/me/");
    setUser(userResponse.data);

    return userResponse.data;
  };

  const register = async (username, email, password) => {
    const response = await api.post("/accounts/register/", {
      username,
      email,
      password,
    });
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
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
