/* eslint-disable react-hooks/rules-of-hooks */
import type { NextPage } from "next";
import Head from "next/head";
import Sidebar from "@/components/sidebar";
import WorkspaceTopbar from "@/components/workspace-topbar";
import WorkspaceTour, { type TourStep } from "@/components/WorkspaceTour";
import type { LayoutProps } from "@/layoutTypes";
import axios from "axios";
import { Transition } from "@headlessui/react";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import { useRouter } from "next/router";
import hexRgb from "hex-rgb";
import * as colors from "tailwindcss/colors";
import WorkspaceBirthdayPrompt from '@/components/bdayprompt';
import { useEffect, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconMenu2, IconAlertTriangle, IconX } from "@tabler/icons-react";
import clsx from 'clsx';
import packageJson from '../package.json';


const workspace: LayoutProps = ({ children }) => {
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [open, setOpen] = useState(true);
	const [suspensionError, setSuspensionError] = useState<string | null>(null);
	const [tourOpen, setTourOpen] = useState(false);
		const [tourStep, setTourStep] = useState(0);
		const [tourSeen, setTourSeen] = useState(false);

		const tourSteps: TourStep[] = [
			{
				id: "workspace-brand",
				title: "Workspace identity",
				description: "Jump between workspaces and see the active brand at a glance.",
			},
			{
				id: "workspace-search",
				title: "Universal search",
				description: "Use the quick search to open pages and actions instantly.",
				hint: "Tip: hit Ctrl + K anywhere to open search",
			},
			{
				id: "sidebar-nav",
				title: "Navigation hubs",
				description: "The sidebar holds activity, policies, sessions, and settings for this workspace.",
			},
			{
				id: "workspace-content",
				title: "Home surface",
				description: "This space is your dashboard - customize widgets and announcements from Settings.",
			},
		];

	const useTheme = (groupTheme: string) => {
		const themes: Record<string, string> = {
			// Light variants
			"bg-pink-200": "#fccfe8",
			"bg-red-200": "#fecaca",
			"bg-orange-200": "#fed7aa",
			"bg-yellow-200": "#fef08a",
			"bg-lime-200": "#d9f99d",
			"bg-emerald-200": "#a7f3d0",
			"bg-cyan-200": "#a4e6f1",
			"bg-blue-200": "#bfdbfe",
			"bg-indigo-200": "#c7d2fe",
			"bg-violet-200": "#ddd6fe",
			// Medium variants
			"bg-pink-400": "#f472b6",
			"bg-red-400": "#f87171",
			"bg-orange-400": "#fb923c",
			"bg-yellow-400": "#facc15",
			"bg-lime-400": "#a3e635",
			"bg-emerald-400": "#34d399",
			"bg-cyan-400": "#22d3ee",
			"bg-blue-400": "#60a5fa",
			"bg-indigo-400": "#818cf8",
			"bg-violet-400": "#c4b5fd",
			// Dark variants
			"bg-pink-700": "#be185d",
			"bg-red-700": "#b91c1c",
			"bg-orange-700": "#c2410c",
			"bg-yellow-700": "#a16207",
			"bg-lime-700": "#65a30d",
			"bg-emerald-700": "#059669",
			"bg-cyan-700": "#0891b2",
			"bg-blue-700": "#1d4ed8",
			"bg-indigo-700": "#4338ca",
			"bg-violet-700": "#6d28d9",
			// Legacy colors for backwards compatibility
			"bg-orbit": "#7700ff",
			"bg-blue-500": colors.blue[500],
			"bg-red-500": colors.red[500],
			"bg-green-500": colors.green[500],
			"bg-green-600": colors.green[600],
			"bg-yellow-500": colors.yellow[500],
			"bg-purple-500": colors.purple[500],
			"bg-pink-500": colors.pink[500],
			"bg-black": colors.black,
			"bg-zinc-500": colors.gray[500],
		};
		const hex = hexRgb(themes[groupTheme] || "#e879f9");
		return `${hex.red} ${hex.green} ${hex.blue}`;
	};

	useEffect(() => {
		router.events.on("routeChangeStart", () => setLoading(true));
		router.events.on("routeChangeComplete", () => setLoading(false));
	}, [router.events]);

	useEffect(() => {
		async function getworkspace() {
			try {
				const res = await axios.get("/api/workspace/" + router.query.id);
				setWorkspace(res.data.workspace);
				setSuspensionError(null);
			} catch (e: any) {
				// Check if workspace is suspended or deleted
				const errorMessage = e.response?.data?.error;
				if (errorMessage?.includes('suspended') || errorMessage?.includes('deleted')) {
					// Show suspension/deletion modal
					setSuspensionError(errorMessage);
				} else {
					router.push("/");
				}
			}
		}
		// Only fetch workspace if we have a valid workspace ID
		if (router.query.id && router.query.id !== '0') {
			getworkspace();
		}
	}, [router.query.id, setWorkspace, router]);

	useEffect(() => {
		if (workspace && workspace.groupTheme) {
			const theme = useTheme(workspace.groupTheme);
			document.documentElement.style.setProperty("--group-theme", theme);
		}
	}, [workspace]);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
			setOpen(window.innerWidth >= 768);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		setTourSeen(localStorage.getItem("varyn-tour-v1") === "done");
	}, []);

	const startTour = () => {
		setTourStep(0);
		setTourOpen(true);
	};

	const completeTour = () => {
		setTourSeen(true);
		setTourOpen(false);
		if (typeof window !== 'undefined') localStorage.setItem("varyn-tour-v1", "done");
	};

	return (
		<div className="h-screen w-screen bg-zinc-50 dark:bg-zinc-900 flex flex-col">
			<Head>
				<title>{workspace.groupName ? `Varyn - ${workspace.groupName}` : "Loading..."}</title>
				<link rel="icon" href={`/favicon-32x32.png`} />
			</Head>

			<div className="z-50 h-16 flex-shrink-0">
				<WorkspaceTopbar onStartTour={startTour} showTourPill={!tourSeen} tourSeen={tourSeen} />
			</div>

			<Transition
				show={open}
				enter="transition-opacity duration-300"
				enterFrom="opacity-0"
				enterTo="opacity-100"
				leave="transition-opacity duration-300"
				leaveFrom="opacity-100"
				leaveTo="opacity-0"
			>
				<div
					className={`fixed inset-0 bg-black bg-opacity-50 z-20 ${
						!isMobile ? "hidden" : ""
					}`}
					onClick={() => setOpen(false)}
				/>
			</Transition>

			<div className="flex flex-1 overflow-hidden">
				<div className={clsx(
					"transition-all duration-300 flex-shrink-0 h-full",
				"w-0 lg:w-64",
				isCollapsed && "lg:w-[4.5rem]"
				)}>
					<Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
				</div>

				<main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-900">
				<div className="relative z-10" data-tour-id="workspace-content">
					{children}
				</div>
				{router.query.id && (
					<WorkspaceBirthdayPrompt workspaceId={router.query.id as string} />
				)}
			</main>
		</div>
		
		{/* Suspension/Deletion Modal */}
		{suspensionError && (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
				<div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
					<div className="flex items-start gap-4">
						<div className="flex-shrink-0">
							<IconAlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
						</div>
						<div className="flex-1">
							<h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
								{suspensionError.includes('suspended') ? 'Workspace Suspended' : 'Workspace Deleted'}
							</h3>
							<p className="text-slate-600 dark:text-slate-300 mb-6">
								{suspensionError}
							</p>
							<button
								onClick={() => router.push('/')}
								className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
							>
								Return to Workspaces
							</button>
						</div>
						<button
							onClick={() => router.push('/')}
							className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
						>
							<IconX className="w-5 h-5" />
						</button>
					</div>
				</div>
			</div>
		)}
		
		<WorkspaceTour
				open={tourOpen}
				steps={tourSteps}
				stepIndex={tourStep}
				onStepChange={setTourStep}
				onClose={() => setTourOpen(false)}
				onComplete={completeTour}
			/>
		</div>
	);
};

export default workspace;
