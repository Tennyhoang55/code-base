"use client";
import { useEffect } from "react";
import { keepSessionAlive } from "@/features/quiz/actions";
import { logout } from "../actions";
export function SessionActivity({
  participant = false,
}: {
  participant?: boolean;
}) {
  useEffect(() => {
    let lastActivity = Date.now();
    let lastPing = lastActivity;
    const activity = () => {
      lastActivity = Date.now();
      if (lastActivity - lastPing >= 60000) {
        lastPing = lastActivity;
        void keepSessionAlive().catch(() => {});
      }
    };
    const timer = setInterval(() => {
      if (!participant && Date.now() - lastActivity >= 8 * 3600000)
        void logout();
    }, 30000);
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
    };
  }, [participant]);
  return null;
}
