"use client"

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { useRecoilState } from "recoil";
import { loginState } from "@/state";
import {
  IconArrowLeft,
  IconMail,
  IconSend,
  IconShield,
  IconUsers,
  IconUser,
  IconInfoCircle,
} from "@tabler/icons-react";

interface Recipient {
  userId: number;
  username: string;
  email: string | null;
  emailVerified: boolean;
  workspaces: number[];
  isWorkspaceAdmin: boolean;
}

interface SendSummary {
  targetCount: number;
  deliverable: number;
  sent: number;
  failed: { userId: number; email: string; error: string }[];
}

const AdminMessages = () => {
  const router = useRouter();
  const [login] = useRecoilState(loginState);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"all" | "workspaceOwners" | "specific">("all");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<SendSummary | null>(null);
  const [skipped, setSkipped] = useState<{ missingEmail: number; invalidEmail: number } | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (login.username && !login.isOwner) {
      router.push("/");
    }
  }, [login.username, login.isOwner, router]);

  useEffect(() => {
    const fetchRecipients = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/admin/messages/recipients");
        setRecipients(res.data?.recipients || []);
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to load recipients";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipients();
  }, []);

  const counts = useMemo(() => {
    const allDeliverable = recipients.filter((r) => r.email).length;
    const ownerDeliverable = recipients.filter((r) => r.email && r.isWorkspaceAdmin).length;
    const selectedDeliverable = recipients.filter((r) => r.email && selectedUserIds.includes(r.userId)).length;
    return { allDeliverable, ownerDeliverable, selectedDeliverable };
  }, [recipients, selectedUserIds]);

  const filteredRecipients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return recipients;
    return recipients.filter((r) =>
      r.username.toLowerCase().includes(term) ||
      (r.email ? r.email.toLowerCase().includes(term) : false) ||
      String(r.userId).includes(term)
    );
  }, [recipients, search]);

  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSend = async () => {
    setError(null);
    setSummary(null);
    setSkipped(null);
    setSending(true);
    try {
      const payload: any = {
        subject,
        message,
        recipientScope: scope,
      };
      if (scope === "specific") {
        payload.userIds = selectedUserIds;
      }
      const res = await axios.post("/api/admin/messages/send", payload);
      setSummary(res.data?.summary || null);
      setSkipped(res.data?.skipped || null);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to send emails";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const sendDisabled =
    sending ||
    !subject.trim() ||
    !message.trim() ||
    (scope === "specific" && selectedUserIds.length === 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <IconArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3 mb-2">
            <IconMail className="w-10 h-10 text-blue-600" />
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Broadcast Emails</h1>
              <p className="text-slate-600 dark:text-slate-300">Send announcements to users, workspace owners, or specific members.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <IconInfoCircle className="w-4 h-4" />
            Configure SMTP via EMAIL_SMTP_* env vars to enable sending.
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <IconInfoCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 dark:text-red-200">{error}</span>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5 space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                />
                <div className="flex items-center gap-2">
                  <IconUsers className="w-4 h-4 text-blue-500" />
                  <span>All users ({counts.allDeliverable} deliverable)</span>
                </div>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={scope === "workspaceOwners"}
                  onChange={() => setScope("workspaceOwners")}
                />
                <div className="flex items-center gap-2">
                  <IconShield className="w-4 h-4 text-emerald-500" />
                  <span>Workspace owners ({counts.ownerDeliverable} deliverable)</span>
                </div>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={scope === "specific"}
                  onChange={() => setScope("specific")}
                />
                <div className="flex items-center gap-2">
                  <IconUser className="w-4 h-4 text-purple-500" />
                  <span>Specific users ({counts.selectedDeliverable} deliverable)</span>
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="Update for your workspace"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="Write your announcement..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {scope === "specific"
                  ? `${selectedUserIds.length} selected | ${counts.selectedDeliverable} with deliverable emails`
                  : scope === "workspaceOwners"
                    ? `${counts.ownerDeliverable} deliverable owner emails`
                    : `${counts.allDeliverable} deliverable emails`}
              </div>
              <button
                onClick={handleSend}
                disabled={sendDisabled}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-60"
              >
                <IconSend className="w-4 h-4" />
                {sending ? "Sending..." : "Send email"}
              </button>
            </div>

            {summary && (
              <div className="mt-2 text-sm text-slate-700 dark:text-slate-200 space-y-1">
                <div>Targets: {summary.targetCount}</div>
                <div>Deliverable: {summary.deliverable}</div>
                <div>Sent: {summary.sent}</div>
                {summary.failed.length > 0 && (
                  <div className="text-red-500">Failures: {summary.failed.length}</div>
                )}
                {skipped && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Skipped — missing email: {skipped.missingEmail}, invalid email: {skipped.invalidEmail}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2">
              <IconInfoCircle className="w-5 h-5 text-blue-500" />
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Delivery checks</div>
            </div>
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
              <li>Email is optional per user; those without an email are skipped.</li>
              <li>Configure SMTP via EMAIL_SMTP_HOST, EMAIL_SMTP_PORT, EMAIL_SMTP_USER, EMAIL_SMTP_PASS, and EMAIL_FROM.</li>
              <li>Custom ports and self-signed certs are supported via EMAIL_SMTP_SECURE and EMAIL_SMTP_ALLOW_SELF_SIGNED.</li>
            </ul>
          </div>
        </div>

        {scope === "specific" && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username, email, or ID"
                className="flex-1 min-w-64 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Selected: {selectedUserIds.length} ({counts.selectedDeliverable} deliverable)
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <div className="py-6 text-center text-slate-500">Loading recipients...</div>
              ) : filteredRecipients.length === 0 ? (
                <div className="py-6 text-center text-slate-500">No recipients found.</div>
              ) : (
                filteredRecipients.map((recipient) => (
                  <label
                    key={recipient.userId}
                    className="flex items-center gap-3 py-2 px-1 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(recipient.userId)}
                      onChange={() => toggleUser(recipient.userId)}
                      disabled={!recipient.email}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {recipient.username}
                        {recipient.isWorkspaceAdmin && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
                            Workspace owner
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">ID: {recipient.userId}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        {recipient.email ? recipient.email : "No email on file"}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessages;
