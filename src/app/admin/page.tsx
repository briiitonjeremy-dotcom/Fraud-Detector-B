"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchAdminUsers,
  fetchAdminTransactions,
  fetchAdminLogs,
  fetchAdminStats,
  addUserToBackend,
  deleteUserFromBackend,
  toggleUserStatusBackend,
  isAdmin,
  isLoggedIn,
  AdminUser,
  AdminTransaction,
  AdminLog,
  AdminStats,
} from "@/lib/api";

// ML API Base URL
const ML_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ml-file-for-url.onrender.com";

type TabType = "dashboard" | "users" | "transactions" | "logs" | "reports" | "settings";

interface ApiStatus {
  status: "online" | "offline";
  latency: number;
  lastChecked: Date;
}

export default function AdminPage() {
  const router = useRouter();
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ status: "offline", latency: 0, lastChecked: new Date() });
  const [authorized, setAuthorized] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState<string | null>(null);
  
  // User management state
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; target: any; message: string } | null>(null);
  
  // Transaction management state
  const [transactionsList, setTransactionsList] = useState<AdminTransaction[]>([]);
  const [fraudFilter, setFraudFilter] = useState<number>(50);
  
  // Logs state
  const [logsList, setLogsList] = useState<AdminLog[]>([]);
  
  // Dashboard stats
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    total_transactions: 0,
    total_logs: 0,
    flagged_transactions: 0,
  });

  // New user form
  const [newUserForm, setNewUserForm] = useState({ email: "", name: "", role: "viewer", password: "" });

  // Skip authorization check - allow all users
  // Check authorization on mount
  useEffect(() => {
    // Check if user is logged in and is admin
    const loggedIn = isLoggedIn();
    const admin = isAdmin();
    
    console.log("[Admin] Authorization check:", {
      loggedIn,
      admin,
      userRole: localStorage.getItem("userRole"),
      sessionToken: !!localStorage.getItem("session_token")
    });
    
    if (!loggedIn) {
      // Not logged in - redirect to admin login
      console.log("[Admin] Not logged in, redirecting to /admin/login");
      router.push("/admin/login?redirect=/admin");
      return;
    }
    
    if (!admin) {
      // Logged in but not admin - show access denied
      console.log("[Admin] User is not admin, showing access denied");
      setAccessDeniedReason("You do not have admin privileges. Only administrators can access this page.");
      setAuthorized(false);
      return;
    }
    
    // User is admin - allow access
    console.log("[Admin] User is admin, allowing access");
    setAuthorized(true);
  }, [router]);

  // Check API status
  const checkApiStatus = useCallback(async () => {
    const startTime = Date.now();
    try {
      const response = await fetch(`${ML_API_URL}/health`, { cache: "no-store" });
      const latency = Date.now() - startTime;
      setApiStatus({
        status: response.ok ? "online" : "offline",
        latency,
        lastChecked: new Date(),
      });
    } catch (error) {
      setApiStatus({
        status: "offline",
        latency: 0,
        lastChecked: new Date(),
      });
    }
  }, []);

  // Load all data
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [users, transactions, logs, statsData] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminTransactions(),
        fetchAdminLogs(),
        fetchAdminStats(),
      ]);
      
      setUsersList(users);
      setTransactionsList(transactions);
      setLogsList(logs);
      setStats(statsData);
    } catch (error) {
      console.error("[Admin] Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    checkApiStatus();
    loadAllData();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      checkApiStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [checkApiStatus, loadAllData]);

  // Don't render anything if not authorized
  if (!authorized) {
    return null;
  }

  // Add new user
  const handleAddUser = async () => {
    if (!newUserForm.email || !newUserForm.name || !newUserForm.password) {
      alert("Please fill in all required fields");
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await addUserToBackend(
        newUserForm.email,
        newUserForm.password,
        newUserForm.role
      );
      
      if (result.success) {
        alert("User created successfully!");
        setShowAddUserModal(false);
        setNewUserForm({ email: "", name: "", role: "viewer", password: "" });
        await loadAllData();
      } else {
        alert(result.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Failed to add user:", error);
      alert("Failed to create user. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: number) => {
    setIsLoading(true);
    try {
      const result = await deleteUserFromBackend(userId);
      
      if (result.success) {
        alert("User deleted successfully!");
        setConfirmAction(null);
        await loadAllData();
      } else {
        alert(result.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to delete user. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle user status
  const handleToggleUserStatus = async (userId: number, isActive: boolean) => {
    setIsLoading(true);
    try {
      const result = await toggleUserStatusBackend(userId, isActive);
      
      if (result.success) {
        setConfirmAction(null);
        await loadAllData();
      } else {
        alert(result.error || "Failed to update user status");
      }
    } catch (error) {
      console.error("Failed to toggle user status:", error);
      alert("Failed to update user status. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter transactions
  const filteredTransactions = transactionsList.filter(
    (t) => (t.fraud_score || 0) >= fraudFilter
  );

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Access Denied Message */}
      {accessDeniedReason && (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
          <div className="max-w-md w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🚫</span>
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h2>
            <p className="text-slate-300 mb-6">{accessDeniedReason}</p>
            <div className="flex gap-4 justify-center">
              <a
                href="/login?redirect=/admin"
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
              >
                Login as Admin
              </a>
              <a
                href="/"
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {!accessDeniedReason && (
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white">⚙️ Admin Dashboard</h1>
              
              {/* API Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/50">
                <div className={`w-2 h-2 rounded-full ${apiStatus.status === "online" ? "bg-green-400" : "bg-red-400"}`} />
                <span className="text-xs text-slate-300">
                  API: {apiStatus.status === "online" ? `${apiStatus.latency}ms` : "Offline"}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={loadAllData}
                disabled={isLoading}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {isLoading ? "⟳ Loading..." : "⟳ Refresh"}
              </button>
            </div>
          </div>
        </div>
      </header>
      )}

      {/* Navigation Tabs */}
      {!accessDeniedReason && (
      <nav className="bg-slate-800/30 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: "dashboard", label: "📊 Dashboard", icon: "📊" },
              { id: "users", label: "👥 Users", icon: "👥" },
              { id: "transactions", label: "💳 Transactions", icon: "💳" },
              { id: "logs", label: "📜 Logs", icon: "📜" },
              { id: "reports", label: "📈 Reports", icon: "📈" },
              { id: "settings", label: "⚙️ Settings", icon: "⚙️" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-cyan-400 border-b-2 border-cyan-400 bg-slate-700/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/20"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
      )}

      {/* Main Content */}
      {!accessDeniedReason && (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">System Overview</h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="text-3xl font-bold text-cyan-400">{stats.total_users}</div>
                <div className="text-slate-400 text-sm">Total Users</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="text-3xl font-bold text-blue-400">{stats.total_transactions}</div>
                <div className="text-slate-400 text-sm">Total Transactions</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="text-3xl font-bold text-orange-400">{stats.flagged_transactions}</div>
                <div className="text-slate-400 text-sm">Flagged Transactions</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="text-3xl font-bold text-purple-400">{stats.total_logs}</div>
                <div className="text-slate-400 text-sm">Total Logs</div>
              </div>
            </div>

            {/* API Status Card */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold mb-4">Backend API Status</h3>
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${apiStatus.status === "online" ? "bg-green-400" : "bg-red-400"}`} />
                <span className="text-lg">{apiStatus.status === "online" ? "Connected" : "Disconnected"}</span>
                {apiStatus.status === "online" && (
                  <span className="text-slate-400">• Latency: {apiStatus.latency}ms</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">User Management</h2>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
              >
                + Add User
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    usersList.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-700/20">
                        <td className="px-4 py-3 text-sm">{user.id}</td>
                        <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === "admin" ? "bg-purple-500/20 text-purple-400" :
                            user.role === "analyst" ? "bg-blue-500/20 text-blue-400" :
                            "bg-slate-600/50 text-slate-300"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                          }`}>
                            {user.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmAction({
                                type: user.is_active ? "deactivate" : "activate",
                                target: user,
                                message: `Are you sure you want to ${user.is_active ? "deactivate" : "activate"} ${user.name}?`
                              })}
                              className="px-2 py-1 text-xs bg-slate-600/50 hover:bg-slate-600 text-white rounded"
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => setConfirmAction({
                                type: "delete",
                                target: user,
                                message: `Are you sure you want to delete ${user.name}? This cannot be undone.`
                              })}
                              className="px-2 py-1 text-xs bg-red-600/50 hover:bg-red-600 text-white rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Transaction Management</h2>
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-400">Min Fraud Score:</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fraudFilter}
                  onChange={(e) => setFraudFilter(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm text-cyan-400">{fraudFilter}+</span>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Transaction ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Fraud Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Is Fraud</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Reviewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.slice(0, 100).map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-700/20">
                        <td className="px-4 py-3 text-sm">{txn.id}</td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-300">{txn.transaction_id}</td>
                        <td className="px-4 py-3 text-sm">${txn.amount?.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            (txn.fraud_score || 0) >= 70 ? "bg-red-500/20 text-red-400" :
                            (txn.fraud_score || 0) >= 50 ? "bg-orange-500/20 text-orange-400" :
                            "bg-green-500/20 text-green-400"
                          }`}>
                            {((txn.fraud_score || 0) * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            txn.is_fraud ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                          }`}>
                            {txn.is_fraud ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            txn.is_reviewed ? "bg-green-500/20 text-green-400" : "bg-slate-600/50 text-slate-400"
                          }`}>
                            {txn.is_reviewed ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Admin Logs</h2>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {logsList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    logsList.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-700/20">
                        <td className="px-4 py-3 text-sm">{log.id}</td>
                        <td className="px-4 py-3 text-sm font-medium text-cyan-400">{log.action}</td>
                        <td className="px-4 py-3 text-sm text-slate-300">{log.details}</td>
                        <td className="px-4 py-3 text-sm text-slate-400">{formatDate(log.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Reports & Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold mb-4">Fraud Detection Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Transactions</span>
                    <span className="font-medium">{stats.total_transactions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Flagged Transactions</span>
                    <span className="font-medium text-orange-400">{stats.flagged_transactions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Flag Rate</span>
                    <span className="font-medium">
                      {stats.total_transactions > 0 
                        ? ((stats.flagged_transactions / stats.total_transactions) * 100).toFixed(2)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold mb-4">User Activity</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Users</span>
                    <span className="font-medium">{stats.total_users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Admin Actions</span>
                    <span className="font-medium">{stats.total_logs}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Settings</h2>
            
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold mb-4">API Configuration</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">Backend URL</span>
                  <span className="font-mono text-sm text-cyan-400">{ML_API_URL}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">API Status</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    apiStatus.status === "online" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {apiStatus.status}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Last Checked</span>
                  <span className="text-sm">{formatDate(apiStatus.lastChecked.toISOString())}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                >
                  <option value="viewer">Viewer</option>
                  <option value="analyst">Analyst</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddUserModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Confirm Action</h3>
            <p className="text-slate-300 mb-6">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirmAction.type === "delete") {
                    await handleDeleteUser(confirmAction.target.id);
                  } else if (confirmAction.type === "activate" || confirmAction.type === "deactivate") {
                    await handleToggleUserStatus(confirmAction.target.id, confirmAction.type === "activate");
                  }
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
