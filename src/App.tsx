import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "@/components/ui/toast";
import Layout from "./app/layout";
import POSPage from "./app/page";
import InventoryPage from "./app/inventory/page";
import DashboardPage from "./app/dashboard/page";
import ReportsPage from "./app/reports/page";
import LoginPage from "./app/login/page";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useSessionTimeout } from "./hooks/useSessionTimeout";

export default function App() {
  useSessionTimeout();
  const location = useLocation();

  return (
    <ThemeProvider>
      <Toaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                    {/* POS: Kasir & Pemilik Usaha */}
                    <Route 
                      path="/" 
                      element={
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="flex-1 flex flex-col min-h-0"
                        >
                          <ProtectedRoute allowedRoles={["OWNER", "ADMIN", "MANAGER", "CASHIER"]}>
                            <POSPage />
                          </ProtectedRoute>
                        </motion.div>
                      } 
                    />
                    
                    {/* Dashboard: Khusus Pemilik Usaha */}
                    <Route 
                      path="/dashboard" 
                      element={
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="flex-1 flex flex-col min-h-0"
                        >
                          <ProtectedRoute allowedRoles={["OWNER", "ADMIN", "MANAGER"]}>
                            <DashboardPage />
                          </ProtectedRoute>
                        </motion.div>
                      } 
                    />

                    {/* Inventory: Pemilik Usaha & Kasir (tampilan terbatas pada Kasir) */}
                    <Route 
                      path="/inventory" 
                      element={
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="flex-1 flex flex-col min-h-0"
                        >
                          <ProtectedRoute allowedRoles={["OWNER", "ADMIN", "MANAGER", "CASHIER"]}>
                            <InventoryPage />
                          </ProtectedRoute>
                        </motion.div>
                      } 
                    />

                    {/* Laporan: Pemilik Usaha & Kasir (tampilan terbatas pada Kasir) */}
                    <Route 
                      path="/reports" 
                      element={
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="flex-1 flex flex-col min-h-0"
                        >
                          <ProtectedRoute allowedRoles={["OWNER", "ADMIN", "MANAGER", "CASHIER"]}>
                            <ReportsPage />
                          </ProtectedRoute>
                        </motion.div>
                      } 
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AnimatePresence>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ThemeProvider>
  );
}
