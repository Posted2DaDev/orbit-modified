import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';
import * as noblox from 'noblox.js';

export default withSessionRoute(handler);

export async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (!req.session.userid) {
		return res.status(401).json({ error: 'Not authenticated' });
	}

	// Verify owner privileges
	const user = await prisma.user.findUnique({
		where: { userid: BigInt(req.session.userid) },
		select: { isOwner: true }
	});

	if (!user?.isOwner) {
		return res.status(403).json({ error: 'Access denied. Owner privileges required.' });
	}

	if (req.method === 'GET') {
		try {
			const workspaces = await prisma.workspace.findMany({
				orderBy: { groupId: 'asc' },
				select: {
					groupId: true,
					groupName: true,
					groupLogo: true,
					isDeleted: true,
					isSuspended: true,
					deletedAt: true,
					suspendedAt: true,
					lastSynced: true,
					members: {
						select: {
							userId: true,
							user: {
								select: {
									userid: true,
									username: true,
									isOwner: true
								}
							}
						}
					}
				}
			});

			// Fetch missing group names from Roblox
			const enrichedWorkspaces = await Promise.all(
				workspaces.map(async (ws) => {
					let groupName = ws.groupName;
					let groupLogo = ws.groupLogo;

					// If groupName is missing, fetch from Roblox
					if (!groupName) {
						try {
							const group = await noblox.getGroup(ws.groupId);
							groupName = group.name;
						} catch (e) {
							console.warn(`Failed to fetch group ${ws.groupId}:`, e);
							groupName = `Group ${ws.groupId}`;
						}
					}

					// If groupLogo is missing, fetch from Roblox
					if (!groupLogo) {
						try {
							groupLogo = await noblox.getLogo(ws.groupId);
						} catch (e) {
							console.warn(`Failed to fetch logo for group ${ws.groupId}:`, e);
						}
					}

					return {
						...ws,
						groupName,
						groupLogo
					};
				})
			);

			// Convert BigInt to string for JSON serialization
			const serializedWorkspaces = enrichedWorkspaces.map(ws => ({
				...ws,
				members: ws.members.map(m => ({
					userId: m.userId.toString(),
					user: {
						...m.user,
						userid: m.user.userid.toString()
					}
				}))
			}));

			return res.json({ success: true, workspaces: serializedWorkspaces });
		} catch (error) {
			console.error('Failed to fetch workspaces:', error);
			return res.status(500).json({ error: 'Failed to fetch workspaces' });
		}
	}

	return res.status(405).json({ error: 'Method not allowed' });
}
