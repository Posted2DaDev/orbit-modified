// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getConfig } from '@/utils/configEngine'
import prisma, { role } from '@/utils/database';
import { withPermissionCheck } from '@/utils/permissionsManager'
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
			liveServersEnabled: boolean
			promotionsEnabled: boolean
			widgets: string[]
			coverImage?: string | null
		}
	}
}

export default withPermissionCheck(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!await prisma.workspace.count()) return res.status(400).json({ success: false, error: 'Workspace not setup' })
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	const { id } = req.query
	const time = new Date()
	
	if (!id) return res.status(400).json({ success: false, error: 'No id provided' })
	if (Number.isNaN(Number(id))) return res.status(400).json({ success: false, error: 'Invalid id provided' })
	
	let workspace = await prisma.workspace.findUnique({
		where: {
			groupId: Number.parseInt((id as string))
		}
	})

	if (!workspace) return res.status(400).json({ success: false, error: 'Workspace not found' })
	
	// Log workspace status for debugging
	console.log(`Workspace ${workspace.groupId}: isSuspended=${workspace.isSuspended}, isDeleted=${workspace.isDeleted}`)
	
	// Check if workspace is suspended or deleted
	if (workspace.isSuspended) {
		return res.status(403).json({ success: false, error: 'This workspace has been suspended' })
	}
	
	if (workspace.isDeleted) {
		return res.status(403).json({ success: false, error: 'This workspace has been deleted' })
	}
	
	console.log(`Workspace found after ${Date.now() - time.getTime()}ms`)
	let themeconfigRaw = await getConfig('customization', workspace.groupId)
	// Fallback to legacy 'theme' key if customization doesn't exist
	if (!themeconfigRaw) {
		themeconfigRaw = await getConfig('theme', workspace.groupId)
	}
	let themeconfig = themeconfigRaw as any
	if (themeconfigRaw && typeof themeconfigRaw === 'string') {
		try {
			themeconfig = JSON.parse(themeconfigRaw)
		} catch {
			themeconfig = themeconfigRaw
		}
	}
	const homeConfigRaw = await getConfig('home', workspace.groupId)
	let homeConfig = homeConfigRaw as any
	if (homeConfigRaw && typeof homeConfigRaw === 'string') {
		try {
			homeConfig = JSON.parse(homeConfigRaw)
		} catch {
			homeConfig = null
		}
	}
	console.log(`Theme config found after ${Date.now() - time.getTime()}ms`)
	const roles = await prisma.role.findMany({
		where: {
			workspaceGroupId: workspace.groupId
		},
		orderBy: {
			isOwnerRole: 'desc'
		}
	})
	console.log(`Roles found after ${Date.now() - time.getTime()}ms`)
	let groupinfo = await noblox.getGroup(workspace.groupId)

	const user = await prisma.user.findUnique({
		where: {
			userid: req.session.userid
		},
		include: {
			roles: {
				where: {
					workspaceGroupId: workspace.groupId
				},
				orderBy: {
					isOwnerRole: 'desc'
				}
			}
		}
	})
	console.log(`User found after ${Date.now() - time.getTime()}ms`)

	if (!user) return res.status(401).json({ success: false, error: 'Not logged in' })
	if (!user.roles.length) return res.status(401).json({ success: false, error: 'Not logged in' })

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
		"View Live Servers": "view_servers",
		"View Promotions": "view_promotions",
		"Manage Promotions": "manage_promotions",
		"Admin (Manage workspace)": "admin",
	};	
	
	res.status(200).json({ success: true, permissions: user.roles[0].permissions, workspace: {
		groupId: workspace.groupId,
		groupThumbnail: await noblox.getLogo(workspace.groupId),
		groupName: groupinfo.name,
		yourPermission: user.roles[0].isOwnerRole ? Object.values(permissions) : user.roles[0].permissions,
		groupTheme: themeconfig,
		roles: roles,
		yourRole: user.roles[0].id,
		settings: {
			guidesEnabled: (await getConfig('guides', workspace.groupId))?.enabled || false,
			leaderboardEnabled: (await getConfig('leaderboard', workspace.groupId))?.enabled || false,
			sessionsEnabled: (await getConfig('sessions', workspace.groupId))?.enabled || false,
			alliesEnabled: (await getConfig('allies', workspace.groupId))?.enabled || false,
			noticesEnabled: (await getConfig('notices', workspace.groupId))?.enabled || false,
			policiesEnabled: (await getConfig('policies', workspace.groupId))?.enabled || false,
			liveServersEnabled: (await getConfig('live_servers', workspace.groupId))?.enabled || false,
			promotionsEnabled: (await getConfig('promotions', workspace.groupId))?.enabled || false,
			widgets: homeConfig?.widgets ?? [],
			coverImage: homeConfig?.coverImage ?? null,
		}
	} })
}
