import { useState, useEffect } from "react"
import type { NextPage } from "next"
import { loginState, workspacestate } from "@/state"
import { themeState } from "@/state/theme"
import { useRecoilState } from "recoil"
import { Menu, Dialog } from "@headlessui/react"
import { useRouter } from "next/router"
import {
  IconHome,
  IconHomeFilled,
  IconMessage2,
  IconMessage2Filled,
  IconServer,
  IconClipboardList,
  IconClipboardListFilled,
  IconBell,
  IconBellFilled,
  IconUser,
  IconUserFilled,
  IconSettings,
  IconSettingsFilled,
  IconChevronDown,
  IconFileText,
  IconFileTextFilled,
  IconShield,
  IconCheck,
  IconRosetteDiscountCheck,
  IconRosetteDiscountCheckFilled,
  IconChevronLeft,
  IconMenu2,
  IconSun,
  IconMoon,
  IconX,
  IconClock,
  IconClockFilled,
  IconTrophy,
  IconTrophyFilled,
  IconArrowsUpDown,
  IconBan,
} from "@tabler/icons-react"
import axios from "axios"
import clsx from "clsx"
import Parser from "rss-parser"
import ReactMarkdown from "react-markdown";
import packageJson from "../package.json";

interface SidebarProps {
  isCollapsed: boolean
  setIsCollapsed: (value: boolean) => void
}

const ChangelogContent: React.FC<{ workspaceId: number }> = ({ workspaceId }) => {
  const [entries, setEntries] = useState<
    { title: string; link: string; pubDate: string; content: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/changelog')
      .then(res => res.json())
      .then(data => {
        setEntries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [workspaceId]);

  if (!entries.length) return <p className="text-sm text-zinc-500">No entries found.</p>;

  return (
    <>
      {entries.map((entry, idx) => (
        <div key={idx}>
          <a
            href={entry.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {entry.title}
          </a>
          <div className="text-xs text-zinc-400">{entry.pubDate}</div>
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            <ReactMarkdown>{entry.content}</ReactMarkdown>
          </div>
        </div>
      ))}
    </>
  );
};

const Sidebar: NextPage<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const [login, setLogin] = useRecoilState(loginState)
  const [workspace, setWorkspace] = useRecoilState(workspacestate)
  const [theme, setTheme] = useRecoilState(themeState)
  const [showOrbitInfo, setShowOrbitInfo] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelog, setChangelog] = useState<{ title: string, link: string, pubDate: string, content: string }[]>([]);
  const [docsEnabled, setDocsEnabled] = useState(false);
  const [alliesEnabled, setAlliesEnabled] = useState(false);
  const [sessionsEnabled, setSessionsEnabled] = useState(false);
  const [noticesEnabled, setNoticesEnabled] = useState(false);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(false);
  const [policiesEnabled, setPoliciesEnabled] = useState(false);
  const [liveServersEnabled, setLiveServersEnabled] = useState(false);
  const [promotionsEnabled, setPromotionsEnabled] = useState(false);
  const router = useRouter()

  // Add body class to prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add("overflow-hidden")
    } else {
      document.body.classList.remove("overflow-hidden")
    }
    return () => {
      document.body.classList.remove("overflow-hidden")
    }
  }, [isMobileMenuOpen])

  const pages: {
    name: string
    href: string
    icon: React.ElementType
    filledIcon?: React.ElementType
    accessible?: boolean
  }[] = [
    { name: "Home", href: "/workspace/[id]", icon: IconHome, filledIcon: IconHomeFilled },
    { name: "Wall", href: "/workspace/[id]/wall", icon: IconMessage2, filledIcon: IconMessage2Filled },
    { name: "Activity", href: "/workspace/[id]/activity", icon: IconClipboardList, filledIcon: IconClipboardListFilled, accessible: true },
	...(leaderboardEnabled ? [{
      name: "Leaderboard",
      href: "/workspace/[id]/leaderboard",
      icon: IconTrophy,
      filledIcon: IconTrophyFilled,
      accessible: workspace.yourPermission.includes("view_entire_groups_activity"),
    }] : []),
   ...(noticesEnabled ? [{
      name: "Notices",
      href: "/workspace/[id]/notices",
      icon: IconClock,
      filledIcon: IconClockFilled,
      accessible: true,
    }] : []),
    ...(alliesEnabled ? [{
      name: "Alliances",
      href: "/workspace/[id]/alliances",
      icon: IconRosetteDiscountCheck,
      filledIcon: IconRosetteDiscountCheckFilled,
      accessible: true,
    }] : []),
    ...(sessionsEnabled ? [{
      name: "Sessions",
      href: "/workspace/[id]/sessions",
      icon: IconBell,
      filledIcon: IconBellFilled,
      accessible: true,
    }] : []),
    { name: "Staff", href: "/workspace/[id]/views", icon: IconUser, filledIcon: IconUserFilled, accessible: workspace.yourPermission.includes("view_members") },
    ...(docsEnabled ? [{ name: "Docs", href: "/workspace/[id]/docs", icon: IconFileText, filledIcon: IconFileTextFilled, accessible: true }] : []),
    ...(policiesEnabled ? [{ name: "Policies", href: "/workspace/[id]/policies", icon: IconShield, filledIcon: IconShield, accessible: workspace.yourPermission.includes("manage_policies") || workspace.yourPermission.includes("admin") }] : []),
	...(liveServersEnabled ? [{ name: "Live Servers", href: "/workspace/[id]/live", icon: IconServer, filledIcon: IconServer, accessible: workspace.yourPermission.includes("view_servers") || workspace.yourPermission.includes("admin") }] : []),
    ...(promotionsEnabled ? [{ name: "Promotions", href: "/workspace/[id]/promotions", icon: IconArrowsUpDown, filledIcon: IconArrowsUpDown, accessible: workspace.yourPermission.includes("manage_promotions") || workspace.yourPermission.includes("view_promotions") || workspace.yourPermission.includes("admin") }] : []),
    { name: "Settings", href: "/workspace/[id]/settings", icon: IconSettings, filledIcon: IconSettingsFilled, accessible: workspace.yourPermission.includes("admin") },    ...(login.isOwner ? [{ name: "Workspace Admin", href: "/admin/workspaces", icon: IconBan, filledIcon: IconBan, accessible: true }] : []),  ];

  const gotopage = (page: string) => {
    const finalPath = page.includes("[id]") ? page.replace("[id]", workspace.groupId.toString()) : page
    router.push(finalPath)
    setIsMobileMenuOpen(false)
  }

  const logout = async () => {
    await axios.post("/api/auth/logout")
    setLogin({
      userId: 1,
      username: "",
      displayname: "",
      canMakeWorkspace: false,
      thumbnail: "",
      workspaces: [],
      isOwner: false,
    })
    router.push("/login")
  }

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", newTheme)
    }
  }

  useEffect(() => {
    if (showChangelog && changelog.length === 0) {
      fetch('/api/changelog')
        .then(res => res.json())
        .then(items => setChangelog(items));
    }
  }, [showChangelog, changelog.length]);

  useEffect(() => {
    // Fetch the config for docs/guides
    fetch(`/api/workspace/${workspace.groupId}/settings/general/guides`)
      .then(res => res.json())
      .then(data => {
        let enabled = false;
        let val = data.value ?? data;
        if (typeof val === "string") {
          try {
            val = JSON.parse(val);
          } catch {
            val = {};
          }
        }
        enabled =
          typeof val === "object" && val !== null && "enabled" in val
            ? (val as { enabled?: boolean }).enabled ?? false
            : false;
        setDocsEnabled(enabled);
      })
      .catch(() => setDocsEnabled(false));
  }, [workspace.groupId]);

  useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/ally`)
      .then(res => res.json())
      .then(data => {
        let enabled = false;
        let val = data.value ?? data;
        if (typeof val === "string") {
          try { val = JSON.parse(val); } catch { val = {}; }
        }
        enabled =
          typeof val === "object" && val !== null && "enabled" in val
            ? (val as { enabled?: boolean }).enabled ?? false
            : false;
        setAlliesEnabled(enabled);
      })
      .catch(() => setAlliesEnabled(false));
  }, [workspace.groupId]);

  useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/sessions`)
      .then(res => res.json())
      .then(data => {
        let enabled = false;
        let val = data.value ?? data;
        if (typeof val === "string") {
          try { val = JSON.parse(val); } catch { val = {}; }
        }
        enabled =
          typeof val === "object" && val !== null && "enabled" in val
            ? (val as { enabled?: boolean }).enabled ?? false
            : false;
        setSessionsEnabled(enabled);
      })
      .catch(() => setSessionsEnabled(false));
  }, [workspace.groupId]);

    useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/notices`)
      .then(res => res.json())
      .then(data => {
        let enabled = false;
        let val = data.value ?? data;
        if (typeof val === "string") {
          try { val = JSON.parse(val); } catch { val = {}; }
        }
        enabled =
          typeof val === "object" && val !== null && "enabled" in val
            ? (val as { enabled?: boolean }).enabled ?? false
            : false;
        setNoticesEnabled(enabled);
      })
      .catch(() => setNoticesEnabled(false));
  }, [workspace.groupId]);

  useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/leaderboard`)
      .then(res => res.json())
      .then(data => {
        let enabled = false;
        let val = data.value ?? data;
        if (typeof val === "string") {
          try { val = JSON.parse(val); } catch { val = {}; }
        }
        enabled =
          typeof val === "object" && val !== null && "enabled" in val
            ? (val as { enabled?: boolean }).enabled ?? false
            : false;
        setLeaderboardEnabled(enabled);
      })
      .catch(() => setLeaderboardEnabled(false));
  }, [workspace.groupId]);

  useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/policies`)
      .then(res => res.json())
      .then(data => {
        let enabled = false;
        let val = data.value ?? data;
        if (typeof val === "string") {
          try { val = JSON.parse(val); } catch { val = {}; }
        }
        enabled =
          typeof val === "object" && val !== null && "enabled" in val
            ? (val as { enabled?: boolean }).enabled ?? false
            : false;
        setPoliciesEnabled(enabled);
      })
      .catch(() => setPoliciesEnabled(false));
  }, [workspace.groupId]);

  useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/live_servers`)
      .then(res => res.json())
      .then(data => {
        let enabled = false;
        let val = data.value ?? data;
        if (typeof val === "string") {
          try { val = JSON.parse(val); } catch { val = {}; }
        }
        enabled =
          typeof val === "object" && val !== null && "enabled" in val
            ? (val as { enabled?: boolean }).enabled ?? false
            : false;
        setLiveServersEnabled(enabled);
      })
      .catch(() => setLiveServersEnabled(false));
  }, [workspace.groupId]);

  useEffect(() => {
    fetch(`/api/workspace/${workspace.groupId}/settings/general/promotions`)
      .then(res => res.json())
      .then(data => {
        let enabled = false;
        let val = data.value ?? data;
        if (typeof val === "string") {
          try { val = JSON.parse(val); } catch { val = {}; }
        }
        enabled =
          typeof val === "object" && val !== null && "enabled" in val
            ? (val as { enabled?: boolean }).enabled ?? false
            : false;
        setPromotionsEnabled(enabled);
      })
      .catch(() => setPromotionsEnabled(false));
  }, [workspace.groupId]);


  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-20 left-4 z-[999999] p-2 rounded-lg bg-white dark:bg-zinc-800 shadow"
      >
        <IconMenu2 className="w-6 h-6 text-zinc-700 dark:text-white" />
      </button>

      <aside
        data-tour-id="sidebar-nav"
        className={clsx(
          "h-full w-64 flex flex-col shadow-xl transition-all duration-300",
          "bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-700",
          "fixed lg:relative z-30",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          isCollapsed && "lg:w-[4.5rem]"
        )}
      >
        <div className="flex-1 flex flex-col p-3 overflow-y-auto">
          <nav className="flex-1 space-y-1 mt-4">
              {pages.map((page) =>
                (page.accessible === undefined || page.accessible) && (
                  <button
                    key={page.name}
                    onClick={() => gotopage(page.href)}
                    className={clsx(
                      "w-full gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                      (() => {
                        const targetPath = page.href.includes("[id]") ? page.href.replace("[id]", workspace.groupId.toString()) : page.href;
                        return router.asPath === targetPath;
                      })()
                        ? "bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))] font-semibold"
                        : "text-zinc-700 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700",
                      isCollapsed ? "grid place-content-center" : "flex gap-2 items-center",
                    )}
                  >
                    {(() => {
                      const targetPath = page.href.includes("[id]") ? page.href.replace("[id]", workspace.groupId.toString()) : page.href;
                      const IconComponent: React.ElementType =
                        router.asPath === targetPath
                          ? page.filledIcon || page.icon
                          : page.icon;
                      return <IconComponent className="w-5 h-5" />;
                    })()}
                    {!isCollapsed && (
                      <div className="flex items-center gap-2">
                        <span>{page.name}</span>
                        {page.name === "Policies" && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                            BETA
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
            )}
          </nav>
        
          {!isCollapsed && (
            <button
              onClick={() => {
                setShowOrbitInfo(true);
              }}
              className="mt-4 w-full text-left text-xs text-zinc-500 hover:text-primary transition-all duration-300"
            >
              © Copyright Notices
            </button>
          )}

          {!isCollapsed && (
            <div className="mt-2 text-xs text-zinc-500">
              Varyn v{packageJson.version} - <button onClick={() => setShowChangelog(true)} className="mt-2 text-left text-xs text-zinc-500 hover:text-primary">Changelog</button>
            </div>
          )}
        </div>
          <Dialog
            open={showCopyright}
            onClose={() => setShowCopyright(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white dark:bg-zinc-800 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">
                    Copyright Notices
                  </Dialog.Title>
                  <button
                    onClick={() => setShowCopyright(false)}
                    className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    <IconX className="w-5 h-5 text-zinc-500" />
                  </button>
                </div>

			

                <div className="space-y-4">

					<div>
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                      Varyn additions and features:
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Copyright © 2025 postedDevelopment. All rights reserved.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                      Orbit features, enhancements, and modifications:
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Copyright © 2025 Planetary. All rights reserved.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                      Original Tovy features and code:
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Copyright © 2022 Tovy. All rights reserved.
                    </p>
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>

          <Dialog
            open={showOrbitInfo}
            onClose={() => setShowOrbitInfo(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="mx-auto max-w-lg rounded-lg bg-white dark:bg-zinc-800 p-6 shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">
                    © Copyright Notices
                  </Dialog.Title>
                  <button
                    onClick={() => setShowOrbitInfo(false)}
                    className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all duration-300"
                  >
                    <IconX className="w-5 h-5 text-zinc-500" />
                  </button>
                </div>
          
				

                <div className="mb-4">

					<div>
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                      Varyn additions and features:
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Copyright © 2025 postedDevelopment. All rights reserved.
                    </p>
                  </div>
                <div className="border-t border-zinc-300 dark:border-zinc-700 my-4" />

                  <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                    Orbit
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    © 2025 Planetary — All rights reserved.
                  </p>
                </div>
          
                <div className="border-t border-zinc-300 dark:border-zinc-700 my-4" />
          
                <div className="mb-4">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                    Original Tovy Project
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    © 2022 Tovy — All rights reserved.
                  </p>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>

          <Dialog
            open={showChangelog}
            onClose={() => setShowChangelog(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="mx-auto max-w-lg rounded-lg bg-white dark:bg-zinc-800 p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">
                    Changelog
                  </Dialog.Title>
                  <button
                    onClick={() => setShowChangelog(false)}
                    className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700">
                    <IconX className="w-5 h-5 text-zinc-500" />
                  </button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {changelog.length === 0 && <p className="text-sm text-zinc-500">Loading...</p>}
                  {changelog.map((entry, idx) => (
                    <div key={idx}>
                      <a href={entry.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                        {entry.title}
                      </a>
                      <div className="text-xs text-zinc-400">{entry.pubDate}</div>
                      <div className="text-sm text-zinc-700 dark:text-zinc-300">
                        <ReactMarkdown>{entry.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        </aside>
    </>
  )
}

export default Sidebar
