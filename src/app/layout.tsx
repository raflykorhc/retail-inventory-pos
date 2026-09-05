import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId, setSessionId } = useCartStore();
  const { fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Session Persistence logic
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionInUrl = params.get("session");
    
    // 1. If we have it in URL but not in store, sync to store
    if (sessionInUrl && sessionInUrl !== sessionId) {
      setSessionId(sessionInUrl);
      localStorage.setItem("pos_session_id", sessionInUrl);
    } 
    // 2. If we have it in store (or localStorage) but NOT in URL, sync to URL
    else if (!sessionInUrl) {
      const storedSessionId = sessionId || localStorage.getItem("pos_session_id");
      if (storedSessionId) {
        if (!sessionId) setSessionId(storedSessionId);
        
        // Append to URL without adding to history (replace: true)
        params.set("session", storedSessionId);
        navigate({
          pathname: location.pathname,
          search: params.toString()
        }, { replace: true, state: location.state });
      }
    }
  }, [location.pathname, sessionId, navigate]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="transition-colors duration-300 bg-neutral-50/50 dark:bg-neutral-900/50 text-foreground">
        <SiteHeader />
        {/* Page Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative mobile-bottom-space">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
