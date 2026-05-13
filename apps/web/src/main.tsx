import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Layout } from "./components/layout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { SubmitPage } from "./pages/SubmitPage";
import { MyPage } from "./pages/MyPage";
import { MandatesListPage } from "./pages/MandatesListPage";
import { MandateDetailPage } from "./pages/MandateDetailPage";
import { TrackingPage } from "./pages/TrackingPage";
import { InstitutionPage } from "./pages/InstitutionPage";
import "./index.css";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { citizen, loading } = useAuth();
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!citizen) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route
              path="submit"
              element={
                <RequireAuth>
                  <SubmitPage />
                </RequireAuth>
              }
            />
            <Route
              path="me"
              element={
                <RequireAuth>
                  <MyPage />
                </RequireAuth>
              }
            />
            <Route path="mandates" element={<MandatesListPage />} />
            <Route path="mandates/:id" element={<MandateDetailPage />} />
            <Route path="tracking" element={<TrackingPage />} />
            <Route path="tracking/:code" element={<TrackingPage />} />
            <Route path="institution" element={<InstitutionPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
