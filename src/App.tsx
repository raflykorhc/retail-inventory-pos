import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./app/layout";
import POSPage from "./app/page";
import InventoryPage from "./app/inventory/page";
import StockInPage from "./app/inventory/stock-in/page";
import CustomersPage from "./app/customers/page";
import ExpensesPage from "./app/expenses/page";
import DebtsPage from "./app/debts/page";
import DeliveryPage from "./app/delivery/page";
import DashboardPage from "./app/dashboard/page";
import ManagementPage from "./app/management/page";
import ReportsPage from "./app/reports/page";
import ReturnsPage from "./app/returns/page";
import ProjectsPage from "./app/projects/page";
import LoginPage from "./app/login/page";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useSessionTimeout } from "./hooks/useSessionTimeout";

export default function App() {
  // Aktifkan auto-logout jika idle 15 menit
  useSessionTimeout();

  return (
    <ThemeProvider>
      <Toaster 
        position="top-right" 
        richColors 
        closeButton 
        expand={true}
        theme="light" // Will be overridden by richColors/styling but good to have a base
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
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/debts" element={<DebtsPage />} />
                  <Route path="/delivery" element={<DeliveryPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/management" element={<ManagementPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/returns" element={<ReturnsPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
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
