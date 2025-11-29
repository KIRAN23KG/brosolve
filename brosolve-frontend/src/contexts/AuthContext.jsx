import { createContext, useState, useEffect } from "react";
import api from "../api/axios";
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // CHECK USER - Fetch current user from /auth/me
  const checkUser = async () => {
    const token = localStorage.getItem("brosolve_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  // LOGIN
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("brosolve_token", res.data.token);
    // Immediately set user from login response
    setUser(res.data.user);
    // Then refetch from /auth/me to ensure we have latest role from database
    await checkUser();
    return res.data;
  };

  // REGISTER
  const register = async (name, email, password) => {
    const res = await api.post("/auth/register", { name, email, password }); // 🔥 Correct
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("brosolve_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
