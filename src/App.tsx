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
                          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "CASHIER"]}>
                            <POSPage />
                          </ProtectedRoute>
                        </motion.div>
                      } 
                    />
                    {[
                      { path: "/inventory", element: <InventoryPage /> },
                      { path: "/dashboard", element: <DashboardPage /> },
                      { path: "/reports", element: <ReportsPage /> }
                    ].map((route) => (
                      <Route 
                        key={route.path}
                        path={route.path} 
                        element={
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="flex-1 flex flex-col min-h-0"
                          >
                            {route.element}
                          </motion.div>
                        } 
                      />
                    ))}
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
