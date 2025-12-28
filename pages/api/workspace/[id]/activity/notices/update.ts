// pages/api/workspace/[id]/activity/notices/update.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/database';
import { logAudit } from '@/utils/logs';
import { withPermissionCheck } from '@/utils/permissionsManager';
import { getConfig } from '@/utils/configEngine';
import { getUsername, getThumbnail } from '@/utils/userinfoEngine';
import axios from 'axios';

type Data = {
  success: boolean;
  error?: string;
};

export default withPermissionCheck(handler, 'manage_activity');

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (!req.session.userid) {
    return res.status(401).json({ success: false, error: 'Not logged in' });
  }

  const { status, id, reviewComment } = req.body;

  if (!['approve', 'deny', 'cancel'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid id' });
  }

  try {
    const notice = await prisma.inactivityNotice.findUnique({
      where: { id },
    });

    if (!notice) {
      return res.status(404).json({ success: false, error: 'Notice not found' });
    }

    const before = notice;
    if (status === 'cancel') {
      await prisma.inactivityNotice.delete({
        where: { id },
      });
      try { await logAudit(notice.workspaceGroupId, (req as any).session?.userid || null, 'notice.cancel', `notice:${id}`, { before, after: null, reviewer: (req as any).session?.userid || null }); } catch (e) {}
    } else {
      const after = await prisma.inactivityNotice.update({
        where: { id },
        data: {
          approved: status === 'approve',
          reviewed: true,
          reviewComment: reviewComment || null,
        },
      });
      try { await logAudit(after.workspaceGroupId, (req as any).session?.userid || null, status === 'approve' ? 'notice.approve' : 'notice.deny', `notice:${id}`, { before, after, reviewer: (req as any).session?.userid || null }); } catch (e) {}
      
      // Send webhook notification for approval/denial
      const webhookConfig = await getConfig('inactivity', notice.workspaceGroupId);
      if (webhookConfig?.webhookEnabled && webhookConfig?.webhookUrl) {
        try {
          if (status === 'approve') {
            console.log('[webhook] inactivity approve ->', webhookConfig.webhookUrl);
          }
          const user = await prisma.user.findUnique({
            where: { userid: notice.userId }
          });
          const reviewer = await prisma.user.findUnique({
            where: { userid: BigInt(req.session.userid) }
          });
          
          const username = user?.username || await getUsername(notice.userId) || "Unknown user";
          const thumbnail = user?.picture || await getThumbnail(notice.userId) || undefined;
          const reviewerName = reviewer?.username || await getUsername(BigInt(req.session.userid)) || "Reviewer";
          const workspace = await prisma.workspace.findUnique({
            where: { groupId: notice.workspaceGroupId }
          });

          const startDate = notice.startTime.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          });
          const endDate = notice.endTime.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          });

          const safe = (val: string, max: number, fallback = "No reason provided") => {
            const str = (val ?? "").toString();
            if (!str.trim()) return fallback;
            return str.slice(0, max);
          };
          const safeReason = safe(notice.reason || "", 1024);
          const safeReview = reviewComment ? safe(reviewComment, 1024, "No review comment provided") : null;

          await axios.post(webhookConfig.webhookUrl, {
            embeds: [{
              title: status === 'approve' ? "✅ Inactivity Notice Approved" : "❌ Inactivity Notice Denied",
              description: `**${username}**'s inactivity request has been ${status === 'approve' ? 'approved' : 'denied'} by **${reviewerName}**.`,
              color: status === 'approve' ? 0x10b981 : 0xef4444, // Green for approve, Red for deny
              fields: [
                {
                  name: "User",
                  value: username,
                  inline: true
                },
                {
                  name: "User ID",
                  value: notice.userId.toString(),
                  inline: true
                },
                {
                  name: "Reviewed By",
                  value: reviewerName,
                  inline: true
                },
                {
                  name: "Start Date",
                  value: startDate,
                  inline: true
                },
                {
                  name: "End Date",
                  value: endDate,
                  inline: true
                },
                {
                  name: "Original Reason",
                  value: safeReason,
                  inline: false
                },
                ...(safeReview ? [{
                  name: "Review Comment",
                  value: safeReview,
                  inline: false
                }] : [])
              ],
              thumbnail: {
                url: thumbnail || undefined
              },
              footer: {
                text: workspace?.groupName || "Workspace",
                icon_url: workspace?.groupLogo || undefined
              },
              timestamp: new Date().toISOString()
            }]
          }).catch(err => {
            // Log full response details for diagnostics but do not throw
            console.error("[webhook:error] status", err?.response?.status, "data", err?.response?.data);
            throw err;
          });
        } catch (webhookError) {
          console.error("Failed to send webhook:", webhookError);
          // Don't fail the request if webhook fails
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[API ERROR]', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
