import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./app/layout";
import POSPage from "./app/page";
import InventoryPage from "./app/inventory/page";
import StockInPage from "./app/inventory/stock-in/page";
import DashboardPage from "./app/dashboard/page";
import ManagementPage from "./app/management/page";
import ReportsPage from "./app/reports/page";
import LoginPage from "./app/login/page";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useSessionTimeout } from "./hooks/useSessionTimeout";

export default function App() {
  useSessionTimeout();

  return (
    <ThemeProvider>
      <Toaster 
        position="top-right" 
        richColors 
        closeButton 
        expand={true}
        theme="light"
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "CASHIER"]}>
                        <POSPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/inventory/stock-in" element={<StockInPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/management" element={<ManagementPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ThemeProvider>
  );
}
