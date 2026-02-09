import { toaster } from "../components/ui/toasterInstance";

export type ToastType = "info" | "success" | "error" | "warning";

export function fireToast(type: ToastType, title: string, description: string) {
  return toaster.create({
    title: title || "Feature Not Implemented",
    description: description || "This feature is not yet implemented.",
    duration: 3000,
    type,
  });
}