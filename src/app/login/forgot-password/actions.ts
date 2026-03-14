"use server";

import { requestPasswordResetOnBackend } from "@/lib/api";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { success: false, error: "Email is required" };
  }

  // Call Flask backend API to request password reset
  const result = await requestPasswordResetOnBackend(email);

  // Don't reveal whether email exists - always return success message
  if (!result.success) {
    return { success: true, message: "If the email exists, a reset code has been sent" };
  }

  return {
    success: true,
    message: "If the email exists, a reset code has been sent",
    email: email,
  };
}
