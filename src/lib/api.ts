// Safe fetch helper for admin dashboard
// Uses Flask backend on Render instead of direct database access

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://ml-file-for-url.onrender.com";

// ============== AUTHENTICATION TYPES ==============

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  error?: string;
  requires_otp?: boolean;
  temp_token?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
    is_active?: boolean;
  };
}

export interface VerifyOTPRequest {
  temp_token: string;
  otp_code: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
    is_active?: boolean;
  };
}

export interface ResendOTPResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============== AUTHENTICATION FUNCTIONS ==============

// Login via Flask backend
// Calls: POST ${API_BASE_URL}/login
// Request: { "email": "...", "password": "..." }
// Success Response: { "message": "Login successful", "user": { "id": 1, "email": "...", "name": "...", "role": "admin" }, "session_token": "..." }
// Failure Response: { "error": "Invalid credentials" } or { "error": "User not found" }
export async function loginToBackend(
  email: string,
  password: string
): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = await response.json();

    // Check for successful login by message
    if (response.ok && data.message === "Login successful") {
      // Login succeeded - Flask backend returns user info and session token
      // Store user info and session in localStorage
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("userRole", data.user.role || "user");
        localStorage.setItem("isActive", String(data.user.is_active ?? true));
      }
      if (data.session_token) {
        localStorage.setItem("session_token", data.session_token);
      }
      
      return {
        success: true,
        message: data.message,
        user: data.user,
        // If backend returns requires_otp and temp_token, use them
        // Otherwise, assume direct login success
        requires_otp: data.requires_otp ?? false,
        temp_token: data.temp_token,
      };
    }

    // Login failed - return the error message from backend
    return {
      success: false,
      error: data.error || data.message || "Authentication failed",
    };
  } catch (error) {
    console.error("[API] Login error:", error);
    return {
      success: false,
      error: "Failed to connect to backend. Please try again.",
    };
  }
}

// Verify OTP via Flask backend
// Calls: POST ${API_BASE_URL}/login/verify
// Request: { "temp_token": "...", "otp_code": "..." }
export async function verifyOTPOnBackend(
  tempToken: string,
  otpCode: string
): Promise<VerifyOTPResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/login/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ temp_token: tempToken, otp_code: otpCode }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || "Verification failed",
      };
    }

    // Store auth data on successful verification
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("userRole", data.user.role || "user");
      localStorage.setItem("isActive", String(data.user.is_active ?? true));
    }
    if (data.session_token) {
      localStorage.setItem("session_token", data.session_token);
    }

    return {
      success: data.success ?? true,
      user: data.user,
      message: data.message,
    };
  } catch (error) {
    console.error("[API] Verify OTP error:", error);
    return {
      success: false,
      error: "Failed to connect to backend. Please try again.",
    };
  }
}

// Store is_active after successful OTP verification
function storeAuthData(user: { id: number; email: string; name: string; role: string; is_active?: boolean }, sessionToken?: string) {
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("userRole", user.role || "user");
    localStorage.setItem("isActive", String(user.is_active ?? true));
  }
  if (sessionToken) {
    localStorage.setItem("session_token", sessionToken);
  }
}

// Resend OTP via Flask backend
// Calls: POST ${API_BASE_URL}/login/resend
// Request: { "temp_token": "..." }
export async function resendOTPOnBackend(
  tempToken: string
): Promise<ResendOTPResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/login/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ temp_token: tempToken }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || "Failed to resend OTP",
      };
    }

    return {
      success: data.success ?? true,
      message: data.message,
    };
  } catch (error) {
    console.error("[API] Resend OTP error:", error);
    return {
      success: false,
      error: "Failed to connect to backend. Please try again.",
    };
  }
}

// ============== PASSWORD RESET TYPES ==============

export interface RequestPasswordResetResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============== PASSWORD RESET FUNCTIONS ==============

// Request password reset via Flask backend
// Calls: POST ${API_BASE_URL}/login/forgot-password
// Request: { "email": "..." }
export async function requestPasswordResetOnBackend(
  email: string
): Promise<RequestPasswordResetResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/login/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || "Failed to request password reset",
      };
    }

    return {
      success: data.success ?? true,
      message: data.message,
    };
  } catch (error) {
    console.error("[API] Request password reset error:", error);
    return {
      success: false,
      error: "Failed to connect to backend. Please try again.",
    };
  }
}

// Reset password via Flask backend
// Calls: POST ${API_BASE_URL}/login/reset-password
// Request: { "email": "...", "otp_code": "...", "new_password": "..." }
export async function resetPasswordOnBackend(
  email: string,
  otpCode: string,
  newPassword: string
): Promise<ResetPasswordResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/login/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp_code: otpCode, new_password: newPassword }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || "Failed to reset password",
      };
    }

    return {
      success: data.success ?? true,
      message: data.message,
    };
  } catch (error) {
    console.error("[API] Reset password error:", error);
    return {
      success: false,
      error: "Failed to connect to backend. Please try again.",
    };
  }
}

// ============== ADMIN TYPES ==============

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active?: boolean;
  created_at?: string;
}

export interface AdminTransaction {
  id: number;
  transaction_id: string;
  amount: number;
  fraud_score: number;
  is_fraud: boolean;
  is_reviewed?: boolean;
  is_escalated?: boolean;
  created_at?: string;
}

export interface AdminLog {
  id: number;
  action: string;
  details: string;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_transactions: number;
  total_logs: number;
  flagged_transactions: number;
}

// Safe fetch helper - returns null on error instead of throwing
export async function safeFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const sessionToken = localStorage.getItem("session_token");
    const response = await fetch(url, {
      ...options,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { "Authorization": `Bearer ${sessionToken}` } : {}),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      console.error(`[API Error] ${response.status}: ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[API Error] Response: ${errorText}`);
      return null;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`[API Fetch Error]`, error);
    return null;
  }
}

// Fetch users from backend
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const data = await safeFetch<{ users: AdminUser[] }>(
    `${API_BASE_URL}/admin/users`
  );
  return data?.users || [];
}

// Fetch transactions from backend
export async function fetchAdminTransactions(): Promise<AdminTransaction[]> {
  const data = await safeFetch<{ transactions: AdminTransaction[] }>(
    `${API_BASE_URL}/admin/transactions`
  );
  return data?.transactions || [];
}

// Fetch admin logs from backend
export async function fetchAdminLogs(): Promise<AdminLog[]> {
  const data = await safeFetch<{ logs: AdminLog[] }>(
    `${API_BASE_URL}/admin/logs`
  );
  return data?.logs || [];
}

// Fetch admin stats from backend
export async function fetchAdminStats(): Promise<AdminStats> {
  const data = await safeFetch<{ stats: AdminStats }>(
    `${API_BASE_URL}/admin/stats`
  );
  return data?.stats || {
    total_users: 0,
    total_transactions: 0,
    total_logs: 0,
    flagged_transactions: 0,
  };
}

// Add new user via backend (requires admin)
export async function addUserToBackend(
  email: string,
  password: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionToken = localStorage.getItem("session_token");
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { "Authorization": `Bearer ${sessionToken}` } : {}),
      },
      body: JSON.stringify({
        email,
        password,
        role,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText || `Failed to create user (${response.status})`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[API] Error adding user:", error);
    return {
      success: false,
      error: "Failed to connect to backend",
    };
  }
}

// Delete user via backend (requires admin)
export async function deleteUserFromBackend(
  userId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionToken = localStorage.getItem("session_token");
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        ...(sessionToken ? { "Authorization": `Bearer ${sessionToken}` } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to delete user (${response.status})`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[API] Error deleting user:", error);
    return {
      success: false,
      error: "Failed to connect to backend",
    };
  }
}

// Toggle user status via backend (requires admin)
export async function toggleUserStatusBackend(
  userId: number,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionToken = localStorage.getItem("session_token");
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { "Authorization": `Bearer ${sessionToken}` } : {}),
      },
      body: JSON.stringify({ is_active: isActive }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to update user status (${response.status})`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[API] Error toggling user status:", error);
    return {
      success: false,
      error: "Failed to connect to backend",
    };
  }
}

// ============== AUTH HELPERS ==============

/**
 * Get the current user's role from localStorage
 */
export function getUserRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("userRole");
}

/**
 * Get the current user info from localStorage
 */
export function getUser(): { id: number; email: string; name: string; role: string } | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Check if current user is an admin
 */
export function isAdmin(): boolean {
  const role = getUserRole();
  return role === "admin";
}

/**
 * Check if current user is active
 */
export function isUserActive(): boolean {
  if (typeof window === "undefined") return false;
  const isActive = localStorage.getItem("isActive");
  return isActive !== "false";
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("session_token");
}

/**
 * Logout - clear session
 */
export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("session_token");
  localStorage.removeItem("user");
  localStorage.removeItem("userRole");
  localStorage.removeItem("isActive");
}

/**
 * Require admin - returns true if user is admin, false otherwise
 * Used for protecting routes on frontend
 */
export function requireAdmin(): boolean {
  return isAdmin();
}
