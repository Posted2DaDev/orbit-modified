import { atom } from "recoil";
import { role } from "@prisma/client";
export type workspaceinfo = {
	groupId: number;
				groupThumbnail: string;
				groupName: string
}

export type WorkspaceState = {
	groupId: number;
	groupThumbnail: string;
	groupName: string;
	yourPermission: string[];
	groupTheme: string;
	roles: role[];
	yourRole: string;
	settings: {
		guidesEnabled: boolean;
		sessionsEnabled: boolean;
		alliesEnabled: boolean;
		noticesEnabled: boolean;
		leaderboardEnabled: boolean;
		policiesEnabled: boolean;
		liveServersEnabled: boolean;
		promotionsEnabled: boolean;
		widgets: string[];
		coverImage: string | null;
	};
};

export type LoginState = {
	userId: number;
	username: string;
	displayname: string;
	thumbnail: string;
	canMakeWorkspace: boolean;
	workspaces: workspaceinfo[];
	isOwner: boolean;
}

const __global = globalThis as any;
__global.__recoilAtoms = __global.__recoilAtoms || {};

const loginState = __global.__recoilAtoms.loginState || (__global.__recoilAtoms.loginState = atom<LoginState>({
	key: "loginState",
	default: {
		userId: 1,
		username: '',
		displayname: '',
		thumbnail: '',
		canMakeWorkspace: false,
		workspaces: [] as workspaceinfo[],
		isOwner: false
	},
}));

const workspacestate = __global.__recoilAtoms.workspacestate || (__global.__recoilAtoms.workspacestate = atom<WorkspaceState>({
	key: "workspacestate",
	default: {
		groupId: 0,
		groupThumbnail: '',
		groupName: '',
		yourPermission: [] as string[],
		groupTheme: '',
		roles: [] as role[],
		yourRole: '',
		settings: {
			guidesEnabled: false,
			sessionsEnabled: false,
			alliesEnabled: false,
			noticesEnabled: false,
			leaderboardEnabled: false,
			policiesEnabled: false,
			liveServersEnabled: false,
			promotionsEnabled: false,
			widgets: [] as string[],
			coverImage: null as string | null,
		}
	},
		effects: [({ setSelf }) => {
			const parseGroupId = () => {
				const path = globalThis?.location?.pathname ?? '';
				const maybe = Number.parseInt(path.split('/')[2] ?? '');
				return Number.isFinite(maybe) ? maybe : 0;
			};

			if (typeof globalThis !== 'undefined' && globalThis.location) {
				setSelf(prev => ({ ...prev, groupId: parseGroupId() }));
			}

			// track client-side navigations (pushState/replaceState) + back/forward
			const applyFromLocation = () => setSelf(prev => ({ ...prev, groupId: parseGroupId() }));
			let originalPush: typeof history.pushState | undefined;
			let originalReplace: typeof history.replaceState | undefined;

			if (typeof window !== 'undefined' && window.history) {
				originalPush = history.pushState;
				originalReplace = history.replaceState;
				history.pushState = function (...args) {
					const result = originalPush?.apply(this, args as any);
					applyFromLocation();
					return result;
				};
				history.replaceState = function (...args) {
					const result = originalReplace?.apply(this, args as any);
					applyFromLocation();
					return result;
				};
				window.addEventListener('popstate', applyFromLocation);
			}

			return () => {
				if (typeof window !== 'undefined' && window.history) {
					window.removeEventListener('popstate', applyFromLocation);
					if (originalPush) history.pushState = originalPush;
					if (originalReplace) history.replaceState = originalReplace;
				}
			};
		}]
}));


export {loginState, workspacestate};