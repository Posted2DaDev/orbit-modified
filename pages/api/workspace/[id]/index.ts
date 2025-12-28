// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { role } from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'

type Data = {
	success: boolean
	error?: string
	permissions?: string[]
	workspace?: {
		groupId: number
		groupThumbnail: string
		groupName: string,
		roles: role[],
		yourRole: string | null,
		yourPermission: string[]
		groupTheme: string,
		settings: {
			guidesEnabled: boolean
			leaderboardEnabled: boolean
			sessionsEnabled: boolean
			alliesEnabled: boolean
			noticesEnabled: boolean
			policiesEnabled: boolean
			widgets: string[]
		}
	}
}

export default withPermissionCheck(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not authenticated' });
	if (!req.query.id) return res.status(400).json({ success: false, error: 'Missing required fields' });

	try {
		const workspace = await prisma.workspace.findUnique({
			where: {
				groupId: parseInt(req.query.id as string)
			}
		});
		if (!workspace) return res.status(404).json({ success: false, error: 'Not found' });

		// Check if workspace is suspended or deleted
		if (workspace.isSuspended) {
			return res.status(403).json({ success: false, error: 'This workspace has been suspended' });
		}

		if (workspace.isDeleted) {
			return res.status(403).json({ success: false, error: 'This workspace has been deleted' });
		}

		const workspaceWithRoles = await prisma.workspace.findUnique({
			where: {
				groupId: parseInt(req.query.id as string)
			},
			include: {
				roles: {
					orderBy: {
						isOwnerRole: 'desc'
					}
				}
			}
		});

		const user = await prisma.user.findFirst({
			where: {
				userid: BigInt(req.session.userid)
			},
			include: {
				roles: {
					where: {
						workspaceGroupId: workspaceWithRoles.groupId
					},
					orderBy: {
						isOwnerRole: 'desc'
					}
				}
			}
		});
		if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
		if (!user.roles || user.roles.length === 0) {
			return res.status(403).json({ success: false, error: 'No workspace role assigned' });
		}

		const primaryRole = user.roles[0];

		let groupinfo;
		let groupLogo;
		try {
			groupinfo = await noblox.getGroup(workspaceWithRoles.groupId);
			groupLogo = await noblox.getLogo(workspaceWithRoles.groupId);
		} catch (e: any) {
			const msg = e?.message || String(e);
			if (msg.includes('429') || msg.toLowerCase().includes('too many requests')) {
				return res.status(429).json({ success: false, error: 'Rate limited by Roblox. Please retry shortly.' });
			}
			throw e;
		}

		const [themeconfigRaw, legacyTheme, guides, leaderboard, sessions, allies, notices, policies, homeRaw] = await Promise.all([
			getConfig('customization', workspaceWithRoles.groupId),
			getConfig('theme', workspaceWithRoles.groupId),
			getConfig('guides', workspaceWithRoles.groupId),
			getConfig('leaderboard', workspaceWithRoles.groupId),
			getConfig('sessions', workspaceWithRoles.groupId),
			getConfig('allies', workspaceWithRoles.groupId),
			getConfig('notices', workspaceWithRoles.groupId),
			getConfig('policies', workspaceWithRoles.groupId),
			getConfig('home', workspaceWithRoles.groupId),
		]);

		// Use customization key, fallback to legacy theme key
		let themeconfig = themeconfigRaw || legacyTheme;
		if (themeconfig && typeof themeconfig === 'string') {
			try {
				themeconfig = JSON.parse(themeconfig);
			} catch {
				themeconfig = themeconfig;
			}
		}

		let home = homeRaw as any;
		if (homeRaw && typeof homeRaw === 'string') {
			try {
				home = JSON.parse(homeRaw);
			} catch {
				home = null;
			}
		}

		const permissions = {
			"View wall": "view_wall",
			"View members": "view_members",
			"View Activity History": "view_entire_groups_activity",
			"Post on wall": "post_on_wall",
			"Represent alliance": "represent_alliance",
			'Assign users to Sessions': 'sessions_assign',
			'Assign Self to Sessions': 'sessions_claim',
			'Host Sessions': 'sessions_host',
			"Manage sessions": "manage_sessions",
			"Manage activity": "manage_activity",
			"Manage quotas": "manage_quotas",
			"Manage members": "manage_members",
			"Manage docs": "manage_docs",
			"Manage alliances": "manage_alliances",
			"Admin (Manage workspace)": "admin",
		};

		const yourPermissions = primaryRole.isOwnerRole ? Object.values(permissions) : primaryRole.permissions;

		return res.status(200).json({
			success: true,
			permissions: primaryRole.permissions,
			workspace: {
				groupId: workspaceWithRoles.groupId,
				groupThumbnail: groupLogo,
				groupName: groupinfo.name,
				yourPermission: yourPermissions,
				groupTheme: themeconfig,
				roles: workspaceWithRoles.roles,
				yourRole: primaryRole.id,
				settings: {
					guidesEnabled: guides?.enabled || false,
					leaderboardEnabled: leaderboard?.enabled || false,
					sessionsEnabled: sessions?.enabled || false,
					alliesEnabled: allies?.enabled || false,
					noticesEnabled: notices?.enabled || false,
					policiesEnabled: policies?.enabled || false,
					widgets: home?.widgets ?? [],
					coverImage: home?.coverImage ?? null,
				}
			}
		});
	} catch (err) {
		console.error('[workspace:get] error', err);
		return res.status(500).json({ success: false, error: 'Internal server error' });
	}
}
