import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";

/**
 * Custom hook untuk mendeteksi idle (tidak ada aktivitas) selama waktu tertentu.
 * Default: 15 menit (15 * 60 * 1000 ms).
 */
export const useSessionTimeout = (timeoutMs: number = 15 * 60 * 1000) => {
  const { logout, isAuthenticated } = useAuthStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (isAuthenticated) {
      timeoutRef.current = setTimeout(() => {
        console.log("Session timeout: User idle too long.");
        logout();
        window.location.href = "/login";
      }, timeoutMs);
    }
  };

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    
    const handleEvent = () => resetTimer();

    if (isAuthenticated) {
      // Mulai timer saat pertama kali hook dijalankan dan user auth
      resetTimer();

      events.forEach((event) => {
        window.addEventListener(event, handleEvent);
      });
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [isAuthenticated, logout, timeoutMs]);
};
