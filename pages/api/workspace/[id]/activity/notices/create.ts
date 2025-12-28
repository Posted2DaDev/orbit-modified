// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { inactivityNotice } from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'
import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
import axios from 'axios'

type Data = {
	success: boolean
	error?: string
	notice?: inactivityNotice
}

export default withPermissionCheck(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
	if (!req.session.userid) return res.status(401).json({ success: false, error: 'Not logged in' });
	if (!req.body.startTime || !req.body.endTime || !req.body.reason) return res.status(400).json({ success: false, error: "Missing data" });
	if (typeof req.body.startTime !== "number" || typeof req.body.endTime !== "number") return res.status(400).json({ success: false, error: "Invalid type(s)" });

	try {
		const workspaceId = parseInt(req.query.id as string);
		
		const session = await prisma.inactivityNotice.create({
			data: {
				userId: BigInt(req.session.userid),
				startTime: new Date(req.body.startTime),
				endTime: new Date(req.body.endTime),
				reason: req.body.reason,
				workspaceGroupId: workspaceId
			}
		});

		// Check if webhook is enabled
		const webhookConfig = await getConfig('inactivity', workspaceId);
		if (webhookConfig?.webhookEnabled && webhookConfig?.webhookUrl) {
			try {
				const user = await prisma.user.findUnique({
					where: { userid: BigInt(req.session.userid) }
				});
				
				const username = user?.username || await getUsername(BigInt(req.session.userid)) || "Unknown user";
				const thumbnail = user?.picture || await getThumbnail(BigInt(req.session.userid)) || undefined;
				const workspace = await prisma.workspace.findUnique({
					where: { groupId: workspaceId }
				});

				const startDate = new Date(req.body.startTime).toLocaleDateString('en-US', { 
					month: 'long', 
					day: 'numeric', 
					year: 'numeric' 
				});
				const endDate = new Date(req.body.endTime).toLocaleDateString('en-US', { 
					month: 'long', 
					day: 'numeric', 
					year: 'numeric' 
				});

				const safe = (val: string, max: number, fallback = "No reason provided") => {
					const str = (val ?? "").toString();
					if (!str.trim()) return fallback;
					return str.slice(0, max);
				};
				const safeReason = safe(req.body.reason || "", 1024);

				const payload = {
					embeds: [{
						title: "📋 New Inactivity Notice",
						description: `**${username}** has submitted an inactivity request.`,
						color: 0x3b82f6, // Blue
						fields: [
							{ name: "User", value: username, inline: true },
							{ name: "User ID", value: req.session.userid.toString(), inline: true },
							{ name: "Start Date", value: startDate, inline: true },
							{ name: "End Date", value: endDate, inline: true },
							{ name: "Reason", value: safeReason, inline: false },
						],
						thumbnail: { url: thumbnail || undefined },
						footer: {
							text: workspace?.groupName || "Workspace",
							icon_url: workspace?.groupLogo || undefined
						},
						timestamp: new Date().toISOString()
					}]
				};

				console.log('[webhook] inactivity create ->', webhookConfig.webhookUrl);
				await axios.post(webhookConfig.webhookUrl, payload).catch(err => {
					console.error("[webhook:error] status", err?.response?.status, "data", err?.response?.data);
				});
			} catch (webhookError) {
				console.error("Failed to send webhook:", webhookError);
				// Don't fail the request if webhook fails
			}
		}

		return res.status(200).json({ success: true, notice: JSON.parse(JSON.stringify(session, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, error: "Something went wrong" });
	}
}
