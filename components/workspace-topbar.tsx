import { Fragment, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { useRecoilState } from "recoil";
import { Dialog, Menu, Transition } from "@headlessui/react";
import axios from "axios";
import { loginState, workspacestate } from "@/state";
import { themeState } from "@/state/theme";
import { useRouter } from "next/router";
import {
  IconSearch,
  IconSparkles,
  IconPlayerPlay,
  IconHome,
  IconClipboardList,
  IconFileText,
  IconShield,
  IconSettings,
  IconUsers,
  IconChevronDown,
} from "@tabler/icons-react";
import clsx from "clsx";
// Theme is handled via recoil and localStorage; no component import needed

type QuickLink = {
  id: string;
  title: string;
  description: string;
  href?: string;
  icon: ElementType;
  tag?: string;
  onSelect?: () => void;
};

interface WorkspaceTopbarProps {
  onStartTour?: () => void;
  showTourPill?: boolean;
  tourSeen?: boolean;
}

const WorkspaceTopbar = ({ onStartTour, showTourPill, tourSeen }: WorkspaceTopbarProps) => {
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [login, setLogin] = useRecoilState(loginState);
  const [theme, setTheme] = useRecoilState(themeState);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<any[]>([]);
  const [results, setResults] = useState<{ users: any[]; sessions: any[]; policies: any[]; documents: any[] } | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Fetch workspaces on mount if not already loaded
  useEffect(() => {
    const loadWorkspaces = async () => {
      if (!login.workspaces || login.workspaces.length === 0) {
        try {
          const res = await axios.get("/api/@me");
          if (res.data) {
            setLogin({
              ...login,
              workspaces: res.data.workspaces || [],
            });
          }
        } catch (err) {
          console.error("Failed to load workspaces:", err);
        }
      }
    };
    loadWorkspaces();
  }, []);

  const base = useMemo(() => (workspace?.groupId ? `/workspace/${workspace.groupId}` : "/workspace"), [workspace?.groupId]);

  const quickLinks: QuickLink[] = useMemo(() => [
    { id: "home", title: "Home", description: "Dashboard and widgets", href: base, icon: IconHome },
    { id: "activity", title: "Activity", description: "Logs and leaderboards", href: `${base}/activity`, icon: IconClipboardList },
    { id: "docs", title: "Docs & Guides", description: "Workspace knowledge base", href: `${base}/docs`, icon: IconFileText },
    { id: "policies", title: "Policies", description: "Acknowledgements and updates", href: `${base}/policies`, icon: IconShield, tag: "Beta" },
    { id: "sessions", title: "Sessions", description: "Upcoming staff sessions", href: `${base}/sessions`, icon: IconUsers },
    { id: "settings", title: "Settings", description: "Workspace controls and access", href: `${base}/settings`, icon: IconSettings },
    { id: "tour", title: "Start guided tour", description: "See what is new in under a minute", icon: IconSparkles, onSelect: onStartTour },
  ], [base, onStartTour]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return quickLinks.slice(0, 5);
    return quickLinks.filter((item) =>
      item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }, [query, quickLinks]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    globalThis.addEventListener?.("keydown", onKeyDown as any);
    return () => globalThis.removeEventListener?.("keydown", onKeyDown as any);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (item: QuickLink) => {
    if (item.onSelect) item.onSelect();
    else if (item.href) router.push(item.href);
    setIsOpen(false);
    setQuery("");
  };

  // Fetch search results against unified API (members, sessions, policies)
  useEffect(() => {
    let timer: any;
    const wsId = workspace?.groupId;
    if (!wsId) return;
    const q = query.trim();
    const doFetch = async () => {
      setLoadingResults(true);
      try {
        const url = q
          ? `/api/workspace/${wsId}/search?q=${encodeURIComponent(q)}`
          : `/api/workspace/${wsId}/search?bootstrap=1`;
        const res = await axios.get(url);
        setResults(res.data?.results || { users: [], sessions: [], policies: [], documents: [] });
      } catch (e) {
        console.error("search fetch failed", e);
        setResults({ users: [], sessions: [], policies: [], documents: [] });
      } finally {
        setLoadingResults(false);
      }
    };
    // Debounce to avoid spamming
    timer = setTimeout(doFetch, q ? 180 : 0);
    return () => clearTimeout(timer);
  }, [query, workspace?.groupId]);

  const handleWorkspaceSelect = (ws: { groupId: number; groupName: string; groupThumbnail: string }) => {
    setWorkspace({
      ...workspace,
      groupId: ws.groupId,
      groupName: ws.groupName,
      groupThumbnail: ws.groupThumbnail,
    });
    router.push(`/workspace/${ws.groupId}`);
    setSwitcherOpen(false);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (globalThis.window) localStorage.setItem("theme", next);
  };

  const logout = async () => {
    await axios.post("/api/auth/logout");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-700">
      <div className="px-4 sm:px-6 lg:px-8 h-16 grid grid-cols-[auto,1fr,auto] items-center gap-4">
        <button
          onClick={() => setSwitcherOpen(true)}
          className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
          data-tour-id="workspace-brand"
        >
          <img
            src={workspace?.groupThumbnail || "/favicon-32x32.png"}
            alt={workspace?.groupName}
            className="h-10 w-10 rounded-lg object-cover bg-zinc-200 dark:bg-zinc-700"
          />
          <div className="hidden sm:block text-left">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Switch workspace</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1">
              {workspace?.groupName || "Workspace"}
              <IconChevronDown className="w-4 h-4" />
            </p>
          </div>
        </button>

        <div className="w-full max-w-xl justify-self-center" ref={searchRef} data-tour-id="workspace-search">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder="Search members, sessions, policies... (Ctrl + K)"
              className="w-full h-11 pl-9 pr-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:ring-2 focus:ring-[color:rgb(var(--group-theme))] focus:outline-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1 hidden sm:block">
              Ctrl + K
            </div>

            {isOpen && (
              <div className="absolute mt-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                  {/* Quick links section */}
                  <div className="py-2">
                    {filtered.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item)}
                          className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        >
                          <div className="w-9 h-9 rounded-lg bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))] grid place-content-center">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{item.title}</p>
                              {item.tag && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                  {item.tag}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.description}</p>
                          </div>
                          <IconPlayerPlay className="w-4 h-4 text-zinc-400" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Search results section */}
                  <div className="py-2">
                    {loadingResults && (
                      <div className="px-4 py-2 text-xs text-zinc-500">Searching…</div>
                    )}
                    {!loadingResults && results && (
                      <>
                        {/* Members */}
                        {results.users?.length > 0 && (
                          <div className="px-4 pb-2 text-[11px] uppercase tracking-wide text-zinc-500">Members</div>
                        )}
                        {results.users?.map((u) => {
                          const canViewProfile = Array.isArray((workspace as any)?.yourPermission) && (workspace as any).yourPermission.includes("manage_activity");
                          const target = canViewProfile ? `${base}/profile/${u.id}` : `${base}/views`;
                          return (
                          <button
                            key={u.id}
                            onClick={() => {
                              router.push(target);
                              setIsOpen(false);
                              setQuery("");
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            <div className="w-9 h-9 rounded-lg bg-[color:rgb(var(--group-theme)/0.1)] grid place-content-center overflow-hidden">
                              {u.picture ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={u.picture} alt="" className="w-9 h-9 object-cover" />
                              ) : (
                                <span className="w-6 h-6 rounded bg-zinc-300" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{u.username}</p>
                              <p className="text-xs text-zinc-500">{canViewProfile ? 'Profile' : 'Members'}</p>
                            </div>
                            <IconPlayerPlay className="w-4 h-4 text-zinc-400" />
                          </button>
                        )})}

                        {/* Sessions */}
                        {results.sessions?.length > 0 && (
                          <div className="px-4 pt-2 pb-2 text-[11px] uppercase tracking-wide text-zinc-500">Sessions</div>
                        )}
                        {results.sessions?.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              router.push(`${base}/sessions`);
                              setIsOpen(false);
                              setQuery("");
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            <div className="w-9 h-9 rounded-lg bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))] grid place-content-center">
                              <IconUsers className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{s.name || "Session"}</p>
                              <p className="text-xs text-zinc-500">{new Date(s.date).toLocaleString()}</p>
                            </div>
                            <IconPlayerPlay className="w-4 h-4 text-zinc-400" />
                          </button>
                        ))}

                        {/* Policies */}
                        {results.policies?.length > 0 && (
                          <div className="px-4 pt-2 pb-2 text-[11px] uppercase tracking-wide text-zinc-500">Policies</div>
                        )}
                        {results.policies?.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => {
                              router.push(`${base}/policies`);
                              setIsOpen(false);
                              setQuery("");
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            <div className="w-9 h-9 rounded-lg bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))] grid place-content-center">
                              <IconFileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{d.name}</p>
                              <p className="text-xs text-zinc-500">Policy</p>
                            </div>
                            <IconPlayerPlay className="w-4 h-4 text-zinc-400" />
                          </button>
                        ))}

                        {/* Documents */}
                        {results.documents?.length > 0 && (
                          <div className="px-4 pt-2 pb-2 text-[11px] uppercase tracking-wide text-zinc-500">Documents</div>
                        )}
                        {results.documents?.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => {
                              router.push(`${base}/docs`);
                              setIsOpen(false);
                              setQuery("");
                            }}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          >
                            <div className="w-9 h-9 rounded-lg bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))] grid place-content-center">
                              <IconFileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{d.name}</p>
                              <p className="text-xs text-zinc-500">Document</p>
                            </div>
                            <IconPlayerPlay className="w-4 h-4 text-zinc-400" />
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 justify-self-end">

          {showTourPill && !tourSeen && (
            <button
              onClick={onStartTour}
              className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))] hover:bg-[color:rgb(var(--group-theme)/0.18)]"
            >
              <IconSparkles className="w-4 h-4" />
              Tour
            </button>
          )}

          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <img
                src={login?.thumbnail || "/avatars/placeholder.png"}
                alt={login?.displayname}
                className="h-9 w-9 rounded-lg bg-zinc-200 dark:bg-zinc-700"
              />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{login?.displayname || "You"}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">@{login?.username}</p>
              </div>
              <IconChevronDown className="w-4 h-4 text-zinc-400" />
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-white dark:bg-zinc-900 shadow-xl ring-1 ring-black/5 focus:outline-none border border-zinc-200 dark:border-zinc-700">
                <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{login?.displayname || "You"}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">@{login?.username}</p>
                </div>

                {tourSeen && onStartTour && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={onStartTour}
                        className={clsx(
                          "w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-900 dark:text-white",
                          active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                        )}
                      >
                        <IconSparkles className="w-4 h-4 text-[color:rgb(var(--group-theme))]" />
                        Replay tour
                      </button>
                    )}
                  </Menu.Item>
                )}

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={toggleTheme}
                      className={clsx(
                        "w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-900 dark:text-white",
                        active ? "bg-zinc-100 dark:bg-zinc-800" : ""
                      )}
                    >
                      <span className="w-2 h-2 rounded-full bg-zinc-400" />
                      Switch to {theme === "dark" ? "light" : "dark"} mode
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={logout}
                      className={clsx(
                        "w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500",
                        active ? "bg-red-50 dark:bg-red-900/30" : ""
                      )}
                    >
                      <IconPlayerPlay className="w-4 h-4 rotate-180 text-red-500" />
                      Sign out
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>


      <Transition appear show={switcherOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[100001]" onClose={setSwitcherOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-start justify-center px-4 py-10 sm:py-16 overflow-y-auto">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-2xl">
                <div className="p-6">
                  <Dialog.Title className="text-xl font-semibold text-zinc-900 dark:text-white">Switch workspaces</Dialog.Title>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Pick a workspace to jump into.</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {login?.workspaces?.filter(ws => !ws.isDeleted && !ws.isSuspended && ws.groupId !== workspace.groupId).length > 0 ? (
                      login.workspaces.filter(ws => !ws.isDeleted && !ws.isSuspended && ws.groupId !== workspace.groupId).map((ws) => (
                        <button
                          key={ws.groupId}
                          onClick={() => handleWorkspaceSelect(ws)}
                          className="w-full text-left flex items-center gap-4 rounded-xl px-4 py-3 transition-transform border bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700"
                        >
                          <img
                            src={ws.groupThumbnail || "/favicon-32x32.png"}
                            alt={ws.groupName}
                            className="h-10 w-10 rounded-lg object-cover bg-zinc-200 dark:bg-zinc-700"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-zinc-900 dark:text-white">{ws.groupName}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Workspace #{ws.groupId}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-2 text-sm text-zinc-500 dark:text-zinc-400">No other active workspaces found.</div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </header>
  );
};

export default WorkspaceTopbar;
