import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "./AuthProvider";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, checked } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (checked && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [checked, isAuthenticated, navigate]);

  if (!checked) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
