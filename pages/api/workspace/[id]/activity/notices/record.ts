import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { getConfig } from "@/utils/configEngine";
import { getUsername, getThumbnail } from "@/utils/userinfoEngine";
import axios from "axios";

export default withSessionRoute(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const workspaceGroupId = parseInt(req.query.id as string, 10);
  if (!workspaceGroupId) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid workspace id" });
  }

  const currentUserId = req.session?.userid;
  if (!currentUserId) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  const user = await prisma.user.findFirst({
    where: {
      userid: BigInt(currentUserId),
    },
    include: {
      roles: {
        where: {
          workspaceGroupId,
        },
      },
    },
  });

  const hasManageMembersPermission =
    user?.roles?.some((role) => role.permissions?.includes("manage_members")) ??
    false;

  if (!hasManageMembersPermission) {
    return res
      .status(403)
      .json({ success: false, error: "Insufficient permissions" });
  }

  const { userId, startTime, endTime, reason } = req.body;

  if (!userId || !startTime || !endTime || !reason) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: userId, startTime, endTime, reason",
    });
  }

  try {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: "End time must be after start time",
      });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        userid: BigInt(userId),
      },
      include: {
        roles: {
          where: {
            workspaceGroupId,
          },
        },
      },
    });

    if (!targetUser || !targetUser.roles.length) {
      return res.status(404).json({
        success: false,
        error: "User not found in workspace",
      });
    }

    const notice = await prisma.inactivityNotice.create({
      data: {
        userId: BigInt(userId),
        workspaceGroupId,
        startTime: start,
        endTime: end,
        reason: reason.trim(),
        reviewed: true,
        approved: true,
      },
    });

    // Send webhook for admin-created approved notice
    const webhookConfig = await getConfig("inactivity", workspaceGroupId);
    if (webhookConfig?.webhookEnabled && webhookConfig?.webhookUrl) {
      try {
        const target = await prisma.user.findFirst({ where: { userid: BigInt(userId) } });
        const creator = await prisma.user.findFirst({ where: { userid: BigInt(currentUserId) } });

        const username = target?.username || (await getUsername(BigInt(userId)));
        const thumbnail = target?.picture || (await getThumbnail(BigInt(userId)));
        const reviewerName = creator?.username || (await getUsername(BigInt(currentUserId)));
        const workspace = await prisma.workspace.findUnique({ where: { groupId: workspaceGroupId } });

        const startDate = start.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const endDate = end.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        await axios.post(webhookConfig.webhookUrl, {
          embeds: [
            {
              title: "✅ Inactivity Notice Approved",
              description: `**${username}**'s inactivity was recorded and approved by **${reviewerName}** (admin action).`,
              color: 0x10b981,
              fields: [
                { name: "User", value: username, inline: true },
                { name: "User ID", value: userId.toString(), inline: true },
                { name: "Recorded By", value: reviewerName, inline: true },
                { name: "Start Date", value: startDate, inline: true },
                { name: "End Date", value: endDate, inline: true },
                { name: "Reason", value: reason.trim() || "No reason provided", inline: false },
              ],
              thumbnail: { url: thumbnail || undefined },
              footer: {
                text: workspace?.groupName || "Workspace",
                icon_url: workspace?.groupLogo || undefined,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        });
      } catch (webhookError) {
        console.error("Failed to send webhook:", webhookError);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Notice created successfully",
      notice: {
        id: notice.id,
        startTime: notice.startTime,
        endTime: notice.endTime,
        reason: notice.reason,
        approved: notice.approved,
        reviewed: notice.reviewed,
      },
    });
  } catch (error) {
    console.error("Error creating admin notice:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});