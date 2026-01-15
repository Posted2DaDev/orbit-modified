import React, { useEffect, useState } from "react";
import {
  IconClipboard,
  IconPencil,
  IconUser,
  IconId,
  IconHash,
  IconCheck,
  IconX,
  IconCalendar,
  IconMail,
} from "@tabler/icons-react";
import axios from "axios";
import { useRouter } from "next/router";
import Confetti from "react-confetti";

type InformationPanelProps = {
  user: {
    userid: string;
    username: string;
    displayname: string;
    rank?: string | number;
    registered: boolean;
    birthdayDay?: number | null;
    birthdayMonth?: number | null;
    joinDate?: string | null;
  };
  isUser?: boolean;
  isAdmin?: boolean;
};

const monthNames = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function InformationPanel({ user, isUser, isAdmin }: InformationPanelProps) {
  const [editing, setEditing] = useState(false);
  const [month, setMonth] = useState<string>(user.birthdayMonth ? String(user.birthdayMonth) : "");
  const [day, setDay] = useState<string>(user.birthdayDay ? String(user.birthdayDay) : "");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailInput, setEmailInput] = useState<string>("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const router = useRouter();

  let workspaceId: string | null = null;
  if (router?.query?.id) {
    workspaceId = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
  } else if (typeof window !== "undefined") {
    const match = window.location.pathname.match(/\/workspace\/([^/]+)/);
    if (match) workspaceId = match[1];
  }

  const canEdit = !!(isUser || isAdmin);

  useEffect(() => {
    if (!workspaceId || !user?.userid) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios
          .get(`/api/workspace/${workspaceId}/birthday/${user.userid}`)
          .catch(() => axios.get(`/api/workspace/${workspaceId}/birthday`));
        if (cancelled) return;
        const { birthdayDay, birthdayMonth } = res.data || {};
        if (birthdayDay != null && birthdayMonth != null) {
          setDay(birthdayDay > 0 ? String(birthdayDay) : "");
          setMonth(birthdayMonth > 0 ? String(birthdayMonth) : "");
          user.birthdayDay = birthdayDay;
          user.birthdayMonth = birthdayMonth;
        }
      } finally {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, user?.userid]);

  useEffect(() => {
    if (!workspaceId || !user?.userid) return;
    let cancelled = false;
    setEmailLoading(true);
    const endpoints = [
      `/api/workspace/${workspaceId}/email/${user.userid}`,
      `/api/workspace/${workspaceId}/email`,
    ];

    (async () => {
      for (const endpoint of (isUser ? endpoints.slice(1) : endpoints)) {
        try {
          const res = await axios.get(endpoint);
          if (cancelled) return;
          setEmail(res.data?.email ?? "");
          setEmailVerified(Boolean(res.data?.emailVerified));
          return;
        } catch (err) {
          // Try next endpoint
        }
      }
      if (!cancelled) {
        setEmail("");
        setEmailVerified(false);
      }
    })().finally(() => {
      if (!cancelled) setEmailLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, user?.userid, isUser]);

  const daysInMonth = (m: number) => {
    if (m === 2) return 28;
    if ([4, 6, 9, 11].includes(m)) return 30;
    return 31;
  };

  const days = month && Number(month) > 0 ? Array.from({ length: daysInMonth(Number(month)) }, (_, i) => i + 1) : [];

  const handleSave = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const isSelf = isUser || (user.userid && router.query?.userId === user.userid);
      if (isSelf) {
        await axios.post(`/api/workspace/${workspaceId}/birthday`, { day: Number(day), month: Number(month) });
      } else {
        await axios.put(`/api/workspace/${workspaceId}/birthday/${user.userid}`, { day: Number(day), month: Number(month) });
      }
      user.birthdayDay = Number(day);
      user.birthdayMonth = Number(month);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSave = async () => {
    if (!workspaceId) return;
    setEmailError(null);
    setEmailSaving(true);
    try {
      const payload = { email: emailInput.trim() ? emailInput.trim() : null };
      const res = isUser
        ? await axios.post(`/api/workspace/${workspaceId}/email`, payload)
        : await axios.put(`/api/workspace/${workspaceId}/email/${user.userid}`, payload);
      setEmail(res.data?.email ?? "");
      setEmailVerified(Boolean(res.data?.emailVerified));
      setEmailEditing(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to update email";
      setEmailError(msg);
    } finally {
      setEmailSaving(false);
    }
  };

  let birthday = "Not set";
  if (day && month) {
    const dNum = Number(day);
    const mNum = Number(month);
    if (dNum > 0 && mNum > 0) birthday = `${monthNames[mNum]} ${dNum}`;
  }

  const today = new Date();
  const isBirthday = user.birthdayDay === today.getDate() && user.birthdayMonth === today.getMonth() + 1;

  return (
    <>
      {isBirthday && <Confetti />}
      <div className="rounded-xl overflow-hidden">
        <div className="bg-[rgb(250,250,250)] dark:bg-zinc-900 p-6 rounded-t-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-[#ff0099]/10 rounded-lg p-3">
              <IconUser className="w-6 h-6 text-[#ff0099]" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Information</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Overview and member-specific details</p>
            </div>
          </div>
        </div>

        <div className="bg-[rgb(250,250,250)] dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/40 p-6 rounded-b-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <InfoRow icon={<IconUser className="w-5 h-5 text-[#ff0099]" />} label="Username" value={user.username} />
              <InfoRow icon={<IconId className="w-5 h-5 text-[#ff0099]" />} label="Display Name" value={user.displayname} />
              <InfoRow icon={<IconHash className="w-5 h-5 text-[#ff0099]" />} label="UserId" value={user.userid} />
              {user.joinDate && (
                <InfoRow
                  icon={<IconClipboard className="w-5 h-5 text-[#ff0099]" />}
                  label="Joined"
                  value={new Date(user.joinDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {user.registered ? <IconCheck className="w-5 h-5 text-[#ff0099]" /> : <IconX className="w-5 h-5 text-[#ff0099]" />}
                <div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">Status</div>
                  <div className="text-sm font-medium text-zinc-500 dark:text-zinc-100">{user.registered ? "Registered" : "Unregistered"}</div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <IconMail className="w-5 h-5 text-[#ff0099]" />
                  <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Email (optional)</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-medium text-zinc-500 dark:text-zinc-100">
                        {emailLoading ? "Loading..." : email || "Not set"}
                      </div>
                      {email && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
                          {emailVerified ? "Verified" : "Unverified"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {canEdit && !emailEditing && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setEmailEditing(true);
                        setEmailInput(email || "");
                        setEmailError(null);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#ff0099] text-white text-sm"
                      aria-label="Edit email"
                    >
                      <IconPencil className="w-4 h-4" />
                      <span>{email ? "Update" : "Add"} email</span>
                    </button>
                  </div>
                )}

                {emailEditing && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="sr-only">Email</label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="name@example.com"
                      className="border rounded px-2 py-1 w-64 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-gray-300 dark:border-zinc-600"
                    />

                    <button
                      onClick={handleEmailSave}
                      disabled={emailSaving}
                      className="ml-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#ff0099] text-white text-sm disabled:opacity-60"
                    >
                      {emailSaving ? "Saving..." : "Save"}
                    </button>

                    <button
                      onClick={() => {
                        setEmailEditing(false);
                        setEmailInput(email || "");
                        setEmailError(null);
                      }}
                      className="ml-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm text-zinc-900 dark:text-zinc-100 border-gray-300 dark:border-zinc-600"
                    >
                      Cancel
                    </button>

                    {emailError && <div className="text-xs text-red-500">{emailError}</div>}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <IconCalendar className="w-5 h-5 text-[#ff0099]" />
                  <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Birthday</div>
                    <div className="text-sm font-medium text-zinc-500 dark:text-zinc-100">{birthday}</div>
                  </div>
                </div>

                {canEdit && !editing && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setEditing(true);
                        setMonth(user.birthdayMonth ? String(user.birthdayMonth) : "");
                        setDay(user.birthdayDay ? String(user.birthdayDay) : "");
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#ff0099] text-white text-sm"
                      aria-label="Edit birthday"
                    >
                      <IconPencil className="w-4 h-4" />
                      <span>Edit Birthday</span>
                    </button>
                  </div>
                )}

                {editing && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="sr-only">Month</label>
                    <select
                      value={month}
                      onChange={(e) => {
                        setMonth(e.target.value);
                        setDay("");
                      }}
                      className="border rounded px-2 py-1 w-36 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-gray-300 dark:border-zinc-600"
                      aria-label="Select month"
                    >
                      <option value="">Month</option>
                      {monthNames.slice(1).map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </select>

                    <label className="sr-only">Day</label>
                    <select
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      className="border rounded px-2 py-1 w-20 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-gray-300 dark:border-zinc-600"
                      disabled={!month}
                      aria-label="Select day"
                    >
                      <option value="">Day</option>
                      {days.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>

                    {workspaceId && (
                      <button
                        onClick={handleSave}
                        disabled={loading || !day || !month}
                        className="ml-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#ff0099] text-white text-sm"
                      >
                        {loading ? "Saving..." : "Save"}
                      </button>
                    )}

                    <button onClick={() => setEditing(false)} className="ml-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm text-zinc-900 dark:text-zinc-100 border-gray-300 dark:border-zinc-600">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div>{icon}</div>
      <div>
        <div className="text-xs text-zinc-400">{label}</div>
        <div className="text-sm font-medium text-zinc-500 dark:text-zinc-100">{value}</div>
      </div>
    </div>
  );
}

export default InformationPanel;