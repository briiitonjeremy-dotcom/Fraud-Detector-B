"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Search, ExternalLink } from "lucide-react";

interface Transaction {
  id: string;
  transaction_id?: string;
  nameorig?: string;
  nameDest?: string;
  vendor?: string;
  vendor_name?: string;
  amount: number;
  fraud_score?: number | null;
  is_fraud?: boolean;
  pattern?: string;
  timestamp?: string;
  time?: string;
}

interface SuspiciousTransactionsTableProps {
  transactions: Transaction[];
  onInvestigate?: (txn: Transaction) => void;
}

type SortKey = "amount" | "fraud_score" | "timestamp";
type SortOrder = "asc" | "desc";

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  return active ? (order === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-30" />;
}

export default function SuspiciousTransactionsTable({ transactions, onInvestigate }: SuspiciousTransactionsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("fraud_score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredTransactions = transactions.filter(txn => {
    const searchLower = searchTerm.toLowerCase();
    const id = txn.transaction_id || txn.nameorig || txn.id || "";
    const vendor = txn.vendor || txn.nameorig || txn.vendor_name || "";
    return id.toLowerCase().includes(searchLower) || vendor.toLowerCase().includes(searchLower);
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    if (sortKey === "amount") {
      aVal = a.amount || 0;
      bVal = b.amount || 0;
    } else if (sortKey === "fraud_score") {
      aVal = a.fraud_score || (a.is_fraud ? 95 : 0);
      bVal = b.fraud_score || (b.is_fraud ? 95 : 0);
    } else {
      aVal = a.timestamp || a.time || "";
      bVal = b.timestamp || b.time || "";
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const paginatedTransactions = sortedTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const getRiskColor = (score: number | null | undefined) => {
    const s = score || 0;
    if (s >= 70) return "text-red-400";
    if (s >= 40) return "text-amber-400";
    return "text-emerald-400";
  };

  const getRiskBg = (score: number | null | undefined) => {
    const s = score || 0;
    if (s >= 70) return "bg-red-500";
    if (s >= 40) return "bg-amber-500";
    return "bg-emerald-500";
  };

  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-white">Suspicious Transactions</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">
            {transactions.length} Found
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800/50 bg-slate-800/30">
              <th className="text-left p-4">
                <button 
                  onClick={() => handleSort("timestamp")}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white"
                >
                  Time <SortIcon active={sortKey === "timestamp"} order={sortOrder} />
                </button>
              </th>
              <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Transaction ID</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">From</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">To</th>
              <th className="text-left p-4">
                <button 
                  onClick={() => handleSort("amount")}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white"
                >
                  Amount <SortIcon active={sortKey === "amount"} order={sortOrder} />
                </button>
              </th>
              <th className="text-left p-4">
                <button 
                  onClick={() => handleSort("fraud_score")}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white"
                >
                  Risk Score <SortIcon active={sortKey === "fraud_score"} order={sortOrder} />
                </button>
              </th>
              <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="text-left p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((txn, i) => {
              const score = txn.fraud_score !== null && txn.fraud_score !== undefined 
                ? txn.fraud_score 
                : (txn.is_fraud ? 95 : 0);
              const isHighRisk = score >= 70 || txn.is_fraud;

              return (
                <tr key={i} className="border-b border-slate-800/30 hover:bg-slate-800/20">
                  <td className="p-4 text-sm text-slate-400">
                    {txn.timestamp || txn.time || "—"}
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-white">
                      {txn.transaction_id || txn.nameorig || txn.id || "N/A"}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-300">
                    {txn.nameorig || txn.vendor || txn.vendor_name || "Unknown"}
                  </td>
                  <td className="p-4 text-sm text-slate-300">
                    {txn.nameDest || "Unknown"}
                  </td>
                  <td className="p-4 text-sm font-semibold text-white">
                    ${(txn.amount || 0).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${getRiskBg(score)}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${getRiskColor(score)}`}>
                        {Math.round(score)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    {isHighRisk ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                        <AlertTriangle className="w-3 h-3" /> Fraud
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                        Safe
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => onInvestigate?.(txn)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors"
                    >
                      Investigate <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-slate-800/50">
          <p className="text-xs text-slate-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedTransactions.length)} of {sortedTransactions.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
