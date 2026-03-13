"use client";

import { useContext } from "react";
import { ToastContext } from "@/components/providers/ToastProvider";

/**
 * Hook to show toast notifications.
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast("Link copied!", "success");
 *   toast("Upload failed", "error");
 */
export function useToast() {
  return useContext(ToastContext);
}
