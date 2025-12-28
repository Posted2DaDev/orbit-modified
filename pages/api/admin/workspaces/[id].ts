import type { NextApiRequest, NextApiResponse } from 'next';
import { withSessionRoute } from '@/lib/withSession';
import prisma from '@/utils/database';

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

	const { id } = req.query;

	if (!id || typeof id !== 'string') {
		return res.status(400).json({ error: 'Invalid workspace ID' });
	}

	const groupId = parseInt(id, 10);
	if (isNaN(groupId)) {
		return res.status(400).json({ error: 'Invalid workspace ID format' });
	}

	// Verify workspace exists
	const workspace = await prisma.workspace.findUnique({
		where: { groupId }
	});

	if (!workspace) {
		return res.status(404).json({ error: 'Workspace not found' });
	}

	if (req.method === 'POST') {
		const { action } = req.body;

		if (action === 'suspend') {
			try {
				const updated = await prisma.workspace.update({
					where: { groupId },
					data: {
						isSuspended: true,
						suspendedAt: new Date()
					}
				});

				return res.json({
					success: true,
					message: `Workspace "${workspace.groupName}" has been suspended`,
					workspace: {
						groupId: updated.groupId,
						groupName: updated.groupName,
						isSuspended: updated.isSuspended,
						suspendedAt: updated.suspendedAt
					}
				});
			} catch (error) {
				console.error('Failed to suspend workspace:', error);
				return res.status(500).json({ error: 'Failed to suspend workspace' });
			}
		}

		if (action === 'unsuspend') {
			try {
				const updated = await prisma.workspace.update({
					where: { groupId },
					data: {
						isSuspended: false,
						suspendedAt: null
					}
				});

				return res.json({
					success: true,
					message: `Workspace "${workspace.groupName}" has been unsuspended`,
					workspace: {
						groupId: updated.groupId,
						groupName: updated.groupName,
						isSuspended: updated.isSuspended,
						suspendedAt: updated.suspendedAt
					}
				});
			} catch (error) {
				console.error('Failed to unsuspend workspace:', error);
				return res.status(500).json({ error: 'Failed to unsuspend workspace' });
			}
		}

		if (action === 'delete') {
			try {
				const updated = await prisma.workspace.update({
					where: { groupId },
					data: {
						isDeleted: true,
						deletedAt: new Date()
					}
				});

				return res.json({
					success: true,
					message: `Workspace "${workspace.groupName}" has been deleted`,
					workspace: {
						groupId: updated.groupId,
						groupName: updated.groupName,
						isDeleted: updated.isDeleted,
						deletedAt: updated.deletedAt
					}
				});
			} catch (error) {
				console.error('Failed to delete workspace:', error);
				return res.status(500).json({ error: 'Failed to delete workspace' });
			}
		}

		if (action === 'undelete') {
			try {
				const updated = await prisma.workspace.update({
					where: { groupId },
					data: {
						isDeleted: false,
						deletedAt: null
					}
				});

				return res.json({
					success: true,
					message: `Workspace "${workspace.groupName}" has been restored`,
					workspace: {
						groupId: updated.groupId,
						groupName: updated.groupName,
						isDeleted: updated.isDeleted,
						deletedAt: updated.deletedAt
					}
				});
			} catch (error) {
				console.error('Failed to restore workspace:', error);
				return res.status(500).json({ error: 'Failed to restore workspace' });
			}
		}

		return res.status(400).json({ error: 'Invalid action' });
	}

	return res.status(405).json({ error: 'Method not allowed' });
}
