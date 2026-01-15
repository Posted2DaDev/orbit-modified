import type { NextApiRequest, NextApiResponse } from "next";
import { withSessionRoute } from "@/lib/withSession";
import prisma from "@/utils/database";
import { getEmailTransporter, isEmailValid, sendEmail } from "@/utils/email";

type RecipientScope = "all" | "workspaceOwners" | "specific";

type SendResponse = {
  success: boolean;
  error?: string;
  summary?: {
    targetCount: number;
    deliverable: number;
    sent: number;
    failed: { userId: number; email: string; error: string }[];
  };
  skipped?: {
    missingEmail: number;
    invalidEmail: number;
  };
};

const escapeHtml = (input: string) =>
  input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export default withSessionRoute(async function handler(req: NextApiRequest, res: NextApiResponse<SendResponse>) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const actingUserId = req.session.userid ? Number(req.session.userid) : null;
  if (!actingUserId) return res.status(401).json({ success: false, error: "Not authenticated" });

  const actor = await prisma.user.findUnique({
    where: { userid: BigInt(actingUserId) },
    select: { isOwner: true },
  });

  if (!actor?.isOwner) {
    return res.status(403).json({ success: false, error: "Owner access required" });
  }

  const subject = typeof req.body?.subject === "string" ? req.body.subject.trim() : "";
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const recipientScope = req.body?.recipientScope as RecipientScope;
  const specificUserIds = Array.isArray(req.body?.userIds)
    ? req.body.userIds.map((id: string | number) => Number(id)).filter((id) => Number.isFinite(id))
    : [];

  if (!subject) return res.status(400).json({ success: false, error: "Subject is required" });
  if (!message) return res.status(400).json({ success: false, error: "Message body is required" });
  if (!recipientScope || !["all", "workspaceOwners", "specific"].includes(recipientScope)) {
    return res.status(400).json({ success: false, error: "Invalid recipient scope" });
  }
  if (recipientScope === "specific" && specificUserIds.length === 0) {
    return res.status(400).json({ success: false, error: "Please select at least one recipient" });
  }

  try {
    // Fail fast if email is not configured
    getEmailTransporter();
  } catch (err: any) {
    return res.status(503).json({ success: false, error: err?.message || "Email transport not configured" });
  }

  const members = await prisma.workspaceMember.findMany({
    select: {
      userId: true,
      isAdmin: true,
      email: true,
      emailVerified: true,
      user: { select: { username: true } },
    },
  });

  const targetUserIds = new Set<number>();
  for (const member of members) {
    const id = Number(member.userId);
    if (recipientScope === "all") {
      targetUserIds.add(id);
    } else if (recipientScope === "workspaceOwners" && member.isAdmin) {
      targetUserIds.add(id);
    } else if (recipientScope === "specific" && specificUserIds.includes(id)) {
      targetUserIds.add(id);
    }
  }

  const deliverable = new Map<string, { userId: number; username: string; email: string }>();
  let missingEmail = 0;
  let invalidEmail = 0;

  for (const member of members) {
    const id = Number(member.userId);
    if (!targetUserIds.has(id)) continue;

    if (!member.email) {
      missingEmail += 1;
      continue;
    }

    if (!isEmailValid(member.email)) {
      invalidEmail += 1;
      continue;
    }

    const emailKey = member.email.toLowerCase();
    if (!deliverable.has(emailKey)) {
      deliverable.set(emailKey, {
        userId: id,
        username: member.user.username || `User ${id}`,
        email: member.email,
      });
    }
  }

  const htmlMessage = escapeHtml(message).replace(/\n/g, "<br />");
  let sent = 0;
  const failed: { userId: number; email: string; error: string }[] = [];

  for (const recipient of deliverable.values()) {
    try {
      await sendEmail({
        to: recipient.email,
        subject,
        text: message,
        html: htmlMessage,
      });
      sent += 1;
    } catch (err: any) {
      failed.push({ userId: recipient.userId, email: recipient.email, error: err?.message || "Failed to send" });
    }
  }

  return res.json({
    success: true,
    summary: {
      targetCount: targetUserIds.size,
      deliverable: deliverable.size,
      sent,
      failed,
    },
    skipped: { missingEmail, invalidEmail },
  });
});
