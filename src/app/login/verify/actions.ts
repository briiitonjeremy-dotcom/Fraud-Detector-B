"use server";

import { verifyOTPOnBackend, resendOTPOnBackend } from "@/lib/api";
import { cookies } from "next/headers";

export async function verifyOTP(formData: FormData) {
  const tempToken = formData.get("tempToken") as string;
  const otpCode = formData.get("otpCode") as string;

  if (!tempToken || !otpCode) {
    return { success: false, error: "Invalid request" };
  }

  // Call Flask backend API for OTP verification
  const result = await verifyOTPOnBackend(tempToken, otpCode);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Set auth cookie
  if (result.user) {
    const cookieStore = await cookies();
    cookieStore.set("auth_token", Buffer.from(JSON.stringify(result.user)).toString("base64"), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return {
      success: true,
      user: result.user,
    };
  }

  return { success: false, error: "Authentication failed" };
}

export async function resendOTPAction(formData: FormData) {
  const tempToken = formData.get("tempToken") as string;

  if (!tempToken) {
    return { success: false, error: "Invalid session" };
  }

  // Call Flask backend API to resend OTP
  const result = await resendOTPOnBackend(tempToken);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true };
}
