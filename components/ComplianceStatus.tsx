"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import clsx from "clsx";
import {
  IconShield,
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconRefresh,
  IconArrowRight,
} from "@tabler/icons-react";
import { useRouter } from "next/router";

interface CompliancePolicy {
  id: string;
  name: string;
  acknowledgedAt: string | null;
  isOverdue: boolean;
  deadline: string | null;
}

interface ComplianceSummary {
  total: number;
  acknowledged: number;
  pending: number;
  overdue: number;
  complianceRate: number;
}

interface ComplianceStatusProps {
  workspaceId: number;
  className?: string;
  variant?: "compact" | "full";
}

const ComplianceStatus: React.FC<ComplianceStatusProps> = ({
  workspaceId,
  className,
  variant = "compact",
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [policies, setPolicies] = useState<CompliancePolicy[]>([]);

  useEffect(() => {
    if (!workspaceId || workspaceId === 0) return;
    fetchComplianceStatus();
  }, [workspaceId]);

  const fetchComplianceStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/workspace/${workspaceId}/compliance-status`);
      if (res.data.success) {
        setSummary(res.data.summary);
        setPolicies(res.data.policies || []);
      }
    } catch (err) {
      console.error("Failed to fetch compliance status:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className={clsx("bg-white dark:bg-zinc-800 rounded-lg p-4", className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
          <div className="h-8 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
      </div>
    );
  }

  const statusColor =
    summary.pending === 0
      ? "text-emerald-600 dark:text-emerald-400"
      : summary.overdue > 0
        ? "text-red-600 dark:text-red-400"
        : "text-amber-600 dark:text-amber-400";

  const statusIcon =
    summary.pending === 0 ? (
      <IconCheck className="w-5 h-5" />
    ) : summary.overdue > 0 ? (
      <IconAlertTriangle className="w-5 h-5" />
    ) : (
      <IconClock className="w-5 h-5" />
    );

  if (variant === "compact") {
    return (
      <div className={clsx("bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4", className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <IconShield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-white">Compliance</h3>
              <p className={clsx("text-sm", statusColor)}>
                {summary.pending === 0
                  ? "All policies signed"
                  : summary.overdue > 0
                    ? `${summary.overdue} overdue`
                    : `${summary.pending} pending`}
              </p>
            </div>
          </div>
          <button
            onClick={fetchComplianceStatus}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
            title="Refresh"
          >
            <IconRefresh className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {summary.pending > 0 && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex gap-2 items-start">
              <IconAlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  {summary.pending} policy
                  {summary.pending !== 1 ? "ies" : ""} need
                  {summary.pending !== 1 ? "" : "s"} your attention
                </p>
                {summary.overdue > 0 && (
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    {summary.overdue} overdue
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between text-sm mb-3">
          <span className="text-zinc-600 dark:text-zinc-400">
            {summary.acknowledged} / {summary.total} signed
          </span>
          <span className="font-semibold text-zinc-900 dark:text-white">
            {summary.complianceRate}%
          </span>
        </div>

        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
          <div
            className={clsx(
              "h-2 rounded-full transition-all",
              summary.complianceRate === 100
                ? "bg-emerald-500"
                : summary.overdue > 0
                  ? "bg-red-500"
                  : "bg-amber-500"
            )}
            style={{ width: `${summary.complianceRate}%` }}
          />
        </div>

        {summary.pending > 0 && (
          <button
            onClick={() => router.push(`/workspace/${workspaceId}/policies`)}
            className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            Review policies
            <IconArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={clsx("bg-white dark:bg-zinc-800 rounded-lg shadow-sm", className)}>
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <IconShield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
              Compliance Status
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {summary.complianceRate}% complete
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {summary.total}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">Total policies</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.acknowledged}
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Signed</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary.pending}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">Pending</p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {summary.overdue}
            </div>
            <p className="text-xs text-red-700 dark:text-red-300">Overdue</p>
          </div>
        </div>
      </div>

      {policies.length > 0 && (
        <div className="p-6">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Policy Status</h3>
          <div className="space-y-3">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-zinc-900 dark:text-white text-sm">
                    {policy.name}
                  </p>
                  {policy.acknowledgedAt && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Signed {new Date(policy.acknowledgedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {policy.acknowledgedAt ? (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <IconCheck className="w-4 h-4" />
                    </div>
                  ) : policy.isOverdue ? (
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <IconAlertTriangle className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <IconClock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceStatus;
