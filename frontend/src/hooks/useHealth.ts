import { useState, useEffect } from 'react';
import { Health } from '../types';

const API_BASE = "http://localhost:8000"; // FastAPI backend URL

export const useHealth = () => {
  const [health, setHealth] = useState<Health>("unknown");
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        setCheckingHealth(true);
        console.log("Checking health at:", `${API_BASE}/health`);
        const res = await fetch(`${API_BASE}/health`);
        console.log("Health response status:", res.status);
        const data = await res.json().catch(() => ({}));
        console.log("Health response data:", data);
        if (!mounted) return;
        const newHealth = res.ok && data?.status === "up" ? "up" : "down";
        console.log("Setting health to:", newHealth);
        setHealth(newHealth);
      } catch (error) {
        console.error("Health check error:", error);
        if (!mounted) return;
        setHealth("down");
      } finally {
        if (mounted) {
          setCheckingHealth(false);
        }
      }
    };
    check();
    const id = setInterval(check, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return { health, checkingHealth };
};