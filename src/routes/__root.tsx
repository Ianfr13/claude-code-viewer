import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { LayoutPanelsProvider } from "../app/components/LayoutPanelsProvider";
import { RootErrorBoundary } from "../app/components/RootErrorBoundary";
import { AuthenticatedProviders } from "../components/AuthenticatedProviders";
import { AuthProvider } from "../components/AuthProvider";
import { ThemeProvider } from "../components/ThemeProvider";
import { Toaster } from "../components/ui/sonner";
import { LinguiClientProvider } from "../lib/i18n/LinguiProvider";

const AuthLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

export const Route = createRootRoute({
  component: () => (
    <RootErrorBoundary>
      <ThemeProvider>
        <Suspense fallback={<AuthLoadingFallback />}>
          <AuthProvider>
            <LinguiClientProvider>
              <AuthenticatedProviders>
                <LayoutPanelsProvider>
                  <Outlet />
                </LayoutPanelsProvider>
              </AuthenticatedProviders>
            </LinguiClientProvider>
          </AuthProvider>
        </Suspense>
      </ThemeProvider>
      <Toaster position="top-right" />
    </RootErrorBoundary>
  ),
});
