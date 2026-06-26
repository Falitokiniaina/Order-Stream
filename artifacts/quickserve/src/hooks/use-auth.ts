import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function useAuth(requiredRole?: string, requiredSlug?: string) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    try {
      const session = localStorage.getItem("quickserve_session");
      if (session) {
        const data = JSON.parse(session);
        if (requiredRole && data.role !== requiredRole) {
          setIsAuthenticated(false);
        } else if (requiredSlug && data.eventSlug !== requiredSlug) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, [requiredRole, requiredSlug]);

  const login = (role: string, eventSlug?: string) => {
    localStorage.setItem("quickserve_session", JSON.stringify({ role, eventSlug }));
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("quickserve_session");
    setIsAuthenticated(false);
    setLocation("/");
  };

  return { isAuthenticated, loading, login, logout };
}