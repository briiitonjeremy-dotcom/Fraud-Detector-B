"use server";

import { resetPasswordOnBackend } from "@/lib/api";

export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const otpCode = formData.get("otpCode") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !otpCode || !newPassword || !confirmPassword) {
    return { success: false, error: "All fields are required" };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "Passwords do not match" };
  }

  // Basic password validation
  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  // Call Flask backend API to reset password
  const result = await resetPasswordOnBackend(email, otpCode, newPassword);

  if (!result.success) {
    return { success: false, error: result.error || "Failed to reset password" };
  }

  return { success: true, message: "Password reset successfully" };
}
