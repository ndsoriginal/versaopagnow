"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type AdminContextValue = {
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export const AdminProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);

  const login = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    if (normalized === "admin01@gmail.com" || normalized === "jhonatas553@gmail.com") {
      setIsAdmin(true);
      localStorage.setItem("is_admin", "true");
    } else {
      throw new Error("Credenciais inválidas");
    }
  };

  const logout = () => {
    setIsAdmin(false);
    localStorage.removeItem("is_admin");
  };

  useEffect(() => {
    const stored = localStorage.getItem("is_admin");
    if (stored === "true") {
      setIsAdmin(true);
    }
  }, []);

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
};